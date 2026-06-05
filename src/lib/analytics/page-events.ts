import { trackHomepageVisit, trackVaccinationPageVisit } from "./events";
import type { AppSurface } from "./types";

export function trackPageByPath(pathname: string, surface: AppSurface): void {
  const base = { page_path: pathname };

  if (surface === "landing") {
    if (pathname === "/") {
      trackHomepageVisit(base);
      return;
    }
    if (pathname === "/vaccination") {
      trackVaccinationPageVisit({ ...base, cta_location: "vaccination_bridge" });
      return;
    }
    return;
  }

  if (surface === "campaign") {
    if (pathname === "/") {
      trackVaccinationPageVisit({ ...base, cta_location: "campaign_home" });
      return;
    }
    if (pathname === "/book/payment/success") {
      return;
    }
    if (pathname === "/book/payment/failed") {
      return;
    }
  }
}
