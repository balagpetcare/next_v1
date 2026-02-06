"use client";

import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../lib/api";

export default function Page() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ email: "", phone: "", note: "" });
  const [editingId, setEditingId] = useState(null);

  const filtered = useMemo(() => rows, [rows]);

  async function load(searchQ) {
    setLoading(true);
    setError("");
    try {
      const qs = String(searchQ ?? q).trim();
      const url = qs ? `/api/v1/admin/super-admin-whitelist?q=${encodeURIComponent(qs)}` : "/api/v1/admin/super-admin-whitelist";
      const r = await apiGet(url);
      setRows(r?.data || []);
    } catch (e) {
      setError(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm({ email: "", phone: "", note: "" });
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        note: form.note.trim() || undefined,
      };
      if (!payload.email && !payload.phone) {
        setError("Email or Phone is required");
        return;
      }

      if (editingId) {
        await apiPatch(`/api/v1/admin/super-admin-whitelist/${editingId}`, payload);
      } else {
        await apiPost("/api/v1/admin/super-admin-whitelist", payload);
      }
      resetForm();
      await load();
    } catch (e2) {
      setError(e2?.message || "Save failed");
    }
  }

  async function toggleActive(id, isActive) {
    setError("");
    try {
      await apiPatch(`/api/v1/admin/super-admin-whitelist/${id}`, { isActive: !isActive });
      await load();
    } catch (e2) {
      setError(e2?.message || "Update failed");
    }
  }

  async function removeRow(id) {
    setError("");
    const ok = window.confirm("Remove this whitelist entry? This can lock someone out.");
    if (!ok) return;
    try {
      await apiDelete(`/api/v1/admin/super-admin-whitelist/${id}`);
      await load();
    } catch (e2) {
      setError(e2?.message || "Delete failed");
    }
  }

  function startEdit(r) {
    setEditingId(r.id);
    setForm({
      email: r.email || "",
      phone: r.phone || "",
      note: r.note || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Super Admin Whitelist</h2>
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            Only entries in this list can access the Admin panel. Add Email and/or Phone.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search (email/phone/note)"
            style={{ ...input, width: 260 }}
          />
          <button onClick={() => load()} style={btn2}>{loading ? "Loading..." : "Search"}</button>
          <button onClick={() => { setQ(""); load(""); }} style={btn2}>Reset</button>
        </div>
      </div>

      {error ? <div style={errStyle}>{error}</div> : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "420px 1fr", gap: 12 }}>
        <div style={card}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>{editingId ? "Edit Entry" : "Add Entry"}</div>
          <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
            <input
              placeholder="Email (optional)"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={input}
            />
            <input
              placeholder="Phone (optional)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              style={input}
            />
            <input
              placeholder="Note (e.g., Founder)"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              style={input}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button style={btn}>{editingId ? "Update" : "Add"}</button>
              {editingId ? (
                <button type="button" onClick={resetForm} style={btn2}>Cancel</button>
              ) : null}
            </div>
          </form>
          <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
            Tip: For BD numbers you can write 017xxxxxxxx or +88017xxxxxxxx — system will store last 11 digits.
          </div>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>List</div>
          <div style={{ display: "grid", gap: 8 }}>
            {filtered.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 10,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span>{r.email || "—"}</span>
                    <span style={{ color: "#6b7280", fontWeight: 600 }}>{r.phone ? `• ${r.phone}` : ""}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    {r.note || ""}
                    {r.note ? " • " : ""}
                    {r.isActive ? "Active" : "Inactive"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button onClick={() => startEdit(r)} style={btn2}>Edit</button>
                  <button
                    onClick={() => toggleActive(r.id, r.isActive)}
                    style={{ ...btn2, borderColor: r.isActive ? "#111827" : "#e5e7eb" }}
                  >
                    {r.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => removeRow(r.id)} style={{ ...btn2, borderColor: "#fecaca" }}>Delete</button>
                </div>
              </div>
            ))}
            {!filtered.length && !loading ? <div style={{ color: "#6b7280", fontSize: 13 }}>No entries.</div> : null}
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
