import { TenantAwareQuery } from "../repositories/tenantAwareQuery";
import { getLatestRate, getHistoricalRate, SupportedCurrency } from "./currencyService";

/**
 * Get or fetch FX rate from cache or external API
 * Note: fx_rates table is NOT tenant-aware (global FX rates), so TenantAwareQuery is used
 * for consistency but tenant_id filtering is not applied
 */
export async function getOrFetchRate(
  tenantQuery: TenantAwareQuery,
  base: SupportedCurrency,
  quote: SupportedCurrency,
  date: string
): Promise<number> {
  // If same currency, return 1
  if (base === quote) {
    return 1;
  }

  // Check cache first
  // Note: fx_rates is NOT tenant-aware, so we use executeRaw to bypass tenant_id check
  const [cached] = await tenantQuery.executeRaw(
    "SELECT rate FROM fx_rates WHERE base_currency = ? AND quote_currency = ? AND rate_date = ?",
    [base, quote, date]
  );

  if (Array.isArray(cached) && cached.length > 0) {
    return (cached[0] as any).rate;
  }

  // Try to find closest date in cache (within 7 days)
  const [closestCached] = await tenantQuery.executeRaw(
    `SELECT rate, rate_date FROM fx_rates 
     WHERE base_currency = ? AND quote_currency = ? 
     AND rate_date BETWEEN DATE_SUB(?, INTERVAL 7 DAY) AND DATE_ADD(?, INTERVAL 7 DAY)
     ORDER BY ABS(DATEDIFF(rate_date, ?)) ASC
     LIMIT 1`,
    [base, quote, date, date, date]
  );

  if (Array.isArray(closestCached) && closestCached.length > 0) {
    const cachedRate = (closestCached[0] as any).rate;
    console.warn(`[fxCache] Using closest cached rate for ${base}->${quote} on ${date} (from ${(closestCached[0] as any).rate_date})`);
    return cachedRate;
  }

  let rate: number;
  const today = new Date().toISOString().slice(0, 10);

  try {
    if (date === today) {
      const fxRate = await getLatestRate(base, quote);
      rate = fxRate.rate;
    } else {
      const fxRate = await getHistoricalRate(date, base, quote);
      rate = fxRate.rate;
    }

    // Cache the rate
    await tenantQuery.executeRaw(
      "INSERT INTO fx_rates (base_currency, quote_currency, rate, rate_date, source) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE rate = VALUES(rate)",
      [base, quote, rate, date, "freecurrencyapi"]
    );
  } catch (error: any) {
    console.error(`[fxCache] Failed to fetch rate for ${base}->${quote} on ${date}:`, error.message);
    
    // Last resort: use base currency conversion through USD or EUR
    if (base !== "USD" && quote !== "USD") {
      try {
        console.warn(`[fxCache] Trying USD as intermediate currency for ${base}->${quote}`);
        const baseToUsd = await getOrFetchRate(tenantQuery, base, "USD", date);
        const usdToQuote = await getOrFetchRate(tenantQuery, "USD", quote, date);
        rate = baseToUsd * usdToQuote;
        return rate;
      } catch (usdError) {
        // If USD conversion also fails, throw original error
      }
    }
    
    // If all else fails, use latest rate
    console.warn(`[fxCache] Using latest rate as final fallback for ${base}->${quote}`);
    try {
      const latestRate = await getLatestRate(base, quote);
      rate = latestRate.rate;
    } catch (latestError) {
      throw new Error(`Unable to fetch FX rate for ${base}->${quote} on ${date}: ${error.message}`);
    }
  }

  return rate;
}
