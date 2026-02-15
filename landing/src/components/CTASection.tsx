import { motion } from "framer-motion";

export function CTASection() {
  return (
    <section id="cta" className="py-24 px-4 bg-slate-100 dark:bg-slate-900/50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto text-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-12 shadow-xl"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 mb-4">
          Galerinizde dijital dönüşümü başlatın
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Çok para birimi ile ticaret ve takip • Senetli satış • Gümrükleme süreçleri • Verileriniz adada güvende.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="https://app.akilligaleri.com/register"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Ücretsiz Demoyu Başlat
          </a>
          <a
            href="https://app.akilligaleri.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-transparent px-6 py-3.5 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Uygulamayı İnceleyin
          </a>
        </div>
      </motion.div>
    </section>
  );
}
