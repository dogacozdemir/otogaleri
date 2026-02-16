/**
 * Safe division utility - returns 0 if denominator is 0 to prevent division errors.
 * Used in profit, ROI, and currency conversion calculations.
 */
export function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0 || denominator == null || !Number.isFinite(denominator)) {
    return 0;
  }
  const num = Number(numerator);
  if (!Number.isFinite(num)) return 0;
  return num / denominator;
}
