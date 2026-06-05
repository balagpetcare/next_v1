import type { BpaAnalyticsEvent } from "../types";

export function trackClarity(event: BpaAnalyticsEvent): void {
  if (typeof window === "undefined" || typeof window.clarity !== "function") return;

  try {
    window.clarity("event", event.event);
    window.clarity("set", "bpa_surface", event.app_surface);
    if (event.campaign_slug) window.clarity("set", "campaign_slug", event.campaign_slug);
    if (event.page_path) window.clarity("set", "page_path", event.page_path);
  } catch {
    /* ignore */
  }
}
