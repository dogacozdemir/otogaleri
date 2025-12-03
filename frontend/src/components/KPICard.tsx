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
      "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
      className
    )}>
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent transition-all duration-300 pointer-events-none" />
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn(
          "p-2 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors duration-300",
          iconColor
        )}>
          <Icon className={cn("h-4 w-4 transition-transform duration-300 group-hover:scale-110", iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-2xl font-bold tracking-tight transition-colors duration-300">
            {formattedValue}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium mt-2",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              <span>{trend.isPositive ? "↑" : "↓"}</span>
              <span>{trend.value}%</span>
              <span className="text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
