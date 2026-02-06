"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import SectionCard from "@/src/bpa/admin/components/SectionCard";

export default function RolesPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]);
  const [createForm, setCreateForm] = useState({ key: "", name: "" });
  const [activeRoleId, setActiveRoleId] = useState(null);
  const [editForm, setEditForm] = useState({ key: "", name: "" });
  const [selectedKeys, setSelectedKeys] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [r, p] = await Promise.all([
        apiGet("/api/v1/admin/roles"),
        apiGet("/api/v1/admin/permissions"),
      ]);
      setRoles(r?.data ?? []);
      setPerms(p?.data ?? []);
    } catch (e) {
      setError(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeRole = useMemo(
    () => roles.find((r) => r.id === activeRoleId) ?? null,
    [roles, activeRoleId]
  );

  useEffect(() => {
    if (!activeRole) return;
    setEditForm({ key: activeRole.key ?? "", name: activeRole.name ?? activeRole.label ?? "" });
    const keys = new Set(
      (activeRole.permissions ?? []).map((rp) => rp.permission?.key).filter(Boolean)
    );
    setSelectedKeys(keys);
  }, [activeRoleId, activeRole]);

  const onCreateRole = async (e) => {
    e.preventDefault();
    setError("");
    if (!createForm.key?.trim() || !createForm.name?.trim()) {
      setError("Key and name are required.");
      return;
    }
    setLoading(true);
    try {
      await apiPost("/api/v1/admin/roles", { key: createForm.key.trim(), name: createForm.name.trim() });
      setCreateForm({ key: "", name: "" });
      await load();
    } catch (e2) {
      setError(e2?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  const onSaveRoleBasics = async (e) => {
    e.preventDefault();
    if (!activeRole || activeRole.isSystem) return;
    setLoading(true);
    setError("");
    try {
      await apiPatch(`/api/v1/admin/roles/${activeRole.id}`, {
        key: editForm.key.trim(),
        name: editForm.name.trim(),
      });
      await load();
    } catch (e2) {
      setError(e2?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  const onSavePermissions = async () => {
    if (!activeRole || activeRole.isSystem) return;
    setLoading(true);
    setError("");
    try {
      await apiPost(`/api/v1/admin/roles/${activeRole.id}/permissions`, {
        keys: Array.from(selectedKeys),
      });
      await load();
    } catch (e2) {
      setError(e2?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  const onCloneRole = async () => {
    if (!activeRole) return;
    setLoading(true);
    setError("");
    try {
      await apiPost(`/api/v1/admin/roles/${activeRole.id}/clone`, {});
      await load();
    } catch (e2) {
      setError(e2?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Manage roles and permission matrix"
        right={
          <button
            type="button"
            className="btn btn-outline-primary d-flex align-items-center gap-2"
            onClick={load}
            disabled={loading}
          >
            <Icon icon="solar:refresh-outline" />
            Refresh
          </button>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <SectionCard title="Create role">
            <form onSubmit={onCreateRole}>
              <div className="mb-2">
                <label className="form-label small text-secondary">Key</label>
                <input
                  className="form-control form-control-sm"
                  value={createForm.key}
                  onChange={(e) => setCreateForm((s) => ({ ...s, key: e.target.value }))}
                  placeholder="e.g. SUPPORT"
                />
              </div>
              <div className="mb-2">
                <label className="form-label small text-secondary">Name</label>
                <input
                  className="form-control form-control-sm"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="e.g. Support Team"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                Create
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Roles" className="mt-3">
            <div className="d-flex flex-column gap-2">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`btn btn-outline-secondary btn-sm text-start d-flex justify-content-between align-items-center ${activeRoleId === r.id ? "active" : ""}`}
                  onClick={() => setActiveRoleId(r.id)}
                >
                  <span>
                    <span className="fw-semibold">{r.key}</span>
                    {r.isSystem ? (
                      <span className="badge bg-secondary ms-2">System</span>
                    ) : null}
                  </span>
                </button>
              ))}
              {!roles.length ? <div className="text-secondary small">No roles yet.</div> : null}
            </div>
          </SectionCard>
        </div>

        <div className="col-12 col-lg-8">
          {!activeRole ? (
            <SectionCard title="Role details">
              <div className="text-secondary">Select a role to view or edit.</div>
            </SectionCard>
          ) : (
            <>
              <SectionCard
                title="Role details"
                right={
                  activeRole.isSystem ? (
                    <span className="badge bg-warning">Locked (system role)</span>
                  ) : (
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={onCloneRole}
                        disabled={loading}
                      >
                        <Icon icon="solar:copy-bold" /> Clone
                      </button>
                    </div>
                  )
                }
              >
                <form onSubmit={onSaveRoleBasics}>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label small text-secondary">Key</label>
                      <input
                        className="form-control form-control-sm"
                        value={editForm.key}
                        onChange={(e) => setEditForm((s) => ({ ...s, key: e.target.value }))}
                        disabled={activeRole.isSystem}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small text-secondary">Name</label>
                      <input
                        className="form-control form-control-sm"
                        value={editForm.name}
                        onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
                        disabled={activeRole.isSystem}
                      />
                    </div>
                  </div>
                  {!activeRole.isSystem && (
                    <button type="submit" className="btn btn-primary btn-sm mt-2" disabled={loading}>
                      Save
                    </button>
                  )}
                </form>
              </SectionCard>

              <SectionCard
                title="Permission matrix"
                right={
                  !activeRole.isSystem && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={onSavePermissions}
                      disabled={loading}
                    >
                      Save permissions
                    </button>
                  )
                }
                className="mt-3"
              >
                <p className="text-secondary small mb-2">
                  Toggle permissions for this role. Selected: {selectedKeys.size}.
                </p>
                <div className="row g-2">
                  {perms.map((p) => {
                    const checked = selectedKeys.has(p.key);
                    return (
                      <div key={p.key} className="col-12 col-md-6 col-lg-4">
                        <label
                          className={`d-flex gap-2 align-items-start p-2 rounded border ${checked ? "bg-primary bg-opacity-10 border-primary" : ""}`}
                          style={{ cursor: activeRole.isSystem ? "default" : "pointer" }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (activeRole.isSystem) return;
                              const next = new Set(selectedKeys);
                              if (e.target.checked) next.add(p.key);
                              else next.delete(p.key);
                              setSelectedKeys(next);
                            }}
                            disabled={activeRole.isSystem}
                            className="mt-1"
                          />
                          <div>
                            <div className="fw-semibold small">{p.key}</div>
                            {p.description ? (
                              <div className="text-secondary" style={{ fontSize: 12 }}>{p.description}</div>
                            ) : null}
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
                {!perms.length ? <div className="text-secondary small">No permissions.</div> : null}
              </SectionCard>

              <SectionCard title="Change history" className="mt-3">
                <div className="text-secondary small">Permission change history not yet available.</div>
              </SectionCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
