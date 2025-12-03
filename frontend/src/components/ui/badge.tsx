import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-primary/20 shadow-sm",
        destructive: "bg-destructive text-destructive-foreground border-destructive/20 shadow-sm",
        outline: "border border-input bg-background hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground border-secondary/20 shadow-sm",
        success: "bg-success/20 text-success border-success/30 dark:bg-success/10 dark:text-success",
        warning: "bg-warning/20 text-warning border-warning/30 dark:bg-warning/10 dark:text-warning",
        info: "bg-info/20 text-info border-info/30 dark:bg-info/10 dark:text-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
