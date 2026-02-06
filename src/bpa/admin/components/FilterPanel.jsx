"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

/**
 * Collapsible left filter panel for admin list pages.
 * @param {Object} props
 * @param {string} props.title - Panel title
 * @param {React.ReactNode} props.children - Filter controls
 * @param {boolean} [props.defaultCollapsed] - Start collapsed
 * @param {string} [props.className]
 */
export default function FilterPanel({ title = "Filters", children, defaultCollapsed = false, className = "" }) {
  const [collapsed, setCollapsed] = useState(!!defaultCollapsed);

  return (
    <div className={`card radius-12 ${className}`}>
      <button
        type="button"
        className="card-header bg-transparent d-flex align-items-center justify-content-between w-100 border-0 py-2 px-3"
        onClick={() => setCollapsed(!collapsed)}
        style={{ cursor: "pointer" }}
      >
        <span className="fw-semibold">{title}</span>
        <Icon icon={collapsed ? "solar:alt-arrow-down-bold" : "solar:alt-arrow-up-bold"} />
      </button>
      {!collapsed && <div className="card-body pt-0">{children}</div>}
    </div>
  );
}
