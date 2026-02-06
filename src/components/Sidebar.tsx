"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { Icon } from "@iconify/react";
import type { NavItem } from "@/src/lib/nav";

function isActive(pathname: string, href?: string) {
  if (!href) return false;
  if (href === "/owner") return pathname === "/owner";
  return pathname === href || pathname.startsWith(href + "/");
}

function hasActiveChild(pathname: string, item: NavItem): boolean {
  if (isActive(pathname, item.href)) return true;
  if (!item.children) return false;
  return item.children.some((c) => hasActiveChild(pathname, c));
}

function slugKey(prefix: string, label: string) {
  return `${prefix}:${label}`.toLowerCase().replace(/\s+/g, "-");
}

export default function Sidebar({ nav }: { nav: NavItem[] }) {
  const pathname = usePathname();

  // default open any group that contains current path
  const initialOpen = useMemo(() => {
    const open: Record<string, boolean> = {};
    const walk = (items: NavItem[], prefix: string) => {
      for (const it of items) {
        const key = slugKey(prefix, it.label);
        if (it.children && hasActiveChild(pathname, it)) open[key] = true;
        if (it.children) walk(it.children, key);
      }
    };
    walk(nav, "root");
    return open;
  }, [nav, pathname]);

  const [open, setOpen] = useState<Record<string, boolean>>(initialOpen);

  const toggle = (key: string) => setOpen((s) => ({ ...s, [key]: !s[key] }));

  const render = (items: NavItem[], depth: number, prefix: string) => {
    return items.map((it) => {
      const key = slugKey(prefix, it.label);
      const Icon = it.icon;
      const active = hasActiveChild(pathname, it);
      const isGroup = !!it.children?.length;

      return (
        <div key={key} className={clsx("navItem", depth > 0 && "navIndent")}
          style={{ marginLeft: depth ? depth * 8 : 0 }}
        >
          {isGroup ? (
            <button
              type="button"
              className={clsx("navLink", active && "navLinkActive")}
              onClick={() => toggle(key)}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {Icon ? <Icon size={18} /> : null}
                <span>{it.label}</span>
              </span>
              <ChevronDown size={16} style={{ opacity: 0.7, transform: open[key] ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 180ms" }} />
            </button>
          ) : (
            <Link className={clsx("navLink", isActive(pathname, it.href) && "navLinkActive")} href={it.href || "#"}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {Icon ? <Icon size={18} /> : null}
                <span>{it.label}</span>
              </span>
            </Link>
          )}

          {isGroup && open[key] ? (
            <div style={{ marginTop: 6 }}>{render(it.children!, depth + 1, key)}</div>
          ) : null}
        </div>
      );
    });
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandMark">BPA</div>
        <div>
          <div style={{ fontWeight: 700, letterSpacing: 0.3 }}>Owner Panel</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>My Business</div>
        </div>
      </div>

      <div className="sidebarSectionTitle">Menu</div>
      <nav className="nav">{render(nav, 0, "root")}</nav>

      <div className="sidebarFooter">
        <div className="pill">API: http://localhost:3000</div>
        <div className="pill">UI: http://localhost:3104</div>
      </div>
    </aside>
  );
}
