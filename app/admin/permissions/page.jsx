"use client";

import { useEffect, useState } from "react";
import { apiGet } from "../../../lib/api";

function Card({ children }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 12,
        background: "#fff",
      }}
    >
      {children}
    </div>
  );
}

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await apiGet("/api/v1/admin/permissions");
      setItems(res?.data || []);
    } catch (e) {
      setError(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: 6 }}>Permissions</h2>
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            Read-only catalog. Roles are configured on the Roles page.
          </div>
        </div>

        <button
          onClick={load}
          disabled={loading}
          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" }}
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2" }}>
          <b style={{ color: "#b91c1c" }}>Error:</b> {error}
        </div>
      ) : null}

      <div style={{ marginTop: 14 }}>
        <Card>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th align="left" style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>Key</th>
                <th align="left" style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id || p.key}>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                    {p.key}
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6", color: "#6b7280" }}>
                    {p.description || "—"}
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={2} style={{ padding: 12, color: "#6b7280" }}>No permissions found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
