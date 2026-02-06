"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../../../lib/api";

export default function Page() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("...");

  async function load() {
    setLoading(true);
    setError("...");
    try {
      const r = await apiGet("/api/v1/admin/branches/publish-requests");
      setRows(r?.data || []);
    } catch (e) {
      setError(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function act(id, kind) {
    try {
      if (kind === "approve") {
        await apiPost(`/api/v1/admin/branches/publish-requests/${id}/approve`, {});
      } else {
        const reason = prompt("Reject reason?") || "";
        await apiPost(`/api/v1/admin/branches/publish-requests/${id}/reject`, { reason });
      }
      await load();
    } catch (e) {
      alert(e?.message || "Action failed");
    }
  }

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Branch Publish Requests</h2>
          <div style={{ color: "#6b7280", fontSize: 13 }}>Pending: {rows.length}</div>
        </div>
        <button onClick={load} style={btnStyle} disabled={loading}>{loading ? "Loading..." : "Refresh"}</button>
      </div>

      {error ? <div style={errStyle}>{error}</div> : null}

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <div key={r.id} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 800 }}>{r.branch?.name || "Branch"} <span style={{ color: "#6b7280", fontWeight: 500 }}>#{r.branchId}</span></div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>Request #{r.id} • Status: {r.status}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => act(r.id, "approve")} style={{ ...btnStyle, width: "auto" }}>Approve</button>
                <button onClick={() => act(r.id, "reject")} style={{ ...btnStyle, width: "auto", background: "#991b1b", borderColor: "#991b1b" }}>Reject</button>
              </div>
            </div>
          </div>
        ))}
        {!rows.length && !loading ? <div style={{ color: "#6b7280", fontSize: 13 }}>No pending requests.</div> : null}
      </div>
    </div>
  );
}

const btnStyle = { padding: "10px 12px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "#fff", cursor: "pointer" };
const cardStyle = { border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff" };
const errStyle = { marginTop: 12, padding: 10, borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: 13 };
