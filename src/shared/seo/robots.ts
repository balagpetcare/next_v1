import type { MetadataRoute } from "next";
import { getSeoConfig } from "./config";

export type RobotsRuleInput = {
  userAgent?: string;
  allow?: string | string[];
  disallow?: string | string[];
};

export type BuildRobotsInput = {
  rules?: RobotsRuleInput | RobotsRuleInput[];
  sitemap?: boolean;
};

function normalizePaths(value?: string | string[]): string[] | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value : [value];
}

/**
 * Build a Next.js MetadataRoute.Robots object.
 * Defaults: allow `/`, include sitemap URL from site config.
 */
export function buildRobots(input: BuildRobotsInput = {}): MetadataRoute.Robots {
  const { siteUrl, appSurface } = getSeoConfig();
  const { rules, sitemap = true } = input;

  if (rules) {
    const normalized = Array.isArray(rules) ? rules : [rules];
    return {
      rules: normalized.map((rule) => ({
        userAgent: rule.userAgent ?? "*",
        allow: normalizePaths(rule.allow),
        disallow: normalizePaths(rule.disallow),
      })),
      ...(sitemap ? { sitemap: `${siteUrl}/sitemap.xml` } : {}),
    };
  }

  // Panel dashboards should not be indexed
  if (appSurface === "panel") {
    return {
      rules: {
        userAgent: "*",
        disallow: ["/admin", "/shop", "/clinic", "/staff", "/mother", "/country", "/doctor", "/login", "/register"],
      },
      sitemap: sitemap ? `${siteUrl}/sitemap.xml` : undefined,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    ...(sitemap ? { sitemap: `${siteUrl}/sitemap.xml` } : {}),
  };
}
