"use client";

import { useEffect } from "react";

/**
 * Loads template JS/CSS plugins on client side.
 * Uses static import() paths so webpack can resolve them (avoids "Critical dependency: expression").
 * Optional deps use .catch() so missing modules don't break the app.
 */
export default function PluginInit() {
  useEffect(() => {
    import("bootstrap/dist/js/bootstrap.bundle.min.js").catch(() => {});
    import("react-quill-new/dist/quill.snow.css").catch(() => {});
    import("jsvectormap/dist/css/jsvectormap.min.css").catch(() => {
      import("jsvectormap/dist/css/jsvectormap.css").catch(() => {});
    });
    import("react-toastify/dist/ReactToastify.css").catch(() => {});
  }, []);

  return null;
}
