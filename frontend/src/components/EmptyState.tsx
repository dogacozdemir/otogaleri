import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Enhanced Empty state component for displaying when no data is available
 * Modern, engaging and actionable design
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className = "",
  size = "md",
}: EmptyStateProps) => {
  const sizeClasses = {
    sm: "py-8",
    md: "py-12",
    lg: "py-16",
  };

  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const ActionIcon = action?.icon;

  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className={cn("text-center", sizeClasses[size])}>
        {Icon && (
          <div className="mb-4 flex justify-center">
            <div className={cn(
              "rounded-full bg-muted/50 p-4 transition-all duration-300",
              iconSizes[size]
            )}>
              <Icon className={cn(
                "text-muted-foreground transition-colors duration-300",
                iconSizes[size]
              )} />
            </div>
          </div>
        )}
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
        )}
        {action && (
          <Button 
            onClick={action.onClick} 
            variant="outline"
            className="gap-2"
          >
            {ActionIcon && <ActionIcon className="w-4 h-4" />}
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
