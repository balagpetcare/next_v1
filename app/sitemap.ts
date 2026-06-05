import type { MetadataRoute } from "next";
import { buildSitemapEntries } from "@/src/shared/seo/sitemap";

const siteMode = process.env.SITE_MODE || "owner";

export default function sitemap(): MetadataRoute.Sitemap {
  if (siteMode === "owner" || siteMode === "producer") {
    return buildSitemapEntries([
      { path: "/", changeFrequency: "weekly", priority: 1 },
    ]);
  }

  return buildSitemapEntries([]);
}
