"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy onboarding page.
 * We now use the dedicated /owner/kyc flow (aligned with Node API endpoints).
 */
export default function OwnerOnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/owner/kyc");
  }, [router]);

  return null;
}
