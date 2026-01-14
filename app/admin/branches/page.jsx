"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPatch, apiPost } from "../../../lib/api";

const CAPS = [
  "clinic",
  "shop",
  "online_sales",
  "delivery_hub",
  "hq_warehouse",
];

function Pill({ children }) {
  return (
    <span
      style={{
        fontSize: 12,
        padding: "4px 8px",
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        background: "#fafafa",
      }}
    >
      {children}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 12,
        background: "#fff",
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

export default function Page() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Create
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [caps, setCaps] = useState(["clinic"]);

  // Edit
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await apiGet("/api/v1/admin/branches");
      setItems(res?.data || []);
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const canWrite = true; // UI already hidden by permissions in nav; keep simple.

  const editingCaps = useMemo(() => {
    if (!editing) return [];
    return (editing.capabilities || []).map((x) => x.capability);
  }, [editing]);

  async function onCreate(e) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !code.trim()) {
      setError("Name and code are required");
      return;
    }
    try {
      await apiPost("/api/v1/admin/branches", {
        name: name.trim(),
        code: code.trim(),
        address: address.trim() || undefined,
        capabilities: caps,
      });
      setName("");
      setCode("");
      setAddress("");
      setCaps(["clinic"]);
      await load();
    } catch (e2) {
      setError(e2?.message || "Create failed");
    }
  }

  async function onSaveEdit(e) {
    e.preventDefault();
    if (!editing) return;
    setError("");
    try {
      await apiPatch(`/api/v1/admin/branches/${editing.id}`, {
        name: editing.name,
        address: editing.address,
        isActive: editing.isActive,
        capabilities: editingCaps,
      });
      setEditing(null);
      await load();
    } catch (e2) {
      setError(e2?.message || "Update failed");
    }
  }

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: 6 }}>Branches</h2>
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            Create/update branches and set capabilities (clinic/shop/online etc.).
          </div>
        </div>
        <button
          onClick={load}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#fff",
            height: "fit-content",
          }}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 10,
            border: "1px solid #fecaca",
            background: "#fff1f2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 14, marginTop: 14 }}>
        <Section title={editing ? `Edit Branch #${editing.id}` : "Create Branch"}>
          {editing ? (
            <form onSubmit={onSaveEdit} style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Name</div>
                <input
                  value={editing.name || ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Address</div>
                <input
                  value={editing.address || ""}
                  onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
                />
              </label>

              <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={!!editing.isActive}
                  onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                />
                <span style={{ fontSize: 13 }}>Active</span>
              </label>

              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                  Capabilities
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {CAPS.map((c) => {
                    const checked = editingCaps.includes(c);
                    return (
                      <label key={c} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? Array.from(new Set([...editingCaps, c]))
                              : editingCaps.filter((x) => x !== c);
                            setEditing({
                              ...editing,
                              capabilities: next.map((cap) => ({ capability: cap })),
                            });
                          }}
                        />
                        <span style={{ fontSize: 13 }}>{c}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  type="submit"
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#111827", color: "#fff" }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={onCreate} style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Name *</div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rampura Branch"
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Code *</div>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Unique in org (e.g. CS-01)"
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Address</div>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Optional"
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
                />
              </label>

              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                  Capabilities
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {CAPS.map((c) => (
                    <label key={c} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={caps.includes(c)}
                        onChange={(e) => {
                          setCaps((prev) =>
                            e.target.checked
                              ? Array.from(new Set([...prev, c]))
                              : prev.filter((x) => x !== c)
                          );
                        }}
                      />
                      <span style={{ fontSize: 13 }}>{c}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!canWrite}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: canWrite ? "#111827" : "#e5e7eb",
                  color: canWrite ? "#fff" : "#6b7280",
                }}
              >
                Create
              </button>
            </form>
          )}
        </Section>

        <Section title={`All Branches (${items.length})`}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left" style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>Name</th>
                  <th align="left" style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>Code</th>
                  <th align="left" style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>Capabilities</th>
                  <th align="left" style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>Status</th>
                  <th style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }} />
                </tr>
              </thead>
              <tbody>
                {items.map((b) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: 10, fontWeight: 700 }}>{b.name}</td>
                    <td style={{ padding: 10, fontFamily: "monospace", fontSize: 13 }}>{b.code}</td>
                    <td style={{ padding: 10 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {(b.capabilities || []).length ? (
                          b.capabilities.map((c) => <Pill key={c.capability}>{c.capability}</Pill>)
                        ) : (
                          <span style={{ color: "#6b7280", fontSize: 13 }}>—</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: 10 }}>{b.isActive ? "Active" : "Inactive"}</td>
                    <td style={{ padding: 10 }}>
                      <button
                        onClick={() => setEditing(b)}
                        style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}

                {!items.length ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 12, color: "#6b7280" }}>
                      No branches yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
}
