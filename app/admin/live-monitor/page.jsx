"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import { apiGet } from "@/lib/api";
import SectionCard from "@/src/bpa/admin/components/SectionCard";

export default function LiveMonitorPage() {
  const [feed, setFeed] = useState([]);
  const [sla, setSla] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [eventType, setEventType] = useState("");
  const [live, setLive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const limit = 50;
      const q = eventType ? `&eventType=${eventType}` : "";
      const [r, s] = await Promise.all([
        apiGet(`/api/v1/admin/dashboard/live-feed?limit=${limit}${q}`),
        apiGet("/api/v1/admin/dashboard/sla"),
      ]);
      setFeed(r?.data ?? []);
      setSla(s?.data ?? null);
    } catch (e) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [eventType]);

  useEffect(() => {
    load();
    if (!live) return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load, live]);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleString("en-BD", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";

  return (
    <div className="container-fluid">
      <PageHeader
        title="Live Operations Monitor"
        subtitle="Real-time feed of orders, verifications, withdrawals, and user activity"
        right={
          <div className="d-flex align-items-center gap-2">
            <label className="d-flex align-items-center gap-2 mb-0">
              <span className="small text-secondary">Live</span>
              <button
                type="button"
                className={`btn btn-sm ${live ? "btn-success" : "btn-outline-secondary"}`}
                onClick={() => setLive(!live)}
              >
                {live ? "On" : "Off"}
              </button>
            </label>
            <select
              className="form-select form-select-sm"
              style={{ width: "auto" }}
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              <option value="">All events</option>
              <option value="order">Orders</option>
              <option value="verification">Verifications</option>
              <option value="withdraw">Withdrawals</option>
              <option value="user">Users</option>
            </select>
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={load} disabled={loading}>
              <Icon icon="solar:refresh-outline" /> {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="row g-3">
        {sla && (
          <div className="col-12">
            <div className="row g-2">
              <div className="col-6 col-md-3">
                <div className="card radius-12">
                  <div className="card-body py-3">
                    <div className="text-secondary small">Avg verification time</div>
                    <div className="fw-semibold">{sla.avgVerificationHours != null ? `${sla.avgVerificationHours}h` : "—"}</div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card radius-12">
                  <div className="card-body py-3">
                    <div className="text-secondary small">Verification pending</div>
                    <div className="fw-semibold">{sla.verificationPendingCount ?? 0}</div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card radius-12">
                  <div className="card-body py-3">
                    <div className="text-secondary small">Ticket avg response</div>
                    <div className="fw-semibold">{sla.ticketAvgResponseHours != null ? `${sla.ticketAvgResponseHours}h` : "—"}</div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card radius-12">
                  <div className="card-body py-3">
                    <div className="text-secondary small">Delivery on-time %</div>
                    <div className="fw-semibold">{sla.deliveryOnTimePercent != null ? `${sla.deliveryOnTimePercent}%` : "—"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="col-12">
          <SectionCard title="Live feed">
            {loading && !feed.length ? (
              <div className="text-center py-5 text-secondary">Loading...</div>
            ) : !feed.length ? (
              <div className="text-center py-5 text-secondary">No events.</div>
            ) : (
              <div className="d-flex flex-column gap-2" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                {feed.map((e) => (
                  <div
                    key={e.id}
                    className="d-flex align-items-start gap-3 p-3 border rounded radius-8"
                  >
                    <div className="flex-shrink-0">
                      {e.eventType === "order" && <Icon icon="solar:cart-bold" className="text-success" style={{ fontSize: 24 }} />}
                      {e.eventType === "verification" && <Icon icon="solar:user-id-bold" className="text-warning" style={{ fontSize: 24 }} />}
                      {e.eventType === "withdraw" && <Icon icon="solar:wallet-money-bold" className="text-info" style={{ fontSize: 24 }} />}
                      {e.eventType === "user" && <Icon icon="solar:user-bold" className="text-primary" style={{ fontSize: 24 }} />}
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-semibold">{e.title}</div>
                      <div className="text-secondary small">{e.description}</div>
                      <div className="text-secondary mt-1" style={{ fontSize: 12 }}>
                        {formatDate(e.date)}
                      </div>
                    </div>
                    <span className="badge bg-secondary-focus text-secondary radius-16">{e.eventType}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
