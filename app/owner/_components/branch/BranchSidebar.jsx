"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import { getBranchMenuItems } from "@/src/lib/branchMenu";

function isActive(pathname, href, base) {
  if (!href) return false;
  const p = (pathname || "").replace(/\/$/, "");
  const h = (href || "").replace(/\/$/, "");
  if (p === h) return true;
  if (h === base && p.startsWith(base + "/")) return false;
  return p.startsWith(h + "/");
}

export default function BranchSidebar({ pathname, branchId, branchName, sidebarActive, mobileMenu, onMobileClose }) {
  const bid = String(branchId || "");
  const items = getBranchMenuItems(bid);
  const base = `/owner/branches/${bid}`;

  return (
    <aside
      className={
        sidebarActive ? "sidebar active" : mobileMenu ? "sidebar sidebar-open" : "sidebar"
      }
    >
      <button onClick={onMobileClose} type="button" className="sidebar-close-btn" aria-label="Close menu">
        <Icon icon="radix-icons:cross-2" />
      </button>

      <div>
        <Link href="/owner/dashboard" className="sidebar-logo" title="Back to main account">
          <img src="/assets/images/logo.png" alt="BPA" className="light-logo" />
          <img src="/assets/images/logo-light.png" alt="BPA" className="dark-logo" />
          <img src="/assets/images/logo-icon.png" alt="BPA" className="logo-icon" />
        </Link>
        {branchName && (
          <div className="mt-2 px-3 text-center">
            <span className="badge bg-primary-focus text-primary-600 radius-12 text-truncate d-inline-block" style={{ maxWidth: "100%" }} title={branchName}>
              {branchName}
            </span>
          </div>
        )}
      </div>

      <div className="sidebar-menu-area">
        <ul className="sidebar-menu" id="sidebar-menu">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={it.href}
                className={isActive(pathname, it.href, base) ? "active-page" : ""}
              >
                <Icon icon={it.icon || "solar:menu-dots-outline"} className="menu-icon" />
                <span>{it.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
