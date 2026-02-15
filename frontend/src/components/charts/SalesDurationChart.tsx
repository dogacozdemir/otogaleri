import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartWrapper, formatChartTooltip } from "./ChartWrapper";
import { SalesDuration } from "@/types/analytics";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { chartColors } from "./ChartWrapper";

interface SalesDurationChartProps {
  data: SalesDuration[];
  onViewDetails?: () => void;
}

/**
 * Line chart component for sales duration visualization
 */
export const SalesDurationChart = ({ data, onViewDetails }: SalesDurationChartProps) => {
  // Group by brand and calculate average days
  const chartData = data.reduce((acc, item) => {
    const brand = item.brand || "Bilinmeyen";
    const existing = acc.find((d) => d.marka === brand);
    if (existing) {
      existing["Ortalama Gün"] =
        (existing["Ortalama Gün"] * existing["Toplam Satış"] + (item.avg_days_to_sell || 0) * item.total_sales) /
        (existing["Toplam Satış"] + item.total_sales);
      existing["Toplam Satış"] += item.total_sales;
    } else {
      acc.push({
        marka: brand,
        "Ortalama Gün": item.avg_days_to_sell || 0,
        "Toplam Satış": item.total_sales,
      });
    }
    return acc;
  }, [] as Array<{ marka: string; "Ortalama Gün": number; "Toplam Satış": number }>);

  return (
    <ChartWrapper
      title="Satış Süresi Analizi"
      description="Markalara göre ortalama satış süresi ve toplam satış sayısı"
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
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="marka"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            label={{ value: "Gün", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === "Ortalama Gün") {
                return [`${Math.round(value)} gün`, name];
              }
              return [value, name];
            }}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="Ortalama Gün"
            name="Ortalama Satış Süresi (Gün)"
            stroke={chartColors.primary}
            strokeWidth={2}
            dot={{ fill: chartColors.primary, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="Toplam Satış"
            name="Toplam Satış Sayısı"
            stroke={chartColors.success}
            strokeWidth={2}
            dot={{ fill: chartColors.success, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};
