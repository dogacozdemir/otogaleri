import { motion } from "framer-motion";
import { Rocket, Play, CreditCard, XCircle, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import dashboardImage from "@/assets/dashboard.png";

const trustBadges = [
  { icon: CreditCard, text: "Kredi Kartı Gerekmez" },
  { icon: XCircle, text: "İstediğiniz Zaman İptal" },
  { icon: Headphones, text: "Ücretsiz Kurulum Desteği" },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export function Hero() {
  return (
    <section className="relative min-h-[100dvh] sm:min-h-[90vh] flex flex-col items-center justify-center px-4 py-24 overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 via-slate-50 to-slate-50 dark:from-indigo-950/20 dark:via-slate-950 dark:to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(79,70,229,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(79,70,229,0.15),transparent)]" />

      <div className="relative z-10 max-w-6xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="text-center lg:text-left space-y-6"
          >
            <motion.div
              variants={item}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2"
            >
              KKTC • Adaya Özel Platform
            </motion.div>
            <motion.h1
              variants={item}
              className={cn(
                "text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight",
                "text-slate-900 dark:text-slate-50"
              )}
            >
              Galerinizi Dijital Çağa Taşıyın,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">
                Satışlarınıza Odaklanın.
              </span>
            </motion.h1>

            <motion.p
              variants={item}
              className="max-w-xl text-lg sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed mx-auto lg:mx-0"
            >
              Tüm kurlarla (£, $, €, ₺, ¥) rahatça işlem yapıp takip edebileceğiniz, senetli satış ve gümrükleme süreçleri için adaya özel geliştirilmiş tek SaaS çözümü.
            </motion.p>
            <motion.p
              variants={item}
              className="max-w-xl text-sm text-slate-600 dark:text-slate-500 leading-relaxed mx-auto lg:mx-0"
            >
              Mobil uyumlu arayüz ile stok ve araç ekleme tek ekrandan.
            </motion.p>

            <motion.div
              variants={item}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-4"
            >
              <a
                href="https://app.akilligaleri.com/register"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 min-h-[48px] font-semibold",
                  "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 transition-colors"
                )}
              >
                <Rocket className="h-5 w-5" aria-hidden />
                Ücretsiz Deneyin
              </a>
              <a
                href="#ozellikler"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 min-h-[48px] font-semibold",
                  "border-2 border-slate-300 dark:border-slate-600 bg-slate-100/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                )}
              >
                <Play className="h-5 w-5" aria-hidden />
                Nasıl Çalışır?
              </a>
            </motion.div>
            <motion.div
              variants={item}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-2"
            >
              {trustBadges.map((badge) => (
                <span
                  key={badge.text}
                  className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm"
                >
                  <badge.icon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                  <span>{badge.text}</span>
                </span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="relative aspect-[16/10]"
          >
            <img
              src={dashboardImage}
              alt="Akıllı Galeri dashboard önizlemesi — araç envanteri, satış performansı ve stok yönetimi"
              className="w-full h-full object-contain object-top mix-blend-darken"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
