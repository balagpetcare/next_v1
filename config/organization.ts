/** Single source of truth — Bangladesh Pet Association (BPA) public contact & branding. */
export const organization = {
  name: {
    en: "Bangladesh Pet Association (BPA)",
    bn: "বাংলাদেশ পেট অ্যাসোসিয়েশন (বিপিএ)",
  },
  shortName: "BPA",
  website: "https://bangladeshpetassociation.com",
  websiteDisplay: "bangladeshpetassociation.com",
  email: "vetandpetcare@gmail.com",
  phone: "01575-008300",
  address: {
    streetAddress: "364 DIT Road, East Rampura",
    addressLocality: "Dhaka",
    postalCode: "1219",
    addressCountry: "Bangladesh",
  },
  social: {
    youtube: "https://www.youtube.com/channel/UCMQAj3SXIcZ-0LM9pstfMQg",
    facebook: null as string | null,
    instagram: null as string | null,
    twitter: null as string | null,
  },
  supportHours: {
    en: "Sun–Thu, 9:00 AM – 6:00 PM (BST)",
    bn: "রবি–বৃহস্পতি, সকাল ৯টা থেকে সন্ধ্যা ৬টা (BST)",
  },
  mission: {
    en: "The Bangladesh Pet Association (BPA) is dedicated to ensuring the health and welfare of companion animals across the country.",
    bn: "বাংলাদেশ পেট অ্যাসোসিয়েশন (বিপিএ) দেশের পোষা প্রাণীদের স্বাস্থ্য ও কল্যাণ নিশ্চিত করতে প্রতিশ্রুতিবদ্ধ।",
  },
} as const;

export function organizationTelHref(): string {
  const digits = organization.phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return `tel:+${digits}`;
  if (digits.startsWith("0")) return `tel:+88${digits}`;
  return `tel:+880${digits}`;
}

export function organizationMailtoHref(): string {
  return `mailto:${organization.email}`;
}

export function organizationTelephoneE164(): string {
  return organizationTelHref().replace(/^tel:/, "");
}

export function organizationPostalAddressSchema() {
  return {
    "@type": "PostalAddress" as const,
    streetAddress: organization.address.streetAddress,
    addressLocality: organization.address.addressLocality,
    postalCode: organization.address.postalCode,
    addressCountry: "BD",
  };
}

export function organizationSameAs(): string[] {
  return Object.values(organization.social).filter((v): v is string => Boolean(v));
}

export function buildOrganizationJsonLd(logoUrl?: string): Record<string, unknown> {
  const node: Record<string, unknown> = {
    "@type": "Organization",
    name: organization.name.en,
    alternateName: organization.shortName,
    url: organization.website,
    email: organization.email,
    telephone: organizationTelephoneE164(),
    address: organizationPostalAddressSchema(),
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: organizationTelephoneE164(),
        email: organization.email,
        contactType: "customer support",
        areaServed: "BD",
        availableLanguage: ["en", "bn"],
      },
    ],
  };
  if (logoUrl) node.logo = logoUrl;
  const sameAs = organizationSameAs();
  if (sameAs.length > 0) node.sameAs = sameAs;
  return node;
}
