import { useTenant } from "@/contexts/TenantContext";
import { formatCurrency as baseFormatCurrency } from "@/lib/formatters";

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

  return {
    formatCurrency,
    currency,
    locale,
  };
};
