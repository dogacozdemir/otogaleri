import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";
import { getOrFetchRate } from "../services/fxCacheService";
import { SupportedCurrency } from "../services/currencyService";

export async function listVehicleCosts(req: AuthRequest, res: Response) {
  const vehicle_id = req.params.vehicle_id || req.params.id;
  const { category } = req.query;

  let query = "SELECT * FROM vehicle_costs WHERE vehicle_id = ? AND tenant_id = ?";
  const params: any[] = [vehicle_id, req.tenantId];

  if (category) {
    query += " AND category = ?";
    params.push(category);
  }

  query += " ORDER BY cost_date DESC";

  try {
    const [rows] = await dbPool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("[vehicleCost] List error", err);
    res.status(500).json({ error: "Failed to list costs" });
  }
}

export async function addVehicleCost(req: AuthRequest, res: Response) {
  const vehicle_id = req.params.vehicle_id || req.params.id;
  const { cost_name, amount, currency, cost_date, category } = req.body;

  if (!cost_name || !amount || !cost_date) {
    return res.status(400).json({ error: "Cost name, amount, and date required" });
  }

  try {
    const [tenantRows] = await dbPool.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";
    const costCurrency = currency || baseCurrency;

    let fxRate = 1;
    if (costCurrency !== baseCurrency) {
      fxRate = await getOrFetchRate(
        costCurrency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        cost_date
      );
    }

    const amountBase = Number(amount) * fxRate;

    const [result] = await dbPool.query(
      "INSERT INTO vehicle_costs (tenant_id, vehicle_id, cost_name, amount, currency, fx_rate_to_base, cost_date, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [req.tenantId, vehicle_id, cost_name, amount, costCurrency, fxRate, cost_date, category || "other"]
    );

    const costId = (result as any).insertId;
    const [rows] = await dbPool.query("SELECT * FROM vehicle_costs WHERE id = ?", [costId]);
    const cost = (rows as any[])[0];
    res.status(201).json(cost);
  } catch (err) {
    console.error("[vehicleCost] Add error", err);
    res.status(500).json({ error: "Failed to add cost" });
  }
}

export async function updateVehicleCost(req: AuthRequest, res: Response) {
  const vehicle_id = req.params.vehicle_id || req.params.id;
  const { cost_id } = req.params;
  const { cost_name, amount, currency, cost_date, category } = req.body;

  try {
    const [tenantRows] = await dbPool.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";
    const costCurrency = currency || baseCurrency;

    let fxRate = 1;
    if (costCurrency !== baseCurrency && cost_date) {
      fxRate = await getOrFetchRate(
        costCurrency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        cost_date
      );
    }

    await dbPool.query(
      "UPDATE vehicle_costs SET cost_name = ?, amount = ?, currency = ?, fx_rate_to_base = ?, cost_date = ?, category = ? WHERE id = ? AND vehicle_id = ? AND tenant_id = ?",
      [cost_name, amount, costCurrency, fxRate, cost_date, category, cost_id, vehicle_id, req.tenantId]
    );

    const [rows] = await dbPool.query("SELECT * FROM vehicle_costs WHERE id = ?", [cost_id]);
    const cost = (rows as any[])[0];
    res.json(cost);
  } catch (err) {
    console.error("[vehicleCost] Update error", err);
    res.status(500).json({ error: "Failed to update cost" });
  }
}

export async function deleteVehicleCost(req: AuthRequest, res: Response) {
  const vehicle_id = req.params.vehicle_id || req.params.id;
  const { cost_id } = req.params;

  try {
    await dbPool.query("DELETE FROM vehicle_costs WHERE id = ? AND vehicle_id = ? AND tenant_id = ?", [
      cost_id,
      vehicle_id,
      req.tenantId,
    ]);
    res.json({ message: "Cost deleted" });
  } catch (err) {
    console.error("[vehicleCost] Delete error", err);
    res.status(500).json({ error: "Failed to delete cost" });
  }
}
