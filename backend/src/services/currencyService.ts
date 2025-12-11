import axios from "axios";
import { FREECURRENCY_API_BASE, FREECURRENCY_API_KEY } from "../config/currency";

export type SupportedCurrency = "TRY" | "USD" | "EUR" | "GBP" | "JPY";

export interface FxRate {
  base: string;
  quote: string;
  rate: number;
  date: string; // YYYY-MM-DD
}

async function callFreeCurrency(path: string, params: Record<string, any>) {
  if (!FREECURRENCY_API_KEY) {
    throw new Error("FREECURRENCY_API_KEY is not configured");
  }

  const url = `${FREECURRENCY_API_BASE}${path}`;
  const response = await axios.get(url, {
    params: { ...params, apikey: FREECURRENCY_API_KEY },
  });
  return response.data;
}

// Latest rate for base->quote
export async function getLatestRate(base: SupportedCurrency, quote: SupportedCurrency): Promise<FxRate> {
  const data = await callFreeCurrency("/latest", { base_currency: base, currencies: quote });
  const rate = data?.data?.[quote];
  if (!rate) throw new Error("FX rate not found");
  const today = new Date().toISOString().slice(0, 10);
  return { base, quote, rate, date: today };
}

// Historical rate at a given date
export async function getHistoricalRate(date: string, base: SupportedCurrency, quote: SupportedCurrency): Promise<FxRate> {
  try {
    const data = await callFreeCurrency("/historical", { date, base_currency: base, currencies: quote });
    
    // FreeCurrencyAPI historical endpoint returns data in format: { data: { "YYYY-MM-DD": { "CURRENCY": rate } } }
    let rate = data?.data?.[date]?.[quote];
    
    // Try alternative response formats
    if (!rate) {
      // Format: { data: { "CURRENCY": rate } }
      rate = data?.data?.[quote];
    }
    
    if (!rate) {
      // Format: { data: { "YYYY-MM-DD": { "CURRENCY": rate } } } - check all dates
      const dates = Object.keys(data?.data || {});
      for (const d of dates) {
        if (data.data[d]?.[quote]) {
          rate = data.data[d][quote];
          console.warn(`[currency] Using rate from different date ${d} instead of ${date}`);
          break;
        }
      }
    }
    
    if (!rate) {
      console.error(`[currency] Historical rate response:`, JSON.stringify(data, null, 2));
      throw new Error(`FX historical rate not found for ${base}->${quote} on ${date}. Response: ${JSON.stringify(data)}`);
    }
    
    return { base, quote, rate, date };
  } catch (error: any) {
    // If API fails, try to get the latest rate as fallback
    console.warn(`[currency] Historical rate fetch failed for ${date}, using latest rate as fallback:`, error.message);
    try {
      const latestRate = await getLatestRate(base, quote);
      return { ...latestRate, date }; // Use latest rate but keep the requested date
    } catch (fallbackError) {
      throw new Error(`FX rate not available for ${base}->${quote} on ${date} and fallback also failed: ${fallbackError}`);
    }
  }
}
