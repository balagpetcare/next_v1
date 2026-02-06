"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { useNotifications } from "@/lib/useNotifications";

export default function NotificationBell({ enabled = true }) {
  const { count, items, loading, wsConnected, fetchList, markRead, readAll } = useNotifications({ enabled });
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    fetchList(20);
  }, [open, fetchList]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <div className="position-relative d-flex align-items-center" ref={dropdownRef}>
      <button
        type="button"
        className="btn btn-link p-0 border-0"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon icon="solar:bell-outline" style={{ fontSize: "20px", color: "var(--bs-body-color)" }} />
        {(count > 0 || unreadCount > 0) && (
          <span
            className="badge bg-danger position-absolute"
            style={{
              top: "-4px",
              right: "-6px",
              fontSize: "10px",
              minWidth: "18px",
              height: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
            }}
          >
            {Math.max(count, unreadCount) > 99 ? "99+" : Math.max(count, unreadCount)}
          </span>
        )}
      </button>
      {open && (
        <div
          className="card shadow position-absolute"
          style={{ width: 360, right: 0, top: "100%", marginTop: 8, zIndex: 1050 }}
        >
          <div className="card-body p-0">
            <div className="d-flex justify-content-between align-items-center px-16 py-12 border-bottom">
              <strong>Notifications</strong>
              <div className="d-flex align-items-center gap-2">
                {wsConnected && (
                  <span className="text-success small" title="Realtime connected">
                    <Icon icon="solar:link-circle-bold" className="icon" />
                  </span>
                )}
                <button type="button" className="btn btn-link btn-sm p-0" onClick={() => fetchList(20)}>
                  Refresh
                </button>
                {unreadCount > 0 && (
                  <button type="button" className="btn btn-link btn-sm p-0" onClick={readAll}>
                    Mark all read
                  </button>
                )}
              </div>
            </div>
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {loading && items.length === 0 ? (
                <p className="text-secondary-light small p-16 mb-0">Loading…</p>
              ) : items.length === 0 ? (
                <p className="text-secondary-light small p-16 mb-0">No notifications.</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="px-16 py-12 border-bottom border-light"
                      style={{ background: item.readAt ? "transparent" : "var(--bs-primary-bg-subtle, rgba(13,110,253,0.08))" }}
                    >
                      <div className="d-flex justify-content-between gap-8">
                        <div className="flex-grow-1 min-w-0">
                          <div className="fw-semibold small">{item.title || "Notification"}</div>
                          <div className="text-secondary-light small text-break">{item.message || ""}</div>
                        </div>
                        <div className="d-flex flex-column gap-2 align-items-end">
                          {!item.readAt && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => markRead(item.id)}
                            >
                              Mark read
                            </button>
                          )}
                          {item.actionUrl && (
                            <Link
                              href={item.actionUrl}
                              className="btn btn-sm btn-primary"
                              onClick={() => {
                                markRead(item.id);
                                setOpen(false);
                              }}
                            >
                              View
                            </Link>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-top px-16 py-12">
              <Link
                href="/owner/notifications"
                className="btn btn-sm btn-primary w-100"
                onClick={() => setOpen(false)}
              >
                View all notifications
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
