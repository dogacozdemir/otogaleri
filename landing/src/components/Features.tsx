import { motion } from "framer-motion";
import {
  Coins,
  FileSignature,
  Ship,
  Package,
  Smartphone,
  BarChart3,
} from "lucide-react";
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
  {
    title: "Stok Yönetimi",
    description:
      "Araç envanterinizi tek ekrandan yönetin. Plaka, marka, model ve fiyat bilgilerini anında takip edin.",
    icon: Package,
    subtitle: null,
    currencyBadge: null,
  },
  {
    title: "Mobil Erişim",
    description:
      "Tablet ve telefonunuzdan her yerden stok ve satış verilerinize erişin. Sahada bile tam kontrol.",
    icon: Smartphone,
    subtitle: null,
    currencyBadge: null,
  },
  {
    title: "Raporlar & Analiz",
    description:
      "Satış performansı, stok devir hızı ve kar marjı raporları ile veri odaklı kararlar alın.",
    icon: BarChart3,
    subtitle: null,
    currencyBadge: null,
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" },
  }),
};

export function Features() {
  return (
    <section
      id="ozellikler"
      className="relative py-24 px-4 bg-white dark:bg-slate-950"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-4">
            KKTC&apos;ye Özel Yetenekler
          </h2>
          <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-400 text-lg">
            Adaya özel geliştirilmiş modüller: çok para birimi ile ticaret, senet ve gümrük takibi.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.article
              key={feature.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className={cn(
                "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6",
                "hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/10 transition-all duration-300",
                "flex flex-col"
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400" aria-hidden>
                  <feature.icon className="h-6 w-6" aria-hidden />
                </div>
                {feature.currencyBadge && (
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400/90 border border-amber-400/30 rounded-lg px-3 py-1 bg-amber-50 dark:bg-amber-500/10">
                    {feature.currencyBadge}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                {feature.title}
              </h3>
              {feature.subtitle && (
                <p className="text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-2">
                  {feature.subtitle}
                </p>
              )}
              <p className="text-slate-600 dark:text-slate-500 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
