import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const includedFeatures = [
  "Sınırsız araç stoku",
  "Müşteri yönetimi",
  "Tek tıkla ilan aktarımı",
  "Mobil uygulama erişimi",
  "Raporlar & analiz",
  "Teknik destek",
];

export function Pricing() {
  const [isYearly, setIsYearly] = useState(true);

  return (
    <section
      id="fiyat"
      className="relative py-24 px-4 bg-slate-100 dark:bg-slate-900/50"
    >
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-4">
            Şeffaf Fiyatlandırma
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg mb-8">
            Tek plan. Tüm özellikler dahil. Gizli ücret yok.
          </p>

          <div className="flex items-center justify-center gap-4 mb-10">
            <span
              className={cn(
                "text-sm font-medium transition-colors",
                !isYearly ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"
              )}
            >
              Aylık
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isYearly}
              onClick={() => setIsYearly(!isYearly)}
              className={cn(
                "relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                isYearly ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"
              )}
            >
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={cn(
                  "pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow ring-0",
                  isYearly ? "translate-x-7" : "translate-x-1"
                )}
              />
            </button>
            <span
              className={cn(
                "text-sm font-medium transition-colors",
                isYearly ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"
              )}
            >
              Yıllık
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={cn(
            "relative rounded-2xl overflow-hidden",
            "bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700",
            "shadow-xl shadow-slate-200/50 dark:shadow-black/30",
            "p-8 sm:p-12"
          )}
        >
          {/* Ribbon - Most Popular / Best Value when Yearly */}
          {isYearly && (
            <div className="absolute top-4 right-[-32px] rotate-45 bg-indigo-600 text-white text-xs font-bold py-1 px-10 shadow-md">
              En İyi Değer
            </div>
          )}

          <div className="text-center mb-8">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-6">
              Professional Plan
            </h3>

            <div className="flex flex-col items-center">
              {isYearly && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-4 py-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30 mb-4">
                  £200 Tasarruf / 2 Ay Bedava
                </span>
              )}
              <motion.div
                key={isYearly ? "yearly" : "monthly"}
                initial={{ opacity: 0.8, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-slate-50 tracking-tight"
              >
                {isYearly ? "£1.000" : "£100"}
                <span className="text-xl font-normal text-slate-500 dark:text-slate-400 ml-1">
                  / {isYearly ? "yıl" : "ay"}
                </span>
              </motion.div>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                {isYearly ? "Aylık £83.33" : "Aylık faturalandırma"}
              </p>
            </div>
          </div>

          {/* Urgency & Trust highlight */}
          <div className="mb-8 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-4 py-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 text-center">
              🎉 Çıkış Özel Teklif: Veri girişlerinizi ücretsiz olarak biz yapıyoruz!
            </p>
          </div>

          <ul className="space-y-3 mb-10">
            {includedFeatures.map((label) => (
              <li
                key={label}
                className="flex items-center gap-3 text-slate-700 dark:text-slate-300"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <Check className="h-4 w-4" aria-hidden />
                </div>
                <span className="text-sm font-medium">{label}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://app.akilligaleri.com/register"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 transition-colors"
            >
              Hemen Başlayın
            </a>
            <a
              href="#ozellikler"
              className="inline-flex items-center justify-center rounded-xl border-2 border-slate-300 dark:border-slate-600 px-6 py-3.5 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Nasıl Çalışır?
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
