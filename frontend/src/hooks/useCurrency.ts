import { useTenant } from "@/contexts/TenantContext";
import { formatCurrency as baseFormatCurrency, formatCurrencyWithCurrency as baseFormatCurrencyWithCurrency } from "@/lib/formatters";

/**
 * Hook to format currency using tenant's default currency
 */
export const useCurrency = () => {
  const { tenant } = useTenant();
  const currency = tenant?.default_currency || "TRY";
  const locale = tenant?.language === "en" ? "en-US" : "tr-TR";

  const formatCurrency = (amount: number | null | undefined | string): string => {
    return baseFormatCurrency(amount, currency, locale);
  };

  /**
   * Formats currency with record's own currency, falling back to tenant's base currency
   * This is used for multi-currency support where each record has its own currency
   */
  const formatCurrencyWithCurrency = (
    amount: number | null | undefined | string,
    recordCurrency: string | null | undefined
  ): string => {
    return baseFormatCurrencyWithCurrency(amount, recordCurrency, locale, currency);
  };

  return {
    formatCurrency,
    formatCurrencyWithCurrency,
    currency,
    locale,
  };
};
