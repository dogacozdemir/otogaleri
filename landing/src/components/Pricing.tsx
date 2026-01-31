import { motion } from "framer-motion";
import {
  Building2,
  Coins,
  FileSignature,
  Headphones,
  Check,
  Shield,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const includedFeatures = [
  { label: "Sınırsız Şube", icon: Building2 },
  { label: "£, $, €, ₺ Yönetimi", icon: Coins },
  { label: "Senetli Satış Takibi", icon: FileSignature },
  { label: "Teknik Destek", icon: Headphones },
  { label: "Güvenli & Yedekli", icon: Shield },
  { label: "Raporlar & Analiz", icon: BarChart3 },
];

export function Pricing() {
  return (
    <section id="fiyat" className="relative py-24 px-4 bg-slate-900/30">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-50 mb-4">
            Fiyatlandırma
          </h2>
          <p className="text-slate-400 text-lg">
            Şeffaf ve sabit fiyat. Gizli ücret yok.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={cn(
            "relative rounded-2xl overflow-hidden",
            "bg-slate-800/40 backdrop-blur-xl border border-slate-600/50",
            "shadow-xl shadow-black/30 ring-2 ring-primary-500/20",
            "p-8 sm:p-12"
          )}
        >
          <h3 className="text-center text-lg font-semibold text-slate-300 mb-8">
            Sektöre Özel Tek Paket, Tam Güç
          </h3>

          <div className="flex flex-col items-center mb-6">
            <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-4 py-1.5 text-sm font-bold text-emerald-400 ring-1 ring-emerald-400/30 mb-4">
              İLK AY ÜCRETSİZ
            </span>
            <div className="text-4xl sm:text-5xl font-bold text-slate-50 tracking-tight">
              4.999 ₺ <span className="text-xl font-normal text-slate-400">/ ay</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">
              Ücretsiz kurulum
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-10">
            {includedFeatures.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-lg bg-slate-700/30 px-3 py-2.5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/20 text-primary-400">
                  <item.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-slate-200">{item.label}</span>
                <Check className="h-4 w-4 shrink-0 text-emerald-400 ml-auto" />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="mailto:info@akilligaleri.com?subject=Fiyatlandırma"
              className="inline-flex items-center justify-center rounded-xl bg-primary-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-primary-500/25 hover:bg-primary-600 transition-colors"
            >
              İletişime Geçin
            </a>
            <a
              href="#cta"
              className="inline-flex items-center justify-center rounded-xl border-2 border-slate-500 bg-transparent px-6 py-3.5 font-semibold text-slate-200 hover:bg-slate-800/50 transition-colors"
            >
              Demoyu Başlat
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
