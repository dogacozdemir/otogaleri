import DineroFactory = require("dinero.js");
import { SupportedCurrency } from "./currencyService";

/**
 * MoneyService - Provides type-safe, precise financial calculations using dinero.js
 * 
 * All monetary values should be handled through this service to avoid floating-point errors.
 * 
 * Usage:
 *   const amount = MoneyService.fromAmount(100.50, 'USD');
 *   const total = amount.multiply(1.5);
 *   const result = total.getAmount(); // Returns number with proper precision
 */

// Dinero.js currency codes mapping (cast to Currency type)
const DINERO_CURRENCY_MAP: Record<SupportedCurrency, DineroFactory.Currency> = {
  TRY: "TRY" as DineroFactory.Currency,
  USD: "USD" as DineroFactory.Currency,
  EUR: "EUR" as DineroFactory.Currency,
  GBP: "GBP" as DineroFactory.Currency,
  JPY: "JPY" as DineroFactory.Currency,
};

/**
 * Convert a number amount to Dinero object
 * @param amount - The monetary amount (e.g., 100.50 for $100.50)
 * @param currency - The currency code
 * @returns Dinero object for safe calculations
 */
export function fromAmount(amount: number | string, currency: SupportedCurrency = "TRY"): DineroFactory.Dinero {
  // Convert to number if string
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  
  // Handle NaN and null/undefined
  if (isNaN(numAmount) || numAmount === null || numAmount === undefined) {
    return DineroFactory({ amount: 0, currency: DINERO_CURRENCY_MAP[currency] });
  }

  // Dinero.js uses integer amounts (cents), so multiply by 100 for decimal currencies
  // JPY doesn't use decimals, others do
  const multiplier = currency === "JPY" ? 1 : 100;
  const integerAmount = Math.round(numAmount * multiplier);

  return DineroFactory({
    amount: integerAmount,
    currency: DINERO_CURRENCY_MAP[currency],
  });
}

/**
 * Convert a Dinero object back to a number amount
 * @param dinero - The Dinero object
 * @returns The monetary amount as a number
 */
export function toAmount(dinero: DineroFactory.Dinero): number {
  const currency = dinero.getCurrency() as SupportedCurrency;
  const multiplier = currency === "JPY" ? 1 : 100;
  return dinero.getAmount() / multiplier;
}

/**
 * Add two monetary amounts (returns new Dinero object)
 */
export function add(
  amount1: number | string,
  amount2: number | string,
  currency: SupportedCurrency = "TRY"
): number {
  const d1 = fromAmount(amount1, currency);
  const d2 = fromAmount(amount2, currency);
  return toAmount(d1.add(d2));
}

/**
 * Subtract two monetary amounts (returns new Dinero object)
 */
export function subtract(
  amount1: number | string,
  amount2: number | string,
  currency: SupportedCurrency = "TRY"
): number {
  const d1 = fromAmount(amount1, currency);
  const d2 = fromAmount(amount2, currency);
  return toAmount(d1.subtract(d2));
}

/**
 * Multiply a monetary amount by a factor
 */
export function multiply(
  amount: number | string,
  factor: number,
  currency: SupportedCurrency = "TRY"
): number {
  const d = fromAmount(amount, currency);
  return toAmount(d.multiply(factor));
}

/**
 * Divide a monetary amount by a divisor
 */
export function divide(
  amount: number | string,
  divisor: number,
  currency: SupportedCurrency = "TRY"
): number {
  const d = fromAmount(amount, currency);
  return toAmount(d.divide(divisor));
}

/**
 * Convert amount from one currency to another using an exchange rate
 * @param amount - The amount to convert
 * @param fromCurrency - Source currency
 * @param toCurrency - Target currency
 * @param rate - Exchange rate (fromCurrency -> toCurrency)
 * @returns Converted amount in target currency
 */
export function convertCurrency(
  amount: number | string,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency,
  rate: number
): number {
  if (fromCurrency === toCurrency) {
    return typeof amount === "string" ? parseFloat(amount) : amount;
  }

  const d = fromAmount(amount, fromCurrency);
  const converted = d.multiply(rate);
  
  // Convert to target currency Dinero object
  const targetDinero = DineroFactory({
    amount: converted.getAmount(),
    currency: DINERO_CURRENCY_MAP[toCurrency],
  });

  return toAmount(targetDinero);
}

/**
 * Calculate percentage of an amount
 */
export function percentage(
  amount: number | string,
  percent: number,
  currency: SupportedCurrency = "TRY"
): number {
  const d = fromAmount(amount, currency);
  // Convert percentage to factor (e.g., 15% -> 0.15)
  const factor = percent / 100;
  return toAmount(d.multiply(factor));
}

/**
 * Compare two amounts
 * @returns -1 if amount1 < amount2, 0 if equal, 1 if amount1 > amount2
 */
export function compare(
  amount1: number | string,
  amount2: number | string,
  currency: SupportedCurrency = "TRY"
): number {
  const d1 = fromAmount(amount1, currency);
  const d2 = fromAmount(amount2, currency);
  // Dinero.js uses compareTo method
  return (d1 as any).compareTo(d2);
}

/**
 * Check if amount is zero
 */
export function isZero(amount: number | string, currency: SupportedCurrency = "TRY"): boolean {
  const d = fromAmount(amount, currency);
  return d.isZero();
}

/**
 * Check if amount is positive
 */
export function isPositive(amount: number | string, currency: SupportedCurrency = "TRY"): boolean {
  const d = fromAmount(amount, currency);
  return d.isPositive();
}

/**
 * Check if amount is negative
 */
export function isNegative(amount: number | string, currency: SupportedCurrency = "TRY"): boolean {
  const d = fromAmount(amount, currency);
  return d.isNegative();
}

/**
 * Sum an array of amounts
 */
export function sum(
  amounts: (number | string)[],
  currency: SupportedCurrency = "TRY"
): number {
  if (amounts.length === 0) return 0;
  
  let total = fromAmount(0, currency);
  for (const amount of amounts) {
    total = total.add(fromAmount(amount, currency));
  }
  
  return toAmount(total);
}

/**
 * Get the absolute value of an amount
 */
export function absolute(amount: number | string, currency: SupportedCurrency = "TRY"): number {
  const d = fromAmount(amount, currency);
  // Use getAmount() and convert back, or use absolute() if available
  const absAmount = d.isNegative() ? d.multiply(-1) : d;
  return toAmount(absAmount);
}

/**
 * Format amount for display (with currency symbol)
 */
export function format(
  amount: number | string,
  currency: SupportedCurrency = "TRY",
  locale: string = "tr-TR"
): string {
  const d = fromAmount(amount, currency);
  // Set locale first, then format
  d.setLocale(locale);
  return d.toFormat("$0,0.00");
}

/**
 * MoneyService - Main export with all utility functions
 */
export const MoneyService = {
  fromAmount,
  toAmount,
  add,
  subtract,
  multiply,
  divide,
  convertCurrency,
  percentage,
  compare,
  isZero,
  isPositive,
  isNegative,
  sum,
  absolute,
  format,
};


