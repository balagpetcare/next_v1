"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/api";
import { useNotifications } from "@/lib/useNotifications";
import { formatDistanceToNow, format, startOfDay } from "date-fns";
import ProducerPageShell from "../../_components/ProducerPageShell";
import { getProducerViewHref, getProducerNotificationPriority, getPriorityBadgeClass } from "../../_lib/producerNotificationHelpers";


const TABS = [
  { key: "all", label: "All" },
  { key: "actionRequired", label: "Action Required" },
  { key: "unread", label: "Unread" },
  { key: "STAFF_INVITE", label: "Staff Invite" },
  { key: "VERIFICATION_CASE_SUBMITTED", label: "Verification" },
  { key: "VERIFICATION_CASE_APPROVED", label: "Approved" },
  { key: "VERIFICATION_CASE_REJECTED", label: "Rejected" },
  { key: "SYSTEM", label: "System" },
];

const TYPE_LABELS = {
  STAFF_INVITE: "Staff Invite",
  STAFF_INVITE_ACCEPTED: "Staff Accepted",
  VERIFICATION_CASE_SUBMITTED: "Verification",
  VERIFICATION_CASE_APPROVED: "Approved",
  VERIFICATION_CASE_REJECTED: "Rejected",
  VERIFICATION_DOCUMENT_APPROVED: "Document",
  VERIFICATION_DOCUMENT_REJECTED: "Document",
  BATCH_SUSPICIOUS_ACTIVITY: "Batch Alert",
  SYSTEM: "System",
  SYSTEM_INFO: "System",
};

function getTypeLabel(type) {
  return TYPE_LABELS[type] || type?.replace(/_/g, " ") || "Notification";
}


function getViewHref(item) {
  return getProducerViewHref(item, { pathname: "/producer" });
}

function formatDate(d) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return formatDistanceToNow(date, { addSuffix: true });
}

/** Group key: YYYY-MM-DD|type (spec). */
function groupByTypeAndDay(items) {
  const keyToItems = new Map();
  for (const item of items) {
    const day = item.createdAt ? startOfDay(new Date(item.createdAt)) : null;
    const dateKey = day ? format(day, "yyyy-MM-dd") : "unknown";
    const key = `${dateKey}|${item.type ?? "OTHER"}`;
    if (!keyToItems.has(key)) keyToItems.set(key, []);
    keyToItems.get(key).push(item);
  }
  return Array.from(keyToItems.entries()).map(([key, list]) => ({
    key,
    type: list[0]?.type,
    day: list[0]?.createdAt ? startOfDay(new Date(list[0].createdAt)) : null,
    items: list,
  }));
}

export default function ProducerNotificationsPage() {
  const searchParams = useSearchParams();
  const rawHighlight = searchParams.get("highlight") || searchParams.get("open");
  const highlightId = rawHighlight && Number.isFinite(Number(rawHighlight)) ? Number(rawHighlight) : null;
  const openDrawerId = searchParams.get("open") && Number.isFinite(Number(searchParams.get("open"))) ? Number(searchParams.get("open")) : null;

  const { fetchCount, markRead, readAll } = useNotifications({
    enabled: true,
    soundEnabled: true,
    panel: "producer",
    filter: filter === "actionRequired" ? "actionRequired" : null,
  });
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50", scope: "page", panel: "producer" });
      if (filter === "unread") params.set("unread", "1");
      else if (filter === "actionRequired") params.set("filter", "actionRequired");
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
      const res = await apiGet("/api/v1/notifications/analytics?range=7d&panel=producer");
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

  useEffect(() => {
    if (highlightId && !loading && items.length > 0) {
      const el = document.querySelector(`[data-notification-id="${highlightId}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [highlightId, loading, items.length]);

  const displayItems = items;
  const grouped = useMemo(() => groupByTypeAndDay(displayItems), [displayItems]);

  const toggleGroup = useCallback((key) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

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
    <ProducerPageShell
      title="Notifications"
      breadcrumbs={[
        { label: "Dashboard", href: "/producer/dashboard" },
        { label: "Notifications", href: "/producer/notifications" },
      ]}
    >
      <p className="text-muted small mb-3">Producer-related alerts: staff invites, verification outcomes, and system messages.</p>

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
              {grouped.map((group) => {
                const typeLabel = getTypeLabel(group.type);
                const priority = getProducerNotificationPriority(group.type);
                const badgeClass = getPriorityBadgeClass(priority);
                const isExpanded = expandedGroups.has(group.key) || group.items.length <= 3;
                const listToShow = isExpanded ? group.items : group.items.slice(0, 1);
                const hasMore = group.items.length > 1 && !isExpanded;
                const dayLabel = group.day ? format(group.day, "MMM d, yyyy") : "";

                return (
                  <li key={group.key} className="mb-4">
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-2 py-2 border-bottom">
                      <div
                        className="d-flex align-items-center gap-2 flex-wrap flex-grow-1 cursor-pointer"
                        onClick={() => group.items.length > 1 && toggleGroup(group.key)}
                        onKeyDown={(e) => e.key === "Enter" && group.items.length > 1 && toggleGroup(group.key)}
                        role={group.items.length > 1 ? "button" : undefined}
                        tabIndex={group.items.length > 1 ? 0 : undefined}
                      >
                        <span className="badge bg-secondary bg-opacity-75 radius-12" style={{ fontSize: 10 }}>
                          {typeLabel}
                        </span>
                        <span className={`badge ${badgeClass} radius-12`} style={{ fontSize: 10 }}>
                          {priority}
                        </span>
                        {dayLabel && <span className="text-muted small">{dayLabel}</span>}
                        <span className="text-muted small">({group.items.length})</span>
                        {group.items.length > 1 && (
                          <span className="small">{isExpanded ? "▼ Collapse" : "▶ Expand"}</span>
                        )}
                      </div>
                      {group.items.some((n) => !n.readAt) && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary radius-12"
                          onClick={async (e) => {
                            e.stopPropagation();
                            for (const n of group.items.filter((n) => !n.readAt)) await handleMarkRead(n.id);
                            fetchCount();
                            load();
                          }}
                        >
                          Mark group read
                        </button>
                      )}
                    </div>
                    <ul className="list-unstyled mb-0 ps-2">
                      {listToShow.map((item) => {
                        const href = getViewHref(item);
                        const isUnread = !item.readAt;
                        const typeLabelItem = getTypeLabel(item.type);
                        const senderName = item?.sender?.profile?.displayName;
                        const isHighlight = highlightId === item.id || openDrawerId === item.id;
                        return (
                          <li
                            key={item.id}
                            data-notification-id={item.id}
                            className={`py-3 border-bottom ${isUnread ? "bg-primary bg-opacity-10 rounded px-3 mx-n3" : ""} ${isHighlight ? "border-primary border-start border-3" : ""}`}
                            style={{ marginBottom: 4 }}
                          >
                            <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                              <div className="flex-grow-1">
                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                  <span className="fw-semibold">{item.title || "Notification"}</span>
                                  {isUnread && <span className="badge bg-primary">New</span>}
                                  <span className="badge bg-secondary bg-opacity-75 radius-12" style={{ fontSize: 10 }}>
                                    {typeLabelItem}
                                  </span>
                                  <span className={`badge ${getPriorityBadgeClass(getProducerNotificationPriority(item.type))} radius-12`} style={{ fontSize: 10 }}>
                                    {getProducerNotificationPriority(item.type)}
                                  </span>
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
                    {hasMore && (
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-primary p-0 mt-1"
                        onClick={() => toggleGroup(group.key)}
                      >
                        +{group.items.length - 1} more
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </ProducerPageShell>
  );
}
