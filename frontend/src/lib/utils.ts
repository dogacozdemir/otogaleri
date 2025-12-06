import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
