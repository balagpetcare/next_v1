import type { Metadata } from "next";
import { getSeoConfig } from "./config";

/**
 * Returns Next.js Metadata `verification` block for Search Console and Meta domain verification.
 */
export function buildVerificationMetadata(): Pick<Metadata, "verification"> {
  const { googleSiteVerification, facebookDomainVerification } = getSeoConfig();
  if (!googleSiteVerification && !facebookDomainVerification) {
    return {};
  }

  const verification: NonNullable<Metadata["verification"]> = {};

  if (googleSiteVerification) {
    verification.google = googleSiteVerification;
  }

  if (facebookDomainVerification) {
    verification.other = {
      "facebook-domain-verification": facebookDomainVerification,
    };
  }

  return { verification };
}
