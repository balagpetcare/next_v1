"use client";

/**
 * Layout for legacy nested segment `services-pricing/services/...` only.
 * Shared pills live on each page (`StaffServiceContentClient`, flat catalog/matrix/agreements) to avoid duplicate nav when nested + flat both exist.
 */
export default function ServicesPricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
