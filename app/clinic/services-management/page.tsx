import { redirect } from "next/navigation";

/**
 * Deprecated: `/clinic/services-management` is not the staff Services & Pricing hub.
 * Staff canonical routes: `staffServicePricing*` helpers in `src/lib/staffServicePricingRoutes.ts`
 * (catalog / matrix / agreements / service-content); legacy nested `/clinic/services-pricing/*` URLs redirect via `next.config.js`.
 * This page only sends standalone clinic users to the clinic dashboard — do not link here from staff nav.
 */
export default function LegacyClinicServicesManagementRedirect() {
  redirect("/clinic/dashboard");
}
