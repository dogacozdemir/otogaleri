import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";
import { safeDivide } from "../utils/safeDivide";

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
      "SELECT SUM(amount * fx_rate_to_base) as total_costs FROM vehicle_costs WHERE vehicle_id = ? AND tenant_id = ?",
      [vehicle_id, req.tenantId]
    );
    const totalCostsBaseWithPurchase = (costRows as any[])[0]?.total_costs || 0;

    // Single source of truth: fetch purchase cost from vehicle_costs (is_system_cost=1, category='purchase')
    const [purchaseCostRows] = await dbPool.query(
      `SELECT amount, currency, fx_rate_to_base FROM vehicle_costs 
       WHERE vehicle_id = ? AND tenant_id = ? AND is_system_cost = 1 AND category = 'purchase' LIMIT 1`,
      [vehicle_id, req.tenantId]
    );
    const purchaseCost = (purchaseCostRows as any[])[0];
    const purchaseAmountInPurchaseCurrency = purchaseCost ? Number(purchaseCost.amount) : 0;
    const purchaseCurrency = purchaseCost?.currency || vehicle.purchase_currency || "TRY";
    const purchaseFxRate = purchaseCost ? Number(purchaseCost.fx_rate_to_base || 1) : (vehicle.purchase_fx_rate_to_base || 1);
    const purchaseAmountBase = purchaseAmountInPurchaseCurrency * purchaseFxRate;

    // STRICT: Derive sale from vehicle_sales (single source of truth for sold vehicles)
    const [saleRows] = await dbPool.query(
      `SELECT sale_amount, sale_currency, sale_fx_rate_to_base, sale_date FROM vehicle_sales 
       WHERE vehicle_id = ? AND tenant_id = ? ORDER BY sale_date DESC LIMIT 1`,
      [vehicle_id, req.tenantId]
    );
    const saleRow = (saleRows as any[])[0];
    const saleAmountInSaleCurrency = saleRow ? Number(saleRow.sale_amount || 0) : 0;
    const saleCurrency = saleRow?.sale_currency || vehicle.sale_currency || "TRY";
    const saleFxRate = saleRow ? Number(saleRow.sale_fx_rate_to_base || 1) : 1;
    const saleAmountBase = saleAmountInSaleCurrency * saleFxRate;

    const [tenantRows] = await dbPool.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";

    let fxGainLoss = 0;
    let operationalProfit = 0;

    if (purchaseCurrency !== baseCurrency || saleCurrency !== baseCurrency) {

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
        purchase_amount: purchaseAmountInPurchaseCurrency,
        purchase_amount_base: purchaseAmountBase,
        sale_amount: saleAmountInSaleCurrency,
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
        fx_impact_percent: safeDivide(fxGainLoss, totalCostsBaseWithPurchase) * 100,
      },
    });
  } catch (err) {
    console.error("[fxAnalysis] FX impact error", err);
    res.status(500).json({ error: "Failed to analyze FX impact" });
  }
}
