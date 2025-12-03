import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Skeleton loader component for loading states
 * Optimized for multi-tenant applications with shimmer effect
 */
export const Skeleton = ({ className, ...props }: SkeletonProps) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        className
      )}
      {...props}
    />
  );
};

interface SkeletonLoaderProps {
  type?: "card" | "table" | "chart" | "text" | "list";
  count?: number;
  rows?: number;
  className?: string;
}

/**
 * Pre-configured skeleton loaders for common use cases
 */
export const SkeletonLoader = ({
  type = "card",
  count = 1,
  rows = 5,
  className = "",
}: SkeletonLoaderProps) => {
  if (type === "card") {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg border border-border bg-card p-6 shadow-sm",
              className
            )}
          >
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-48" />
          </div>
        ))}
      </>
    );
  }

  if (type === "table") {
    return (
      <div className={cn("space-y-3", className)}>
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (type === "chart") {
    return (
      <div className={cn("w-full", className)}>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (type === "list") {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return <Skeleton className={cn("h-4 w-full", className)} />;
};
