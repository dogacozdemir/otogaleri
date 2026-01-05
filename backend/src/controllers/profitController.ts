import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";
import { getOrFetchRate } from "../services/fxCacheService";
import { SupportedCurrency } from "../services/currencyService";
import { MoneyService } from "../services/moneyService";

export async function calculateVehicleProfit(req: AuthRequest, res: Response) {
  const vehicle_id = req.params.vehicle_id || req.params.id;

  try {
    const [vehicleRows] = await dbPool.query("SELECT * FROM vehicles WHERE id = ? AND tenant_id = ?", [
      vehicle_id,
      req.tenantId,
    ]);
    const vehicleRowsArray = vehicleRows as any[];
    if (!Array.isArray(vehicleRowsArray) || vehicleRowsArray.length === 0) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    const vehicle = vehicleRowsArray[0] as any;
    const [costRows] = await dbPool.query(
      "SELECT SUM(amount * fx_rate_to_base) as total_costs FROM vehicle_costs WHERE vehicle_id = ? AND tenant_id = ?",
      [vehicle_id, req.tenantId]
    );
    const totalCosts = (costRows as any[])[0]?.total_costs || 0;

    // Get tenant's base currency for MoneyService
    const [tenantRows] = await dbPool.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = ((tenantRows as any[])[0]?.default_currency || "TRY") as SupportedCurrency;

    // Use MoneyService for precise financial calculations
    const purchaseAmountBase = vehicle.purchase_amount && vehicle.purchase_fx_rate_to_base
      ? MoneyService.convertCurrency(
          vehicle.purchase_amount,
          (vehicle.purchase_currency || baseCurrency) as SupportedCurrency,
          baseCurrency,
          vehicle.purchase_fx_rate_to_base
        )
      : 0;
    
    const totalCostsBase = MoneyService.add(totalCosts, purchaseAmountBase, baseCurrency);

    const saleAmountBase = vehicle.sale_price && vehicle.sale_fx_rate_to_base
      ? MoneyService.convertCurrency(
          vehicle.sale_price,
          (vehicle.sale_currency || baseCurrency) as SupportedCurrency,
          baseCurrency,
          vehicle.sale_fx_rate_to_base
        )
      : 0;

    const profitBase = MoneyService.subtract(saleAmountBase, totalCostsBase, baseCurrency);
    
    // Calculate percentages (profit margin and ROI)
    // profitMargin = (profit / sale) * 100
    // roi = (profit / costs) * 100
    const profitMargin = !MoneyService.isZero(saleAmountBase, baseCurrency)
      ? (profitBase / saleAmountBase) * 100
      : 0;
    const roi = !MoneyService.isZero(totalCostsBase, baseCurrency)
      ? (profitBase / totalCostsBase) * 100
      : 0;

    const [costs] = await dbPool.query(
      "SELECT * FROM vehicle_costs WHERE vehicle_id = ? AND tenant_id = ? ORDER BY cost_date DESC",
      [vehicle_id, req.tenantId]
    );

    res.json({
      vehicle: {
        id: vehicle.id,
        maker: vehicle.maker,
        model: vehicle.model,
        purchase_amount: vehicle.purchase_amount,
        purchase_currency: vehicle.purchase_currency,
        purchase_fx_rate_to_base: vehicle.purchase_fx_rate_to_base,
        sale_price: vehicle.sale_price,
        sale_currency: vehicle.sale_currency,
        sale_fx_rate_to_base: vehicle.sale_fx_rate_to_base,
      },
      costs,
      totals: {
        purchase_amount_base: purchaseAmountBase,
        total_costs_base: totalCostsBase,
        sale_amount_base: saleAmountBase,
        profit_base: profitBase,
        profit_margin_percent: Number(profitMargin.toFixed(2)),
        roi_percent: Number(roi.toFixed(2)),
      },
      target_profit: vehicle.target_profit ? Number(vehicle.target_profit) : null,
    });
  } catch (err) {
    console.error("[profit] Calculate error", err);
    res.status(500).json({ error: "Failed to calculate profit" });
  }
}

