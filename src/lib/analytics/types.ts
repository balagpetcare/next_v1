/** Which BPA web surface emitted the event */
export type AppSurface = "landing" | "campaign" | "panel";

/** Canonical conversion events (same names across GA4, Meta, Clarity) */
export type BpaAnalyticsEventName =
  | "homepage_visit"
  | "vaccination_page_visit"
  | "book_now_click"
  | "checkout_start"
  | "payment_success"
  | "payment_failure";

export type BpaAnalyticsParams = {
  app_surface: AppSurface;
  page_path?: string;
  page_title?: string;
  campaign_slug?: string;
  booking_ref?: string;
  checkout_id?: string;
  destination_url?: string;
  cta_location?: string;
  payment_status?: string;
  value?: number;
  currency?: string;
  [key: string]: string | number | boolean | undefined;
};

export type BpaAnalyticsEvent = {
  event: BpaAnalyticsEventName;
} & BpaAnalyticsParams;

export type AnalyticsConfig = {
  enabled: boolean;
  appSurface: AppSurface;
  gaMeasurementId?: string;
  gtmContainerId?: string;
  metaPixelId?: string;
  clarityProjectId?: string;
  debug: boolean;
};

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

export {};
