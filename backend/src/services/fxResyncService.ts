import { getOrFetchRate } from "./fxCacheService";
import { SupportedCurrency } from "./currencyService";
import { TenantAwareQuery } from "../repositories/tenantAwareQuery";

export interface ReSyncFxRatesResult {
  vehicleId: number;
  updatedCount: number;
  skippedCount: number;
  errors: string[];
}

/**
 * Re-sync FX rates for vehicle costs where custom_rate (manual) is NULL.
 * Re-fetches historical rates from API for the transaction dates and updates fx_rate_to_base.
 * Use for fixing data inconsistencies when API rates were wrong or missing.
 */
export async function reSyncFxRates(
  tenantQuery: TenantAwareQuery,
  vehicleId: number,
  startDate: string,
  endDate: string
): Promise<ReSyncFxRatesResult> {
  const tenantId = tenantQuery.getTenantId();
  const errors: string[] = [];
  let updatedCount = 0;
  let skippedCount = 0;

  const [tenantRows] = await tenantQuery.executeRaw(
    "SELECT default_currency FROM tenants WHERE id = ?",
    [tenantId],
    false
  );
  const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";

  const [costRows] = await tenantQuery.query(
    `SELECT id, cost_name, amount, currency, cost_date, fx_rate_to_base, custom_rate, base_currency_at_transaction
     FROM vehicle_costs
     WHERE vehicle_id = ? AND tenant_id = ?
       AND cost_date BETWEEN ? AND ?
       AND (custom_rate IS NULL OR custom_rate = 0)
     ORDER BY cost_date ASC`,
    [vehicleId, tenantId, startDate, endDate]
  );

  const costs = costRows as any[];

  for (const cost of costs) {
    const costCurrency = (cost.currency || baseCurrency) as SupportedCurrency;
    const costDate = cost.cost_date;

    if (costCurrency === baseCurrency) {
      skippedCount++;
      continue;
    }

    try {
      const newRate = await getOrFetchRate(
        tenantQuery,
        costCurrency,
        baseCurrency as SupportedCurrency,
        costDate
      );

      if (newRate <= 0) {
        errors.push(`Cost ${cost.id} (${cost.cost_name}): Invalid rate ${newRate} from API`);
        continue;
      }

      await tenantQuery.query(
        `UPDATE vehicle_costs
         SET fx_rate_to_base = ?, base_currency_at_transaction = ?
         WHERE id = ? AND vehicle_id = ? AND tenant_id = ?`,
        [newRate, baseCurrency, cost.id, vehicleId, tenantId]
      );
      updatedCount++;
    } catch (err: any) {
      errors.push(`Cost ${cost.id} (${cost.cost_name}): ${err?.message || "Failed to fetch rate"}`);
    }
  }

  return {
    vehicleId,
    updatedCount,
    skippedCount,
    errors,
  };
}
