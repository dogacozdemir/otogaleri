/**
 * Centralized formatting utilities for the application
 * Used across multiple components for consistency
 */

/**
 * Gets appropriate locale for currency formatting
 * @param currency - Currency code
 * @param fallbackLocale - Fallback locale (default: "tr-TR")
 * @returns Locale string optimized for the currency
 */
const getLocaleForCurrency = (currency: string, fallbackLocale: string = "tr-TR"): string => {
  // Map currencies to their optimal locales for better formatting
  const currencyLocaleMap: Record<string, string> = {
    TRY: "tr-TR",
    USD: "en-US",
    EUR: "de-DE", // European format (1.234,56 €)
    GBP: "en-GB",
    JPY: "ja-JP",
  };
  
  return currencyLocaleMap[currency] || fallbackLocale;
};

/**
 * Formats a number as currency
 * @param amount - The amount to format (can be number, string, null, or undefined)
 * @param currency - Currency code (default: "TRY")
 * @param locale - Locale string (default: "tr-TR", will be auto-adjusted for currency if not specified)
 * @returns Formatted currency string or "-" if invalid
 */
export const formatCurrency = (
  amount: number | null | undefined | string,
  currency: string = "TRY",
  locale: string = "tr-TR"
): string => {
  if (amount == null || amount === undefined || amount === "") return "-";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "-";
  
  // Use currency-optimized locale if default locale is used
  // This ensures proper formatting for GBP, JPY, EUR, etc.
  const optimizedLocale = (locale === "tr-TR" || locale === "en-US") 
    ? getLocaleForCurrency(currency, locale)
    : locale;
  
  return new Intl.NumberFormat(optimizedLocale, {
    style: "currency",
    currency: currency,
  }).format(num);
};

/**
 * Formats a number as currency with explicit currency parameter
 * This is used for multi-currency support where each record has its own currency
 * @param amount - The amount to format (can be number, string, null, or undefined)
 * @param recordCurrency - The currency of the record (e.g., "USD", "EUR", "TRY")
 * @param locale - Locale string (default: "tr-TR")
 * @param fallbackCurrency - Fallback currency if recordCurrency is null/undefined (default: "TRY")
 * @returns Formatted currency string or "-" if invalid
 */
export const formatCurrencyWithCurrency = (
  amount: number | null | undefined | string,
  recordCurrency: string | null | undefined,
  locale: string = "tr-TR",
  fallbackCurrency: string = "TRY"
): string => {
  const currency = recordCurrency || fallbackCurrency;
  return formatCurrency(amount, currency, locale);
};

/**
 * Formats a date string to Turkish locale date format
 * @param dateString - ISO date string or Date object
 * @param options - Optional Intl.DateTimeFormatOptions
 * @returns Formatted date string or "Yok" if invalid
 */
export const formatDate = (
  dateString: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!dateString) return "Yok";
  try {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return "Yok";
    return date.toLocaleDateString("tr-TR", options);
  } catch {
    return "Yok";
  }
};

/**
 * Formats a date with time to Turkish locale format
 * @param dateString - ISO date string or Date object
 * @returns Formatted date and time string
 */
export const formatDateTime = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return "Yok";
  try {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return "Yok";
    return date.toLocaleString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Yok";
  }
};

/**
 * Formats a number with thousand separators
 * @param num - Number to format
 * @returns Formatted number string
 */
export const formatNumber = (num: number | null | undefined): string => {
  if (num == null || num === undefined) return "-";
  return new Intl.NumberFormat("tr-TR").format(num);
};
