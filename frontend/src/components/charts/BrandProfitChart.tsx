import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartWrapper, formatChartTooltip, chartColors } from "./ChartWrapper";
import { BrandProfit } from "@/types/analytics";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface BrandProfitChartProps {
  data: BrandProfit[];
  onViewDetails?: () => void;
}

/**
 * Bar chart component for brand profit visualization
 */
export const BrandProfitChart = ({ data, onViewDetails }: BrandProfitChartProps) => {
  const chartData = data.map((item) => ({
    brand: item.brand || "Bilinmeyen",
    kar: item.total_profit || 0,
    "Araç Sayısı": item.vehicle_count,
    "Satılan": item.sold_count,
  }));

  return (
    <ChartWrapper
      title="Marka Bazlı Kar Analizi"
      description="Markalara göre toplam kar ve satış istatistikleri"
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
      <ResponsiveContainer width="100%" height={350} minHeight={350}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="brand"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M₺`;
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K₺`;
              return `${value}₺`;
            }}
          />
          <Tooltip
            formatter={(value: number, name: string) => formatChartTooltip(value, name)}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Legend />
          <Bar
            dataKey="kar"
            name="Toplam Kar"
            fill={chartColors.primary}
            radius={[8, 8, 0, 0]}
          />
          <Bar
            dataKey="Araç Sayısı"
            name="Toplam Araç"
            fill={chartColors.success}
            radius={[8, 8, 0, 0]}
          />
          <Bar
            dataKey="Satılan"
            name="Satılan Araç"
            fill={chartColors.accent}
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};
