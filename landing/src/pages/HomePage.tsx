import { Header } from "@/components/Header";
import { StickyCTA } from "@/components/StickyCTA";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { DashboardPreview } from "@/components/DashboardPreview";
import { ArchitecturalHighlights } from "@/components/ArchitecturalHighlights";
import { BenefitsTable } from "@/components/BenefitsTable";
import { Pricing } from "@/components/Pricing";
import { Testimonial } from "@/components/Testimonial";
import { FAQ } from "@/components/FAQ";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import {
  JsonLd,
  SoftwareApplicationSchema,
  FAQPageSchema,
} from "@/components/JsonLd";

const faqsForSchema = [
  {
    question: "Benim araçlarımı, satış fiyatlarımı, kazandığım parayı bir başkası görebilir mi?",
    answer:
      "Hayır, paneliniz tamamen size özeldir ve siz giriş yaptıkça şifrelenerek saklanır; yani biz bile göremeyiz.",
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
      "Evet, fiyat sabittir: Aylık £99 veya yıllık £990 (£198 tasarruf). Kurulum ücretsizdir. Ek kullanıcı veya özel entegrasyon gibi esnek ihtiyaçlar için iletişime geçebilirsiniz.",
  },
  {
    question: "Verilerim yedekleniyor mu?",
    answer:
      "Evet. Veritabanı ve kritik veriler düzenli yedeklenir. Multi-tenant yapı sayesinde verileriniz diğer galerilerden ayrı ve güvenli şekilde saklanır.",
  },
  {
    question: "KKTC dışından da kullanabilir miyim?",
    answer:
      "Akıllı Galeri özellikle KKTC galeri sektörü için (çok para birimi £, $, €, ₺, ¥ ile işlem ve takip, senetli satış, gümrükleme) tasarlanmıştır. Teknik olarak internet erişimi olan her yerden kullanılabilir; bölgeye özel ihtiyaçlar için destek alabilirsiniz.",
  },
];

export function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <SEO
        title="KKTC Otogaleri Yönetim Yazılımı"
        description="KKTC galerileri için SaaS: £, $, €, ₺, ¥ ile işlem, senetli satış ve gümrükleme takibi. Ücretsiz deneyin."
      />
      <JsonLd
        data={[SoftwareApplicationSchema(), FAQPageSchema(faqsForSchema)]}
      />
      <Header />
      <StickyCTA />
      <main className="pt-[calc(7rem+env(safe-area-inset-top))]">
        <Hero />
        <Features />
        <DashboardPreview />
        <ArchitecturalHighlights />
        <BenefitsTable />
        <Pricing />
        <Testimonial />
        <FAQ />
        <CTASection />
        <Footer />
      </main>
    </div>
  );
}
