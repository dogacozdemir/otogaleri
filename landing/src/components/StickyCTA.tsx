import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const HERO_HEIGHT_OFFSET = 400;

export function StickyCTA() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsVisible(scrollY > HERO_HEIGHT_OFFSET);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        >
          <a
            href="https://app.akilligaleri.com/register"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-xl bg-indigo-600 py-3.5 text-center font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 transition-colors"
          >
            Hemen Başla
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
