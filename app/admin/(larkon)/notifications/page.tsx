"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";

function getViewHref(item: { actionUrl?: string | null; type?: string; meta?: any }) {
  if (item?.actionUrl) return item.actionUrl;
  return null;
}

function formatTimeAgo(createdAt: string | Date | null) {
  if (!createdAt) return "";
  const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return formatDistanceToNow(d, { addSuffix: true, locale: enUS });
}

export default function AdminNotificationsPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: "50", panel: "admin" });
      if (filter === "unread") params.set("unread", "1");
      const res = await apiGet(`/api/v1/notifications?${params}`);
      const items = res?.data?.items ?? [];
      setList(Array.isArray(items) ? items : []);
    } catch (e) {
      console.error("Failed to load notifications:", e);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  async function markAsRead(id: number) {
    try {
      await apiPost(`/api/v1/notifications/${id}/read`, {});
      await load();
    } catch (e) {
      console.error("Failed to mark as read:", e);
    }
  }

  async function clearAll() {
    try {
      await apiPost("/api/v1/notifications/read-all", {});
      await load();
    } catch (e) {
      console.error("Failed to clear all:", e);
    }
  }

  const unreadCount = list.filter((n) => !n.readAt).length;

  return (
    <div className="dashboard-main-body">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Notifications</h4>
        <div className="d-flex gap-2">
          <button
            type="button"
            className={`btn btn-sm ${filter === "all" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filter === "unread" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setFilter("unread")}
          >
            Unread
          </button>
          {unreadCount > 0 && (
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>
      </div>
      <div className="card">
        <div className="card-body p-24">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : list.length === 0 ? (
            <p className="text-muted mb-0">No new notifications</p>
          ) : (
            <ul className="list-unstyled mb-0">
              {list.map((item) => {
                const href = getViewHref(item);
                const isUnread = !item.readAt;
                return (
                  <li
                    key={item.id}
                    className={`py-3 border-bottom ${isUnread ? "bg-light rounded px-3 mx-n3" : ""}`}
                    style={{ marginBottom: 4 }}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-semibold">{item.title || "Notification"}</span>
                          {isUnread && <span className="badge bg-primary">New</span>}
                        </div>
                        <p className="text-muted small mb-1 mt-1">{item.message}</p>
                        <span className="text-secondary-light" style={{ fontSize: 12 }}>
                          {formatTimeAgo(item.createdAt)}
                        </span>
                      </div>
                      <div className="d-flex gap-2">
                        {isUnread && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => markAsRead(item.id)}
                          >
                            Mark read
                          </button>
                        )}
                        {href && (
                          <Link
                            href={href}
                            className="btn btn-sm btn-primary"
                            onClick={() => isUnread && markAsRead(item.id)}
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
