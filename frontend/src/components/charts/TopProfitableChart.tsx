import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartWrapper, formatChartTooltip, chartColors } from "./ChartWrapper";
import { TopProfitable } from "@/types/analytics";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useTenant } from "@/contexts/TenantContext";

interface TopProfitableChartProps {
  data: TopProfitable[];
  onViewDetails?: () => void;
}

/**
 * Bar chart component for top profitable vehicles visualization
 */
export const TopProfitableChart = ({ data, onViewDetails }: TopProfitableChartProps) => {
  const { tenant } = useTenant();
  const currency = tenant?.default_currency || "TRY";
  const locale = tenant?.language === "en" ? "en-US" : "tr-TR";
  const currencySymbol = currency === "TRY" ? "₺" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "£";
  
  const chartData = data.slice(0, 10).map((item) => ({
    name: `${item.maker || ""} ${item.model || ""} ${item.year || ""}`.trim() || "Bilinmeyen",
    kar: item.profit || item.profit_base || 0,
    "Satış Fiyatı": item.sale_price || 0,
  }));

  return (
    <ChartWrapper
      title="En Karlı Araçlar"
      description="En yüksek kar getiren araçlar"
      hasData={data.length > 0}
      actionButton={
        onViewDetails && (
          <Button variant="outline" size="sm" onClick={onViewDetails}>
            <Eye className="w-4 h-4 mr-2" />
            Detayları Gör
          </Button>
        )
      }
    >
      <ResponsiveContainer width="100%" height={350} minHeight={350} initialDimension={{ width: 100, height: 200 }}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 150, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            type="number"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M${currencySymbol}`;
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K${currencySymbol}`;
              return `${value}${currencySymbol}`;
            }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            width={140}
          />
          <Tooltip
            formatter={(value: number, name: string) => formatChartTooltip(value, name, currency, locale)}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Bar
            dataKey="kar"
            name="Kar"
            fill={chartColors.success}
            radius={[0, 8, 8, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};
