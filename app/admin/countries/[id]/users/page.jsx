"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

export default function CountryUsersPage() {
  const params = useParams();
  const countryId = useMemo(() => Number(params?.id), [params]);
  const [roles, setRoles] = useState([]);
  const [rows, setRows] = useState([]);
  const [invites, setInvites] = useState([]);
  const [form, setForm] = useState({ email: "", displayName: "", roleId: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!countryId) return;
    setLoading(true);
    setError("");
    try {
      const [usersRes, rolesRes, invitesRes] = await Promise.all([
        apiGet(`/api/v1/admin/country/countries/${countryId}/users`),
        apiGet("/api/v1/admin/roles"),
        apiGet(`/api/v1/admin/access-invites?countryId=${countryId}&scopeType=COUNTRY`),
      ]);
      const allRoles = rolesRes?.data ?? [];
      setRoles(allRoles.filter((r) => r.scope === "COUNTRY"));
      setRows(usersRes?.data ?? []);
      setInvites(invitesRes?.data ?? []);
    } catch (e) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [countryId]);

  useEffect(() => {
    load();
  }, [load]);

  const onInvite = async (e) => {
    e.preventDefault();
    if (!form.email || !form.roleId) return;
    setLoading(true);
    setError("");
    try {
      await apiPost(`/api/v1/admin/access-invites`, {
        scopeType: "COUNTRY",
        countryId,
        roleId: Number(form.roleId),
        email: form.email,
        displayName: form.displayName?.trim() || undefined,
      });
      setForm({ email: "", displayName: "", roleId: "" });
      await load();
    } catch (e2) {
      setError(e2?.message ?? "Invite failed");
    } finally {
      setLoading(false);
    }
  };

  const onRevokeInvite = async (row) => {
    setLoading(true);
    setError("");
    try {
      await apiPost(`/api/v1/admin/access-invites/${row.id}/revoke`, {});
      await load();
    } catch (e) {
      setError(e?.message ?? "Revoke failed");
    } finally {
      setLoading(false);
    }
  };

  const onResendInvite = async (row) => {
    setLoading(true);
    setError("");
    try {
      await apiPost(`/api/v1/admin/access-invites`, {
        scopeType: "COUNTRY",
        countryId,
        roleId: Number(row.roleId),
        email: row.email,
        displayName: row.displayName || undefined,
      });
      await load();
    } catch (e) {
      setError(e?.message ?? "Resend failed");
    } finally {
      setLoading(false);
    }
  };

  const onRemove = async (row) => {
    setLoading(true);
    setError("");
    try {
      await apiDelete(`/api/v1/admin/country/countries/${countryId}/users/${row.userId}/roles/${row.roleId}`);
      await load();
    } catch (e) {
      setError(e?.message ?? "Remove failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <PageHeader
        title="Country Staff"
        subtitle={`Country ID: ${countryId || "-"}`}
        icon={<Icon icon="solar:user-id-outline" />}
      />

      <SectionCard title="Invite Country Staff">
        <form className="row g-3" onSubmit={onInvite}>
          <div className="col-md-4">
            <label className="form-label">Email</label>
            <input
              className="form-control"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="staff@email.com"
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Display Name (optional)</label>
            <input
              className="form-control"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="Staff name"
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Role</label>
            <select
              className="form-select"
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              required
            >
              <option value="">Select role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} ({r.key})
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-1 d-flex align-items-end">
            <button className="btn btn-primary w-100" disabled={loading}>
              Invite
            </button>
          </div>
        </form>
        {error ? <div className="text-danger mt-2">{error}</div> : null}
      </SectionCard>

      <SectionCard title="Country Staff Assignments" className="mt-4">
        {loading ? <div>Loading...</div> : null}
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Display</th>
                <th>Role</th>
                <th>Assigned At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.userId}-${row.roleId}`}>
                  <td>{row.userId}</td>
                  <td>{row.user?.profile?.displayName || row.user?.profile?.username || "-"}</td>
                  <td>{row.role?.label || row.role?.key}</td>
                  <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => onRemove(row)} disabled={loading}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted">
                    No country staff assigned.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <SectionCard title="Pending Invites" className="mt-4">
        {loading ? <div>Loading...</div> : null}
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((row) => (
                <tr key={row.id}>
                  <td>{row.email}</td>
                  <td>{row.role?.label || row.role?.key || row.roleId}</td>
                  <td>{row.status}</td>
                  <td>{row.expiresAt ? new Date(row.expiresAt).toLocaleString() : "-"}</td>
                  <td className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => onResendInvite(row)}
                      disabled={loading}
                    >
                      Resend
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => onRevokeInvite(row)}
                      disabled={loading || row.status !== "PENDING"}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
              {invites.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted">
                    No invites found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

