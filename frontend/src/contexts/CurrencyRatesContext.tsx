import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface CurrencyRate {
  from: string;
  to: string;
  rate: number;
}

interface CurrencyRatesContextType {
  customRates: Record<string, number>; // Key: "USD-TRY", Value: rate
  setCustomRate: (from: string, to: string, rate: number | null) => void;
  getCustomRate: (from: string, to: string) => number | null;
  clearCustomRate: (from: string, to: string) => void;
  clearAllCustomRates: () => void;
}

const CurrencyRatesContext = createContext<CurrencyRatesContextType | undefined>(undefined);

const STORAGE_KEY = "custom_currency_rates";

export function CurrencyRatesProvider({ children }: { children: ReactNode }) {
  const [customRates, setCustomRatesState] = useState<Record<string, number>>({});

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCustomRatesState(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load custom rates from localStorage:", error);
    }
  }, []);

  // Save to localStorage whenever customRates changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customRates));
    } catch (error) {
      console.error("Failed to save custom rates to localStorage:", error);
    }
  }, [customRates]);

  const getRateKey = (from: string, to: string): string => {
    return `${from}-${to}`;
  };

  const setCustomRate = (from: string, to: string, rate: number | null) => {
    setCustomRatesState((prev) => {
      const key = getRateKey(from, to);
      const newRates = { ...prev };
      if (rate === null) {
        delete newRates[key];
      } else {
        newRates[key] = rate;
      }
      return newRates;
    });
  };

  const getCustomRate = (from: string, to: string): number | null => {
    const key = getRateKey(from, to);
    return customRates[key] ?? null;
  };

  const clearCustomRate = (from: string, to: string) => {
    setCustomRate(from, to, null);
  };

  const clearAllCustomRates = () => {
    setCustomRatesState({});
  };

  return (
    <CurrencyRatesContext.Provider
      value={{
        customRates,
        setCustomRate,
        getCustomRate,
        clearCustomRate,
        clearAllCustomRates,
      }}
    >
      {children}
    </CurrencyRatesContext.Provider>
  );
}

export function useCurrencyRates() {
  const context = useContext(CurrencyRatesContext);
  if (context === undefined) {
    throw new Error("useCurrencyRates must be used within a CurrencyRatesProvider");
  }
  return context;
}

