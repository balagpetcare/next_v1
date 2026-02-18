"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { useNotifications } from "@/lib/useNotifications";
import { formatDistanceToNow } from "date-fns";

const TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "STAFF_BRANCH_ACCESS_REQUEST", label: "Branch" },
  { key: "INVENTORY_STOCK_REQUEST", label: "Inventory" },
  { key: "CLINIC_APPOINTMENT", label: "Clinic" },
  { key: "FINANCE_PAYMENT", label: "Finance" },
  { key: "SYSTEM", label: "System" },
];

const TYPE_LABELS = {
  INVENTORY_STOCK_REQUEST: "Stock Request",
  INVENTORY_LOW_STOCK: "Low Stock",
  STAFF_BRANCH_ACCESS_REQUEST: "Branch Access",
  CLINIC_APPOINTMENT: "Clinic",
  FINANCE_PAYMENT: "Finance",
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

function formatDate(d) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return formatDistanceToNow(date, { addSuffix: true });
}

export default function OwnerNotificationsPage() {
  const { fetchCount, markRead, readAll } = useNotifications({
    enabled: true,
    soundEnabled: true,
  });
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50", scope: "page" });
      if (filter === "unread") params.set("unread", "1");
      else if (filter !== "all") params.set("type", filter);
      const res = await apiGet(`/api/v1/notifications?${params}`);
      const list = res?.data?.items ?? res?.data ?? [];
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await apiGet("/api/v1/notifications/analytics?range=7d");
      if (res?.success && res?.data) setAnalytics(res.data);
    } catch {
      setAnalytics(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics, items]);

  const displayItems = items;

  async function handleMarkRead(id) {
    await markRead(id);
    fetchCount();
    await load();
  }

  async function handleClearAll() {
    await readAll();
    fetchCount();
    await load();
  }

  const unreadCount = displayItems.filter((n) => !n.readAt).length;

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Notifications"
        subtitle="All notifications and alerts"
        breadcrumbs={[
          { label: "Home", href: "/owner/dashboard" },
          { label: "Notifications", href: "/owner/notifications" },
        ]}
      />

      {analytics && (
        <div className="card radius-12 mb-4">
          <div className="card-body">
            <h6 className="mb-3">Analytics (7 days)</h6>
            <div className="row g-3">
              <div className="col-md-4">
                <div className="p-3 bg-light rounded">
                  <div className="text-muted small">Unread</div>
                  <div className="h4 mb-0">{analytics.unreadCount ?? 0}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3 bg-light rounded">
                  <div className="text-muted small">By Type</div>
                  <div className="small">
                    {(analytics.byType || []).slice(0, 3).map((x) => (
                      <span key={x.type} className="me-2">
                        {x.type}: {x.count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3 bg-light rounded">
                  <div className="text-muted small">By Priority</div>
                  <div className="small">
                    {(analytics.byPriority || []).map((x) => (
                      <span key={x.priority} className="me-2">
                        {x.priority}: {x.count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="d-flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`btn btn-sm ${filter === t.key ? "btn-primary" : "btn-outline-primary"} radius-12`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
        {unreadCount > 0 && (
          <button type="button" className="btn btn-sm btn-outline-secondary radius-12" onClick={handleClearAll}>
            Mark all read
          </button>
        )}
      </div>

      <div className="card radius-12">
        <div className="card-body p-24">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : displayItems.length === 0 ? (
            <p className="text-muted mb-0">No notifications</p>
          ) : (
            <ul className="list-unstyled mb-0">
              {displayItems.map((item) => {
                const href = getViewHref(item);
                const isUnread = !item.readAt;
                const branchName = item?.meta?.branchName || (item.branchId ? `Branch #${item.branchId}` : null);
                const typeLabel = getTypeLabel(item.type);
                const senderName = item?.sender?.profile?.displayName;
                return (
                  <li
                    key={item.id}
                    className={`py-3 border-bottom ${isUnread ? "bg-primary bg-opacity-10 rounded px-3 mx-n3" : ""}`}
                    style={{ marginBottom: 4 }}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <span className="fw-semibold">{item.title || "Notification"}</span>
                          {isUnread && <span className="badge bg-primary">New</span>}
                          <span className="badge bg-secondary bg-opacity-75 radius-12" style={{ fontSize: 10 }}>
                            {typeLabel}
                          </span>
                          {branchName && (
                            <span className="badge bg-info bg-opacity-25 text-info radius-12" style={{ fontSize: 10 }} title="কোথা থেকে এসেছে">
                              {branchName}
                            </span>
                          )}
                        </div>
                        <p className="text-muted small mb-1 mt-1">{item.message}</p>
                        <div className="d-flex align-items-center gap-2">
                          <span className="text-secondary-light" style={{ fontSize: 12 }}>
                            {formatDate(item.createdAt)}
                          </span>
                          {senderName && (
                            <span className="text-secondary-light" style={{ fontSize: 12 }}>
                              • {senderName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        {isUnread && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary radius-12"
                            onClick={() => handleMarkRead(item.id)}
                          >
                            Mark read
                          </button>
                        )}
                        {href && (
                          <Link
                            href={href}
                            className="btn btn-sm btn-primary radius-12"
                            onClick={() => isUnread && handleMarkRead(item.id)}
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
      </div>
    </div>
  );
}