export async function convertCostsToCurrency(req: AuthRequest, res: Response) {
  const vehicle_id = req.params.vehicle_id || req.params.id;
  const { target_currency } = req.body;

  if (!target_currency) {
    return res.status(400).json({ error: "target_currency is required" });
  }

  // Validate target_currency is a supported currency
  const SUPPORTED_CURRENCIES: SupportedCurrency[] = ["TRY", "USD", "EUR", "GBP", "JPY"];
  if (!SUPPORTED_CURRENCIES.includes(target_currency as SupportedCurrency)) {
    return res.status(400).json({ error: `Unsupported target_currency. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}` });
  }

  try {
    // Get tenant's base currency
    const [tenantRows] = await dbPool.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";

    // Get all costs for this vehicle
    const [costRows] = await dbPool.query(
      "SELECT * FROM vehicle_costs WHERE vehicle_id = ? AND tenant_id = ? ORDER BY cost_date DESC",
      [vehicle_id, req.tenantId]
    );
    const costs = costRows as any[];

    const convertedAmounts: number[] = [];
    const conversionDetails: Array<{
      cost_name: string;
      amount: number;
      currency: string;
      cost_date: string;
      converted_amount: number;
      rate_used: number;
      rate_source: 'custom' | 'api';
    }> = [];

    for (const cost of costs) {
      const costCurrency = (cost.currency || baseCurrency) as SupportedCurrency;
      const costDate = cost.cost_date;
      const costAmount = Number(cost.amount);

      let rateToTarget = 1;
      let rateSource: 'custom' | 'api' = 'api';

      if (costCurrency === target_currency) {
        // Same currency, no conversion needed
        convertedAmounts.push(costAmount);
        conversionDetails.push({
          cost_name: cost.cost_name,
          amount: costAmount,
          currency: costCurrency,
          cost_date: costDate,
          converted_amount: costAmount,
          rate_used: 1,
          rate_source: 'api'
        });
        continue;
      }

      // Convert directly from cost currency to target currency using date-based rate
      // If custom_rate exists, it's the rate from cost currency to base currency
      // We need to convert: costCurrency -> targetCurrency using the cost date
      
      if (cost.custom_rate !== null && cost.custom_rate !== undefined) {
        // Custom rate is from costCurrency to baseCurrency
        // Convert: costCurrency -> baseCurrency (using custom_rate) -> targetCurrency (using date-based rate)
        const amountInBase = MoneyService.convertCurrency(
          costAmount,
          costCurrency,
          baseCurrency as SupportedCurrency,
          Number(cost.custom_rate)
        );
        rateSource = 'custom';
        
        if (target_currency !== baseCurrency) {
          if (!req.tenantQuery) {
            return res.status(500).json({ error: "Tenant query not available" });
          }
          rateToTarget = await getOrFetchRate(
            req.tenantQuery,
            baseCurrency as SupportedCurrency,
            target_currency as SupportedCurrency,
            costDate
          );
          const convertedAmount = MoneyService.convertCurrency(
            amountInBase,
            baseCurrency as SupportedCurrency,
            target_currency as SupportedCurrency,
            rateToTarget
          );
          convertedAmounts.push(convertedAmount);
          conversionDetails.push({
            cost_name: cost.cost_name,
            amount: costAmount,
            currency: costCurrency,
            cost_date: costDate,
            converted_amount: convertedAmount,
            rate_used: rateToTarget,
            rate_source: rateSource
          });
        } else {
          convertedAmounts.push(amountInBase);
          conversionDetails.push({
            cost_name: cost.cost_name,
            amount: costAmount,
            currency: costCurrency,
            cost_date: costDate,
            converted_amount: amountInBase,
            rate_used: Number(cost.custom_rate),
            rate_source: rateSource
          });
        }
        continue;
      }
      
      // No custom rate - use date-based rate directly from costCurrency to targetCurrency
      if (target_currency !== baseCurrency || costCurrency !== baseCurrency) {
        // Convert: costCurrency -> targetCurrency using date-based rate
        if (!req.tenantQuery) {
          return res.status(500).json({ error: "Tenant query not available" });
        }
        rateToTarget = await getOrFetchRate(
          req.tenantQuery,
          costCurrency,
          target_currency as SupportedCurrency,
          costDate
        );
      } else {
        rateToTarget = 1;
      }

      // Use MoneyService for precise currency conversion
      const convertedAmount = MoneyService.convertCurrency(
        costAmount,
        costCurrency,
        target_currency as SupportedCurrency,
        rateToTarget
      );
      convertedAmounts.push(convertedAmount);

      conversionDetails.push({
        cost_name: cost.cost_name,
        amount: costAmount,
        currency: costCurrency,
        cost_date: costDate,
        converted_amount: convertedAmount,
        rate_used: rateToTarget,
        rate_source: rateSource
      });
    }

    // Use MoneyService to sum all converted amounts with precision
    const totalConverted = MoneyService.sum(convertedAmounts, target_currency as SupportedCurrency);

    // Get vehicle information for sale price and profit conversion
    const [vehicleRows] = await dbPool.query("SELECT * FROM vehicles WHERE id = ? AND tenant_id = ?", [
      vehicle_id,
      req.tenantId,
    ]);
    const vehicleRowsArray = vehicleRows as any[];
    const vehicle = vehicleRowsArray.length > 0 ? vehicleRowsArray[0] : null;

    // Convert sale price to target currency
    let salePriceConverted = 0;
    let salePriceRate = 1;
    let salePriceRateSource: 'custom' | 'api' = 'api';
    
    if (vehicle && vehicle.sale_price) {
      const saleCurrency = (vehicle.sale_currency || baseCurrency) as SupportedCurrency;
      const saleAmount = Number(vehicle.sale_price);
      
      if (saleCurrency === target_currency) {
        salePriceConverted = saleAmount;
        salePriceRate = 1;
      } else {
        // Use sale_fx_rate_to_base if available (for historical conversion)
        // Otherwise, use current date rate
        if (vehicle.sale_fx_rate_to_base && saleCurrency !== baseCurrency) {
          // Convert: saleCurrency -> baseCurrency (using stored rate) -> targetCurrency (using current rate)
          const amountInBase = MoneyService.convertCurrency(
            saleAmount,
            saleCurrency,
            baseCurrency as SupportedCurrency,
            vehicle.sale_fx_rate_to_base
          );
          
          if (target_currency !== baseCurrency) {
            if (!req.tenantQuery) {
              return res.status(500).json({ error: "Tenant query not available" });
            }
            // Use today's date for sale price conversion (sale is current)
            const today = new Date().toISOString().split('T')[0];
            salePriceRate = await getOrFetchRate(
              req.tenantQuery,
              baseCurrency as SupportedCurrency,
              target_currency as SupportedCurrency,
              today
            );
            salePriceConverted = MoneyService.convertCurrency(
              amountInBase,
              baseCurrency as SupportedCurrency,
              target_currency as SupportedCurrency,
              salePriceRate
            );
          } else {
            salePriceConverted = amountInBase;
            salePriceRate = vehicle.sale_fx_rate_to_base;
            salePriceRateSource = 'custom'; // Using stored rate
          }
        } else {
          // No stored rate, use current date rate
          if (!req.tenantQuery) {
            return res.status(500).json({ error: "Tenant query not available" });
          }
          const today = new Date().toISOString().split('T')[0];
          salePriceRate = await getOrFetchRate(
            req.tenantQuery,
            saleCurrency,
            target_currency as SupportedCurrency,
            today
          );
          salePriceConverted = MoneyService.convertCurrency(
            saleAmount,
            saleCurrency,
            target_currency as SupportedCurrency,
            salePriceRate
          );
        }
      }
    }

    // Calculate profit in target currency
    // Profit = Sale Price - Total Costs (both in target currency)
    const profitConverted = MoneyService.subtract(
      salePriceConverted,
      totalConverted,
      target_currency as SupportedCurrency
    );

    // Convert target profit to target currency (target profit is stored in base currency)
    let targetProfitConverted: number | null = null;
    if (vehicle && vehicle.target_profit) {
      const targetProfitBase = Number(vehicle.target_profit);
      if (target_currency !== baseCurrency) {
        if (!req.tenantQuery) {
          return res.status(500).json({ error: "Tenant query not available" });
        }
        // Use today's date for target profit conversion
        const today = new Date().toISOString().split('T')[0];
        const targetProfitRate = await getOrFetchRate(
          req.tenantQuery,
          baseCurrency as SupportedCurrency,
          target_currency as SupportedCurrency,
          today
        );
        targetProfitConverted = MoneyService.convertCurrency(
          targetProfitBase,
          baseCurrency as SupportedCurrency,
          target_currency as SupportedCurrency,
          targetProfitRate
        );
      } else {
        targetProfitConverted = targetProfitBase;
      }
    }

    res.json({
      vehicle_id: Number(vehicle_id),
      target_currency,
      base_currency: baseCurrency,
      total_converted: totalConverted,
      sale_price_converted: salePriceConverted,
      sale_price_rate: salePriceRate,
      sale_price_rate_source: salePriceRateSource,
      profit_converted: profitConverted,
      target_profit_converted: targetProfitConverted,
      conversion_details: conversionDetails
    });
  } catch (err) {
    console.error("[profit] Convert costs error", err);
    res.status(500).json({ error: "Failed to convert costs" });
  }
}
