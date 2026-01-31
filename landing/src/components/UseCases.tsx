import { motion } from "framer-motion";
import {
  Car,
  PieChart,
  Building2,
  Coins,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const scenarios = [
  {
    title: "Galeri günlük operasyonu",
    description:
      "Yeni araç ekleme, masraf girişi, satış (peşin/taksit) kaydı, müşteri ve teklif takibi tek ekrandan.",
    icon: Car,
    gradient: "from-primary-500/20 to-primary-600/10",
  },
  {
    title: "Finansal kontrol",
    description:
      "Araç bazlı kar, marka/model karlılığı, aylık karşılaştırma ve taksit nakit akışı raporları.",
    icon: PieChart,
    gradient: "from-emerald-500/20 to-emerald-600/10",
  },
  {
    title: "Çok şubeli yönetim",
    description:
      "Merkez ve şubelerin stok ve satış verilerinin rol bazlı erişimle yönetilmesi.",
    icon: Building2,
    gradient: "from-amber-500/20 to-amber-600/10",
  },
  {
    title: "Dövizli işlemler",
    description:
      "Farklı para biriminde alış/satış/masraf; otomatik kur ve raporlarda tek para birimine çeviri.",
    icon: Coins,
    gradient: "from-blue-500/20 to-blue-600/10",
  },
  {
    title: "Müşteri ilişkileri",
    description:
      "Müşteri kartı, satış geçmişi, taksit durumu, takip görevleri ve tekliften satışa dönüşüm.",
    icon: Users,
    gradient: "from-violet-500/20 to-violet-600/10",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

export function UseCases() {
  return (
    <section id="senaryolar" className="relative py-24 px-4 bg-slate-900/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-50 mb-4">
            Kullanım Senaryoları
          </h2>
          <p className="max-w-2xl mx-auto text-slate-400 text-lg">
            Kendinizi bulacağınız temel kullanım alanları.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.slice(0, 4).map((scenario, i) => (
            <motion.article
              key={scenario.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className={cn(
                "rounded-2xl border border-slate-700 bg-slate-800/50 p-6",
                "bg-gradient-to-br",
                scenario.gradient,
                "hover:border-slate-600 transition-colors"
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-slate-200 mb-4">
                <scenario.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">
                {scenario.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {scenario.description}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
