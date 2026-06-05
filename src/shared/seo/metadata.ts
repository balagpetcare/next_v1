import type { Metadata } from "next";
import { getSeoConfig } from "./config";
import { buildVerificationMetadata } from "./verification";

export type PageMetadataInput = {
  title?: string;
  description?: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
  ogImage?: string;
  ogType?: "website" | "article";
  /** Absolute canonical URL override (e.g. bridge page → primary campaign host) */
  canonicalUrl?: string;
  /** Absolute Open Graph / Twitter `og:url` override */
  openGraphUrl?: string;
};

const DEFAULT_DESCRIPTION =
  "Bangladesh Pet Association — trusted pet care, vaccination campaigns, and digital health services.";

const DEFAULT_KEYWORDS = [
  "BPA",
  "Bangladesh Pet Association",
  "pet care",
  "vaccination",
  "pet health",
] as const;

export function buildPageMetadata(input: PageMetadataInput = {}): Metadata {
  const config = getSeoConfig();
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    path = "",
    keywords = [...DEFAULT_KEYWORDS],
    noIndex,
    ogImage,
    ogType = "website",
    canonicalUrl: canonicalUrlOverride,
    openGraphUrl: openGraphUrlOverride,
  } = input;

  const shouldNoIndex = noIndex ?? config.noIndexDefault;
  const canonicalPath = path.startsWith("/") ? path : path ? `/${path}` : "";
  const pageUrl = `${config.siteUrl}${canonicalPath}`;
  const canonicalUrl = canonicalUrlOverride ?? pageUrl;
  const openGraphUrl = openGraphUrlOverride ?? canonicalUrl;
  const pageTitle = title ? `${title} | ${config.siteName}` : config.siteName;

  const ogImageUrl = ogImage
    ? ogImage.startsWith("http")
      ? ogImage
      : `${config.siteUrl}${ogImage.startsWith("/") ? ogImage : `/${ogImage}`}`
    : config.ogImageUrl;

  const openGraph: NonNullable<Metadata["openGraph"]> = {
    type: ogType,
    locale: config.locale,
    url: openGraphUrl,
    siteName: config.siteName,
    title: title ?? config.siteName,
    description,
    ...(ogImageUrl
      ? {
          images: [
            {
              url: ogImageUrl,
              width: 1200,
              height: 630,
              alt: title ?? config.siteName,
            },
          ],
        }
      : {}),
  };

  const twitter: NonNullable<Metadata["twitter"]> = {
    card: "summary_large_image",
    title: title ?? config.siteName,
    description,
    ...(config.twitterSite ? { site: `@${config.twitterSite.replace(/^@/, "")}` } : {}),
    ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
  };

  return {
    title: title
      ? { absolute: pageTitle }
      : { default: config.siteName, template: `%s | ${config.siteName}` },
    description,
    keywords,
    applicationName: config.siteName,
    metadataBase: new URL(config.siteUrl),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: canonicalUrl,
        "en-BD": canonicalUrl,
      },
    },
    robots: shouldNoIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
          },
        },
    openGraph,
    twitter,
    formatDetection: {
      email: true,
      address: false,
      telephone: true,
    },
    ...buildVerificationMetadata(),
  };
}
