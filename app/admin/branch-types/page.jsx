"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "../../../lib/api";

export default function Page() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ code: "", nameEn: "", nameBn: "" });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await apiGet("/api/v1/admin/branch-types");
      setRows(r?.data || []);
    } catch (e) {
      setError(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function upsert(e) {
    e.preventDefault();
    setError("");
    try {
      await apiPost("/api/v1/admin/branch-types", {
        code: form.code.trim(),
        nameEn: form.nameEn.trim(),
        nameBn: form.nameBn.trim() || undefined,
      });
      setForm({ code: "", nameEn: "", nameBn: "" });
      await load();
    } catch (e2) {
      setError(e2?.message || "Upsert failed");
    }
  }

  async function toggle(id, isActive) {
    setError("");
    try {
      await apiPatch(`/api/v1/admin/branch-types/${id}`, { isActive: !isActive });
      await load();
    } catch (e2) {
      setError(e2?.message || "Update failed");
    }
  }

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Branch Types</h2>
          <div style={{ color: "#6b7280", fontSize: 13 }}>Upsert by code. Toggle active/inactive.</div>
        </div>
        <button onClick={load} style={btn2}>{loading ? "Loading..." : "Refresh"}</button>
      </div>

      {error ? <div style={errStyle}>{error}</div> : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "420px 1fr", gap: 12 }}>
        <div style={card}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Add / Update</div>
          <form onSubmit={upsert} style={{ display: "grid", gap: 10 }}>
            <input placeholder="CODE (e.g. CLINIC)" value={form.code} onChange={(e)=>setForm({ ...form, code: e.target.value })} style={input} />
            <input placeholder="Name EN" value={form.nameEn} onChange={(e)=>setForm({ ...form, nameEn: e.target.value })} style={input} />
            <input placeholder="Name BN" value={form.nameBn} onChange={(e)=>setForm({ ...form, nameBn: e.target.value })} style={input} />
            <button style={btn}>Save</button>
          </form>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>List</div>
          <div style={{ display: "grid", gap: 8 }}>
            {rows.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{r.code}</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>{r.nameEn}{r.nameBn ? ` • ${r.nameBn}` : ""}</div>
                </div>
                <button onClick={() => toggle(r.id, r.isActive)} style={{ ...btn2, borderColor: r.isActive ? "#111827" : "#e5e7eb" }}>
                  {r.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
            {!rows.length && !loading ? <div style={{ color: "#6b7280", fontSize: 13 }}>No items.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

const card = { border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff" };
const input = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb" };
const btn = { padding: "10px 12px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "#fff" };
const btn2 = { padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" };
const errStyle = { marginTop: 12, padding: 10, borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: 13 };
