/**
 * Runtime panel identity for multi-process production deploy (one build, many PM2 apps).
 * PM2 sets SITE_MODE per panel; NEXT_PUBLIC_DEFAULT_PANEL is kept in sync for analytics/SEO.
 */
export const PANEL_HOME_PATHS: Record<string, string> = {
  staff: "/staff",
  mother: "/mother",
  shop: "/shop",
  clinic: "/clinic",
  admin: "/admin",
  owner: "/owner",
  producer: "/producer",
  country: "/country",
  doctor: "/doctor",
};

const LANDING_MODES = new Set(["owner", "producer"]);

/** Resolve active panel mode (server/runtime). */
export function getSiteMode(): string {
  const fromEnv =
    process.env.SITE_MODE?.trim() || process.env.NEXT_PUBLIC_DEFAULT_PANEL?.trim();
  return fromEnv || "owner";
}

export function getPanelHomePath(mode?: string): string {
  const m = mode ?? getSiteMode();
  return PANEL_HOME_PATHS[m] ?? "/owner";
}

export function isLandingMode(mode?: string): boolean {
  return LANDING_MODES.has(mode ?? getSiteMode());
}

export function isProducerMode(mode?: string): boolean {
  return (mode ?? getSiteMode()) === "producer";
}

export function shouldRedirectRootFromPublic(mode?: string): boolean {
  return !isLandingMode(mode);
}
