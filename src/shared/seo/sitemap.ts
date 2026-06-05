import type { MetadataRoute } from "next";
import { getSeoConfig } from "./config";

export type SitemapEntryInput = {
  path: string;
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority?: number;
  lastModified?: Date | string;
};

/**
 * Build absolute sitemap URL for the current site.
 */
export function buildSitemapUrl(): string {
  const { siteUrl } = getSeoConfig();
  return `${siteUrl}/sitemap.xml`;
}

/**
 * Convert path entries to Next.js sitemap objects.
 */
export function buildSitemapEntries(entries: SitemapEntryInput[]): MetadataRoute.Sitemap {
  const { siteUrl } = getSeoConfig();
  const defaultLastModified = new Date();

  return entries.map((entry) => {
    const path = entry.path.startsWith("/") ? entry.path : `/${entry.path}`;
    return {
      url: `${siteUrl}${path === "/" ? "" : path}`.replace(/([^:]\/)\/+/g, "$1/") || siteUrl,
      lastModified: entry.lastModified ?? defaultLastModified,
      changeFrequency: entry.changeFrequency ?? "weekly",
      priority: entry.priority ?? 0.5,
    };
  });
}
