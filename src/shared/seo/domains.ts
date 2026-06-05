/**
 * Canonical domain registry for the BPA/WPA ecosystem.
 * Used for CORS hints, canonical URLs, and multi-brand SEO configuration.
 */

export const BPA_DOMAINS = {
  BPA_APEX: "bangladeshpetassociation.com",
  VACCINATION: "vaccination.bangladeshpetassociation.com",
  COMMUNITY_PETS_CLINIC: "communitypetsclinic.com",
  COMMUNITY_PET_SHOP: "communitypetshop.com",
  PET_SMART_SOLUTION: "petsmartsolution.com",
  PRANI_DOCTOR: "pranidoctor.com",
} as const;

export type BpaDomainKey = keyof typeof BPA_DOMAINS;
export type BpaDomain = (typeof BPA_DOMAINS)[BpaDomainKey];

/** Production HTTPS origins for all registered domains. */
export const BPA_DOMAIN_ORIGINS: Record<BpaDomainKey, string> = {
  BPA_APEX: `https://${BPA_DOMAINS.BPA_APEX}`,
  VACCINATION: `https://${BPA_DOMAINS.VACCINATION}`,
  COMMUNITY_PETS_CLINIC: `https://${BPA_DOMAINS.COMMUNITY_PETS_CLINIC}`,
  COMMUNITY_PET_SHOP: `https://${BPA_DOMAINS.COMMUNITY_PET_SHOP}`,
  PET_SMART_SOLUTION: `https://${BPA_DOMAINS.PET_SMART_SOLUTION}`,
  PRANI_DOCTOR: `https://${BPA_DOMAINS.PRANI_DOCTOR}`,
};

/** BPA panel subdomains on the apex domain. */
export const BPA_PANEL_SUBDOMAINS = [
  "api",
  "admin",
  "shop",
  "clinic",
  "staff",
  "owner",
  "producer",
  "doctor",
] as const;

export function getPanelOrigin(subdomain: string): string {
  return `https://${subdomain}.${BPA_DOMAINS.BPA_APEX}`;
}

export function resolveDomainByHost(host: string): BpaDomainKey | null {
  const normalized = host.toLowerCase().replace(/:\d+$/, "");
  for (const [key, domain] of Object.entries(BPA_DOMAINS)) {
    if (normalized === domain || normalized.endsWith(`.${domain}`)) {
      return key as BpaDomainKey;
    }
  }
  return null;
}
