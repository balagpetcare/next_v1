import type { BpaAnalyticsEvent } from "../types";

export function pushDataLayer(event: BpaAnalyticsEvent): void {
  if (typeof window === "undefined") return;

  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      ...event,
      timestamp: new Date().toISOString(),
    });
  } catch {
    /* ignore */
  }
}
