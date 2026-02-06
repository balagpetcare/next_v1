"use client";
import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import ThemeToggleButton from "@/helper/ThemeToggleButton";
import { DEFAULT_NAV, PANELS } from "@/bpa/panels";

function join(basePath, href) {
  if (!href) return basePath;
  if (href.startsWith("/")) return basePath + href;
  return basePath + "/" + href;
}

export default function BPAMasterLayout({ panelKey, nav = DEFAULT_NAV, children }) {
  const pathname = usePathname();
  const panel = PANELS[panelKey] || PANELS.admin;
  const [sidebarActive, setSidebarActive] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  const basePath = panel.basePath;

  return (
    <section className={mobileMenu ? "overlay active" : "overlay"}>
      {/* Sidebar */}
      <aside
        className={
          sidebarActive ? "sidebar active" : mobileMenu ? "sidebar sidebar-open" : "sidebar"
        }
      >
        <button onClick={() => setMobileMenu(!mobileMenu)} type="button" className="sidebar-close-btn">
          <Icon icon="radix-icons:cross-2" />
        </button>

        <div>
          <Link href={join(basePath, "/dashboard")} className="sidebar-logo" title={panel.brand?.title || "BPA"}>
            <img src="/assets/images/logo.png" alt="logo" className="light-logo" />
            <img src="/assets/images/logo-light.png" alt="logo" className="dark-logo" />
            <img src="/assets/images/logo-icon.png" alt="logo" className="logo-icon" />
          </Link>
        </div>

        <div className="sidebar-menu-area">
          <ul className="sidebar-menu" id="sidebar-menu">
            {nav.map((item) => {
              const href = join(basePath, item.href);
              const active = pathname === href || pathname?.startsWith(href + "/");
              return (
                <li key={item.key}>
                  <Link href={href} className={active ? "active-page" : ""}>
                    <Icon icon={item.icon} className="menu-icon" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* Main */}
      <main className={sidebarActive ? "dashboard-main active" : "dashboard-main"}>
        {/* Top bar */}
        <div className="navbar-header">
          <div className="row align-items-center justify-content-between">
            <div className="col-auto">
              <button
                type="button"
                className="sidebar-toggle"
                onClick={() => setSidebarActive(!sidebarActive)}
                title="Toggle sidebar"
              >
                <Icon icon="heroicons:bars-3-bottom-left-20-solid" />
              </button>
              <button
                type="button"
                className="sidebar-mobile-toggle ms-2"
                onClick={() => setMobileMenu(!mobileMenu)}
                title="Open menu"
              >
                <Icon icon="heroicons:bars-3-bottom-left-20-solid" />
              </button>
            </div>

            <div className="col-auto d-flex align-items-center gap-3">
              <span className="d-none d-md-inline text-secondary">{panel.label}</span>
              <ThemeToggleButton />
              <Link href={join(basePath, "/logout")} className="btn btn-sm btn-outline-primary">
                Logout
              </Link>
            </div>
          </div>
        </div>

        <div className="dashboard-body">{children}</div>
      </main>
    </section>
  );
}
