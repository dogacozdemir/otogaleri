import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useTenant } from "./TenantContext";

type SupportedViewCurrency = "TRY" | "USD" | "EUR" | "GBP" | "JPY";

interface ViewCurrencyContextType {
  viewCurrency: SupportedViewCurrency;
  setViewCurrency: (currency: SupportedViewCurrency) => void;
  baseCurrency: SupportedViewCurrency;
}

const ViewCurrencyContext = createContext<ViewCurrencyContextType | undefined>(undefined);

export const useViewCurrency = () => {
  const context = useContext(ViewCurrencyContext);
  if (context === undefined) {
    throw new Error("useViewCurrency must be used within ViewCurrencyProvider");
  }
  return context;
};

interface ViewCurrencyProviderProps {
  children: React.ReactNode;
}

export const ViewCurrencyProvider: React.FC<ViewCurrencyProviderProps> = ({ children }) => {
  const { tenant } = useTenant();
  const baseCurrency = (tenant?.default_currency || "TRY") as SupportedViewCurrency;
  const [viewCurrency, setViewCurrencyState] = useState<SupportedViewCurrency>(baseCurrency);

  useEffect(() => {
    setViewCurrencyState(baseCurrency);
  }, [baseCurrency]);

  const setViewCurrency = useCallback((currency: SupportedViewCurrency) => {
    setViewCurrencyState(currency);
  }, []);

  const value = {
    viewCurrency,
    setViewCurrency,
    baseCurrency,
  };

  return (
    <ViewCurrencyContext.Provider value={value}>
      {children}
    </ViewCurrencyContext.Provider>
  );
};
