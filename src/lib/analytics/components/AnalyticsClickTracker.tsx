"use client";

import { useEffect } from "react";
import { trackBookNowClick } from "../events";

const TRACK_ATTR = "data-bpa-track";

export default function AnalyticsClickTracker() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const tracked = target.closest(`[${TRACK_ATTR}]`);
      if (!(tracked instanceof HTMLElement)) return;

      const trackName = tracked.getAttribute(TRACK_ATTR);
      if (trackName !== "book_now_click") return;

      trackBookNowClick({
        cta_location: tracked.getAttribute("data-bpa-cta") ?? undefined,
        destination_url: tracked.getAttribute("href") ?? tracked.getAttribute("data-bpa-destination") ?? undefined,
        campaign_slug: tracked.getAttribute("data-bpa-campaign") ?? undefined,
      });
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
