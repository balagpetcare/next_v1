"use client";

import { useEffect } from "react";

/**
 * Loads template JS/CSS plugins on client side.
 * Keep it resilient: some template dependencies may be optional in early phases.
 */
export default function PluginInit() {
  useEffect(() => {
    const safeRequire = (p) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require(p);
      } catch (e) {
        // Optional dependency or path mismatch — ignore in minimal build.
      }
    };

    // JS
    safeRequire("bootstrap/dist/js/bootstrap.bundle.min.js");

    // CSS (optional)
    safeRequire("react-quill/dist/quill.snow.css");

    // jsvectormap CSS path differs across versions/builds; try common paths.
    safeRequire("jsvectormap/dist/css/jsvectormap.css");
    safeRequire("jsvectormap/dist/css/jsvectormap.min.css");

    safeRequire("react-toastify/dist/ReactToastify.css");
    safeRequire("react-modal-video/css/modal-video.min.css");
  }, []);

  return null;
}
