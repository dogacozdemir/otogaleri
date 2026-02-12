import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { ArchitecturalHighlights } from "@/components/ArchitecturalHighlights";
import { BenefitsTable } from "@/components/BenefitsTable";
import { DashboardPreview } from "@/components/DashboardPreview";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";
import { Testimonial } from "@/components/Testimonial";
import { Footer } from "@/components/Footer";

const navLinks = [
  { href: "#ozellikler", label: "Özellikler" },
  { href: "#mimari", label: "Teknik Güvenlik" },
  { href: "#faydalar", label: "Lokal Faydalar" },
  { href: "#demo", label: "Demo" },
  { href: "#fiyat", label: "Fiyat" },
  { href: "#sss", label: "SSS" },
];

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="#" className="text-xl font-bold text-slate-50">
            AkıllıGaleri
          </a>
          <nav className="hidden sm:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-slate-400 hover:text-primary-400 transition-colors min-h-[44px] flex items-center"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="sm:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Menüyü aç"
            >
              <Menu className="w-6 h-6" />
            </button>
            <a
              href="https://app.akilligaleri.com/login"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-primary-500 px-4 py-2.5 min-h-[44px] flex items-center text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
            >
              Ücretsiz Demoyu Başlat
            </a>
            <a
              href="https://app.akilligaleri.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex text-sm font-medium text-slate-300 hover:text-primary-400 transition-colors min-h-[44px] items-center"
            >
              Uygulamaya Git
            </a>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay and panel */}
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
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[85vw] sm:hidden bg-slate-900 border-l border-slate-800 shadow-xl flex flex-col pt-[env(safe-area-inset-top)]"
            >
              <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
                <span className="text-lg font-bold text-slate-50">Menü</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
                    className="min-h-[44px] flex items-center px-4 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
                <a
                  href="https://app.akilligaleri.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] flex items-center px-4 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors mt-4"
                >
                  Uygulamaya Git
                </a>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="pt-16">
        <Hero />
        <Features />
        <DashboardPreview />
        <ArchitecturalHighlights />
        <BenefitsTable />
        <Pricing />
        <Testimonial />
        <FAQ />

        <section id="cta" className="py-24 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center rounded-2xl border border-slate-700 bg-gradient-to-br from-primary-950/50 to-slate-900 p-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-50 mb-4">
              Galerinizde dijital dönüşümü başlatın
            </h2>
            <p className="text-slate-400 mb-8">
              Çok para birimi ile ticaret ve takip • Senetli satış • Gümrükleme süreçleri • Verileriniz adada güvende.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="https://app.akilligaleri.com/register"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-3.5 font-semibold text-white hover:bg-primary-600 transition-colors"
              >
                Ücretsiz Demoyu Başlat
              </a>
              <a
                href="https://app.akilligaleri.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800/50 px-6 py-3.5 font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
              >
                akilligaleri.com&apos;u İnceleyin
              </a>
            </div>
          </motion.div>
        </section>

        <Footer />
      </main>
    </div>
  );
}

export default App;
