"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  doctorListNotifications,
  doctorGetNotificationUnreadCount,
  doctorMarkNotificationRead,
} from "@/lib/api";

export default function DoctorNotificationsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, unread] = await Promise.all([
        doctorListNotifications({ limit: 100 }),
        doctorGetNotificationUnreadCount(),
      ]);
      setRows(list.items ?? []);
      setUnreadCount(unread ?? 0);
    } catch (e) {
      setRows([]);
      setError((e as Error)?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="dashboard-main-body">
      <div className="card radius-12 mb-3">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h6 className="mb-0">Doctor Notifications</h6>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-danger">Unread: {unreadCount}</span>
            <Link href="/doctor/dashboard" className="btn btn-sm btn-outline-primary radius-12">Dashboard</Link>
          </div>
        </div>
      </div>

      {error ? <div className="alert alert-danger radius-12">{error}</div> : null}

      <div className="card radius-12">
        <div className="card-body">
          {loading ? (
            <p className="text-muted mb-0">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="text-muted mb-0">No notifications.</p>
          ) : (
            <ul className="list-group list-group-flush">
              {rows.map((row) => (
                <li key={row.id} className="list-group-item px-0">
                  <div className="d-flex justify-content-between gap-2">
                    <div>
                      <div className="fw-semibold">{row.title}</div>
                      <div className="small text-muted">{row.message}</div>
                      <div className="small text-muted">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : ""}
                      </div>
                    </div>
                    <div className="text-end">
                      {row.readAt ? (
                        <span className="badge bg-light text-dark">Read</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary radius-12"
                          onClick={async () => {
                            await doctorMarkNotificationRead(row.id);
                            await load();
                          }}
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
