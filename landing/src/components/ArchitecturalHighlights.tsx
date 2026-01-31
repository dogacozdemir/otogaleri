import { motion } from "framer-motion";
import { Building2, Shield, Lock, ShieldCheck, Database, Server } from "lucide-react";
import { cn } from "@/lib/utils";

const trustBadges = [
  { label: "256-bit SSL", icon: ShieldCheck, title: "Şifreli bağlantı" },
  { label: "Daily Backup", icon: Database, title: "Günlük yedekleme" },
  { label: "Multi-tenant", icon: Server, title: "Veri izolasyonu" },
];

const highlights = [
  {
    title: "Verileriniz Adada Güvende",
    description:
      "Her galeri için tamamen izole veri tabanı mimarisi. Multi-tenant yapı ile verileriniz birbirinden ayrı ve güvende.",
    icon: Building2,
  },
  {
    title: "JWT ile güvenli erişim",
    description:
      "Oturum yönetimi ve token tabanlı kimlik doğrulama. Rol tabanlı erişim kontrolü (ACL) ile yetkili kullanıcılar.",
    icon: Shield,
  },
  {
    title: "Rol tabanlı erişim kontrolü",
    description:
      "Owner, admin, satış ve muhasebe rolleri ile yetki ayrımı. Hassas verilere sadece yetkili erişim.",
    icon: Lock,
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.45 },
  }),
};

export function ArchitecturalHighlights() {
  return (
    <section id="mimari" className="relative py-24 px-4 bg-slate-900/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-50 mb-4">
            Teknik Güvenlik
          </h2>
          <p className="max-w-2xl mx-auto text-slate-400 text-lg">
            Multi-tenant mimari, JWT ve rol tabanlı erişim ile verileriniz güvende.
          </p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-8">
          {highlights.map((item, i) => (
            <motion.div
              key={item.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className={cn(
                "rounded-2xl border border-slate-700 bg-slate-800/50 p-8",
                "hover:border-primary-500/40 transition-colors"
              )}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-500/20 text-primary-400 mb-6">
                <item.icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-3">
                {item.title}
              </h3>
              <p className="text-slate-400 leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>
        {/* Güven Rozetleri */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10"
        >
          {trustBadges.map((badge) => (
            <div
              key={badge.label}
              title={badge.title}
              className={cn(
                "flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3",
                "hover:border-primary-500/40 hover:bg-slate-800/80 transition-colors"
              )}
            >
              <badge.icon className="h-5 w-5 text-primary-400 shrink-0" />
              <span className="text-sm font-medium text-slate-300">{badge.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
