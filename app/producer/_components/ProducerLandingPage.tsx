"use client";

import { useState, useMemo } from "react";
import ProducerHeader from "./ProducerHeader";
import GoToTopButton from "@/app/(public)/_components/GoToTopButton";
import ProducerDesignMockupSection, { type LandingMode } from "./ProducerDesignMockupSection";
import ProducerHeroSection from "./ProducerHeroSection";
import ProducerProblemVsSolutionSection from "./ProducerProblemVsSolutionSection";
import ProducerHowItWorksSection from "./ProducerHowItWorksSection";
import ProducerSerialApiSection from "./ProducerSerialApiSection";
import ProducerFactoryTraceabilitySection from "./ProducerFactoryTraceabilitySection";
import ProducerSecurityKeySection from "./ProducerSecurityKeySection";
import ProducerAnalyticsGrowthSection from "./ProducerAnalyticsGrowthSection";
import ProducerFinalCtaSection from "./ProducerFinalCtaSection";

function getLandingMode(): LandingMode {
  const v = process.env.NEXT_PUBLIC_PRODUCER_LANDING_MODE?.toLowerCase();
  if (v === "mockup" || v === "sections" || v === "auto") return v;
  return "sections";
}

export default function ProducerLandingPage() {
  const [mockupVisible, setMockupVisible] = useState<boolean | null>(null);
  const mode = useMemo(() => getLandingMode(), []);

  const showMockupSection = mode !== "sections";
  const showSections =
    mode === "sections" || (mode === "auto" && mockupVisible === false);

  return (
    <>
      <ProducerHeader />
      {showMockupSection && (
        <ProducerDesignMockupSection
          mode={mode}
          onLoaded={() => setMockupVisible(true)}
          onError={() => setMockupVisible(false)}
        />
      )}
      {showSections && (
        <>
          <ProducerHeroSection />
          <section id="features" className="producer-section producer-features-anchor" aria-hidden />
          <ProducerProblemVsSolutionSection />
          <ProducerHowItWorksSection />
          <ProducerSerialApiSection />
          <ProducerFactoryTraceabilitySection />
          <ProducerSecurityKeySection />
          <ProducerAnalyticsGrowthSection />
          <ProducerFinalCtaSection />
        </>
      )}
      <GoToTopButton />
    </>
  );
}
