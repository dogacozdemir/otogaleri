/**
 * Type definitions for Dashboard data structures
 */

export interface DashboardStats {
  totalVehicles: number;
  unsoldVehicles: number;
  totalSales: number;
  totalProfit: number;
  totalBranches?: number;
  activeInstallmentCount?: number;
}

export interface Followup {
  id: number;
  customer_id: number;
  customer_name?: string;
  customer_name_full?: string;
  followup_type: "call" | "sms" | "email" | string;
  followup_time?: string;
  maker?: string;
  model?: string;
}

export interface ExpiringDocument {
  id: number;
  document_name: string;
  document_type: string;
  expiry_date: string;
  days_until_expiry: number;
  source: "vehicle" | "customer";
  vehicle_id?: number | null;
  customer_id?: number | null;
  maker?: string | null;
  model?: string | null;
  production_year?: number | null;
  customer_name?: string | null;
}
