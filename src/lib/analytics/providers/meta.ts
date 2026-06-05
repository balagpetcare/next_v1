import type { BpaAnalyticsEvent, BpaAnalyticsEventName } from "../types";

const META_STANDARD: Partial<Record<BpaAnalyticsEventName, string>> = {
  homepage_visit: "PageView",
  vaccination_page_visit: "ViewContent",
  book_now_click: "Lead",
  checkout_start: "InitiateCheckout",
  payment_success: "Purchase",
};

export function trackMeta(event: BpaAnalyticsEvent): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;

  const { event: name, value, currency, ...rest } = event;
  const standard = META_STANDARD[name];

  if (standard === "Purchase" && value != null) {
    window.fbq("track", standard, {
      value,
      currency: currency ?? "BDT",
      content_name: name,
      ...rest,
    });
    return;
  }

  if (standard) {
    window.fbq("track", standard, { content_name: name, ...rest });
    return;
  }

  window.fbq("trackCustom", name, rest);
}
