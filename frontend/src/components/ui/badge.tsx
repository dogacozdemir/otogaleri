import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "badge-glow inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-primary/30 shadow-sm hover:shadow-md",
        destructive: "bg-destructive/90 text-destructive-foreground border-destructive/40 shadow-sm hover:shadow-md",
        outline: "border border-input bg-background hover:bg-accent hover:border-primary/30",
        secondary: "bg-secondary text-secondary-foreground border-secondary/30 shadow-sm hover:shadow-md",
        success: "bg-success/20 text-success border-success/40 dark:bg-success/10 dark:text-success shadow-sm hover:shadow-md hover:bg-success/25",
        warning: "bg-warning/20 text-warning border-warning/40 dark:bg-warning/10 dark:text-warning shadow-sm hover:shadow-md hover:bg-warning/25",
        info: "bg-info/20 text-info border-info/40 dark:bg-info/10 dark:text-info shadow-sm hover:shadow-md hover:bg-info/25",
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
