import { useState, useEffect, useCallback } from "react";
import { api } from "@/api";
import { formatCurrency } from "@/lib/formatters";
import { useViewCurrency } from "@/contexts/ViewCurrencyContext";
import { useTenant } from "@/contexts/TenantContext";

/**
 * Hook for real-time currency conversion on Vehicles page.
 * Fetches rate from base to viewCurrency when they differ.
 */
export function useViewCurrencyConversion() {
  const { viewCurrency, baseCurrency } = useViewCurrency();
  const { tenant } = useTenant();
  const locale = tenant?.language === "en" ? "en-US" : "tr-TR";
  const [rate, setRate] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (viewCurrency === baseCurrency) {
      setRate(1);
      return;
    }
    setLoading(true);
    api
      .get("/currency/rate", { params: { from: baseCurrency, to: viewCurrency } })
      .then((res) => {
        if (res.data?.rate) {
          setRate(Number(res.data.rate));
        }
      })
      .catch(() => setRate(1))
      .finally(() => setLoading(false));
  }, [viewCurrency, baseCurrency]);

  const formatInViewCurrency = useCallback(
    (amount: number | null | undefined): string => {
      if (amount == null) return "-";
      if (!Number.isFinite(amount)) return "-";
      const effectiveRate = Number.isFinite(rate) ? rate : 1;
      const converted = amount * effectiveRate;
      if (!Number.isFinite(converted)) return formatCurrency(0, viewCurrency, locale);
      return formatCurrency(converted, viewCurrency, locale);
    },
    [rate, viewCurrency, locale]
  );

  const convertAmount = useCallback(
    (amount: number | null | undefined): number => {
      if (amount == null) return 0;
      if (!Number.isFinite(amount)) return 0;
      const effectiveRate = Number.isFinite(rate) ? rate : 1;
      const result = amount * effectiveRate;
      return Number.isFinite(result) ? result : 0;
    },
    [rate]
  );

  return {
    formatInViewCurrency,
    convertAmount,
    rate,
    loading,
    viewCurrency,
    baseCurrency,
  };
}
