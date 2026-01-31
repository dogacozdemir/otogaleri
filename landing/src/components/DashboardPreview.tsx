import { motion } from "framer-motion";
import { Package, CreditCard, Ship, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const kpis = [
  {
    label: "Toplam Stok Değeri",
    value: "£ 1.24M",
    icon: Package,
    highlight: "£",
  },
  {
    label: "Beklenen Taksit Tahsilatı",
    value: "£ 48K",
    sub: "Aylık",
    icon: CreditCard,
    highlight: "£",
  },
  {
    label: "Gümrükleme Aşamasındaki Araçlar",
    value: "12",
    icon: Ship,
    highlight: null,
  },
  {
    label: "Döviz Bazlı Kar/Zarar Analizi",
    value: "£ +18.2K",
    icon: TrendingUp,
    highlight: "£",
  },
];

const barHeights = [65, 85, 45, 70, 55, 90, 60];

export function DashboardPreview() {
  return (
    <section id="demo" className="relative py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-50 mb-4">
            Dashboard Önizleme
          </h2>
          <p className="max-w-2xl mx-auto text-slate-400 text-lg">
            Tüm kurlarla KPI kartları, taksit tahsilatı ve gümrük durumu tek ekranda.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={cn(
            "rounded-2xl border border-slate-700 bg-slate-900/80 p-6 sm:p-8",
            "shadow-2xl shadow-black/30"
          )}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {kpis.map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="rounded-xl border border-slate-700 bg-slate-800/50 p-4"
              >
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                  <kpi.icon className="h-4 w-4" />
                  {kpi.label}
                </div>
                <div className="text-xl font-bold text-slate-100">
                  {kpi.value}
                  {kpi.sub && (
                    <span className="text-slate-500 font-normal text-sm ml-1">
                      {kpi.sub}
                    </span>
                  )}
                </div>
                {kpi.highlight && (
                  <div className="mt-1 text-xs text-amber-400/80 font-medium">
                    Çok para birimi destekli
                  </div>
                )}
              </motion.div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-6">
            <div className="flex items-end justify-between gap-2 h-40">
              {barHeights.map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.05, duration: 0.5 }}
                  className="flex-1 rounded-t bg-gradient-to-t from-primary-600 to-primary-400 min-h-[8px] max-w-[48px] mx-auto"
                />
              ))}
            </div>
            <div className="flex justify-between mt-3 text-xs text-slate-500">
              <span>Pzt</span>
              <span>Sal</span>
              <span>Çar</span>
              <span>Per</span>
              <span>Cum</span>
              <span>Cmt</span>
              <span>Paz</span>
            </div>
          </div>
          <p className="text-center text-slate-500 text-sm mt-6">
            Haftalık tahsilat • Döviz bazlı kar/zarar • Gümrük durumu
          </p>
        </motion.div>
      </div>
    </section>
  );
}
