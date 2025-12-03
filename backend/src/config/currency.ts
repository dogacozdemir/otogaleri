export const FREECURRENCY_API_BASE = "https://api.freecurrencyapi.com/v1";

export const FREECURRENCY_API_KEY = process.env.FREECURRENCY_API_KEY || "";

if (!FREECURRENCY_API_KEY) {
  console.warn("[otogaleri] FREECURRENCY_API_KEY is not set. FX features will not work until configured.");
}
