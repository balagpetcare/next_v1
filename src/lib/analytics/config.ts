import type { AnalyticsConfig, AppSurface } from "./types";

function readEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function resolveAppSurface(): AppSurface {
  const explicit = readEnv("NEXT_PUBLIC_ANALYTICS_APP_SURFACE");
  if (explicit === "landing" || explicit === "campaign" || explicit === "panel") return explicit;
  if (readEnv("NEXT_PUBLIC_DEFAULT_PANEL")) return "panel";
  return readEnv("NEXT_PUBLIC_CAMPAIGN_SLUG") ? "campaign" : "landing";
}

export function getAnalyticsConfig(): AnalyticsConfig {
  const gaMeasurementId = readEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID");
  const gtmContainerId = readEnv("NEXT_PUBLIC_GTM_CONTAINER_ID");
  const metaPixelId = readEnv("NEXT_PUBLIC_META_PIXEL_ID");
  const clarityProjectId = readEnv("NEXT_PUBLIC_CLARITY_PROJECT_ID");

  const enabled = Boolean(gaMeasurementId || gtmContainerId || metaPixelId || clarityProjectId);
  const debug = process.env.NODE_ENV === "development";

  return {
    enabled,
    appSurface: resolveAppSurface(),
    gaMeasurementId,
    gtmContainerId,
    metaPixelId,
    clarityProjectId,
    debug,
  };
}
