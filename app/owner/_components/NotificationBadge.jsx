"use client";

import { useEffect, useState, useCallback } from "react";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";

export default function NotificationBadge() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await ownerGet("/api/v1/owner/notifications?type=STAFF_BRANCH_ACCESS_REQUEST&unread=1&limit=5");
      const list = res?.data ?? res;
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load owner notifications:", err);
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  async function markAsRead(id) {
    try {
      await ownerPost(`/api/v1/owner/notifications/${id}/read`, {});
      await load();
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }

  const count = items.filter((n) => !n.readAt).length;

  return (
    <div className="position-relative">
      <button
        type="button"
        className="btn btn-link p-0 border-0"
        aria-label="Branch access notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <i className="solar:bell-outline" style={{ fontSize: "20px", color: "var(--bs-body-color)" }} />
        {count > 0 && (
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
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="card shadow position-absolute" style={{ width: 320, right: 0, zIndex: 40 }}>
          <div className="card-body p-16">
            <div className="d-flex justify-content-between align-items-center mb-12">
              <strong>Branch access</strong>
              <button type="button" className="btn btn-link btn-sm" onClick={load}>
                Refresh
              </button>
            </div>
            {items.length === 0 ? (
              <p className="text-secondary-light small mb-0">No pending requests.</p>
            ) : (
              <ul className="list-unstyled mb-0">
                {items.map((item) => (
                  <li key={item.id} className="mb-12">
                    <div className="d-flex justify-content-between gap-8">
                      <div>
                        <div className="fw-semibold small">{item.title || "Branch access request"}</div>
                        <div className="text-secondary-light small">{item.message || "New request"}</div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                          markAsRead(item.id);
                          const targetId = item?.meta?.permissionId;
                          window.location.href = targetId
                            ? `/owner/access/requests/${targetId}`
                            : "/owner/access/requests";
                        }}
                      >
                        View
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
