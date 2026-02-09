"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";

const API_BASE = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "") || "";

export default function ContextSelector({ contexts = [], defaultContext, onSwitch }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = defaultContext || (contexts && contexts[0]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function setDefault(contextId) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/me/contexts/${contextId}/default`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok && onSwitch) onSwitch();
      setOpen(false);
    } catch (e) {
      console.error("Set default context:", e);
    }
  }

  if (!contexts || contexts.length <= 1) return null;

  const label =
    current?.team?.name ||
    current?.branch?.name ||
    current?.owner?.displayName ||
    "Select context";

  return (
    <div className="position-relative" ref={ref}>
      <button
        type="button"
        className="btn btn-outline-light btn-sm d-flex align-items-center gap-2"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <Icon icon="mdi:view-dashboard-outline" width={18} />
        <span className="text-truncate" style={{ maxWidth: 140 }}>
          {label}
        </span>
        <Icon icon={open ? "mdi:chevron-up" : "mdi:chevron-down"} width={18} />
      </button>
      {open && (
        <ul
          className="list-unstyled position-absolute top-100 start-0 mt-1 py-2 bg-white rounded-3 shadow border"
          style={{ minWidth: 200, zIndex: 1050 }}
        >
          {contexts.map((ctx) => (
            <li key={ctx.id}>
              <button
                type="button"
                className={`btn btn-link btn-sm text-start w-100 text-dark text-decoration-none ${ctx.id === current?.id ? "fw-bold" : ""}`}
                onClick={() => setDefault(ctx.id)}
              >
                {ctx.team?.name || ctx.branch?.name || ctx.owner?.displayName || `Context #${ctx.id}`}
                {ctx.isDefault && " ✓"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
