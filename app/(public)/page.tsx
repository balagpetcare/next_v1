import HeroSection from "./_components/HeroSection";
import TrustSection from "./_components/TrustSection";
import EcosystemSection from "./_components/EcosystemSection";
import HowToStartDiagramSection from "./_components/HowToStartDiagramSection";
import ServiceSalesSection from "./_components/ServiceSalesSection";
import HowToStartSection from "./_components/HowToStartSection";
import CustomerBenefitsSection from "./_components/CustomerBenefitsSection";
import BenefitsSection from "./_components/BenefitsSection";
import ReportsSection from "./_components/ReportsSection";
import GlobalImpactSection from "./_components/GlobalImpactSection";
import TestimonialsSection from "./_components/TestimonialsSection";
import FaqSection from "./_components/FaqSection";
import CtaSection from "./_components/CtaSection";

export default function PublicLandingPage() {
  return (
    <>
      <HeroSection />
      <EcosystemSection />
      <HowToStartDiagramSection />
      <BenefitsSection />
      <CustomerBenefitsSection />
      <ServiceSalesSection />
      <ReportsSection />
      <GlobalImpactSection />
      <TrustSection />
      <TestimonialsSection />
      <HowToStartSection />
      <FaqSection />
      <CtaSection />
    </>
  );
}
