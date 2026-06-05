import { getAnalyticsConfig } from "./config";
import { pushDataLayer, trackClarity, trackGa4, trackMeta } from "./providers";
import type { BpaAnalyticsEvent, BpaAnalyticsEventName, BpaAnalyticsParams } from "./types";

export function trackEvent(
  event: BpaAnalyticsEventName,
  params: Omit<BpaAnalyticsParams, "app_surface"> & { app_surface?: BpaAnalyticsParams["app_surface"] } = {}
): void {
  if (typeof window === "undefined") return;

  const config = getAnalyticsConfig();
  const body = {
    ...params,
    event,
    app_surface: params.app_surface ?? config.appSurface,
    page_path:
      typeof params.page_path === "string" ? params.page_path : window.location.pathname,
    page_title:
      typeof params.page_title === "string" ? params.page_title : document.title,
  } satisfies BpaAnalyticsEvent;

  pushDataLayer(body);

  if (config.gaMeasurementId) trackGa4(body, config.gaMeasurementId);
  if (config.metaPixelId) trackMeta(body);
  if (config.clarityProjectId) trackClarity(body);

  if (config.debug) {
    console.debug("[bpa-analytics]", body);
  }
}

/** Non-canonical events (funnel steps, locator, etc.) — dataLayer + GA4 only */
export function trackLegacyEvent(
  event: string,
  params: Record<string, string | number | boolean | undefined> = {}
): void {
  if (typeof window === "undefined") return;

  const config = getAnalyticsConfig();
  const body = {
    event,
    app_surface: config.appSurface,
    page_path: window.location.pathname,
    ...params,
  };

  pushDataLayer(body as BpaAnalyticsEvent);

  if (typeof window.gtag === "function") {
    window.gtag("event", event, body);
  }

  if (config.debug) {
    console.debug("[bpa-analytics:legacy]", body);
  }
}
