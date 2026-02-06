"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

/**
 * Right-side drawer with tabs. Use for verification review, entity detail, etc.
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {string} title
 * @param {React.ReactNode} [subtitle] - e.g. status badge
 * @param {Array<{ key: string; label: string; children: React.ReactNode }>} tabs
 * @param {React.ReactNode} [actionBar] - Bottom action buttons (e.g. DecisionPanel)
 * @param {boolean} [loading]
 */
export default function DetailDrawer({ open, onClose, title, subtitle, tabs = [], actionBar, loading }) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? "");

  useEffect(() => {
    if (open && tabs[0]?.key) setActiveTab(tabs[0].key);
  }, [open, tabs[0]?.key]);

  if (!open) return null;

  const active = tabs.find((t) => t.key === activeTab) || tabs[0];

  return (
    <>
      <div
        className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
        style={{ zIndex: 1040 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="position-fixed top-0 end-0 h-100 bg-white shadow overflow-hidden d-flex flex-column"
        style={{ width: "min(520px, 100vw)", zIndex: 1050 }}
      >
        <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
          <div>
            <h6 className="mb-0 fw-semibold">{title}</h6>
            {subtitle && <div className="text-secondary small">{subtitle}</div>}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <Icon icon="solar:close-circle-bold" />
          </button>
        </div>

        {tabs.length > 1 && (
          <div className="d-flex border-bottom overflow-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`btn btn-ghost btn-sm rounded-0 border-0 ${activeTab === t.key ? "border-bottom border-primary border-2" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-grow-1 overflow-auto p-3">
          {loading ? (
            <div className="text-secondary text-center py-5">Loading…</div>
          ) : active?.children ? (
            active.children
          ) : (
            <div className="text-secondary">No content.</div>
          )}
        </div>

        {actionBar && <div className="p-3 border-top bg-light">{actionBar}</div>}
      </div>
    </>
  );
}
