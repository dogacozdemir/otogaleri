import { motion } from "framer-motion";
import { Rocket, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary-950/30 via-slate-950 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.15),transparent)]" />
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 max-w-4xl mx-auto text-center space-y-8"
      >
        <motion.div variants={item} className="inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-4 py-1.5 text-sm text-primary-300">
          KKTC • Adaya Özel Platform
        </motion.div>
        <motion.h1
          variants={item}
          className={cn(
            "text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight",
            "text-slate-50"
          )}
        >
          KKTC Galeri Sektöründe{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
            Dijital Dönüşüm
          </span>
        </motion.h1>
        <motion.p
          variants={item}
          className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-400 leading-relaxed"
        >
          Tüm kurlarla (£, $, €, ₺, ¥) rahatça işlem yapıp takip edebileceğiniz, senetli satış ve gümrükleme süreçleri için adaya özel geliştirilmiş tek SaaS çözümü.
        </motion.p>
        <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="#cta"
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold",
              "bg-primary-500 text-white shadow-lg shadow-primary-500/25 hover:bg-primary-600 transition-colors"
            )}
          >
            <Rocket className="h-5 w-5" />
            Ücretsiz Demoyu Başlat
          </a>
          <a
            href="https://akilligaleri.com"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold",
              "border border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-800 transition-colors"
            )}
          >
            <ExternalLink className="h-5 w-5" />
            akilligaleri.com&apos;u İnceleyin
          </a>
          <p className="text-slate-500 text-sm pt-2">
            Mobil uyumlu arayüz ile stok ve araç ekleme tek ekrandan.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
