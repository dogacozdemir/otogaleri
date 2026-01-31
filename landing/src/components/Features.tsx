import { motion } from "framer-motion";
import { Coins, FileSignature, Ship } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "£, $, €, ₺, ¥ Çoklu Kur",
    subtitle: "Tüm kurlarla işlem yapın, takip edin.",
    description:
      "Satışlar £, masraflar ₺ veya $ olsa bile sistem kur farkını otomatik hesaplar. Tüm para birimleriyle raporlama ve parite desteği.",
    icon: Coins,
    currencyBadge: "£$€₺¥",
  },
  {
    title: "Senetli Satış Takibi",
    subtitle: "Elden taksit yönetimini profesyonelleştirin.",
    description:
      "Ödeme planları, gecikme bildirimleri ve kalan borç raporları. Dijital senet takibi ile nakit akışı kontrolü.",
    icon: FileSignature,
    currencyBadge: null,
  },
  {
    title: "İthalat & Koçan Yönetimi",
    subtitle: "Gümrükleme ve stok tek ekranda.",
    description:
      "Plakasız araçların gümrükleme süreçleri ve koçan tipi (Şahıs/Şirket) bazlı stok takibi. Maliyet kalemi bazlı araç kartı.",
    icon: Ship,
    currencyBadge: null,
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4 },
  }),
};

export function Features() {
  return (
    <section id="ozellikler" className="relative py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-50 mb-4">
            KKTC'ye Özel Yetenekler
          </h2>
          <p className="max-w-2xl mx-auto text-slate-400 text-lg">
            Adaya özel geliştirilmiş modüller: çok para birimi ile ticaret, senet ve gümrük takibi.
          </p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.article
              key={feature.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className={cn(
                "rounded-2xl border border-slate-800 bg-slate-900/50 p-6",
                "hover:border-primary-500/30 hover:bg-slate-900/80 transition-colors",
                "flex flex-col"
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/20 text-primary-400">
                  <feature.icon className="h-6 w-6" />
                </div>
                {feature.currencyBadge && (
                  <span className="text-2xl font-bold text-amber-400/90 border border-amber-400/30 rounded-lg px-3 py-1 bg-amber-500/10">
                    {feature.currencyBadge}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-1">
                {feature.title}
              </h3>
              <p className="text-primary-300/90 text-sm font-medium mb-2">
                {feature.subtitle}
              </p>
              <p className="text-slate-400 text-sm leading-relaxed mt-auto">
                {feature.description}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
