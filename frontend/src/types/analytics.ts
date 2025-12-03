/**
 * Type definitions for Analytics data structures
 */

export interface BrandProfit {
  brand: string | null;
  vehicle_count: number;
  sold_count: number;
  total_profit: number | null;
}

export interface TopProfitable {
  id: number;
  maker: string | null;
  model: string | null;
  year: number | null;
  sale_price: number | null;
  profit: number | null;
  profit_base?: number | null;
  sale_date: string | null;
}

export interface SalesDuration {
  brand: string | null;
  model: string | null;
  avg_days_to_sell: number | null;
  total_sales: number;
}

export interface AnalyticsData {
  brandProfit: BrandProfit[];
  topProfitable: TopProfitable[];
  salesDuration: SalesDuration[];
}
