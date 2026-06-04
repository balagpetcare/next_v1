"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/staff/campaign", label: "Home", icon: "ri-home-4-line", exact: true },
  { href: "/staff/campaign/scan", label: "Scan", icon: "ri-qr-scan-2-line" },
  { href: "/staff/campaign/lookup", label: "Lookup", icon: "ri-search-line" },
  { href: "/staff/campaign/history", label: "History", icon: "ri-history-line" },
];

export default function CampaignStaffShell({ children, title, backHref, hideBottomNav }) {
  const pathname = usePathname();
  const autoHide =
    pathname?.includes("/booking/") ||
    pathname?.includes("/vaccinate/") ||
    pathname?.includes("/certificate/");
  const hideNav = hideBottomNav ?? autoHide;

  return (
    <div className="d-flex flex-column min-vh-100 bg-light" style={{ paddingBottom: hideNav ? 0 : 72 }}>
      <header className="bg-white border-bottom sticky-top px-3 py-2 d-flex align-items-center gap-2">
        {backHref ? (
          <Link href={backHref} className="btn btn-sm btn-light" aria-label="Go back">
            <i className="ri-arrow-left-line" aria-hidden />
          </Link>
        ) : null}
        <div className="flex-grow-1 min-w-0">
          <div className="fw-semibold text-truncate">{title || "Vaccination campaign"}</div>
          <div className="text-muted small">BPA staff portal</div>
        </div>
        <Link href="/staff/login?returnTo=/staff/campaign" className="btn btn-sm btn-outline-secondary flex-shrink-0">
          Account
        </Link>
      </header>
      <main className="flex-grow-1 p-3" style={{ maxWidth: 640, width: "100%", margin: "0 auto" }}>
        {children}
      </main>
      {!hideNav ? (
        <nav
          className="fixed-bottom bg-white border-top d-flex justify-content-around py-1"
          style={{ zIndex: 1030, maxWidth: 640, left: "50%", transform: "translateX(-50%)", width: "100%" }}
          aria-label="Campaign staff navigation"
        >
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`btn btn-link text-decoration-none d-flex flex-column align-items-center small py-2 px-1 ${
                  active ? "text-primary fw-semibold" : "text-muted"
                }`}
                style={{ minWidth: 64 }}
              >
                <i className={`${item.icon} fs-5`} aria-hidden />
                <span style={{ fontSize: "0.65rem" }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
