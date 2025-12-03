import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";

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
