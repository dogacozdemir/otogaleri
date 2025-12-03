import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}

/**
 * Standardized page header component for consistent visual hierarchy
 * Ensures consistent spacing, typography, and icon usage across all pages
 */
export const PageHeader = ({
  title,
  description,
  icon: Icon,
  action,
  className = "",
}: PageHeaderProps) => {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6",
      className
    )}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className="text-h1">{title}</h1>
          {description && (
            <p className="text-small text-muted-foreground mt-2 max-w-2xl">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
};
