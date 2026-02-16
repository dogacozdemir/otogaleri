import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";
import { getOrFetchRate } from "../services/fxCacheService";
import { SupportedCurrency } from "../services/currencyService";
import { MoneyService } from "../services/moneyService";
import { safeDivide } from "../utils/safeDivide";

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
    // Single source of truth: ALL costs (including purchase) come from vehicle_costs
    // Each cost: amount * fx_rate_to_base converts to base. Use COALESCE(NULLIF(...,0),1) to avoid 0 multiplication (legacy data)
    const [costRows] = await dbPool.query(
      `SELECT SUM(amount * COALESCE(NULLIF(fx_rate_to_base, 0), 1)) as total_costs 
       FROM vehicle_costs 
       WHERE vehicle_id = ? AND tenant_id = ?`,
      [vehicle_id, req.tenantId]
    );
    const totalCostsBase = Number((costRows as any[])[0]?.total_costs) || 0;

    // Get tenant's base currency for MoneyService
    const [tenantRows] = await dbPool.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = ((tenantRows as any[])[0]?.default_currency || "TRY") as SupportedCurrency;

    // STRICT: For sold vehicles, ONLY use vehicle_sales (single source of truth — zero drift with reports)
    let saleAmountBase = 0;
    let salePrice: number | null = null;
    let saleCurrency = baseCurrency;
    let saleFxRateToBase: number | null = null;

    if (vehicle.is_sold) {
      const [saleRows] = await dbPool.query(
        "SELECT sale_amount, sale_currency, sale_fx_rate_to_base FROM vehicle_sales WHERE vehicle_id = ? AND tenant_id = ? ORDER BY sale_date DESC LIMIT 1",
        [vehicle_id, req.tenantId]
      );
      const saleRow = (saleRows as any[])[0];
      if (saleRow) {
        salePrice = saleRow.sale_amount;
        saleCurrency = saleRow.sale_currency || baseCurrency;
        saleFxRateToBase = saleRow.sale_fx_rate_to_base;
      }
    } else {
      salePrice = vehicle.sale_price;
      saleCurrency = vehicle.sale_currency || baseCurrency;
      saleFxRateToBase = vehicle.sale_fx_rate_to_base;
    }

    // Sale amount in base: use stored rate; fallback to 1 when 0/null (same currency or legacy)
    const effectiveSaleRate = saleFxRateToBase && saleFxRateToBase > 0 ? saleFxRateToBase : 1;
    if (salePrice != null) {
      saleAmountBase = MoneyService.convertCurrency(
        salePrice,
        saleCurrency as SupportedCurrency,
        baseCurrency,
        effectiveSaleRate
      );
    }

    const grossProfit = MoneyService.subtract(saleAmountBase, totalCostsBase, baseCurrency);

    // ROI = (Net Profit / Total Cost) * 100. Profit Margin = (Net Profit / Sales Price) * 100
    // safeDivide returns 0 when denominator is 0 (prevents NaN/crash)
    const roi = safeDivide(grossProfit, totalCostsBase) * 100;
    const profitMargin = safeDivide(grossProfit, saleAmountBase) * 100;

    const targetProfit = vehicle.target_profit ? Number(vehicle.target_profit) : null;
    const targetProfitVariance = targetProfit !== null
      ? MoneyService.subtract(grossProfit, targetProfit, baseCurrency)
      : null;

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
        sale_price: salePrice,
        sale_currency: saleCurrency,
        sale_fx_rate_to_base: saleFxRateToBase,
      },
      costs,
      financialSummary: {
        totalCostBase: totalCostsBase,
        totalCostViewCurrency: totalCostsBase,
        grossProfit,
        roi: Number.isFinite(roi) ? Number(roi.toFixed(2)) : 0,
        profitMargin: Number.isFinite(profitMargin) ? Number(profitMargin.toFixed(2)) : 0,
        targetProfitVariance,
      },
      totals: {
        total_costs_base: totalCostsBase,
        sale_amount_base: saleAmountBase,
        profit_base: grossProfit,
        profit_margin_percent: Number.isFinite(profitMargin) ? Number(profitMargin.toFixed(2)) : 0,
        roi_percent: Number.isFinite(roi) ? Number(roi.toFixed(2)) : 0,
      },
      target_profit: targetProfit,
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
      const storedBaseCurrency = cost.base_currency_at_transaction || baseCurrency;

      let rateToTarget = 1;
      let rateSource: 'custom' | 'api' = 'api';

      if (costCurrency === target_currency) {
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

      // Use stored fx_rate_to_base (rate at transaction) for historical accuracy
      // base_currency_at_transaction ensures reports stay correct if tenant changes default_currency
      
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
      
      // No custom rate - use stored fx_rate_to_base for historical accuracy when base_currency_at_transaction exists
      if (cost.base_currency_at_transaction && cost.fx_rate_to_base) {
        const amountInStoredBase = costAmount * Number(cost.fx_rate_to_base);
        if (target_currency === storedBaseCurrency) {
          convertedAmounts.push(amountInStoredBase);
          conversionDetails.push({
            cost_name: cost.cost_name,
            amount: costAmount,
            currency: costCurrency,
            cost_date: costDate,
            converted_amount: amountInStoredBase,
            rate_used: Number(cost.fx_rate_to_base),
            rate_source: 'api'
          });
        } else {
          if (!req.tenantQuery) {
            return res.status(500).json({ error: "Tenant query not available" });
          }
          rateToTarget = await getOrFetchRate(
            req.tenantQuery,
            storedBaseCurrency as SupportedCurrency,
            target_currency as SupportedCurrency,
            costDate
          );
          const convertedAmount = MoneyService.convertCurrency(
            amountInStoredBase,
            storedBaseCurrency as SupportedCurrency,
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
      } else {
        // Fallback: direct conversion
        if (target_currency !== baseCurrency || costCurrency !== baseCurrency) {
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
    }

    // Use MoneyService to sum all converted amounts with precision
    const totalConverted = MoneyService.sum(convertedAmounts, target_currency as SupportedCurrency);

    // Get vehicle and sale info — for sold vehicles use vehicle_sales (single source of truth)
    const [vehicleRows] = await dbPool.query("SELECT * FROM vehicles WHERE id = ? AND tenant_id = ?", [
      vehicle_id,
      req.tenantId,
    ]);
    const vehicleRowsArray = vehicleRows as any[];
    const vehicle = vehicleRowsArray.length > 0 ? vehicleRowsArray[0] : null;

    let saleAmount = 0;
    let saleCurrencyForConvert = baseCurrency;
    let saleFxRateForConvert: number | null = null;
    if (vehicle?.is_sold) {
      const [saleRows] = await dbPool.query(
        "SELECT sale_amount, sale_currency, sale_fx_rate_to_base FROM vehicle_sales WHERE vehicle_id = ? AND tenant_id = ? ORDER BY sale_date DESC LIMIT 1",
        [vehicle_id, req.tenantId]
      );
      const saleRow = (saleRows as any[])[0];
      if (saleRow) {
        saleAmount = Number(saleRow.sale_amount || 0);
        saleCurrencyForConvert = saleRow.sale_currency || baseCurrency;
        saleFxRateForConvert = saleRow.sale_fx_rate_to_base;
      }
    } else if (vehicle?.sale_price) {
      saleAmount = Number(vehicle.sale_price);
      saleCurrencyForConvert = vehicle.sale_currency || baseCurrency;
      saleFxRateForConvert = vehicle.sale_fx_rate_to_base;
    }

    // Convert sale price to target currency
    let salePriceConverted = 0;
    let salePriceRate = 1;
    let salePriceRateSource: 'custom' | 'api' = 'api';
    
    if (saleAmount > 0) {
      const saleCurrency = saleCurrencyForConvert as SupportedCurrency;
      
      if (saleCurrency === target_currency) {
        salePriceConverted = saleAmount;
        salePriceRate = 1;
      } else {
        // Use sale_fx_rate_to_base if available (for historical conversion)
        // Otherwise, use current date rate
        if (saleFxRateForConvert && saleCurrency !== baseCurrency) {
          // Convert: saleCurrency -> baseCurrency (using stored rate) -> targetCurrency (using current rate)
          const amountInBase = MoneyService.convertCurrency(
            saleAmount,
            saleCurrency,
            baseCurrency as SupportedCurrency,
            saleFxRateForConvert
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
            salePriceRate = saleFxRateForConvert;
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
