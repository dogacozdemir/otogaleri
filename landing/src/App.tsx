import { motion } from "framer-motion";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { ArchitecturalHighlights } from "@/components/ArchitecturalHighlights";
import { BenefitsTable } from "@/components/BenefitsTable";
import { DashboardPreview } from "@/components/DashboardPreview";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";
import { Testimonial } from "@/components/Testimonial";
import { Footer } from "@/components/Footer";

function App() {
  return (
    <div className="min-h-screen bg-slate-950">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="#" className="text-xl font-bold text-slate-50">
            AkıllıGaleri
          </a>
          <nav className="hidden sm:flex items-center gap-6">
            <a
              href="#ozellikler"
              className="text-sm text-slate-400 hover:text-primary-400 transition-colors"
            >
              Özellikler
            </a>
            <a
              href="#mimari"
              className="text-sm text-slate-400 hover:text-primary-400 transition-colors"
            >
              Teknik Güvenlik
            </a>
            <a
              href="#faydalar"
              className="text-sm text-slate-400 hover:text-primary-400 transition-colors"
            >
              Lokal Faydalar
            </a>
            <a
              href="#demo"
              className="text-sm text-slate-400 hover:text-primary-400 transition-colors"
            >
              Demo
            </a>
            <a
              href="#fiyat"
              className="text-sm text-slate-400 hover:text-primary-400 transition-colors"
            >
              Fiyat
            </a>
            <a
              href="#sss"
              className="text-sm text-slate-400 hover:text-primary-400 transition-colors"
            >
              SSS
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <a
              href="#cta"
              className="rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
            >
              Ücretsiz Demoyu Başlat
            </a>
            <a
              href="https://app.akilligaleri.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-slate-300 hover:text-primary-400 transition-colors"
            >
              Uygulamaya Git
            </a>
          </div>
        </div>
      </header>

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
                href="#cta"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-3.5 font-semibold text-white hover:bg-primary-600 transition-colors"
              >
                Ücretsiz Demoyu Başlat
              </a>
              <a
                href="https://akilligaleri.com"
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
