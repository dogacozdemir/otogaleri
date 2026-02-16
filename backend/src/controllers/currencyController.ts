import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { getLatestRate, getHistoricalRate, SupportedCurrency } from "../services/currencyService";

export async function getCurrencyRate(req: AuthRequest, res: Response) {
  try {
    const { from, to, date } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: "from and to parameters are required" });
    }

    // Validate currencies
    const supportedCurrencies = ["TRY", "USD", "EUR", "GBP", "JPY", "YEN"];
    
    if (!supportedCurrencies.includes(from as string) || !supportedCurrencies.includes(to as string)) {
      return res.status(400).json({ 
        error: "Unsupported currency. Supported currencies: TRY, USD, EUR, GBP, JPY" 
      });
    }

    // FreeCurrencyAPI uses JPY, not YEN
    const fromCurrency = (from === "YEN" ? "JPY" : from) as SupportedCurrency;
    const toCurrency = (to === "YEN" ? "JPY" : to) as SupportedCurrency;

    const rate = date && typeof date === "string"
      ? await getHistoricalRate(date, fromCurrency, toCurrency)
      : await getLatestRate(fromCurrency, toCurrency);

    res.json({
      from: fromCurrency,
      to: toCurrency,
      rate: rate.rate,
      date: rate.date,
    });
  } catch (error: any) {
    console.error("[currency] Error fetching rate:", error);
    res.status(500).json({ 
      error: "Failed to fetch currency rate",
      message: error.message 
    });
  }
}
