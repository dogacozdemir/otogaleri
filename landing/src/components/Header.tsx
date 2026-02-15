import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LaunchBanner } from "./LaunchBanner";

const navLinks = [
  { href: "#ozellikler", label: "Özellikler" },
  { href: "#mimari", label: "Teknik Güvenlik" },
  { href: "#faydalar", label: "Lokal Faydalar" },
  { href: "#demo", label: "Demo" },
  { href: "#fiyat", label: "Fiyat" },
  { href: "#referanslar", label: "Referanslar" },
  { href: "#sss", label: "SSS" },
  { href: "#footer", label: "İletişim" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <LaunchBanner />
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="#" className="text-xl font-bold text-slate-900 dark:text-slate-50">
          Akıllı Galeri
        </a>
        <nav className="hidden sm:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors min-h-[44px] flex items-center"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="sm:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Menüyü aç"
          >
            <Menu className="w-6 h-6" />
          </button>
          <a
            href="https://app.akilligaleri.com/register"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "rounded-xl px-4 py-2.5 min-h-[44px] flex items-center text-sm font-semibold",
              "bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            )}
          >
            Hemen Başla
          </a>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 sm:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Menüyü kapat"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[85vw] sm:hidden bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl flex flex-col pt-[env(safe-area-inset-top)]"
            >
              <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800">
                <span className="text-lg font-bold text-slate-900 dark:text-slate-50">Menü</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Menüyü kapat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex flex-col p-4 gap-1 overflow-y-auto">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="min-h-[44px] flex items-center px-4 rounded-xl text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
                <a
                  href="https://app.akilligaleri.com/register"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] flex items-center px-4 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors mt-4"
                >
                  Hemen Başla
                </a>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
