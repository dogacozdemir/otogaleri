import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";

export function Testimonial() {
  return (
    <section id="referanslar" className="relative py-24 px-4 bg-slate-100 dark:bg-slate-900/30">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-4">
            Galeriler Ne Diyor?
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Akıllı Galeri kullanan işletmelerden geri bildirimler.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={cn(
            "rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-8 sm:p-10",
            "shadow-xl shadow-slate-200/50 dark:shadow-black/20"
          )}
        >
          <Quote className="h-10 w-10 text-indigo-500/40 mb-4" />
          <blockquote className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-slate-100 leading-relaxed mb-6">
            &ldquo;İşimizi çok kolaylaştırdı. Kur farkı ve senet takibi artık tek ekrandan; gümrük masraflarını araç kartında görmek büyük rahatlık.&rdquo;
          </blockquote>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800/80 p-1.5">
              <img
                src="/mcangil.png"
                alt="M. Cangil Motors Ltd. galeri referans logosu - Alsancak"
                className="h-full w-full object-contain object-center"
              />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">M. Cangil Motors Ltd.</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Alsancak</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
