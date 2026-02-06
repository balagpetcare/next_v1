"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * ✅ WowDash-aligned master layout for BPA dashboards
 * - Keeps WowDash classnames/structure so all pages inherit the same look.
 * - Sidebar + Topbar + Footer are centralized here.
 */

const APP_NAME = "BPA";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function isActive(pathname, href) {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function anyChildActive(pathname, children = []) {
  return (children || []).some((c) => isActive(pathname, c.href));
}

/** ---------------- Menus ---------------- */
function ownerMenu() {
  return [
    { type: "link", href: "/owner/dashboard", label: "Dashboard", icon: "ri-dashboard-2-line" },
    {
      type: "dropdown",
      key: "Accounts",
      label: "Accounts",
      icon: "ri-user-settings-line",
      children: [
        { href: "/owner/accounts/owners", label: "Owner Accounts" },
        { href: "/owner/accounts/staffs", label: "Staff Accounts" },
      ],
    },
    {
      type: "dropdown",
      key: "MyBusiness",
      label: "My Business",
      icon: "ri-briefcase-4-line",
      children: [
        { href: "/owner/organizations", label: "Organizations" },
        { href: "/owner/branches", label: "Branches" },
        { href: "/owner/staff", label: "Staffs" },
      ],
    },
    {
      type: "dropdown",
      key: "Settings",
      label: "Settings",
      icon: "ri-settings-3-line",
      children: [
        { href: "/owner/settings", label: "Settings" },
        { href: "/owner/profile", label: "Profile" },
      ],
    },
  ];
}

function minimalMenu(appKey) {
  const base = `/${appKey}`;
  return [{ type: "link", href: `${base}/dashboard`, label: "Dashboard", icon: "ri-dashboard-2-line" }];
}

/** Helpers to auto-open dropdown for active routes */
function getDropdownKeysToOpen(pathname, menu) {
  const keys = [];
  for (const it of menu || []) {
    if (it?.type === "dropdown" && it?.key && anyChildActive(pathname, it.children)) {
      keys.push(it.key);
    }
  }
  return keys;
}

/** ---------------- Sidebar ---------------- */
function Sidebar({
  pathname,
  appKey,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  openDropdowns,
  setOpenDropdowns,
}) {
  const menu = useMemo(() => {
    if (appKey === "owner") return ownerMenu();
    return minimalMenu(appKey);
  }, [appKey]);

  const toggleDropdown = (key) => {
    setOpenDropdowns((p) => ({ ...(p || {}), [key]: !Boolean(p?.[key]) }));
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <aside
      className={cx("sidebar", collapsed ? "active" : "", mobileOpen ? "sidebar-open" : "")}
      onMouseLeave={() => {
        // Keep your current behavior (optional)
        // closeMobile();
      }}
    >
      <button type="button" className="sidebar-close-btn" aria-label="Close" onClick={closeMobile}>
        <i className="ri-close-line" />
      </button>

      <div>
        <Link href={`/${appKey}`} className="sidebar-logo" onClick={closeMobile}>
          <img
            src="/assets/images/logo.png"
            alt={APP_NAME}
            className="light-logo"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <img
            src="/assets/images/logo-light.png"
            alt={APP_NAME}
            className="dark-logo"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <img
            src="/assets/images/logo-icon.png"
            alt={APP_NAME}
            className="logo-icon"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <span className="fw-bold ms-8">{APP_NAME}</span>
        </Link>
      </div>

      <div className="sidebar-menu-area">
        <ul className="sidebar-menu" id="sidebar-menu">
          {menu.map((it) => {
            if (it.type === "link") {
              const active = isActive(pathname, it.href);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className={active ? "active-page" : ""}
                    onClick={closeMobile}
                  >
                    <i className={cx("menu-icon", it.icon || "ri-circle-fill")} />
                    <span>{it.label}</span>
                  </Link>
                </li>
              );
            }

            if (it.type === "dropdown") {
              const openedByState = Boolean(openDropdowns?.[it.key]);
              const openedByActiveRoute = anyChildActive(pathname, it.children);
              const open = openedByState || openedByActiveRoute;

              return (
                <li
                  key={it.key}
                  className={cx("dropdown", open ? "open" : "")}
                  data-dropdown-key={it.key}
                >
                  <button
                    type="button"
                    className="w-100 bg-transparent border-0 p-0"
                    onClick={() => toggleDropdown(it.key)}
                    aria-expanded={open ? "true" : "false"}
                    aria-controls={`submenu_${it.key}`}
                  >
                    <span className="d-flex align-items-center w-100">
                      <i className={cx("menu-icon", it.icon || "ri-folder-2-line")} />
                      <span>{it.label}</span>
                      <i className="ri-arrow-down-s-line ms-auto" />
                    </span>
                  </button>

                  <ul
                    id={`submenu_${it.key}`}
                    className="sidebar-submenu"
                    style={{ display: open ? "block" : "none" }}
                  >
                    {(it.children || []).map((c) => {
                      const active = isActive(pathname, c.href);
                      return (
                        <li key={c.href}>
                          <Link
                            href={c.href}
                            className={active ? "active-page" : ""}
                            onClick={closeMobile}
                          >
                            <i className="ri-circle-fill circle-icon text-primary-600 w-auto" />
                            {c.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            }

            return null;
          })}
        </ul>
      </div>

      <div className="p-16 pt-0">
        <button
          type="button"
          className="btn btn-sm btn-outline-primary w-100 radius-12"
          onClick={() => setCollapsed((p) => !p)}
        >
          {collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        </button>
      </div>
    </aside>
  );
}

/** ---------------- Topbar ---------------- */
function Topbar({ appKey, onToggleSidebar, onToggleMobile }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    // Keep current theme on reload (optional)
    try {
      const t = window.localStorage.getItem("bpa_theme");
      if (t === "dark" || t === "light") {
        setTheme(t);
        document?.body?.classList?.toggle("dark", t === "dark");
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document?.body?.classList?.toggle("dark", next === "dark");
    try {
      window.localStorage.setItem("bpa_theme", next);
    } catch {
      // ignore
    }
  };

  return (
    <div className="navbar-header">
      <div className="row align-items-center justify-content-between">
        <div className="col-auto">
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="sidebar-toggle btn btn-light radius-12"
              onClick={onToggleSidebar}
              aria-label="Toggle sidebar"
            >
              <span className="icon">
                <i className="ri-menu-2-line" />
              </span>
            </button>

            <button
              type="button"
              className="sidebar-mobile-toggle btn btn-light radius-12"
              onClick={onToggleMobile}
              aria-label="Open sidebar"
            >
              <span className="icon">
                <i className="ri-menu-2-line" />
              </span>
            </button>

            <div className="d-none d-md-flex align-items-center gap-2">
              <span className="fw-bold">{APP_NAME}</span>
              <span className="text-muted small">/ {String(appKey || "").toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="col-auto">
          <div className="d-flex align-items-center gap-2">
            <button type="button" className="btn btn-light radius-12" onClick={toggleTheme} aria-label="Theme">
              <i className="ri-sun-line" />
            </button>

            {/* Bootstrap dropdown needs bootstrap JS. If not loaded, it won't open. */}
            <div className="dropdown">
              <button
                className="btn btn-light radius-12 d-flex align-items-center gap-2"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <span
                  className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary text-white"
                  style={{ width: 32, height: 32, fontWeight: 800 }}
                >
                  U
                </span>
                <span className="d-none d-md-inline fw-semibold">User</span>
                <i className="ri-arrow-down-s-line" />
              </button>

              <ul className="dropdown-menu dropdown-menu-end">
                <li>
                  <Link className="dropdown-item" href={`/${appKey}/profile`}>
                    <i className="ri-user-3-line me-2" />
                    Profile
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item" href={`/${appKey}/settings`}>
                    <i className="ri-settings-3-line me-2" />
                    Settings
                  </Link>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <Link className="dropdown-item" href={`/${appKey}/logout`}>
                    <i className="ri-logout-box-r-line me-2" />
                    Logout
                  </Link>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------------- Master ---------------- */
export default function SiteMaster({ appKey = "owner", children }) {
  const pathname = usePathname() || "";

  const storageKey = `bpa_sidebar_state_${appKey}`;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({});

  const hydratedRef = useRef(false);

  const menuForApp = useMemo(() => {
    if (appKey === "owner") return ownerMenu();
    return minimalMenu(appKey);
  }, [appKey]);

  /** Load persisted state */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        hydratedRef.current = true;
        return;
      }
      const st = JSON.parse(raw);
      if (typeof st?.collapsed === "boolean") setCollapsed(st.collapsed);
      if (st?.openDropdowns && typeof st.openDropdowns === "object") setOpenDropdowns(st.openDropdowns);
    } catch {
      // ignore
    } finally {
      hydratedRef.current = true;
    }
  }, [storageKey]);

  /** Persist state */
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ collapsed, openDropdowns }));
    } catch {
      // ignore
    }
  }, [collapsed, openDropdowns, storageKey]);

  /** Auto-open dropdown that contains active route */
  useEffect(() => {
    // Only for dropdown menus (owner)
    const keys = getDropdownKeysToOpen(pathname, menuForApp);
    if (!keys.length) return;

    setOpenDropdowns((prev) => {
      const next = { ...(prev || {}) };
      let changed = false;
      for (const k of keys) {
        if (!next[k]) {
          next[k] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [pathname, menuForApp]);

  return (
    <section className="dashboard">
      <Sidebar
        pathname={pathname}
        appKey={appKey}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        openDropdowns={openDropdowns}
        setOpenDropdowns={setOpenDropdowns}
      />

      <main className="dashboard-main">
        <Topbar
          appKey={appKey}
          onToggleSidebar={() => setCollapsed((p) => !p)}
          onToggleMobile={() => setMobileOpen((p) => !p)}
        />

        <div className="dashboard-main-body">{children}</div>

        <footer className="d-footer">
          <div className="row align-items-center justify-content-between">
            <div className="col-auto">
              <p className="mb-0">
                © {new Date().getFullYear()} {APP_NAME}. All Rights Reserved.
              </p>
            </div>
            <div className="col-auto">
              <p className="mb-0">
                Made for <span className="text-primary-600">BPA</span>
              </p>
            </div>
          </div>
        </footer>
      </main>
    </section>
  );
}
