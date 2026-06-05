"use client";

import { Suspense } from "react";
import { getAnalyticsConfig } from "../config";
import AnalyticsClickTracker from "./AnalyticsClickTracker";
import AnalyticsPageView from "./AnalyticsPageView";
import AnalyticsProvider from "./AnalyticsProvider";

export default function AnalyticsShell() {
  const { gtmContainerId } = getAnalyticsConfig();

  return (
    <>
      {gtmContainerId ? (
        <noscript>
          <iframe
            title="Google Tag Manager"
            src={`https://www.googletagmanager.com/ns.html?id=${gtmContainerId}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
      ) : null}
      <AnalyticsProvider />
      <Suspense fallback={null}>
        <AnalyticsPageView />
      </Suspense>
      <AnalyticsClickTracker />
    </>
  );
}
