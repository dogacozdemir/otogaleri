import { motion } from "framer-motion";
import { Mail, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { label: "Özellikler", href: "#ozellikler" },
  { label: "Teknik Güvenlik", href: "#mimari" },
  { label: "Lokal Faydalar", href: "#faydalar" },
  { label: "Demo", href: "#demo" },
  { label: "Fiyat", href: "#fiyat" },
  { label: "Referanslar", href: "#referanslar" },
  { label: "SSS", href: "#sss" },
];

export function Footer() {
  return (
    <footer
      id="footer"
      className="relative border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 py-16 px-4"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              Akıllı Galeri
            </div>
            <p className="max-w-sm text-slate-600 dark:text-slate-400 text-sm">
              KKTC galeri sektörü için çok para birimi (£, $, €, ₺, ¥) ile işlem ve takip, senetli satış ve gümrükleme odaklı SaaS çözümü.
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
              <a
                href="mailto:info@akilligaleri.com"
                className={cn(
                  "inline-flex items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                )}
              >
                <Mail className="h-4 w-4" />
                info@akilligaleri.com
              </a>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                KKTC
              </span>
            </div>
          </motion.div>
          <motion.nav
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-wrap gap-6"
          >
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-sm"
              >
                {link.label}
              </a>
            ))}
          </motion.nav>
        </div>
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-slate-500 dark:text-slate-500 text-sm">
            © {new Date().getFullYear()} Akıllı Galeri bir{" "}
            <a
              href="https://www.nerdyreptile.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Nerdy Reptile
            </a>{" "}
            ürünüdür.
          </div>
        </div>
      </div>
    </footer>
  );
}
