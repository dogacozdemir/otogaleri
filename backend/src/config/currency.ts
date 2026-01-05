import { apiConfig } from "./appConfig";

export const FREECURRENCY_API_BASE = apiConfig.required.freecurrencyApiBase;
export const FREECURRENCY_API_KEY = apiConfig.required.freecurrencyApiKey;

if (!FREECURRENCY_API_KEY) {
  console.warn("[otogaleri] FREECURRENCY_API_KEY is not set. FX features will not work until configured.");
}
