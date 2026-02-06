"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

function getViewHref(item) {
  const type = String(item?.type || "").toUpperCase();
  if (type === "STAFF_BRANCH_ACCESS_REQUEST") {
    const id = item?.meta?.permissionId ?? item?.meta?.branchAccessId;
    return id ? `/owner/access/requests/${id}` : "/owner/access/requests";
  }
  return null;
}

function formatDate(d) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-BD", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function OwnerNotificationsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | unread

  const load = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: "50" });
      if (filter === "unread") params.set("unread", "1");
      const res = await ownerGet(`/api/v1/owner/notifications?${params}`);
      const data = res?.data ?? res;
      setList(Array.isArray(data) ? data : []);
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

  async function markAsRead(id) {
    try {
      await ownerPost(`/api/v1/owner/notifications/${id}/read`, {});
      await load();
    } catch (e) {
      console.error("Failed to mark as read:", e);
    }
  }

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
      <div className="d-flex gap-2 mb-4">
        <button
          type="button"
          className={`btn btn-sm ${filter === "all" ? "btn-primary" : "btn-outline-primary"} radius-12`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          type="button"
          className={`btn btn-sm ${filter === "unread" ? "btn-primary" : "btn-outline-primary"} radius-12`}
          onClick={() => setFilter("unread")}
        >
          Unread
        </button>
      </div>
      <div className="card radius-12">
        <div className="card-body p-24">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : list.length === 0 ? (
            <p className="text-muted mb-0">No notifications.</p>
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
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      <div className="d-flex gap-2">
                        {isUnread && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary radius-12"
                            onClick={() => markAsRead(item.id)}
                          >
                            Mark read
                          </button>
                        )}
                        {href && (
                          <Link
                            href={href}
                            className="btn btn-sm btn-primary radius-12"
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
