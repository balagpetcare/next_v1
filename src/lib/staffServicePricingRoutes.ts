/** Canonical staff URLs for Services & Pricing (flat segments for Turbopack stability). */

export function staffServicePricingCatalogPath(branchId: string) {
  return `/staff/branch/${branchId}/clinic/services-pricing-catalog`;
}

export function staffServicePricingMatrixPath(branchId: string) {
  return `/staff/branch/${branchId}/clinic/services-pricing-matrix`;
}

export function staffServicePricingAgreementsPath(branchId: string) {
  return `/staff/branch/${branchId}/clinic/services-pricing-agreements`;
}

/** Service content & media editor (flat canonical). Legacy nested path redirects here. */
export function staffServicePricingServiceContentPath(branchId: string, serviceId: number | string) {
  return `/staff/branch/${branchId}/clinic/services-pricing-service-content/${serviceId}`;
}
