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

function App() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
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

export default App;
