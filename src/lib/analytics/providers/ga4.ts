import type { BpaAnalyticsEvent, BpaAnalyticsEventName } from "../types";

const GA4_PAGE_EVENTS: BpaAnalyticsEventName[] = [
  "homepage_visit",
  "vaccination_page_visit",
];

export function trackGa4(event: BpaAnalyticsEvent, measurementId?: string): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  const { event: name, ...params } = event;

  if (GA4_PAGE_EVENTS.includes(name)) {
    window.gtag("event", "page_view", {
      page_path: params.page_path,
      page_title: params.page_title,
      send_to: measurementId,
      bpa_event: name,
      ...params,
    });
  }

  window.gtag("event", name, params);
}
