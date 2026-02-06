"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { useBranchContext } from "@/lib/useBranchContext";
import { getFilteredBranchSidebar } from "@/src/lib/branchSidebarConfig";

function isActive(pathname, href) {
  if (!href || !pathname) return false;
  const p = pathname.replace(/\/$/, "");
  const h = href.replace(/\/$/, "");
  if (p === h) return true;
  return p.startsWith(h + "/");
}

export default function StaffBranchSidebar({ branchId, sidebarActive, mobileMenu, onMobileClose }) {
  const pathname = usePathname();
  const { branch, myAccess, isLoading, kpis, todayBoard } = useBranchContext(branchId || "");
  const permissions = myAccess?.permissions ?? [];
  const bid = String(branchId || "");

  const counts = {
    approvals: todayBoard?.approvalsPending?.length ?? kpis?.approvalsPending ?? undefined,
    lowStock: kpis?.lowStockCount ?? undefined,
    clinicQueue: todayBoard?.appointmentsQueue?.length ?? undefined,
  };

  const filtered = getFilteredBranchSidebar(bid, branch, permissions, counts);

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
        <Link href="/staff/branch" className="sidebar-logo" title="Branch selector">
          <img src="/assets/images/logo.png" alt="BPA" className="light-logo" />
          <img src="/assets/images/logo-light.png" alt="BPA" className="dark-logo" />
          <img src="/assets/images/logo-icon.png" alt="BPA" className="logo-icon" />
        </Link>
        {branch?.name && (
          <div className="mt-2 px-3 text-center">
            <span
              className="badge bg-primary-focus text-primary-600 radius-12 text-truncate d-inline-block"
              style={{ maxWidth: "100%" }}
              title={branch.name}
            >
              {branch.name}
            </span>
          </div>
        )}
        {isLoading && !branch?.name && (
          <div className="mt-2 px-3 text-center">
            <span className="text-secondary-light text-sm">Loading...</span>
          </div>
        )}
      </div>

      <div className="sidebar-menu-area">
        <ul className="sidebar-menu" id="sidebar-menu">
          {filtered.map((g) => (
            <React.Fragment key={g.group}>
              <li className="sidebar-section-label text-uppercase text-secondary-light text-sm px-3 mt-2 list-unstyled">
                {g.group}
              </li>
              {g.items.map((it) => (
                <li key={it.key}>
                  <Link
                    href={it.href}
                    className={isActive(pathname, it.href) ? "active-page" : ""}
                  >
                    <Icon icon={it.icon || "solar:menu-dots-outline"} className="menu-icon" />
                    <span>{it.label}</span>
                    {it.badge !== undefined && it.badge !== null && it.badge !== "" && (
                      <span className="badge bg-primary-focus text-primary-600 radius-12 ms-2" style={{ fontSize: 10 }}>
                        {it.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </React.Fragment>
          ))}
        </ul>
      </div>
    </aside>
  );
}
