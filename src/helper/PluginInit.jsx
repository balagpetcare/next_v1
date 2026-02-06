"use client";

import { useEffect } from "react";

/**
 * Best-effort loader for WowDash vendor scripts.
 * - Safe if scripts don't exist (it will just skip).
 * - Avoids duplicate injection.
 * - Checks file existence before loading to prevent 404 errors in logs.
 *
 * Your CSS is already linked in app/layout.jsx.
 * Note: Many libraries (like ApexCharts) are used via React wrappers (react-apexcharts)
 * rather than global scripts, so missing JS files are normal.
 */
const JS_FILES = [
  "/assets/js/lib/jquery-3.7.1.min.js",
  "/assets/js/lib/bootstrap.bundle.min.js",
  "/assets/js/lib/dataTables.min.js",
  "/assets/js/lib/apexcharts.min.js",
  "/assets/js/lib/slick.min.js",
  "/assets/js/lib/flatpickr.js",
  "/assets/js/app.js",
];

/**
 * Check if a file exists by making a HEAD request
 */
async function fileExists(src) {
  try {
    const response = await fetch(src, { method: "HEAD", cache: "no-cache" });
    return response.ok;
  } catch {
    return false;
  }
}

function injectScript(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(false);

    // Already present?
    const existing = document.querySelector(`script[data-bpa-script="1"][src="${src}"]`);
    if (existing) return resolve(true);

    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.defer = true;
    s.setAttribute("data-bpa-script", "1");
    s.onload = () => resolve(true);
    // Silently handle missing files - 404s are expected for optional scripts
    s.onerror = () => {
      // Script failed to load (likely 404) - this is expected for optional WowDash scripts
      resolve(false);
    };
    document.body.appendChild(s);
  });
}

export default function PluginInit() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      for (const src of JS_FILES) {
        if (cancelled) return;
        
        // Check if file exists before attempting to load
        // This prevents 404 errors from appearing in Next.js logs
        const exists = await fileExists(src);
        if (!exists) {
          // File doesn't exist, skip silently
          continue;
        }
        
        // eslint-disable-next-line no-await-in-loop
        await injectScript(src);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
