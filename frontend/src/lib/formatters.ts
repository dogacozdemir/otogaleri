/**
 * Centralized formatting utilities for the application
 * Used across multiple components for consistency
 */

/**
 * Formats a number as currency
 * @param amount - The amount to format (can be number, string, null, or undefined)
 * @param currency - Currency code (default: "TRY")
 * @param locale - Locale string (default: "tr-TR")
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
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(num);
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
