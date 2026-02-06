"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from '@iconify/react';
import PageHeader from '@/src/bpa/components/PageHeader';
import { apiGet, apiPost } from "../../../lib/api";
import SectionCard from '@/src/bpa/admin/components/SectionCard';
import StatusChip from '@/src/bpa/admin/components/StatusChip';
import StatCard from '@/src/bpa/admin/components/StatCard';
import TrendChart from '@/src/bpa/admin/components/charts/TrendChart';

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState("");

  const [createForm, setCreateForm] = useState({
    branchId: "",
    userId: "",
    email: "",
    phone: "",
    displayName: "",
    role: "",
    password: "",
  });

  const canWrite = true;

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

  const filtered = useMemo(() => {
    if (!search) return staff;
    const q = search.toLowerCase();
    return staff.filter((s) => {
      const name = (s.user?.profile?.displayName || s.user?.profile?.username || '').toLowerCase();
      const email = (s.user?.auth?.email || '').toLowerCase();
      const phone = (s.user?.auth?.phone || '').toLowerCase();
      const userId = String(s.userId || '');
      const staffId = String(s.id || '');
      return name.includes(q) || email.includes(q) || phone.includes(q) || userId.includes(q) || staffId.includes(q);
    });
  }, [staff, search]);

  // Analytics calculations
  const analytics = useMemo(() => {
    const total = staff.length;
    const active = staff.filter(s => s.status === 'ACTIVE').length;
    const suspended = staff.filter(s => s.status === 'SUSPENDED').length;
    const invited = staff.filter(s => s.status === 'INVITED').length;
    
    // Role distribution
    const roleCounts = {};
    staff.forEach(s => {
      const role = s.role || 'UNKNOWN';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });

    // Branch distribution
    const branchCounts = {};
    staff.forEach(s => {
      if (s.branch?.name) {
        branchCounts[s.branch.name] = (branchCounts[s.branch.name] || 0) + 1;
      }
    });

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = staff.filter(s => {
      if (!s.createdAt) return false;
      return new Date(s.createdAt) >= sevenDaysAgo;
    }).length;

    return {
      total,
      active,
      suspended,
      invited,
      roleCounts,
      branchCounts,
      recent,
    };
  }, [staff]);

  const roleOptions = useMemo(() => roles.map((r) => ({ id: r.id, label: `${r.key} — ${r.name}` })), [roles]);
  const branchOptions = useMemo(() => branches.map((b) => ({ id: b.id, label: `${b.code} — ${b.name}` })), [branches]);

  async function onCreateStaff(e) {
    e.preventDefault();
    setError("");

    const branchId = Number(createForm.branchId);
    if (!branchId) {
      setError("Branch is required");
      return;
    }

    const role = createForm.role;
    if (!role) {
      setError("Role is required");
      return;
    }

    const userId = createForm.userId ? Number(createForm.userId) : null;
    const email = createForm.email?.trim() || null;
    const phone = createForm.phone?.trim() || null;

    if (!userId && !email && !phone) {
      setError("Either User ID or Email/Phone is required");
      return;
    }

    if (!userId && !createForm.password) {
      setError("Password is required when creating new user");
      return;
    }

    setLoading(true);
    try {
      await apiPost("/api/v1/admin/staff", {
        branchId,
        userId: userId || undefined,
        email: email || undefined,
        phone: phone || undefined,
        displayName: createForm.displayName?.trim() || undefined,
        role,
        password: createForm.password || undefined,
      });
      setCreateForm({ branchId: "", userId: "", email: "", phone: "", displayName: "", role: "", password: "" });
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
    <div className="container-fluid">
      <PageHeader
        title="Staff Management"
        subtitle="Create staff profiles, assign roles and branch access"
        right={
          <button
            onClick={load}
            disabled={loading}
            className="btn btn-outline-primary d-flex align-items-center gap-2"
          >
            <Icon icon="solar:refresh-outline" />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {/* Analytics Overview */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6 col-lg-3">
          <StatCard
            title="Total Staff"
            value={analytics.total}
            subtitle={`${analytics.active} active`}
            icon={<Icon icon="solar:users-group-rounded-outline" width={20} />}
            tone="primary"
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <StatCard
            title="Active Staff"
            value={analytics.active}
            subtitle={`${Math.round((analytics.active / Math.max(analytics.total, 1)) * 100)}% of total`}
            icon={<Icon icon="solar:user-check-rounded-outline" width={20} />}
            tone="success"
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <StatCard
            title="Suspended"
            value={analytics.suspended}
            subtitle={`${analytics.invited} invited`}
            icon={<Icon icon="solar:user-block-rounded-outline" width={20} />}
            tone="warning"
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <StatCard
            title="New This Week"
            value={analytics.recent}
            subtitle="Last 7 days"
            icon={<Icon icon="solar:user-plus-rounded-outline" width={20} />}
            tone="info"
          />
        </div>
      </div>

      {/* Role Distribution Chart */}
      {Object.keys(analytics.roleCounts).length > 0 && (
        <div className="row g-3 mb-4">
          <div className="col-12 col-lg-6">
            <SectionCard title="Staff by Role">
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th className="text-end">Count</th>
                      <th className="text-end">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(analytics.roleCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([role, count]) => (
                        <tr key={role}>
                          <td>{role.replace(/_/g, ' ')}</td>
                          <td className="text-end">{count}</td>
                          <td className="text-end">
                            {Math.round((count / analytics.total) * 100)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
          <div className="col-12 col-lg-6">
            <SectionCard title="Top Branches by Staff Count">
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th className="text-end">Staff Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(analytics.branchCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 10)
                      .map(([branch, count]) => (
                        <tr key={branch}>
                          <td>{branch}</td>
                          <td className="text-end">{count}</td>
                        </tr>
                      ))}
                    {Object.keys(analytics.branchCounts).length === 0 && (
                      <tr>
                        <td colSpan={2} className="text-secondary text-center">
                          No branch data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {canWrite && (
        <SectionCard title="Create New Staff" className="mb-3">
          <form onSubmit={onCreateStaff}>
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label">Branch *</label>
                <select
                  className="form-select"
                  value={createForm.branchId}
                  onChange={(e) => setCreateForm((s) => ({ ...s, branchId: e.target.value }))}
                  required
                >
                  <option value="">Select a branch...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Role *</label>
                <select
                  className="form-select"
                  value={createForm.role}
                  onChange={(e) => setCreateForm((s) => ({ ...s, role: e.target.value }))}
                  required
                >
                  <option value="">Select a role...</option>
                  <option value="BRANCH_MANAGER">Branch Manager</option>
                  <option value="BRANCH_STAFF">Branch Staff</option>
                  <option value="SELLER">Seller</option>
                  <option value="DELIVERY_MANAGER">Delivery Manager</option>
                  <option value="DELIVERY_STAFF">Delivery Staff</option>
                  <option value="ORG_ADMIN">Org Admin</option>
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">User ID (or create new)</label>
                <input
                  className="form-control"
                  type="number"
                  value={createForm.userId}
                  onChange={(e) => setCreateForm((s) => ({ ...s, userId: e.target.value }))}
                  placeholder="Leave empty to create new user"
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Email {!createForm.userId && '*'}</label>
                <input
                  className="form-control"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
                  placeholder="Required if creating new user"
                  required={!createForm.userId}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Phone {!createForm.userId && '*'}</label>
                <input
                  className="form-control"
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((s) => ({ ...s, phone: e.target.value }))}
                  placeholder="Required if creating new user"
                  required={!createForm.userId}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Display Name</label>
                <input
                  className="form-control"
                  value={createForm.displayName}
                  onChange={(e) => setCreateForm((s) => ({ ...s, displayName: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              {!createForm.userId && (
                <div className="col-12 col-md-4">
                  <label className="form-label">Password *</label>
                  <input
                    className="form-control"
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((s) => ({ ...s, password: e.target.value }))}
                    placeholder="Min 4 characters"
                    required
                  />
                </div>
              )}
              <div className="col-12">
                <button type="submit" disabled={loading} className="btn btn-primary">
                  Create Staff
                </button>
              </div>
            </div>
          </form>
        </SectionCard>
      )}

      <SectionCard title={`Staff List (${filtered.length})`}>
        <div className="mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, phone, user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 300 }}
          />
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Contact</th>
                <th>Roles</th>
                <th>Branches</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const staffRoles = (s.roles || []).map((x) => x.key || x.label || x).filter(Boolean);
                const displayName = s.user?.profile?.displayName || s.user?.profile?.username || `Staff #${s.id}`;
                const email = s.user?.auth?.email || '—';
                const phone = s.user?.auth?.phone || '—';
                const branchName = s.branch?.name || s.org?.name || '—';

                return (
                  <tr key={s.id}>
                    <td>
                      <div className="fw-semibold">{displayName}</div>
                      <div className="text-secondary" style={{ fontSize: 12 }}>
                        Staff #{s.id} • User #{s.userId}
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      <div>{email}</div>
                      <div className="text-secondary">{phone}</div>
                    </td>
                    <td>
                      {staffRoles.length > 0 ? (
                        <div className="d-flex flex-wrap gap-1">
                          {staffRoles.map((r, idx) => (
                            <span key={idx} className="badge bg-primary-50 text-primary-600">
                              {r}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="badge bg-secondary-50 text-secondary-600">
                          {s.role || 'No role'}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge bg-info-50 text-info-600">
                        {branchName}
                      </span>
                    </td>
                    <td><StatusChip status={s.status} /></td>
                    <td className="text-end">
                      <div className="d-flex gap-2 justify-content-end">
                        <a 
                          href={`/admin/verifications/staff/${s.id}`} 
                          className="btn btn-sm btn-outline-primary"
                        >
                          Verify
                        </a>
                        <a 
                          href={`/admin/staff/${s.id}`} 
                          className="btn btn-sm btn-primary"
                        >
                          View
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && !loading ? (
                <tr>
                  <td colSpan={6} className="text-secondary text-center" style={{ fontSize: 13 }}>
                    No staff found.
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
