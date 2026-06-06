import type { MetadataRoute } from "next";
import { buildSitemapEntries } from "@/src/shared/seo/sitemap";
import { getSiteMode, isLandingMode } from "@/src/shared/panel/siteMode";

export default function sitemap(): MetadataRoute.Sitemap {
  if (isLandingMode(getSiteMode())) {
    return buildSitemapEntries([
      { path: "/", changeFrequency: "weekly", priority: 1 },
    ]);
  }

  return buildSitemapEntries([]);
}
