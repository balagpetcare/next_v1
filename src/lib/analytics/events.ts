import { trackEvent } from "./track";
import type { BpaAnalyticsParams } from "./types";

type EventParams = Omit<BpaAnalyticsParams, "app_surface"> & {
  app_surface?: BpaAnalyticsParams["app_surface"];
};

export function trackHomepageVisit(params: EventParams = {}): void {
  trackEvent("homepage_visit", params);
}

export function trackVaccinationPageVisit(params: EventParams = {}): void {
  trackEvent("vaccination_page_visit", params);
}

export function trackBookNowClick(params: EventParams = {}): void {
  trackEvent("book_now_click", params);
}

export function trackCheckoutStart(params: EventParams = {}): void {
  trackEvent("checkout_start", params);
}

export function trackPaymentSuccess(params: EventParams = {}): void {
  trackEvent("payment_success", params);
}

export function trackPaymentFailure(params: EventParams = {}): void {
  trackEvent("payment_failure", params);
}
