import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { useTenant } from "@/contexts/TenantContext";

interface ChartWrapperProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  emptyMessage?: string;
  hasData: boolean;
  actionButton?: ReactNode;
}

/**
 * Standardized wrapper for charts with consistent styling
 * Uses theme colors and provides empty state handling
 */
export const ChartWrapper = ({
  title,
  description,
  children,
  className = "",
  emptyMessage = "Veri bulunamadı",
  hasData,
  actionButton,
}: ChartWrapperProps) => {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex-1">
          <CardTitle>{title}</CardTitle>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actionButton && <div>{actionButton}</div>}
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="w-full min-h-[350px]">{children}</div>
        ) : (
          <div className="flex items-center justify-center h-64 relative overflow-hidden rounded-lg">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            <div className="text-center relative z-10">
              <p className="text-sm text-muted-foreground font-medium">{emptyMessage}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Helper function to format chart tooltip values
 * Note: This is used in chart components, currency comes from tenant context
 */
export const formatChartTooltip = (value: number | string, name: string, currency: string = "TRY", locale: string = "tr-TR") => {
  if (typeof value === "number") {
    return [formatCurrency(value, currency, locale), name];
  }
  return [value, name];
};

/**
 * Chart color palette using theme CSS variables
 */
export const chartColors = {
  primary: "hsl(var(--chart-1))",
  success: "hsl(var(--chart-2))",
  warning: "hsl(var(--chart-3))",
  error: "hsl(var(--chart-4))",
  accent: "hsl(var(--chart-5))",
};
