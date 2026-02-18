"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotifications } from "@/lib/useNotifications";
import { formatDistanceToNow } from "date-fns";

/** Type to display label (Bangla/English) */
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

/** Resolve View link: actionUrl or meta-based routes for detail pages */
function getViewHref(item) {
  if (item?.actionUrl) return item.actionUrl;
  const type = String(item?.type || "").toUpperCase();
  const meta = item?.meta || {};
  if (type === "STAFF_BRANCH_ACCESS_REQUEST") {
    return "/owner/access/requests";
  }
  if (type === "INVENTORY_STOCK_REQUEST" && meta.stockRequestId) {
    return `/owner/inventory/stock-requests/${meta.stockRequestId}`;
  }
  return null;
}

/** Role-aware View All link */
function getViewAllHref(pathname) {
  if (!pathname) return "/owner/notifications";
  if (pathname.startsWith("/admin")) return "/admin/notifications";
  if (pathname.startsWith("/owner")) return "/owner/notifications";
  if (pathname.startsWith("/staff")) return "/staff/branch";
  if (pathname.startsWith("/shop") || pathname.startsWith("/clinic") || pathname.startsWith("/producer")) return pathname.split("/").slice(0, 2).join("/") + "/notifications";
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
  const viewAllHref = getViewAllHref(pathname);
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
          className="card shadow position-absolute radius-12 overflow-hidden"
          style={{ width: "min(360px, 95vw)", right: 0, top: "100%", marginTop: 8, zIndex: 1050 }}
        >
          <div className="card-body p-0">
            <div className="d-flex justify-content-between align-items-center px-16 py-12 border-bottom bg-body-tertiary bg-opacity-50">
              <strong className="text-body">Notifications</strong>
              <div className="d-flex align-items-center gap-2">
                {wsConnected && (
                  <span className="text-success" title="Realtime connected" style={{ fontSize: 14 }}>
                    <Icon icon="solar:link-circle-bold" />
                  </span>
                )}
                <button type="button" className="btn btn-link btn-sm p-0 text-primary text-decoration-none" onClick={() => fetchList(20)}>
                  Refresh
                </button>
                {unreadCount > 0 && (
                  <button type="button" className="btn btn-link btn-sm p-0 text-primary text-decoration-none" onClick={readAll}>
                    Mark all read
                  </button>
                )}
              </div>
            </div>
            <div style={{ maxHeight: 420, overflowY: "auto" }} className="notification-dropdown-list">
              {loading && items.length === 0 ? (
                <p className="text-secondary small p-16 mb-0">Loading…</p>
              ) : items.length === 0 ? (
                <p className="text-secondary small p-16 mb-0">No new notifications</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {items.map((item) => {
                    const isUnread = !item.readAt;
                    const viewHref = getViewHref(item);
                    const branchName = item?.meta?.branchName || (item.branchId ? `Branch #${item.branchId}` : null);
                    const typeLabel = getTypeLabel(item.type);
                    const senderName = item?.sender?.profile?.displayName;
                    return (
                      <li
                        key={item.id}
                        className={`px-16 py-12 border-bottom ${isUnread ? "bg-primary bg-opacity-10" : "bg-body"}`}
                        style={{ transition: "background 0.2s" }}
                      >
                        <div className="d-flex justify-content-between gap-8">
                          <div className="flex-grow-1 min-w-0">
                            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                              <span className="fw-semibold small text-body">{item.title || "Notification"}</span>
                              <span className="badge bg-secondary bg-opacity-75 text-white radius-12" style={{ fontSize: 10 }}>
                                {typeLabel}
                              </span>
                              {branchName && (
                                <span className="badge bg-info bg-opacity-25 text-info radius-12" style={{ fontSize: 10 }} title="কোথা থেকে এসেছে">
                                  {branchName}
                                </span>
                              )}
                            </div>
                            <div className="text-secondary small text-break">{item.message || ""}</div>
                            <div className="d-flex align-items-center gap-2 mt-1">
                              <span className="text-secondary" style={{ fontSize: 11 }}>
                                {formatTimeAgo(item.createdAt)}
                              </span>
                              {senderName && (
                                <span className="text-secondary" style={{ fontSize: 11 }}>
                                  • {senderName}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="d-flex flex-column gap-2 align-items-end flex-shrink-0">
                            {!item.readAt && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary radius-12"
                                onClick={() => markRead(item.id)}
                              >
                                Mark read
                              </button>
                            )}
                            {viewHref && (
                              <Link
                                href={viewHref}
                                className="btn btn-sm btn-primary radius-12"
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
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="border-top px-16 py-12 bg-body-tertiary bg-opacity-25">
              <Link href={viewAllHref} className="btn btn-sm btn-primary w-100 radius-12" onClick={() => setOpen(false)}>
                View all notifications
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
