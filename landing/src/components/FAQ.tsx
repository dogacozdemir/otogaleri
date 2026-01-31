import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "Benim araçlarımı, satış fiyatlarımı, kazandığım parayı bir başkası görebilir mi?",
    answer:
      "Hayır, paneliniz tamamen size özeldir ve siz giriş yaptıkça şifrelenerek saklanır, yani biz bile göremeyiz.",
  },
  {
    question: "Verilerimiz çalınır mı?",
    answer:
      "Hayır. Verileriniz multi-tenant mimari ile tamamen izole tutulur; her galeri yalnızca kendi verisini görür. JWT tabanlı kimlik doğrulama, rol tabanlı erişim (ACL) ve güvenli API ile verileriniz adada güvende.",
  },
  {
    question: "İnternet kesilirse ne olur?",
    answer:
      "AkıllıGaleri bulut tabanlı bir SaaS uygulamasıdır; çalışması için internet bağlantısı gerekir. İnternet kesintisinde giriş yapılamaz, ancak verileriniz sunucuda saklanmaya devam eder. Bağlantı tekrar geldiğinde kaldığınız yerden devam edebilirsiniz.",
  },
  {
    question: "Fiyat sabit mi, gizli ücret var mı?",
    answer:
      "Evet, fiyat sabittir: İlk ay ücretsiz, sonrasında aylık 4.999 ₺. Kurulum ücretsizdir. Ek kullanıcı veya özel entegrasyon gibi esnek ihtiyaçlar için iletişime geçebilirsiniz.",
  },
  {
    question: "Verilerim yedekleniyor mu?",
    answer:
      "Evet. Veritabanı ve kritik veriler düzenli yedeklenir. Multi-tenant yapı sayesinde verileriniz diğer galerilerden ayrı ve güvenli şekilde saklanır.",
  },
  {
    question: "KKTC dışından da kullanabilir miyim?",
    answer:
      "AkıllıGaleri özellikle KKTC galeri sektörü için (çok para birimi £, $, €, ₺, ¥ ile işlem ve takip, senetli satış, gümrükleme) tasarlanmıştır. Teknik olarak internet erişimi olan her yerden kullanılabilir; bölgeye özel ihtiyaçlar için destek alabilirsiniz.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="sss" className="relative py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-50 mb-4">
            Sıkça Sorulan Sorular
          </h2>
          <p className="text-slate-400 text-lg">
            Güvenlik, fiyat ve kullanım hakkında merak ettikleriniz.
          </p>
        </motion.div>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <motion.div
              key={faq.question}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "rounded-xl border border-slate-700 bg-slate-900/50 overflow-hidden",
                "hover:border-slate-600 transition-colors"
              )}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
              >
                <span className="font-medium text-slate-100 flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 shrink-0 text-primary-400/80" />
                  {faq.question}
                </span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-slate-400 transition-transform",
                    openIndex === i && "rotate-180"
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4 pt-0 text-slate-400 text-sm leading-relaxed border-t border-slate-800">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
