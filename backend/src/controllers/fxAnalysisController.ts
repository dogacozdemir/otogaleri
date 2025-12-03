import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";

export async function getFxImpactAnalysis(req: AuthRequest, res: Response) {
  const { vehicle_id } = req.params;

  try {
    const [vehicleRows] = await dbPool.query("SELECT * FROM vehicles WHERE id = ? AND tenant_id = ?", [
      vehicle_id,
      req.tenantId,
    ]);
    const vehicleRowsArray = vehicleRows as any[];
    if (vehicleRowsArray.length === 0) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    const vehicle = vehicleRowsArray[0] as any;
    if (!vehicle.is_sold || !vehicle.purchase_date || !vehicle.sale_date) {
      return res.status(400).json({ error: "Vehicle must be sold with purchase and sale dates" });
    }

    const [costRows] = await dbPool.query(
      "SELECT SUM(amount * fx_rate_to_base) as total_costs FROM vehicle_costs WHERE vehicle_id = ?",
      [vehicle_id]
    );
    const totalCostsBase = (costRows as any[])[0]?.total_costs || 0;

    const purchaseAmountBase = vehicle.purchase_amount
      ? Number(vehicle.purchase_amount) * Number(vehicle.purchase_fx_rate_to_base || 1)
      : 0;
    const totalCostsBaseWithPurchase = Number(totalCostsBase) + purchaseAmountBase;

    const saleAmountBase = vehicle.sale_price
      ? Number(vehicle.sale_price) * Number(vehicle.sale_fx_rate_to_base || 1)
      : 0;

    const purchaseCurrency = vehicle.purchase_currency || "TRY";
    const saleCurrency = vehicle.sale_currency || "TRY";

    const [tenantRows] = await dbPool.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";

    const purchaseFxRate = vehicle.purchase_fx_rate_to_base || 1;
    const saleFxRate = vehicle.sale_fx_rate_to_base || 1;

    let fxGainLoss = 0;
    let operationalProfit = 0;

    if (purchaseCurrency !== baseCurrency || saleCurrency !== baseCurrency) {
      const purchaseAmountInPurchaseCurrency = vehicle.purchase_amount || 0;
      const saleAmountInSaleCurrency = vehicle.sale_price || 0;

      const purchaseAmountAtPurchaseRate = purchaseAmountInPurchaseCurrency * purchaseFxRate;
      const saleAmountAtSaleRate = saleAmountInSaleCurrency * saleFxRate;

      operationalProfit = saleAmountAtSaleRate - totalCostsBaseWithPurchase;

      if (purchaseCurrency === saleCurrency && purchaseCurrency !== baseCurrency) {
        const fxChange = saleFxRate - purchaseFxRate;
        fxGainLoss = purchaseAmountInPurchaseCurrency * fxChange;
      } else if (purchaseCurrency !== baseCurrency && saleCurrency === baseCurrency) {
        const currentFxRate = saleFxRate;
        const purchaseFxRateAtSaleTime = currentFxRate;
        fxGainLoss = purchaseAmountInPurchaseCurrency * (purchaseFxRateAtSaleTime - purchaseFxRate);
      }
    } else {
      operationalProfit = saleAmountBase - totalCostsBaseWithPurchase;
    }

    const totalProfit = operationalProfit + fxGainLoss;

    res.json({
      vehicle: {
        id: vehicle.id,
        maker: vehicle.maker,
        model: vehicle.model,
        purchase_date: vehicle.purchase_date,
        sale_date: vehicle.sale_date,
        purchase_currency: purchaseCurrency,
        sale_currency: saleCurrency,
        base_currency: baseCurrency,
      },
      amounts: {
        purchase_amount: vehicle.purchase_amount,
        purchase_amount_base: purchaseAmountBase,
        sale_amount: vehicle.sale_price,
        sale_amount_base: saleAmountBase,
        total_costs_base: totalCostsBaseWithPurchase,
      },
      fx_rates: {
        purchase_fx_rate: purchaseFxRate,
        sale_fx_rate: saleFxRate,
      },
      profit_breakdown: {
        operational_profit_base: operationalProfit,
        fx_gain_loss_base: fxGainLoss,
        total_profit_base: totalProfit,
      },
      analysis: {
        days_held: Math.floor(
          (new Date(vehicle.sale_date).getTime() - new Date(vehicle.purchase_date).getTime()) / (1000 * 60 * 60 * 24)
        ),
        fx_impact_percent: totalCostsBaseWithPurchase > 0 ? (fxGainLoss / totalCostsBaseWithPurchase) * 100 : 0,
      },
    });
  } catch (err) {
    console.error("[fxAnalysis] FX impact error", err);
    res.status(500).json({ error: "Failed to analyze FX impact" });
  }
}
