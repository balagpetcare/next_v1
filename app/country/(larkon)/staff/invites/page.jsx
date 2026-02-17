"use client";

import { useEffect, useMemo, useState } from "react";
import LkFormGroup from "@larkon-ui/components/LkFormGroup";
import LkInput from "@larkon-ui/components/LkInput";
import LkSelect from "@larkon-ui/components/LkSelect";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

function roleLabel(role) {
  if (!role) return "";
  if (typeof role === "string") return role;
  return role.label || role.key || String(role.id || "");
}

export default function CountryStaffInvitesPage() {
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState([]);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [roleIdFilter, setRoleIdFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createRoleId, setCreateRoleId] = useState("");
  const [createScopeType, setCreateScopeType] = useState("COUNTRY");
  const [createStateId, setCreateStateId] = useState("");
  const [createDisplayName, setCreateDisplayName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState("");

  const counts = useMemo(() => {
    const by = { PENDING: 0, ACCEPTED: 0, EXPIRED: 0, REVOKED: 0 };
    invites.forEach((i) => {
      const s = String(i.status || "").toUpperCase();
      if (by[s] !== undefined) by[s] += 1;
    });
    return by;
  }, [invites]);

  async function loadInvites() {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set("status", statusFilter);
      if (roleIdFilter) qs.set("roleId", roleIdFilter);
      if (emailFilter) qs.set("email", emailFilter);
      const res = await apiGet(`/api/v1/country/access-invites?${qs.toString()}`);
      setInvites(res?.data || []);
    } catch (e) {
      setError(e?.message || "Failed to load invites");
    } finally {
      setLoading(false);
    }
  }

  async function loadRoles() {
    try {
      const res = await apiGet("/api/v1/country/staff/roles");
      setRoles(res?.data || []);
    } catch {}
  }

  useEffect(() => {
    loadInvites();
  }, [statusFilter, roleIdFilter]);

  useEffect(() => {
    loadRoles();
  }, []);

  async function handleCreate() {
    if (!createEmail || !createRoleId) return;
    setCreating(true);
    setError("");
    try {
      const payload = {
        email: createEmail.trim(),
        roleId: Number(createRoleId),
        scopeType: createScopeType,
        stateId: createScopeType === "STATE" ? Number(createStateId || 0) || undefined : undefined,
        displayName: createDisplayName?.trim() || undefined,
      };
      const res = await apiPost("/api/v1/country/access-invites", payload);
      const devToken = res?.data?.devInviteToken || res?.devInviteToken || "";
      setCreatedToken(devToken ? String(devToken) : "");
      setShowCreate(false);
      setCreateEmail("");
      setCreateRoleId("");
      setCreateScopeType("COUNTRY");
      setCreateStateId("");
      setCreateDisplayName("");
      await loadInvites();
    } catch (e) {
      setError(e?.message || "Failed to create invite");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id) {
    if (!id) return;
    try {
      await apiPatch(`/api/v1/country/access-invites/${id}/revoke`, {});
      await loadInvites();
    } catch (e) {
      setError(e?.message || "Failed to revoke invite");
    }
  }

  return (
    <div className="p-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="h4 mb-1">Invites</h2>
          <div className="text-secondary small">Manage country staff invitations</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
          Create Invite
        </button>
      </div>

      {error ? <div className="alert alert-danger mb-3">{error}</div> : null}

      {createdToken ? (
        <div className="alert alert-info mb-3">
          Dev Invite Token: <code>{createdToken}</code>
        </div>
      ) : null}

      <div className="card mb-3">
        <div className="card-body d-flex flex-wrap gap-8 align-items-center">
          <LkSelect
            className="form-select-sm"
            style={{ maxWidth: 180 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {["", "PENDING", "ACCEPTED", "EXPIRED", "REVOKED"].map((s) => (
              <option key={s} value={s}>
                {s || "All Status"}
              </option>
            ))}
          </LkSelect>
          <LkSelect
            className="form-select-sm"
            style={{ maxWidth: 200 }}
            value={roleIdFilter}
            onChange={(e) => setRoleIdFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label || r.key}
              </option>
            ))}
          </LkSelect>
          <LkInput
            className="form-control-sm"
            placeholder="Search email"
            style={{ maxWidth: 240 }}
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
          />
          <button className="btn btn-light btn-sm" onClick={loadInvites} disabled={loading}>
            {loading ? "Loading..." : "Apply"}
          </button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        {[
          { label: "Pending", value: counts.PENDING },
          { label: "Accepted", value: counts.ACCEPTED },
          { label: "Expired", value: counts.EXPIRED },
          { label: "Revoked", value: counts.REVOKED },
        ].map((k) => (
          <div key={k.label} className="col-md-3 col-sm-6">
            <div className="card">
              <div className="card-body">
                <div className="text-secondary small">{k.label}</div>
                <div className="h4 mb-0">{k.value ?? "—"}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Scope</th>
                  <th>Status</th>
                  <th>Sent At</th>
                  <th>Expires At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-secondary">
                      No invites found
                    </td>
                  </tr>
                ) : (
                  invites.map((row) => (
                    <tr key={row.id}>
                      <td>{row.email}</td>
                      <td>{roleLabel(row.role)}</td>
                      <td>
                        {row.scopeType === "STATE"
                          ? `State: ${row.state?.name || row.stateId || "—"}`
                          : `Country: ${row.country?.name || row.countryId || "—"}`}
                      </td>
                      <td>{row.status}</td>
                      <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}</td>
                      <td>{row.expiresAt ? new Date(row.expiresAt).toLocaleString() : "—"}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleRevoke(row.id)}
                          disabled={row.status !== "PENDING"}
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCreate ? (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create Invite</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreate(false)} />
              </div>
              <div className="modal-body">
                <LkFormGroup label="Email">
                  <LkInput
                    className="radius-12"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="staff@example.com"
                  />
                </LkFormGroup>
                <LkFormGroup label="Role">
                  <LkSelect
                    className="radius-12"
                    value={createRoleId}
                    onChange={(e) => setCreateRoleId(e.target.value)}
                  >
                    <option value="">Select role</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label || r.key}
                      </option>
                    ))}
                  </LkSelect>
                </LkFormGroup>
                <LkFormGroup label="Scope Type">
                  <LkSelect
                    className="radius-12"
                    value={createScopeType}
                    onChange={(e) => setCreateScopeType(e.target.value)}
                  >
                    <option value="COUNTRY">COUNTRY</option>
                    <option value="STATE">STATE</option>
                  </LkSelect>
                </LkFormGroup>
                {createScopeType === "STATE" ? (
                  <LkFormGroup label="State ID">
                    <LkInput
                      className="radius-12"
                      value={createStateId}
                      onChange={(e) => setCreateStateId(e.target.value)}
                      placeholder="Enter state id"
                    />
                    <div className="small text-secondary mt-1">State list UI can be added later.</div>
                  </LkFormGroup>
                ) : null}
                <LkFormGroup label="Display Name (optional)">
                  <LkInput
                    className="radius-12"
                    value={createDisplayName}
                    onChange={(e) => setCreateDisplayName(e.target.value)}
                    placeholder="Staff name"
                  />
                </LkFormGroup>
                <div className="text-secondary small">
                  Default invite expiry is 72 hours (system default).
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-light" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleCreate}
                  disabled={creating || !createEmail || !createRoleId}
                >
                  {creating ? "Creating..." : "Create Invite"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
