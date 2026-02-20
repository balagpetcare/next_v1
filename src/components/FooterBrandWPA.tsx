"use client";

/**
 * WPA standard footer branding — single source of truth for credit text.
 * @2026 World Pet Association (WPA) — Pet Smart Solution
 * www.petsmartsolution.com (clickable)
 * Elegant small text, opacity 75–85%, centered on mobile, right/center on desktop, theme-safe.
 */
const WPA_URL = "https://www.petsmartsolution.com";

export default function FooterBrandWPA() {
  return (
    <div
      className="text-center text-lg-end small text-body-secondary"
      style={{
        fontSize: "0.75rem",
        opacity: 0.8,
        lineHeight: 1.4,
      }}
    >
      @2026 World Pet Association (WPA) — Pet Smart Solution
      <br />
      <a
        href={WPA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-body-secondary text-decoration-none"
        style={{ opacity: 0.9 }}
      >
        www.petsmartsolution.com
      </a>
    </div>
  );
}
