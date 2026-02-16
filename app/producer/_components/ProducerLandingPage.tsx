"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProducerHeader from "./ProducerHeader";
import GoToTopButton from "@/app/(public)/_components/GoToTopButton";
import ProducerDesignMockupSection, { type LandingMode } from "./ProducerDesignMockupSection";
import {
  HeroSection,
  StatsRow,
  ProblemSection,
  SolutionGrid,
  HowItWorks,
  LiveDemo,
  SecurityApi,
  FinalCTA,
} from "./landing";
import { apiGet } from "@/lib/api";

function getLandingMode(): LandingMode {
  const v = process.env.NEXT_PUBLIC_PRODUCER_LANDING_MODE?.toLowerCase();
  if (v === "mockup" || v === "sections" || v === "auto") return v;
  return "sections";
}

export default function ProducerLandingPage() {
  const router = useRouter();
  const [mockupVisible, setMockupVisible] = useState<boolean | null>(null);
  const mode = useMemo(() => getLandingMode(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await apiGet("/api/v1/producer/me");
        if (!cancelled) router.replace("/producer/dashboard");
      } catch {
        /* not authenticated — show landing */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

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
          <HeroSection />
          <StatsRow />
          <ProblemSection />
          <SolutionGrid />
          <HowItWorks />
          <LiveDemo />
          <SecurityApi />
          <FinalCTA />
        </>
      )}
      <GoToTopButton />
    </>
  );
}
