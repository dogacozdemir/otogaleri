import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize CC (motor hacmi) input: "1.500" veya "1,500" -> "1500"
 * Nokta ve virgülleri binlik ayracı olarak kabul edip kaldırır.
 */
export function normalizeCCInput(value: string): string {
  if (!value || typeof value !== "string") return "";
  const cleaned = value.trim().replace(/[.,\s]/g, "");
  return cleaned === "" ? "" : cleaned.replace(/^0+/, "") || "0";
}

/**
 * Parse CC string to number: "1.500" veya "1,500" -> 1500
 */
export function parseCC(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isNaN(value) ? null : Math.round(value);
  const cleaned = String(value).trim().replace(/[.,\s]/g, "");
  if (!cleaned) return null;
  const num = parseInt(cleaned, 10);
  return Number.isNaN(num) ? null : num;
}

/**
 * Get the base API URL (without /api suffix) for static file serving
 * Used for images, documents, etc.
 */
export function getApiBaseUrl(): string {
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5005/api";
  // Remove /api suffix if present
  return apiBase.replace(/\/api$/, '');
}
