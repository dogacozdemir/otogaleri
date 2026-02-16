import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { reSyncFxRates } from "../services/fxResyncService";
import "../middleware/tenantQuery";

export async function reSyncVehicleCostFxRates(req: AuthRequest, res: Response) {
  const vehicle_id = req.params.vehicle_id || req.params.id;
  const { start_date, end_date } = req.body;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: "start_date and end_date are required (YYYY-MM-DD)" });
  }

  const startDate = new Date(start_date).toISOString().split("T")[0];
  const endDate = new Date(end_date).toISOString().split("T")[0];

  if (startDate > endDate) {
    return res.status(400).json({ error: "start_date must be before or equal to end_date" });
  }

  try {
    if (!req.tenantQuery) {
      return res.status(500).json({ error: "Tenant query not available" });
    }

    const result = await reSyncFxRates(
      req.tenantQuery,
      Number(vehicle_id),
      startDate,
      endDate
    );

    res.json({
      message: "FX rates re-synced",
      ...result,
    });
  } catch (err: any) {
    console.error("[fxResync] Error", err);
    res.status(500).json({ error: err?.message || "Failed to re-sync FX rates" });
  }
}
