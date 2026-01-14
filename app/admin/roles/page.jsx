"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPatch, apiPost } from "../../../lib/api";

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

function SmallPill({ text }) {
  return (
    <span
      style={{
        fontSize: 12,
        padding: "2px 8px",
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        background: "#fafafa",
        marginRight: 6,
        marginBottom: 6,
        display: "inline-block",
      }}
    >
      {text}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]);

  const [createForm, setCreateForm] = useState({ key: "", name: "" });
  const [activeRoleId, setActiveRoleId] = useState(null);
  const [editForm, setEditForm] = useState({ key: "", name: "" });
  const [selectedKeys, setSelectedKeys] = useState(new Set());

  const canWrite = true;

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [r, p] = await Promise.all([
        apiGet("/api/v1/admin/roles"),
        apiGet("/api/v1/admin/permissions"),
      ]);
      setRoles(r?.data || []);
      setPerms(p?.data || []);
    } catch (e) {
      setError(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const activeRole = useMemo(
    () => roles.find((r) => r.id === activeRoleId) || null,
    [roles, activeRoleId]
  );

  useEffect(() => {
    if (!activeRole) return;
    setEditForm({ key: activeRole.key || "", name: activeRole.name || "" });
    const keys = new Set(
      (activeRole.permissions || []).map((rp) => rp.permission?.key).filter(Boolean)
    );
    setSelectedKeys(keys);
  }, [activeRoleId]);

  async function onCreateRole(e) {
    e.preventDefault();
    setError("");
    if (!createForm.key || !createForm.name) {
      setError("key and name are required");
      return;
    }

    setLoading(true);
    try {
      await apiPost("/api/v1/admin/roles", { key: createForm.key, name: createForm.name });
      setCreateForm({ key: "", name: "" });
      await load();
    } catch (e2) {
      setError(e2?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function onSaveRoleBasics(e) {
    e.preventDefault();
    if (!activeRole) return;
    setLoading(true);
    setError("");
    try {
      await apiPatch(`/api/v1/admin/roles/${activeRole.id}`, {
        key: editForm.key,
        name: editForm.name,
      });
      await load();
    } catch (e2) {
      setError(e2?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function onSavePermissions() {
    if (!activeRole) return;
    setLoading(true);
    setError("");
    try {
      await apiPost(`/api/v1/admin/roles/${activeRole.id}/permissions`, {
        keys: Array.from(selectedKeys),
      });
      await load();
    } catch (e2) {
      setError(e2?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: 6 }}>Roles</h2>
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            Create roles for your organization, then assign permission keys.
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

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "380px 1fr", gap: 14 }}>
        <div style={{ display: "grid", gap: 12 }}>
          {canWrite ? (
            <Card>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Create Role</div>
              <form onSubmit={onCreateRole}>
                <Field label="Key">
                  <input
                    value={createForm.key}
                    onChange={(e) => setCreateForm((s) => ({ ...s, key: e.target.value }))}
                    placeholder="e.g. SUPPORT"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb" }}
                  />
                </Field>
                <Field label="Name">
                  <input
                    value={createForm.name}
                    onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
                    placeholder="e.g. Support Team"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb" }}
                  />
                </Field>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      background: "#111827",
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    Create
                  </button>
                </div>
              </form>
            </Card>
          ) : null}

          <Card>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Role list</div>
            <div style={{ display: "grid", gap: 8 }}>
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveRoleId(r.id)}
                  style={{
                    textAlign: "left",
                    padding: "10px 10px",
                    borderRadius: 12,
                    border: activeRoleId === r.id ? "1px solid #111827" : "1px solid #e5e7eb",
                    background: activeRoleId === r.id ? "#f9fafb" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 800 }}>{r.key}</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>{r.name}</div>
                </button>
              ))}
              {!roles.length ? <div style={{ color: "#6b7280" }}>No roles yet.</div> : null}
            </div>
          </Card>
        </div>

        <div>
          {!activeRole ? (
            <Card>
              <div style={{ color: "#6b7280" }}>Select a role to view/edit details.</div>
            </Card>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <Card>
                <div style={{ fontWeight: 800, marginBottom: 10 }}>Role details</div>
                <form onSubmit={onSaveRoleBasics}>
                  <Field label="Key">
                    <input
                      value={editForm.key}
                      onChange={(e) => setEditForm((s) => ({ ...s, key: e.target.value }))}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb" }}
                    />
                  </Field>
                  <Field label="Name">
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb" }}
                    />
                  </Field>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        padding: "9px 12px",
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        background: "#111827",
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    >
                      Save
                    </button>
                  </div>
                </form>
              </Card>

              <Card>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Permissions</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
                  Tick the permission keys this role should have, then click “Save permissions”.
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                  {perms.map((p) => {
                    const checked = selectedKeys.has(p.key);
                    return (
                      <label
                        key={p.key}
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "flex-start",
                          padding: 10,
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          background: checked ? "#f9fafb" : "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = new Set(selectedKeys);
                            if (e.target.checked) next.add(p.key);
                            else next.delete(p.key);
                            setSelectedKeys(next);
                          }}
                          style={{ marginTop: 2 }}
                        />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13 }}>{p.key}</div>
                          {p.description ? (
                            <div style={{ fontSize: 12, color: "#6b7280" }}>{p.description}</div>
                          ) : null}
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Selected: {selectedKeys.size}
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={onSavePermissions}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      background: "#111827",
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    Save permissions
                  </button>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Currently assigned</div>
                  <div>
                    {(activeRole.permissions || []).length ? (
                      (activeRole.permissions || []).map((rp) => (
                        <SmallPill key={rp.permissionId} text={rp.permission?.key || ""} />
                      ))
                    ) : (
                      <span style={{ color: "#9ca3af" }}>—</span>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
