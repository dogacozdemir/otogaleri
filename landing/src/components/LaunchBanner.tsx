import { motion } from "framer-motion";
import { Gift, Sparkles } from "lucide-react";

export function LaunchBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden bg-gradient-to-r from-rose-600 via-amber-500 to-amber-600 py-3.5 px-4"
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer" />
      {/* Subtle pattern */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />

      <div className="relative flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
            <Sparkles className="h-3.5 w-3.5" />
            Çıkış Özel
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border-2 border-white/50 bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
            <Gift className="h-3 w-3" />
            Sınırlı Süre
          </span>
        </div>
        <p className="text-sm sm:text-base font-semibold text-white text-center drop-shadow-sm">
          Araç ve veri girişlerinizi ekibimiz sizin yerinize yapıyor! Arkanıza yaslanın ve dijitalleşmenin tadını çıkarın.
        </p>
      </div>
    </motion.div>
  );
}
