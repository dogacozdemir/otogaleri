import { useEffect, useState, useRef } from "react";

interface UseCountUpOptions {
  duration?: number;
  decimals?: number;
}

/**
 * Hook for animating numbers with count-up effect
 * Perfect for KPI cards and statistics
 */
export const useCountUp = (
  end: number,
  options: UseCountUpOptions = {}
): number => {
  const { duration = 1000, decimals = 0 } = options;
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) {
      setCount(end);
      return;
    }

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = end * easeOut;

      setCount(parseFloat(current.toFixed(decimals)));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        hasAnimated.current = true;
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration, decimals]);

  return count;
};
