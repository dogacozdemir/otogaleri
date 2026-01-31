import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, ArrowRight, Coins, FileSignature, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const rows = [
  {
    ihtiyac: "Çapraz Kur Karmaşası",
    cozum: "Otomatik Parite & Kar Hesaplama",
    iconNeed: Coins,
    iconSolution: CheckCircle,
    colorClass: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
    iconBgClass: "bg-amber-500/20 group-hover:bg-amber-500/30",
    iconColor: "text-amber-400",
  },
  {
    ihtiyac: "Taksit Takibi",
    cozum: "Dijital Senet & Gecikme Uyarıları",
    iconNeed: FileSignature,
    iconSolution: CheckCircle,
    colorClass: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
    iconBgClass: "bg-emerald-500/20 group-hover:bg-emerald-500/30",
    iconColor: "text-emerald-400",
  },
  {
    ihtiyac: "Gümrük Masrafları",
    cozum: "Maliyet Kalemi Bazlı Araç Kartı",
    iconNeed: Package,
    iconSolution: CheckCircle,
    colorClass: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    iconBgClass: "bg-blue-500/20 group-hover:bg-blue-500/30",
    iconColor: "text-blue-400",
  },
];

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.08, duration: 0.35 },
  }),
};

export function BenefitsTable() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="faydalar" className="relative py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-50 mb-4">
            Lokal Fayda Tablosu
          </h2>
          <p className="max-w-2xl mx-auto text-slate-400 text-lg">
            KKTC galeri ihtiyaçlarına göre AkıllıGaleri çözümleri.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-slate-700 bg-slate-900/50 overflow-hidden"
        >
          <div className="overflow-x-auto hidden sm:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  <th className="px-6 py-4 text-sm font-semibold text-slate-300 w-14" />
                  <th className="px-6 py-4 text-sm font-semibold text-slate-300">
                    İhtiyaç
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-primary-300 w-12" />
                  <th className="px-6 py-4 text-sm font-semibold text-primary-300">
                    AkıllıGaleri Çözümü
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <motion.tr
                    key={row.ihtiyac}
                    custom={i}
                    variants={rowVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={cn(
                      "group border-b border-slate-800 last:border-0 transition-all duration-200",
                      hoveredIndex === i && "bg-slate-800/50"
                    )}
                  >
                    <td className="px-4 py-4">
                      <motion.div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                          row.iconBgClass
                        )}
                        whileHover={{ scale: 1.15 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <row.iconNeed className={cn("h-5 w-5", row.iconColor)} />
                      </motion.div>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-200 group-hover:text-slate-100 transition-colors">
                      {row.ihtiyac}
                    </td>
                    <td className="px-2 py-4">
                      <motion.div
                        className="text-primary-400 inline-flex"
                        animate={{ x: hoveredIndex === i ? 4 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ArrowRight className="h-5 w-5" />
                      </motion.div>
                    </td>
                    <td className="px-6 py-4">
                      <motion.div
                        className={cn(
                          "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 font-medium text-primary-300 transition-all duration-200",
                          hoveredIndex === i && "bg-primary-500/10 scale-[1.02]"
                        )}
                      >
                        <row.iconSolution className="h-4 w-4 shrink-0 text-emerald-400" />
                        {row.cozum}
                      </motion.div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sm:hidden px-6 py-6 space-y-4">
            {rows.map((row) => (
              <motion.div
                key={row.ihtiyac}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "rounded-xl border border-slate-700 bg-slate-800/30 p-4 space-y-2 transition-colors",
                  "bg-gradient-to-br",
                  row.colorClass
                )}
              >
                <div className="flex items-center gap-2 text-slate-200 text-sm">
                  <div className={cn("rounded-lg p-1.5", row.iconBgClass)}>
                    <row.iconNeed className="h-4 w-4 shrink-0 text-slate-100" />
                  </div>
                  <span className="font-medium">{row.ihtiyac}</span>
                </div>
                <div className="flex items-center gap-2 text-primary-300 text-sm pl-10">
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                  {row.cozum}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
