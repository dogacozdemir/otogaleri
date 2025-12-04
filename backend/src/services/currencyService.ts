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
  const data = await callFreeCurrency("/historical", { date, base_currency: base, currencies: quote });
  const rate = data?.data?.[date]?.[quote];
  if (!rate) throw new Error("FX historical rate not found");
  return { base, quote, rate, date };
}
