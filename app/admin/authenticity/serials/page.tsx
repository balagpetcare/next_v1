"use client";

import { useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

export default function AdminAuthenticitySerialsPage() {
  const [serialCode, setSerialCode] = useState("");
  const [scanSerialCode, setScanSerialCode] = useState("");
  const [actorRole, setActorRole] = useState("FACTORY");
  const [action, setAction] = useState("PRODUCED");
  const [countryCode, setCountryCode] = useState("BD");
  const [deviceId, setDeviceId] = useState("");
  const [metaJson, setMetaJson] = useState("{}");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [serials, setSerials] = useState<any[]>([]);
  const [listFilters, setListFilters] = useState({ batchId: "", status: "", search: "" });

  const verifySerial = async () => {
    if (!serialCode) return alert("Serial code required");
    setLoading(true);
    try {
      const res = await apiGet(`/api/v1/serials/${encodeURIComponent(serialCode)}/verify`);
      setResponse(res);
    } catch (e: any) {
      alert(e?.message || "Failed to verify serial");
    } finally {
      setLoading(false);
    }
  };

  const createScan = async () => {
    if (!scanSerialCode) return alert("Serial code required");
    setLoading(true);
    try {
      const meta = metaJson ? JSON.parse(metaJson) : undefined;
      const res = await apiPost(`/api/v1/serials/${encodeURIComponent(scanSerialCode)}/scan-event`, {
        actorRole,
        action,
        countryCode: countryCode || undefined,
        deviceId: deviceId || undefined,
        metaJson: meta,
      });
      setResponse(res);
    } catch (e: any) {
      alert(e?.message || "Failed to create scan event");
    } finally {
      setLoading(false);
    }
  };

  const fetchSerials = async () => {
    const qs = new URLSearchParams();
    if (listFilters.batchId) qs.set("batchId", listFilters.batchId);
    if (listFilters.status) qs.set("status", listFilters.status);
    if (listFilters.search) qs.set("search", listFilters.search);
    setLoading(true);
    try {
      const res = await apiGet(`/api/v1/serials?${qs.toString()}`);
      setSerials(res?.data?.items || []);
      setResponse(res);
    } catch (e: any) {
      alert(e?.message || "Failed to list serials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="h4 mb-3">Product Authenticity – Serials</h2>

      <div className="card mb-4">
        <div className="card-body">
          <h6 className="mb-3">Verify Serial (Public)</h6>
          <div className="row g-2">
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Serial code"
                value={serialCode}
                onChange={(e) => setSerialCode(e.target.value)}
              />
            </div>
          </div>
          <button className="btn btn-outline-primary btn-sm mt-3" onClick={verifySerial} disabled={loading}>
            Verify Serial
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h6 className="mb-3">Scan Event (Authorized)</h6>
          <div className="row g-2">
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Serial code"
                value={scanSerialCode}
                onChange={(e) => setScanSerialCode(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <select className="form-select" value={actorRole} onChange={(e) => setActorRole(e.target.value)}>
                <option value="FACTORY">FACTORY</option>
                <option value="DISTRIBUTOR">DISTRIBUTOR</option>
                <option value="RETAILER">RETAILER</option>
                <option value="CUSTOMER">CUSTOMER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="col-md-2">
              <select className="form-select" value={action} onChange={(e) => setAction(e.target.value)}>
                <option value="PRODUCED">PRODUCED</option>
                <option value="SHIPPED">SHIPPED</option>
                <option value="RECEIVED">RECEIVED</option>
                <option value="SOLD">SOLD</option>
                <option value="VERIFY">VERIFY</option>
              </select>
            </div>
            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="Country (BD)"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="Device ID (optional)"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
              />
            </div>
            <div className="col-12">
              <input
                className="form-control"
                placeholder='Meta JSON (optional, e.g. {"location":"Dhaka"})'
                value={metaJson}
                onChange={(e) => setMetaJson(e.target.value)}
              />
            </div>
          </div>
          <button className="btn btn-success btn-sm mt-3" onClick={createScan} disabled={loading}>
            Create Scan Event
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h6 className="mb-3">Response</h6>
          <pre style={{ whiteSpace: "pre-wrap" }}>{response ? JSON.stringify(response, null, 2) : "No response yet."}</pre>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <h6 className="mb-0">Recent Serials</h6>
            <div className="d-flex gap-2">
              <input
                className="form-control form-control-sm"
                placeholder="Batch ID"
                value={listFilters.batchId}
                onChange={(e) => setListFilters({ ...listFilters, batchId: e.target.value })}
              />
              <select
                className="form-select form-select-sm"
                value={listFilters.status}
                onChange={(e) => setListFilters({ ...listFilters, status: e.target.value })}
              >
                <option value="">All</option>
                <option value="ISSUED">ISSUED</option>
                <option value="ACTIVATED">ACTIVATED</option>
                <option value="SOLD">SOLD</option>
                <option value="VOID">VOID</option>
                <option value="RECALLED">RECALLED</option>
              </select>
              <input
                className="form-control form-control-sm"
                placeholder="Search code"
                value={listFilters.search}
                onChange={(e) => setListFilters({ ...listFilters, search: e.target.value })}
              />
              <button className="btn btn-sm btn-outline-primary" onClick={fetchSerials} disabled={loading}>
                Load
              </button>
            </div>
          </div>
          {serials.length === 0 ? (
            <p className="text-secondary">No serials found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Code</th>
                    <th>Status</th>
                    <th>Batch</th>
                    <th>First Scan</th>
                  </tr>
                </thead>
                <tbody>
                  {serials.map((s) => (
                    <tr key={s.id}>
                      <td>{s.id}</td>
                      <td style={{ maxWidth: 240, wordBreak: "break-all" }}>{s.serialCode}</td>
                      <td>{s.status}</td>
                      <td>{s.batchId}</td>
                      <td>{s.firstScanAt ? new Date(s.firstScanAt).toLocaleString() : "—"}</td>
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
