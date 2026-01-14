"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../../lib/api";

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

function Row({ label, children }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "140px 1fr",
      gap: 10,
      alignItems: "center",
      marginBottom: 10,
    }}>
      <div style={{ fontSize: 13, color: "#6b7280" }}>{label}</div>
      <div>{children}</div>
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
        display: "inline-block",
      }}
    >
      {text}
    </span>
  );
}

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);

  const [createForm, setCreateForm] = useState({
    userId: "",
    fullName: "",
    phone: "",
    title: "",
  });

  const canWrite = true; // server-side nav already hides page, but keep UI permissive for now

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [s, r, b] = await Promise.all([
        apiGet("/api/v1/admin/staff"),
        apiGet("/api/v1/admin/roles"),
        apiGet("/api/v1/admin/branches"),
      ]);
      setStaff(s?.data || []);
      setRoles(r?.data || []);
      setBranches(b?.data || []);
    } catch (e) {
      setError(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const roleOptions = useMemo(() => roles.map((r) => ({ id: r.id, label: `${r.key} — ${r.name}` })), [roles]);
  const branchOptions = useMemo(() => branches.map((b) => ({ id: b.id, label: `${b.code} — ${b.name}` })), [branches]);

  async function onCreateStaff(e) {
    e.preventDefault();
    setError("");

    const userId = Number(createForm.userId);
    if (!userId) {
      setError("userId is required");
      return;
    }

    setLoading(true);
    try {
      await apiPost("/api/v1/admin/staff", {
        userId,
        fullName: createForm.fullName || undefined,
        phone: createForm.phone || undefined,
        title: createForm.title || undefined,
      });
      setCreateForm({ userId: "", fullName: "", phone: "", title: "" });
      await load();
    } catch (e2) {
      setError(e2?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function assignRole(staffId, roleId) {
    if (!roleId) return;
    setLoading(true);
    setError("");
    try {
      await apiPost(`/api/v1/admin/staff/${staffId}/roles`, { roleId: Number(roleId) });
      await load();
    } catch (e) {
      setError(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function assignBranch(staffId, branchId, position) {
    if (!branchId) return;
    setLoading(true);
    setError("");
    try {
      await apiPost(`/api/v1/admin/staff/${staffId}/branches`, {
        branchId: Number(branchId),
        position: position || undefined,
      });
      await load();
    } catch (e) {
      setError(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: 6 }}>Staff</h2>
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            Create staff profiles for existing users, then assign roles and branch access.
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

      {canWrite ? (
        <div style={{ marginTop: 14 }}>
          <Card>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Create Staff</div>
            <form onSubmit={onCreateStaff}>
              <Row label="User ID">
                <input
                  value={createForm.userId}
                  onChange={(e) => setCreateForm((s) => ({ ...s, userId: e.target.value }))}
                  placeholder="e.g. 1"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb" }}
                />
              </Row>
              <Row label="Full name">
                <input
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm((s) => ({ ...s, fullName: e.target.value }))}
                  placeholder="Optional"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb" }}
                />
              </Row>
              <Row label="Phone">
                <input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((s) => ({ ...s, phone: e.target.value }))}
                  placeholder="Optional"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb" }}
                />
              </Row>
              <Row label="Title">
                <input
                  value={createForm.title}
                  onChange={(e) => setCreateForm((s) => ({ ...s, title: e.target.value }))}
                  placeholder="e.g. Branch Manager"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb" }}
                />
              </Row>

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
        </div>
      ) : null}

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {staff.map((s) => {
          const staffRoles = (s.roles || []).map((x) => x.role?.key).filter(Boolean);
          const staffBranches = (s.branches || []).map((x) => x.branch?.code).filter(Boolean);

          return (
            <Card key={s.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>Staff #{s.id}</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    userId: <b>{s.userId}</b>
                    {s.fullName ? <span> — {s.fullName}</span> : null}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Roles</div>
                <div>
                  {staffRoles.length ? staffRoles.map((r) => <SmallPill key={r} text={r} />) : <span style={{ color: "#9ca3af" }}>—</span>}
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Branches</div>
                <div>
                  {staffBranches.length ? staffBranches.map((b) => <SmallPill key={b} text={b} />) : <span style={{ color: "#9ca3af" }}>—</span>}
                </div>
              </div>

              {canWrite ? (
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ border: "1px dashed #e5e7eb", borderRadius: 12, padding: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Assign role</div>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        e.target.value = "";
                        assignRole(s.id, v);
                      }}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" }}
                    >
                      <option value="">Select a role…</option>
                      {roleOptions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                      After assigning, refresh will show updated permissions next login.
                    </div>
                  </div>

                  <div style={{ border: "1px dashed #e5e7eb", borderRadius: 12, padding: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Assign branch</div>

                    <select
                      defaultValue=""
                      id={`branch-${s.id}`}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" }}
                    >
                      <option value="">Select a branch…</option>
                      {branchOptions.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                    <input
                      id={`pos-${s.id}`}
                      placeholder="Position (optional)"
                      style={{ width: "100%", marginTop: 8, padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb" }}
                    />

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        const branchId = document.getElementById(`branch-${s.id}`)?.value;
                        const position = document.getElementById(`pos-${s.id}`)?.value;
                        assignBranch(s.id, branchId, position);
                      }}
                      style={{
                        width: "100%",
                        marginTop: 8,
                        padding: "9px 12px",
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        background: "#111827",
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}

        {!staff.length ? (
          <Card>
            <div style={{ color: "#6b7280" }}>No staff yet.</div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
