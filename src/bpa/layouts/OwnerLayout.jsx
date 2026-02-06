"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggleButton from "@/helper/ThemeToggleButton";
import { apiFetch, ENDPOINTS } from "@/bpa/api/client";

const AUTH_COOKIE_NAME =
  process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME || "bpa_auth";

const BASE_OWNER_NAV = [
  {
    label: "Owner Onboarding",
    icon: "solar:user-check-outline",
    items: [
      { href: "/owner/onboarding", label: "Application" },
      { href: "/owner/dashboard", label: "Dashboard" },
    ],
  },
  {
    label: "Business Setup",
    icon: "solar:buildings-3-outline",
    items: [
      { href: "/owner/org/create", label: "Create Organization" },
      { href: "/owner/branches", label: "Branches" },
    ],
  },
  {
    label: "Staff Management",
    icon: "solar:users-group-two-rounded-outline",
    items: [
      { href: "/owner/branches", label: "Branch Teams" },
    ],
  },
  {
    label: "Products",
    icon: "solar:box-outline",
    items: [
      { href: "/owner/product-requests/new", label: "Create Product Request" },
      { href: "/owner/product-approvals", label: "Approval Queue" },
    ],
  },
  {
    label: "Settings",
    icon: "solar:settings-outline",
    items: [
      { href: "/owner/settings", label: "Settings" },
      { href: "/owner/logout", label: "Logout" },
    ],
  },
];


function hasAuthCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${AUTH_COOKIE_NAME}=`));
}

export default function OwnerLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarActive, setSidebarActive] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);

  const isAuthPage = useMemo(() => {
    return pathname?.startsWith("/owner/login");
  }, [pathname]);

  useEffect(() => {
    // Client-side guard for Owner area
    if (isAuthPage) return;

    const run = async () => {
      setMeLoading(true);
      try {
        // If cookie missing, go to login immediately
        if (!hasAuthCookie()) {
          router.replace("/owner/login");
          return;
        }

        const data = await apiFetch(ENDPOINTS.authMe);
        setMe(data);
      } catch (e) {
        router.replace("/owner/login");
      } finally {
        setMeLoading(false);
      }
    };

    run();
  }, [isAuthPage, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleDropdownClick = (event) => {
      event.preventDefault();
      const clickedLink = event.currentTarget;
      const clickedDropdown = clickedLink.closest(".dropdown");
      if (!clickedDropdown) return;

      const isActive = clickedDropdown.classList.contains("open");

      const allDropdowns = document.querySelectorAll(".sidebar-menu .dropdown");
      allDropdowns.forEach((dropdown) => {
        dropdown.classList.remove("open");
        const submenu = dropdown.querySelector(".sidebar-submenu");
        if (submenu) submenu.style.maxHeight = "0px";
      });

      if (!isActive) {
        clickedDropdown.classList.add("open");
        const submenu = clickedDropdown.querySelector(".sidebar-submenu");
        if (submenu) submenu.style.maxHeight = `${submenu.scrollHeight}px`;
      }
    };

    const dropdownTriggers = document.querySelectorAll(
      ".sidebar-menu .dropdown > a, .sidebar-menu .dropdown > Link"
    );
    dropdownTriggers.forEach((trigger) => {
      trigger.addEventListener("click", handleDropdownClick);
    });

    const openActiveDropdown = () => {
      const allDropdowns = document.querySelectorAll(".sidebar-menu .dropdown");
      allDropdowns.forEach((dropdown) => {
        const submenuLinks = dropdown.querySelectorAll(
          ".sidebar-submenu li a"
        );
        submenuLinks.forEach((link) => {
          if (link.getAttribute("href") === pathname) {
            dropdown.classList.add("open");
            const submenu = dropdown.querySelector(".sidebar-submenu");
            if (submenu) submenu.style.maxHeight = `${submenu.scrollHeight}px`;
          }
        });
      });
    };

    openActiveDropdown();

    return () => {
      dropdownTriggers.forEach((trigger) => {
        trigger.removeEventListener("click", handleDropdownClick);
      });
    };
  }, [pathname]);

  const sidebarControl = () => setSidebarActive((v) => !v);
  const mobileMenuControl = () => setMobileMenu((v) => !v);

  // Login page uses a minimal shell (no sidebar)
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <section className={mobileMenu ? "overlay active" : "overlay "}>
      <aside
        className={
          sidebarActive
            ? "sidebar active "
            : mobileMenu
            ? "sidebar sidebar-open"
            : "sidebar"
        }
      >
        <button
          onClick={mobileMenuControl}
          type='button'
          className='sidebar-close-btn'
        >
          <Icon icon='radix-icons:cross-2' />
        </button>

        <div>
          <Link href='/owner/dashboard' className='sidebar-logo'>
            <img
              src='/assets/images/logo.png'
              alt='site logo'
              className='light-logo'
            />
            <img
              src='/assets/images/logo-light.png'
              alt='site logo'
              className='dark-logo'
            />
            <img
              src='/assets/images/logo-icon.png'
              alt='site logo'
              className='logo-icon'
            />
          </Link>
        </div>

        <div className='sidebar-menu-area'>
          <ul className='sidebar-menu' id='sidebar-menu'>
            {navToRender.map((group) => (
              <li className='dropdown' key={group.label}>
                <Link href='#'>
                  <Icon icon={group.icon} className='menu-icon' />
                  <span>{group.label}</span>
                </Link>
                <ul className='sidebar-submenu'>
                  {group.items.map((it) => (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        className={pathname === it.href ? "active-page" : ""}
                      >
                        <i className='ri-circle-fill circle-icon text-primary-600 w-auto' />
                        {it.label}{typeof it.badge === "number" ? (
                          <span className="badge text-bg-danger ms-8">{it.badge}</span>
                        ) : null}</Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className={sidebarActive ? "dashboard-main active" : "dashboard-main"}>
        <div className='navbar-header'>
          <div className='row align-items-center justify-content-between'>
            <div className='col-auto'>
              <button
                type='button'
                className='sidebar-toggle-btn'
                onClick={sidebarControl}
              >
                <Icon icon='heroicons:bars-3-bottom-left-20-solid' />
              </button>
              <button
                type='button'
                className='sidebar-mobile-toggle-btn'
                onClick={mobileMenuControl}
              >
                <Icon icon='heroicons:bars-3-bottom-left-20-solid' />
              </button>
            </div>

            <div className='col-auto d-flex align-items-center gap-3'>
              <ThemeToggleButton />
              <div className='d-flex flex-column' style={{ lineHeight: 1.1 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Logged in as</span>
                <strong style={{ fontSize: 13 }}>
                  {me?.phone || me?.email || "Owner"}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className='dashboard-main-body'>
          {meLoading ? (
            <div className='card'>
              <div className='card-body'>Checking session…</div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </section>
  );
}
