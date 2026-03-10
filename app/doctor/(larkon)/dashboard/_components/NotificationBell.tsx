"use client";

import { useState } from "react";
import Link from "next/link";

export function NotificationBell(props: {
  unreadCount: number;
  items: any[];
  onMarkRead: (id: number) => Promise<void>;
}) {
  const { unreadCount, items, onMarkRead } = props;
  const [open, setOpen] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);

  return (
    <div className="position-relative">
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary radius-12"
        onClick={() => setOpen((v) => !v)}
      >
        Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}
      </button>
      {open ? (
        <div
          className="card radius-12 shadow-sm position-absolute end-0 mt-2"
          style={{ width: 360, zIndex: 1050 }}
        >
          <div className="card-header d-flex align-items-center justify-content-between">
            <strong className="small">Alerts</strong>
            <Link href="/doctor/notifications" className="small">
              View all
            </Link>
          </div>
          <div className="card-body p-2" style={{ maxHeight: 320, overflowY: "auto" }}>
            {items.length === 0 ? (
              <p className="small text-muted mb-0 p-2">No notifications</p>
            ) : (
              <ul className="list-group list-group-flush">
                {items.slice(0, 8).map((n) => (
                  <li key={n.id} className="list-group-item px-2 py-2">
                    <div className="d-flex align-items-start justify-content-between gap-2">
                      <div>
                        <div className="fw-semibold small">{n.title}</div>
                        <div className="small text-muted">{n.message}</div>
                        <div className="small text-muted">
                          {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                        </div>
                      </div>
                      {n.readAt ? (
                        <span className="badge bg-light text-dark">Read</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          disabled={markingId === n.id}
                          onClick={async () => {
                            setMarkingId(n.id);
                            try {
                              await onMarkRead(n.id);
                            } finally {
                              setMarkingId(null);
                            }
                          }}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
