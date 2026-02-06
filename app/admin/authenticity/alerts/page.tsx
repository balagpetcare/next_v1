"use client";

import { useState } from "react";
import { apiGet } from "@/lib/api";

export default function AdminAuthenticityAlertsPage() {
  const [hours, setHours] = useState("24");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [serialCode, setSerialCode] = useState("");
  const [loading, setLoading] = useState(false);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await apiGet(`/api/v1/serials/fraud-alerts?hours=${encodeURIComponent(hours)}`);
      setAlerts(res?.data || []);
    } catch (e: any) {
      alert(e?.message || "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    if (!serialCode) return alert("Serial code required");
    setLoading(true);
    try {
      const res = await apiGet(`/api/v1/serials/scan-events?serialCode=${encodeURIComponent(serialCode)}`);
      setEvents(res?.data?.items || []);
    } catch (e: any) {
      alert(e?.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="h4 mb-3">Product Authenticity – Fraud Alerts</h2>

      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <input
              className="form-control"
              style={{ width: 120 }}
              placeholder="Hours"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
            <button className="btn btn-sm btn-outline-primary" onClick={loadAlerts} disabled={loading}>
              Load Alerts
            </button>
          </div>
          {alerts.length === 0 ? (
            <p className="text-secondary mt-3">No alerts.</p>
          ) : (
            <div className="table-responsive mt-3">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Serial</th>
                    <th>Scans (window)</th>
                    <th>Countries</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a, idx) => (
                    <tr key={`${a.serialId}-${idx}`}>
                      <td style={{ maxWidth: 220, wordBreak: "break-all" }}>{a.serialCode || a.serialId}</td>
                      <td>{a.scansLastWindow}</td>
                      <td>{Array.isArray(a.countries) ? a.countries.join(", ") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h6 className="mb-3">Scan Events by Serial</h6>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <input
              className="form-control"
              placeholder="Serial code"
              value={serialCode}
              onChange={(e) => setSerialCode(e.target.value)}
              style={{ minWidth: 240 }}
            />
            <button className="btn btn-sm btn-outline-secondary" onClick={loadEvents} disabled={loading}>
              Load Events
            </button>
          </div>
          {events.length === 0 ? (
            <p className="text-secondary mt-3">No events.</p>
          ) : (
            <div className="table-responsive mt-3">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Role</th>
                    <th>Country</th>
                    <th>Device</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td>{e.action}</td>
                      <td>{e.actorRole}</td>
                      <td>{e.countryCode || "—"}</td>
                      <td>{e.deviceId || "—"}</td>
                      <td>{e.createdAt ? new Date(e.createdAt).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
