import { dbPool } from "../config/database";
import { getLatestRate, getHistoricalRate, SupportedCurrency } from "./currencyService";

export async function getOrFetchRate(
  base: SupportedCurrency,
  quote: SupportedCurrency,
  date: string
): Promise<number> {
  const [cached] = await dbPool.query(
    "SELECT rate FROM fx_rates WHERE base_currency = ? AND quote_currency = ? AND rate_date = ?",
    [base, quote, date]
  );

  if (Array.isArray(cached) && cached.length > 0) {
    return (cached[0] as any).rate;
  }

  let rate: number;
  const today = new Date().toISOString().slice(0, 10);

  if (date === today) {
    const fxRate = await getLatestRate(base, quote);
    rate = fxRate.rate;
  } else {
    const fxRate = await getHistoricalRate(date, base, quote);
    rate = fxRate.rate;
  }

  await dbPool.query(
    "INSERT INTO fx_rates (base_currency, quote_currency, rate, rate_date, source) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE rate = VALUES(rate)",
    [base, quote, rate, date, "freecurrencyapi"]
  );

  return rate;
}
