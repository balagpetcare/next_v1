"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggleButton from "@/helper/ThemeToggleButton";

const MANAGER_NAV = [
  { href: "/manager/dashboard", label: "Dashboard", icon: "solar:home-smile-angle-outline" },
  { href: "/manager/branches", label: "Branches", icon: "solar:buildings-3-outline" },
  { href: "/manager/staff", label: "Staff", icon: "solar:users-group-rounded-outline" },
  { href: "/manager/settings", label: "Settings", icon: "solar:settings-outline" },
];

export default function ManagerLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarActive, setSidebarActive] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    // close mobile sidebar on route change
    setMobileMenu(false);
  }, [pathname]);

  const sidebarControl = () => setSidebarActive((v) => !v);
  const mobileMenuControl = () => setMobileMenu((v) => !v);

  return (
    <section className={mobileMenu ? "overlay active" : "overlay"}>
      <aside
        className={
          sidebarActive
            ? "sidebar active"
            : mobileMenu
            ? "sidebar sidebar-open"
            : "sidebar"
        }
      >
        <button onClick={mobileMenuControl} type='button' className='sidebar-close-btn'>
          <Icon icon='radix-icons:cross-2' />
        </button>

        <div>
          <Link href='/manager/dashboard' className='sidebar-logo'>
            <img src='/assets/images/logo.png' alt='site logo' className='light-logo' />
            <img src='/assets/images/logo-light.png' alt='site logo' className='dark-logo' />
            <img src='/assets/images/logo-icon.png' alt='logo icon' className='logo-icon' />
          </Link>
        </div>

        <div className='sidebar-menu-area'>
          <ul className='sidebar-menu' id='sidebar-menu'>
            <li className='sidebar-menu-group-title'>Manager Panel</li>
            {MANAGER_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={pathname === item.href ? "active-page" : ""}>
                  <Icon icon={item.icon} className='menu-icon' />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href='/manager/logout'>
                <Icon icon='solar:logout-2-outline' className='menu-icon' />
                <span>Logout</span>
              </Link>
            </li>
          </ul>
        </div>
      </aside>

      <main className={sidebarActive ? "dashboard-main active" : "dashboard-main"}>
        <div className='navbar-header'>
          <div className='row align-items-center justify-content-between'>
            <div className='col-auto'>
              <div className='d-flex align-items-center gap-3'>
                <button type='button' className='sidebar-toggle-btn' onClick={sidebarControl}>
                  <Icon icon='radix-icons:mix' />
                </button>
                <button type='button' className='sidebar-mobile-toggle-btn' onClick={mobileMenuControl}>
                  <Icon icon='radix-icons:mix' />
                </button>
                <h6 className='mb-0'>Branch Manager</h6>
              </div>
            </div>

            <div className='col-auto'>
              <div className='d-flex align-items-center gap-2'>
                <ThemeToggleButton />
                <button
                  type='button'
                  className='btn btn-sm btn-primary-600'
                  onClick={() => router.push("/manager/settings")}
                >
                  <Icon icon='solar:settings-outline' />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className='dashboard-main-body'>{children}</div>
      </main>
    </section>
  );
}
