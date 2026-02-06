"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../../../lib/api";

export default function Page() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [noteById, setNoteById] = useState({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await apiGet("/api/v1/admin/partner/applications");
      setRows(r?.data || []);
    } catch (e) {
      setError(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function act(id, kind) {
    setError("");
    try {
      const note = noteById[id] || "";
      await apiPost(`/api/v1/admin/partner/applications/${id}/${kind}`, { note });
      await load();
    } catch (e) {
      setError(e?.message || "Action failed");
    }
  }

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Partner Applications</h2>
          <div style={{ color: "#6b7280", fontSize: 13 }}>List/approve/reject partner onboarding applications.</div>
        </div>
        <button onClick={load} style={btnLite}>{loading ? "Refreshing..." : "Refresh"}</button>
      </div>

      {error ? <div style={errStyle}>{error}</div> : null}

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <div key={r.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 800 }}>{r.businessName}</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>#{r.id} • User #{r.userId} • {r.status}</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>NID: {r.nidNumber} • Trade: {r.tradeLicenseNo || "—"}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => act(r.id, "approve")} style={btn}>Approve</button>
                <button onClick={() => act(r.id, "reject")} style={{ ...btn, background: "#991b1b", borderColor: "#991b1b" }}>Reject</button>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Review note (optional)</div>
              <input
                value={noteById[r.id] || ""}
                onChange={(e) => setNoteById((p) => ({ ...p, [r.id]: e.target.value }))}
                style={input}
                placeholder="e.g., Please re-upload trade license scan"
              />
            </div>
          </div>
        ))}

        {!rows.length && !loading ? <div style={{ color: "#6b7280", fontSize: 13 }}>No items.</div> : null}
      </div>
    </div>
  );
}

const card = { border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff" };
const btn = { padding: "8px 10px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "#fff", cursor: "pointer" };
const btnLite = { padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" };
const input = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb" };
const errStyle = { marginTop: 12, padding: 10, borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: 13 };
