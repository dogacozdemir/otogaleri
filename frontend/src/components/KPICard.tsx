import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  className?: string;
  animate?: boolean;
}

/**
 * Enhanced KPI Card component with count-up animation and hover effects
 */
export const KPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-muted-foreground",
  trend,
  className,
  animate = true,
}: KPICardProps) => {
  const numericValue = typeof value === "number" ? value : parseFloat(value.toString().replace(/[^\d.-]/g, "")) || 0;
  const displayValue = animate && typeof value === "number" 
    ? useCountUp(numericValue, { duration: 1000, decimals: 0 })
    : value;

  const formattedValue = typeof displayValue === "number" 
    ? displayValue.toLocaleString("tr-TR")
    : displayValue;

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-white rounded-xl border border-[#e2e8f0] shadow-md",
      className
    )}>
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#003d82]/0 to-[#003d82]/0 group-hover:from-[#003d82]/5 group-hover:to-transparent transition-all duration-300 pointer-events-none" />
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-[#2d3748]/70">
          {title}
        </CardTitle>
        <div className={cn(
          "p-2 rounded-xl bg-[#f8f9fa] group-hover:bg-[#003d82]/10 transition-colors duration-300",
          iconColor
        )}>
          <Icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-3xl font-bold tracking-tight transition-colors duration-300 text-[#003d82]">
            {formattedValue}
          </div>
          {subtitle && (
            <p className="text-xs text-[#2d3748]/60 mt-1">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium mt-2",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}>
              <span>{trend.isPositive ? "↑" : "↓"}</span>
              <span>{trend.value}%</span>
              <span className="text-[#2d3748]/60">{trend.label}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
