import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";
import { getOrFetchRate } from "../services/fxCacheService";
import { SupportedCurrency } from "../services/currencyService";

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
      "SELECT SUM(amount * fx_rate_to_base) as total_costs FROM vehicle_costs WHERE vehicle_id = ?",
      [vehicle_id]
    );
    const totalCosts = (costRows as any[])[0]?.total_costs || 0;

    const purchaseAmountBase = vehicle.purchase_amount
      ? Number(vehicle.purchase_amount) * Number(vehicle.purchase_fx_rate_to_base || 1)
      : 0;
    const totalCostsBase = Number(totalCosts) + purchaseAmountBase;

    const saleAmountBase = vehicle.sale_price
      ? Number(vehicle.sale_price) * Number(vehicle.sale_fx_rate_to_base || 1)
      : 0;

    const profitBase = saleAmountBase - totalCostsBase;
    const profitMargin = saleAmountBase > 0 ? (profitBase / saleAmountBase) * 100 : 0;
    const roi = totalCostsBase > 0 ? (profitBase / totalCostsBase) * 100 : 0;

    const [costs] = await dbPool.query(
      "SELECT * FROM vehicle_costs WHERE vehicle_id = ? ORDER BY cost_date DESC",
      [vehicle_id]
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

    let totalConverted = 0;
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
      const costCurrency = cost.currency || baseCurrency;
      const costDate = cost.cost_date;
      const costAmount = Number(cost.amount);

      let rateToTarget = 1;
      let rateSource: 'custom' | 'api' = 'api';

      if (costCurrency === target_currency) {
        // Same currency, no conversion needed
        totalConverted += costAmount;
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
        const amountInBase = costAmount * Number(cost.custom_rate);
        rateSource = 'custom';
        
        if (target_currency !== baseCurrency) {
          rateToTarget = await getOrFetchRate(
            baseCurrency as SupportedCurrency,
            target_currency as SupportedCurrency,
            costDate
          );
          const convertedAmount = amountInBase * rateToTarget;
          totalConverted += convertedAmount;
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
          totalConverted += amountInBase;
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
        rateToTarget = await getOrFetchRate(
          costCurrency as SupportedCurrency,
          target_currency as SupportedCurrency,
          costDate
        );
      } else {
        rateToTarget = 1;
      }

      const convertedAmount = costAmount * rateToTarget;
      totalConverted += convertedAmount;

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

    res.json({
      vehicle_id: Number(vehicle_id),
      target_currency,
      base_currency: baseCurrency,
      total_converted: totalConverted,
      conversion_details: conversionDetails
    });
  } catch (err) {
    console.error("[profit] Convert costs error", err);
    res.status(500).json({ error: "Failed to convert costs" });
  }
}
