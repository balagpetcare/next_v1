/**
 * Phase 5: Policy features (DONATION, ADS, PRODUCTS) for UI visibility.
 * Fetch from GET /api/v1/meta/features?countryCode=X and hide/disable Donation or Ads per policy.
 */

"use client";

import { useEffect, useState } from "react";
import { apiGet } from "./api";
import { getCountryCode } from "./countryContext";

export type PolicyFeatures = {
  countryCode: string;
  features: Record<string, boolean>;
};

export function usePolicyFeatures(): {
  data: PolicyFeatures | null;
  loading: boolean;
  donationEnabled: boolean;
  fundraisingEnabled: boolean;
  adsEnabled: boolean;
  productsEnabled: boolean;
} {
  const [data, setData] = useState<PolicyFeatures | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const code = getCountryCode();
    apiGet<{ success: boolean; data: PolicyFeatures }>(`/api/v1/meta/features?countryCode=${code}`)
      .then((res) => {
        if (!cancelled && res?.data) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) setData({ countryCode: code, features: {} });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const features = data?.features ?? {};
  return {
    data,
    loading,
    donationEnabled: !!features.DONATION,
    fundraisingEnabled: !!features.FUNDRAISING,
    adsEnabled: !!features.ADS,
    productsEnabled: features.PRODUCTS !== false,
  };
}
