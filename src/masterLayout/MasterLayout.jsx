"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Icon } from "@iconify/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/app/(public)/_lib/LanguageContext";
import { buildMenu, appKeyFromPath } from "../lib/permissionMenu";
import { isBranchRoute, getBranchIdFromPath, isStaffBranchRoute, getStaffBranchIdFromPath } from "../lib/branchMenu";
import StaffBranchSidebar from "../components/branch/StaffBranchSidebar";
import { useMe } from "../lib/useMe";
import { usePolicyFeatures } from "@/lib/usePolicyFeatures";
import { useEntityCounts } from "../../app/owner/_hooks/useEntityCounts";
import BranchSidebar from "../../app/owner/_components/branch/BranchSidebar";
import NotificationBadge from "../../app/owner/_components/NotificationBadge";
import NotificationBell from "../components/NotificationBell";
import ContextSelector from "../../app/owner/_components/ContextSelector";

function isActive(pathname, href) {
  if (!href) return false;
  if (href === "/owner") return pathname === "/owner" || pathname === "/owner/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function MasterLayout({ children }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [sidebarActive, setSidebarActive] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  const logoutHref = useMemo(() => {
    if (!pathname) return "/api/logout";
    if (pathname.startsWith("/owner")) return "/owner/logout";
    if (pathname.startsWith("/admin")) return "/admin/logout";
    if (pathname.startsWith("/partner")) return "/partner/logout";
    if (pathname.startsWith("/country")) return "/api/logout";
    if (pathname.startsWith("/staff")) return "/api/logout";
    if (pathname.startsWith("/shop")) return "/api/logout";
    if (pathname.startsWith("/clinic")) return "/api/logout";
    if (pathname.startsWith("/producer")) return "/api/logout";
    return "/api/logout";
  }, [pathname]);

  const panelTitle = useMemo(() => {
    if (!pathname) return "User";
    if (pathname.startsWith("/admin")) return "Admin";
    if (pathname.startsWith("/country")) return "Country";
    if (pathname.startsWith("/owner")) return "Owner";
    if (pathname.startsWith("/partner")) return "Partner";
    if (pathname.startsWith("/staff")) return "Staff";
    if (pathname.startsWith("/shop")) return "Shop";
    if (pathname.startsWith("/clinic")) return "Clinic";
    return "User";
  }, [pathname]);

  const settingsHref = useMemo(() => {
    if (!pathname) return "/owner/settings";
    if (pathname.startsWith("/admin")) return "/admin/settings";
    if (pathname.startsWith("/country")) return "/country/settings/features";
    if (pathname.startsWith("/owner")) return "/owner/settings";
    if (pathname.startsWith("/partner")) return "/partner/dashboard";
    if (pathname.startsWith("/staff")) return "/staff/branches";
    return "/owner/settings";
  }, [pathname]);

  const profileHref = useMemo(() => {
    if (!pathname) return "/owner/settings";
    if (pathname.startsWith("/admin")) return "/admin/settings";
    if (pathname.startsWith("/country")) return "/country/profile";
    if (pathname.startsWith("/owner")) return "/owner/settings";
    if (pathname.startsWith("/partner")) return "/partner/dashboard";
    return "/owner/settings";
  }, [pathname]);
  const sidebarControl = () => setSidebarActive((v) => !v);
  const mobileMenuControl = () => setMobileMenu((v) => !v);

  const isAdmin = !!pathname && pathname.startsWith("/admin");
  const isOwner = !!pathname && pathname.startsWith("/owner");
  const isPartner = !!pathname && pathname.startsWith("/partner");

  const isBranchView = isOwner && isBranchRoute(pathname);
  const branchIdFromPath = isBranchView ? getBranchIdFromPath(pathname) : null;
  const isStaffBranchView = !!pathname && isStaffBranchRoute(pathname);
  const staffBranchIdFromPath = isStaffBranchView ? getStaffBranchIdFromPath(pathname) : null;

  // Permission-driven menu (Phase-4)
  const { me } = useMe(pathname);
  // Phase 5: policy-based UI – hide Donation/Ads nav when feature disabled for country
  const { donationEnabled, adsEnabled } = usePolicyFeatures();

  const branchName = useMemo(() => {
    if (!branchIdFromPath || !me?.branches) return null;
    const b = (me.branches || []).find((x) => String(x.id) === String(branchIdFromPath));
    return b?.name || b?.title || `Branch #${branchIdFromPath}`;
  }, [branchIdFromPath, me?.branches]);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  
  // Entity counts for badges (only for owner)
  const { counts } = useEntityCounts();

  const appKey = useMemo(() => appKeyFromPath(pathname), [pathname]);

  const menuItems = useMemo(() => {
    const perms = Array.isArray(me?.permissions) ? me.permissions : [];
    // If backend permission seeding isn't finished yet, perms can be empty.
    // We still want to show core navigation for authenticated users.
    return buildMenu(appKey, perms, { isAuthenticated: !!me });
  }, [appKey, me]);

  const homeItem = useMemo(() => {
    const defaultContextType = me?.defaultContext?.type;
    const isTeamContext = defaultContextType === "TEAM" && isOwner;
    if (isTeamContext) {
      const workspaceItem = menuItems.find((x) => x.href === "/owner/workspace");
      if (workspaceItem) return workspaceItem;
    }
    const first = menuItems.find((x) => !!x.href) || null;
    if (first) return first;
    if (isAdmin) return { id: "admin.home", label: t("common.dashboard"), href: "/admin/dashboard", icon: "solar:home-smile-angle-outline" };
    if (isOwner) return { id: "owner.home", label: t("common.dashboard"), href: "/owner/dashboard", icon: "solar:home-smile-angle-outline" };
    if (pathname?.startsWith("/shop")) return { id: "shop.home", label: t("common.dashboard"), href: "/shop", icon: "solar:home-smile-angle-outline" };
    if (pathname?.startsWith("/clinic")) return { id: "clinic.home", label: t("common.dashboard"), href: "/clinic", icon: "solar:home-smile-angle-outline" };
    return { id: "home", label: t("common.home"), href: "/", icon: "solar:home-smile-angle-outline" };
  }, [menuItems, isAdmin, isOwner, pathname, me?.defaultContext?.type, t]);

  const menuRest = useMemo(() => menuItems.filter((x) => x.id !== homeItem.id), [menuItems, homeItem.id]);

  // Phase 5: filter menu by policy (hide DONATION/ADS items when disabled for country)
  const menuRestPolicyFiltered = useMemo(() => {
    const featureOk = (pf) => {
      if (!pf) return true;
      if (pf === "DONATION") return donationEnabled;
      if (pf === "ADS") return adsEnabled;
      return true;
    };
    const filterChildren = (items) => {
      if (!items || !items.length) return items;
      return items
        .filter((it) => featureOk(it.policyFeature))
        .map((it) => (it.children ? { ...it, children: filterChildren(it.children) } : it))
        .filter((it) => !it.children || it.children.length > 0);
    };
    return menuRest.map((g) => (g.children ? { ...g, children: filterChildren(g.children) } : g)).filter((g) => !g.children || g.children.length > 0);
  }, [menuRest, donationEnabled, adsEnabled]);

  // Owner UX: show branches quick-links inside sidebar (from cached /me)
  // so Owners can see all their branches without leaving the sidebar.
  // Also inject badge counts for entities
  const menuRestWithBranchLinks = useMemo(() => {
    if (!isOwner) return menuRestPolicyFiltered;
    const branches = Array.isArray(me?.branches) ? me.branches : [];

    return menuRestPolicyFiltered.map((g) => {
      if (g.id === "owner.requests" && Array.isArray(g.children)) {
        const children = g.children.map((child) => {
          let badge = child.badge;
          if (child.badgeType === "count") {
            if (child.id === "owner.requests.inbox") badge = counts.requests;
            else if (child.id === "owner.requests.product") badge = counts.productRequests;
            else if (child.id === "owner.requests.transfers") badge = counts.transfers;
            else if (child.id === "owner.requests.adjustments") badge = counts.adjustments;
            else if (child.id === "owner.requests.returns") badge = counts.returns;
            else if (child.id === "owner.requests.cancellations") badge = counts.cancellations;
            else if (child.id === "owner.requests.notifications") badge = counts.notifications;
          }
          return { ...child, badge };
        });
        const totalBadge = children.reduce(
          (sum, c) => sum + (typeof c.badge === "number" ? c.badge : 0),
          0
        );
        return { ...g, badge: totalBadge || g.badge, children };
      }

      if (g.id !== "owner.myBusiness" || !Array.isArray(g.children)) return g;

      const children = g.children.map((child) => {
        // Add badge counts
        let badge = child.badge;
        if (child.badgeType === "count") {
          if (child.id === "owner.orgs") {
            badge = counts.organizations;
          } else if (child.id === "owner.branches") {
            badge = counts.branches;
          } else if (child.id === "owner.staffs") {
            badge = counts.staffs;
          }
        }
        return { ...child, badge };
      });

      // Find the "Branches" menu item
      const branchesIdx = children.findIndex((x) => x.id === "owner.branches");
      if (branchesIdx !== -1 && branches.length > 0) {
        const branchLinks = branches
          .filter((b) => b && (b.id !== undefined && b.id !== null))
          .map((b) => ({
            id: `owner.branch.${b.id}`,
            label: String(b.name || b.title || `Branch #${b.id}`),
            href: `/owner/branches/${b.id}`,
            required: [],
          }));

        // Insert branch links right after the Branches item
        children.splice(branchesIdx + 1, 0, ...branchLinks);
      }
      return { ...g, children };
    });
  }, [isOwner, menuRestPolicyFiltered, me, counts]);

  // IMPORTANT: dropdown click handlers depend on DOM nodes.
  // Menu items are injected async after /me loads, so we must re-bind listeners
  // whenever the menu structure changes (not only when pathname changes).
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleDropdownClick = (event) => {
      event.preventDefault();
      const clickedLink = event.currentTarget;
      const clickedDropdown = clickedLink.closest(".dropdown");
      if (!clickedDropdown) return;

      const isOpen = clickedDropdown.classList.contains("open");

      // Close all dropdowns
      const allDropdowns = document.querySelectorAll(".sidebar-menu .dropdown");
      allDropdowns.forEach((dropdown) => {
        dropdown.classList.remove("open");
        const submenu = dropdown.querySelector(".sidebar-submenu");
        if (submenu) submenu.style.maxHeight = "0px";
      });

      // Toggle clicked
      if (!isOpen) {
        clickedDropdown.classList.add("open");
        const submenu = clickedDropdown.querySelector(".sidebar-submenu");
        if (submenu) submenu.style.maxHeight = `${submenu.scrollHeight}px`;
      }
    };

    const dropdownTriggers = document.querySelectorAll(
      ".sidebar-menu .dropdown > a, .sidebar-menu .dropdown > span, .sidebar-menu .dropdown > button"
    );
    dropdownTriggers.forEach((trigger) => trigger.addEventListener("click", handleDropdownClick));

    // Auto-open dropdown that contains active page
    const allDropdowns = document.querySelectorAll(".sidebar-menu .dropdown");
    allDropdowns.forEach((dropdown) => {
      const submenuLinks = dropdown.querySelectorAll(".sidebar-submenu li a");
      submenuLinks.forEach((link) => {
        const href = link.getAttribute("href") || "";
        if (href && pathname && (pathname === href || pathname.startsWith(href + "/"))) {
          dropdown.classList.add("open");
          const submenu = dropdown.querySelector(".sidebar-submenu");
          if (submenu) submenu.style.maxHeight = `${submenu.scrollHeight}px`;
        }
      });
    });

    return () => {
      dropdownTriggers.forEach((trigger) =>
        trigger.removeEventListener("click", handleDropdownClick)
      );
    };
  }, [pathname, menuRestWithBranchLinks]);

  // Profile dropdown click outside handler
  useEffect(() => {
    if (!profileDropdownOpen) return;

    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [profileDropdownOpen]);

  // Extract user profile data
  const userProfile = me?.profile || me?.data?.profile || me?.user?.profile;
  const displayName =
    userProfile?.displayName ||
    me?.owner?.name ||
    me?.data?.owner?.name ||
    me?.user?.profile?.displayName ||
    panelTitle;
  const avatarUrl =
    userProfile?.avatarMedia?.url ||
    me?.user?.profile?.avatarMedia?.url ||
    null;
  const userAuth = me?.auth || me?.data?.auth || me?.user?.auth;
  const userEmail = userAuth?.email || me?.email || "";
  const userPhone = userAuth?.phone || me?.phone || "";
  const userId = me?.id || me?.user?.id || me?.data?.id || "";
  const userIdentifier = userEmail || userPhone || (userId ? `ID: ${userId}` : "") || displayName;

  // (intentionally no extra dropdown binding effect below — the one above re-binds on menu change)

  return (
    <section className={mobileMenu ? "overlay active" : "overlay"}>
      {/* Sidebar: staff branch dashboard vs owner branch vs default */}
      {isStaffBranchView && staffBranchIdFromPath ? (
        <StaffBranchSidebar
          branchId={staffBranchIdFromPath}
          sidebarActive={sidebarActive}
          mobileMenu={mobileMenu}
          onMobileClose={mobileMenuControl}
        />
      ) : isBranchView && branchIdFromPath ? (
        <BranchSidebar
          pathname={pathname}
          branchId={branchIdFromPath}
          branchName={branchName}
          sidebarActive={sidebarActive}
          mobileMenu={mobileMenu}
          onMobileClose={mobileMenuControl}
        />
      ) : (
        <aside
          className={
            sidebarActive
              ? "sidebar active"
              : mobileMenu
              ? "sidebar sidebar-open"
              : "sidebar"
          }
        >
          <button onClick={mobileMenuControl} type="button" className="sidebar-close-btn">
            <Icon icon="radix-icons:cross-2" />
          </button>

          <div>
            <Link href={homeItem.href} className="sidebar-logo">
              <img src="/assets/images/logo.png" alt="BPA" className="light-logo" />
              <img src="/assets/images/logo-light.png" alt="BPA" className="dark-logo" />
              <img src="/assets/images/logo-icon.png" alt="BPA" className="logo-icon" />
            </Link>
          </div>

          <div className="sidebar-menu-area">
            <ul className="sidebar-menu" id="sidebar-menu">
              <li>
                <Link
                  href={homeItem.href}
                  className={isActive(pathname, homeItem.href) ? "active-page" : ""}
                >
                  <Icon icon="solar:home-smile-angle-outline" className="menu-icon" />
                  <span>{homeItem.label}</span>
                </Link>
              </li>

              {menuRestWithBranchLinks.map((g) => {
                const hasChildren = Array.isArray(g.children) && g.children.length > 0;
                const menuLabel = (item) => {
                  const key = item.labelKey || `menu.${item.id}`;
                  const out = t(key);
                  return out !== key ? out : item.label;
                };
                if (!hasChildren) {
                  return (
                    <li key={g.id}>
                      <Link href={g.href || "#"} className={isActive(pathname, g.href) ? "active-page" : ""}>
                        <Icon icon={g.icon || "solar:menu-dots-outline"} className="menu-icon" />
                        <span>{menuLabel(g)}</span>
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={g.id} className={isAdmin ? "dropdown sidebar-section" : "dropdown"}>
                    <Link href="#">
                      <Icon icon={g.icon || "solar:menu-dots-outline"} className="menu-icon" />
                      <span>{menuLabel(g)}</span>
                    </Link>
                    <ul className="sidebar-submenu">
                      {g.children.map((it) => (
                        <li key={it.id}>
                          <Link href={it.href || "#"} className={isActive(pathname, it.href) ? "active-page" : ""}>
                            <Icon icon="radix-icons:dot-filled" className="icon circle-icon w-auto" />
                            {menuLabel(it)}
                            {it.badge !== undefined && it.badge !== null && it.badge !== "" && (
                              <span className="badge bg-primary-focus text-primary-600 radius-12 ms-2" style={{ fontSize: 10 }}>
                                {it.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      )}

      {/* Main */}
      <main className={sidebarActive ? "dashboard-main active" : "dashboard-main"}>
        <div className="navbar-header">
          <div className="row align-items-center justify-content-between">
            <div className="col-auto">
              <div className="d-flex flex-wrap align-items-center gap-4">
                <button type="button" className="sidebar-toggle" onClick={sidebarControl}>
                  {sidebarActive ? (
                    <Icon icon="iconoir:arrow-right" className="icon text-2xl non-active" />
                  ) : (
                    <Icon icon="heroicons:bars-3-solid" className="icon text-2xl non-active" />
                  )}
                </button>

                <button onClick={mobileMenuControl} type="button" className="sidebar-mobile-toggle">
                  <Icon icon="heroicons:bars-3-solid" className="icon" />
                </button>

                <form className="navbar-search" onSubmit={(e) => e.preventDefault()}>
                  <input type="text" name="search" placeholder="Search" />
                  <Icon icon="ion:search-outline" className="icon" />
                </form>
              </div>
            </div>

            <div className="col-auto">
              <div className="d-flex flex-wrap align-items-center gap-3">
                {isOwner && (me?.contexts?.length > 1) && (
                  <ContextSelector
                    contexts={me.contexts}
                    defaultContext={me.defaultContext}
                    onSwitch={() => window.location.reload()}
                  />
                )}
                {isOwner && <NotificationBadge />}
                {(isOwner || isAdmin || pathname?.startsWith?.("/staff")) && <NotificationBell enabled={!!me} />}

                {/* Profile dropdown */}
                <div className="dropdown" ref={profileDropdownRef} style={{ position: "relative" }}>
                  <button
                    className="d-flex justify-content-center align-items-center rounded-circle"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setProfileDropdownOpen((prev) => !prev);
                    }}
                    style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-40-px h-40-px object-fit-cover rounded-circle"
                        style={{ border: "2px solid rgba(255,255,255,0.2)" }}
                        onError={(e) => {
                          if (e.target && e.target instanceof HTMLImageElement) {
                            e.target.src = "/assets/images/user.png";
                          }
                        }}
                      />
                    ) : (
                      <img
                        src="/assets/images/user.png"
                        alt="user"
                        className="w-40-px h-40-px object-fit-cover rounded-circle"
                      />
                    )}
                  </button>
                  {profileDropdownOpen && (
                    <div
                      className="dropdown-menu to-top dropdown-menu-sm"
                      style={{
                        position: "absolute",
                        right: 0,
                        top: "calc(100% + 10px)",
                        zIndex: 1000,
                        display: "block",
                        minWidth: "240px",
                      }}
                    >
                      <div className="py-12 px-16 radius-8 bg-primary-50 mb-16 d-flex align-items-center justify-content-between gap-2">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h6
                            className="text-lg text-primary-light fw-semibold mb-2"
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {displayName}
                          </h6>
                          <span
                            className="text-secondary-light fw-medium text-sm"
                            style={{
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {userIdentifier}
                          </span>
                          {userId && (
                            <span
                              className="text-secondary-light fw-medium text-xs"
                              style={{
                                display: "block",
                                marginTop: "4px",
                                fontSize: "11px",
                              }}
                            >
                              User ID: {userId}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="hover-text-danger"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setProfileDropdownOpen(false);
                          }}
                          style={{ border: "none", background: "transparent", cursor: "pointer", padding: "4px" }}
                        >
                          <Icon icon="radix-icons:cross-1" className="icon text-xl" />
                        </button>
                      </div>
                      <ul className="to-top-list">
                        <li>
                          <Link
                            className="dropdown-item text-black px-0 py-8 hover-bg-transparent hover-text-primary d-flex align-items-center gap-3"
                            href={profileHref}
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <Icon icon="solar:user-linear" className="icon text-xl" />
                            My Profile
                          </Link>
                        </li>
                        <li>
                          <Link
                            className="dropdown-item text-black px-0 py-8 hover-bg-transparent hover-text-primary d-flex align-items-center gap-3"
                            href={settingsHref}
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <Icon icon="icon-park-outline:setting-two" className="icon text-xl" />
                            Account Settings
                          </Link>
                        </li>
                        <li>
                          <Link
                            className="dropdown-item text-black px-0 py-8 hover-bg-transparent hover-text-primary d-flex align-items-center gap-3"
                            href={pathname?.startsWith?.("/staff") ? "/staff/notifications" : "/owner/notifications"}
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <Icon icon="solar:letter-linear" className="icon text-xl" />
                            Messages
                          </Link>
                        </li>
                        <li>
                          <Link
                            className="dropdown-item text-black px-0 py-8 hover-bg-transparent hover-text-danger d-flex align-items-center gap-3"
                            href={logoutHref}
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <Icon icon="lucide:power" className="icon text-xl" />
                            Log Out
                          </Link>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`dashboard-main-body${isOwner ? " owner-panel-ui" : ""}`}>{children}</div>

        <footer className="d-footer">
          <div className="row align-items-center justify-content-between">
            <div className="col-auto">
              <p className="mb-0">© 2026 BPA. All Rights Reserved.</p>
            </div>
            <div className="col-auto">
              <p className="mb-0">
                Powered by <span className="text-primary-600">WowDash</span>
              </p>
            </div>
          </div>
        </footer>
      </main>
    </section>
  );
}