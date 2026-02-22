"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotifications } from "@/lib/useNotifications";
import { formatDistanceToNow } from "date-fns";

/** Derive API panel from pathname so branch manager does not see owner notifications */
function getPanelFromPathname(pathname) {
  if (!pathname) return "owner";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/owner")) return "owner";
  if (pathname.startsWith("/staff")) return "staff";
  return "owner";
}

const TYPE_LABELS = {
  INVENTORY_STOCK_REQUEST: "Stock Request",
  INVENTORY_LOW_STOCK: "Low Stock",
  INVENTORY_TRANSFER: "Transfer",
  STAFF_BRANCH_ACCESS_REQUEST: "Branch Access",
  STAFF_BRANCH_ACCESS_APPROVED: "Branch Access",
  STAFF_BRANCH_ACCESS_REVOKED: "Branch Access",
  FINANCE_PAYMENT: "Finance",
  FINANCE_PAYOUT: "Finance",
  CLINIC_APPOINTMENT: "Clinic",
  CLINIC_PRESCRIPTION: "Clinic",
  SYSTEM: "System",
};

function getTypeLabel(type) {
  return TYPE_LABELS[type] || type?.replace(/_/g, " ") || "Notification";
}

function getViewHref(item) {
  if (item?.actionUrl) return item.actionUrl;
  const type = String(item?.type || "").toUpperCase();
  const meta = item?.meta || {};
  if (type === "STAFF_BRANCH_ACCESS_REQUEST") return "/owner/access/requests";
  if (type === "INVENTORY_STOCK_REQUEST" && meta.stockRequestId) {
    return `/owner/inventory/stock-requests/${meta.stockRequestId}`;
  }
  return null;
}

function getViewAllHref(pathname) {
  if (!pathname) return "/owner/notifications";
  if (pathname.startsWith("/admin")) return "/admin/notifications";
  if (pathname.startsWith("/owner")) return "/owner/notifications";
  if (pathname.startsWith("/staff")) return "/staff/branch";
  if (pathname.startsWith("/shop") || pathname.startsWith("/clinic") || pathname.startsWith("/producer")) {
    return pathname.split("/").slice(0, 2).join("/") + "/notifications";
  }
  if (pathname.startsWith("/mother")) return "/mother/notifications";
  if (pathname.startsWith("/country")) return "/country/notifications";
  return "/owner/notifications";
}

function formatTimeAgo(createdAt) {
  if (!createdAt) return "";
  try {
    const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "";
  }
}

export default function NotificationBell({ enabled = true }) {
  const pathname = usePathname();
  const panel = getPanelFromPathname(pathname);
  const viewAllHref = getViewAllHref(pathname);
  const { count, items, loading, wsConnected, fetchList, markRead, readAll } = useNotifications({
    enabled,
    panel,
  });
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
            className="badge bg-danger position-absolute rounded-circle"
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
          className="card shadow position-absolute overflow-hidden border-0"
          style={{
            width: "min(380px, 95vw)",
            right: 0,
            top: "100%",
            marginTop: 8,
            zIndex: 1050,
            borderRadius: 12,
          }}
        >
          <div className="card-body p-0">
            {/* Header: title + 3 icons (refresh, mark all read, settings) */}
            <div className="d-flex justify-content-between align-items-center px-3 py-3 border-bottom bg-light">
              <strong className="text-body" style={{ fontSize: 15 }}>Notifications</strong>
              <div className="d-flex align-items-center gap-1">
                {wsConnected && (
                  <span className="text-success me-1" title="Realtime connected" style={{ fontSize: 14 }}>
                    <Icon icon="solar:link-circle-bold" />
                  </span>
                )}
                <button
                  type="button"
                  className="btn btn-link btn-sm p-1 text-body-secondary text-decoration-none"
                  onClick={() => fetchList(20)}
                  title="Refresh"
                  aria-label="Refresh"
                >
                  <Icon icon="solar:refresh-outline" style={{ fontSize: 18 }} />
                </button>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-1 text-body-secondary text-decoration-none"
                    onClick={readAll}
                    title="Mark all as read"
                    aria-label="Mark all as read"
                  >
                    <Icon icon="solar:check-read-outline" style={{ fontSize: 18 }} />
                  </button>
                )}
                <Link
                  href={viewAllHref}
                  className="btn btn-link btn-sm p-1 text-body-secondary text-decoration-none"
                  onClick={() => setOpen(false)}
                  title="Notification settings"
                  aria-label="Settings"
                >
                  <Icon icon="solar:settings-outline" style={{ fontSize: 18 }} />
                </Link>
              </div>
            </div>
            {/* List: left circle (unread=blue, read=gray), title, category pill, message, time, right checkmark */}
            <div style={{ maxHeight: 420, overflowY: "auto" }} className="notification-dropdown-list">
              {loading && items.length === 0 ? (
                <p className="text-muted small p-4 mb-0">Loading…</p>
              ) : items.length === 0 ? (
                <p className="text-muted small p-4 mb-0">No notifications</p>
              ) : (
                <ul className="list-unstyled mb-0 py-2">
                  {items.map((item) => {
                    const isUnread = !item.readAt;
                    const viewHref = getViewHref(item);
                    const typeLabel = getTypeLabel(item.type);
                    return (
                      <li
                        key={item.id}
                        className="d-flex align-items-start gap-3 px-3 py-3 border-bottom border-light"
                        style={{ minHeight: 56 }}
                      >
                        <div className="flex-shrink-0 mt-1">
                          {isUnread ? (
                            <span
                              className="rounded-circle d-inline-block"
                              style={{ width: 10, height: 10, background: "var(--bs-primary)" }}
                              title="Unread"
                            />
                          ) : (
                            <span
                              className="rounded-circle d-inline-block border border-secondary"
                              style={{ width: 10, height: 10, background: "transparent" }}
                              title="Read"
                            />
                          )}
                        </div>
                        <div className="flex-grow-1 min-w-0">
                          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                            <span className="fw-semibold text-body" style={{ fontSize: 14 }}>
                              {item.title || "Notification"}
                            </span>
                            <button
                              type="button"
                              className="btn btn-link btn-sm p-0 text-body-secondary flex-shrink-0"
                              onClick={() => markRead(item.id)}
                              title="Mark as read"
                              aria-label="Mark as read"
                            >
                              <Icon icon="solar:check-circle-outline" style={{ fontSize: 20 }} />
                            </button>
                          </div>
                          <div className="mt-1">
                            <span
                              className="badge bg-secondary bg-opacity-75 text-white rounded-pill"
                              style={{ fontSize: 10 }}
                            >
                              {typeLabel}
                            </span>
                          </div>
                          <p className="text-muted small mb-1 mt-1" style={{ fontSize: 13 }}>
                            {item.message || ""}
                          </p>
                          <span className="text-secondary" style={{ fontSize: 11 }}>
                            {formatTimeAgo(item.createdAt)}
                          </span>
                        </div>
                        {viewHref && (
                          <Link
                            href={viewHref}
                            className="btn btn-sm btn-primary flex-shrink-0 rounded-pill"
                            onClick={() => {
                              if (isUnread) markRead(item.id);
                              setOpen(false);
                            }}
                            style={{ fontSize: 12 }}
                          >
                            View
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="border-top p-3 bg-light">
              <Link
                href={viewAllHref}
                className="btn btn-primary w-100 rounded-pill"
                onClick={() => setOpen(false)}
                style={{ fontSize: 14 }}
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
