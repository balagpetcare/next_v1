import { BPA_DOMAIN_ORIGINS, type BpaDomainKey } from "./domains";

export type SeoAppSurface = "landing" | "campaign" | "panel";

export type SeoConfig = {
  siteUrl: string;
  siteName: string;
  appSurface: SeoAppSurface;
  googleSiteVerification?: string;
  facebookDomainVerification?: string;
  ogImageUrl?: string;
  twitterSite?: string;
  locale: string;
  noIndexDefault: boolean;
};

function readEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function resolveAppSurface(): SeoAppSurface {
  const explicit = readEnv("NEXT_PUBLIC_SEO_APP_SURFACE") ?? readEnv("NEXT_PUBLIC_ANALYTICS_APP_SURFACE");
  if (explicit === "landing" || explicit === "campaign" || explicit === "panel") return explicit;
  if (readEnv("NEXT_PUBLIC_CAMPAIGN_SLUG")) return "campaign";
  if (readEnv("NEXT_PUBLIC_DEFAULT_PANEL")) return "panel";
  return "landing";
}

function resolveSiteUrl(): string {
  const url = readEnv("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3101";
  return url.replace(/\/$/, "");
}

function resolveOgImageUrl(siteUrl: string): string | undefined {
  const custom = readEnv("NEXT_PUBLIC_OG_IMAGE_URL");
  if (!custom) return undefined;
  return custom.startsWith("http") ? custom : `${siteUrl}${custom.startsWith("/") ? custom : `/${custom}`}`;
}

export function getSeoConfig(): SeoConfig {
  const siteUrl = resolveSiteUrl();
  const appSurface = resolveAppSurface();

  return {
    siteUrl,
    siteName: readEnv("NEXT_PUBLIC_SITE_NAME") ?? "Bangladesh Pet Association",
    appSurface,
    googleSiteVerification: readEnv("NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION"),
    facebookDomainVerification: readEnv("NEXT_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION"),
    ogImageUrl: resolveOgImageUrl(siteUrl),
    twitterSite: readEnv("NEXT_PUBLIC_TWITTER_SITE"),
    locale: appSurface === "campaign" ? "bn_BD" : "en_BD",
    noIndexDefault: appSurface === "panel",
  };
}

/** Resolve production site URL for a known domain key (for cross-linking). */
export function getDomainSiteUrl(key: BpaDomainKey): string {
  return BPA_DOMAIN_ORIGINS[key];
}
