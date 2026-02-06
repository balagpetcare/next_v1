"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from '@iconify/react';
import { apiGet } from "../../../../lib/api";
import PageHeader from '@/src/bpa/components/PageHeader';
import SectionCard from '@/src/bpa/admin/components/SectionCard';
import StatusChip from '@/src/bpa/admin/components/StatusChip';

const STATUS = ["", "ACTIVE", "PENDING", "REJECTED", "SUSPENDED", "INACTIVE"];

export default function Page() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const q = status ? `?status=${encodeURIComponent(status)}` : "";
      const r = await apiGet(`/api/v1/admin/verifications/staff${q}`);
      setRows(r?.data || []);
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const name = (r.fullName || '').toLowerCase();
      const phone = (r.phone || r.user?.auth?.phone || '').toLowerCase();
      const title = (r.title || '').toLowerCase();
      const userId = String(r.userId || '');
      const staffId = String(r.id || '');
      return name.includes(q) || phone.includes(q) || title.includes(q) || userId.includes(q) || staffId.includes(q);
    });
  }, [rows, search]);

  const count = useMemo(() => filtered.length, [filtered]);

  return (
    <div className="container-fluid">
      <PageHeader
        title="Staff Verification Queue"
        subtitle={`Total: ${count} ${status ? `(${status})` : ''}`}
        right={
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <input
              type="text"
              className="form-control"
              placeholder="Search name, phone, title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 250 }}
            />
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 220 }}>
              {STATUS.map((s) => (
                <option key={s} value={s}>{s || "All Status"}</option>
              ))}
            </select>
            <button onClick={load} disabled={loading} className="btn btn-outline-primary d-flex align-items-center gap-2">
              <Icon icon="solar:refresh-outline" />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <SectionCard title="Queue">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Contact</th>
                <th>Roles</th>
                <th>Branches</th>
                <th>Status</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="fw-semibold">{r.fullName || '—'}</div>
                    <div className="text-secondary" style={{ fontSize: 12 }}>
                      Staff #{r.id} • User #{r.userId}
                      {r.title && <span> • {r.title}</span>}
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    <div>{r.phone || r.user?.auth?.phone || '—'}</div>
                    <div className="text-secondary" style={{ fontSize: 12 }}>{r.user?.auth?.email || '—'}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {r.roles && r.roles.length > 0 ? (
                      r.roles.map((sr, idx) => (
                        <span key={idx} className="badge bg-primary-50 text-primary-600 me-1">
                          {sr.role?.key || sr.role?.name || '—'}
                        </span>
                      ))
                    ) : (
                      <span className="text-secondary-light">No roles</span>
                    )}
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {r.branches && r.branches.length > 0 ? (
                      r.branches.map((sb, idx) => (
                        <div key={idx} className="text-secondary" style={{ fontSize: 12 }}>
                          {sb.branch?.name || `Branch #${sb.branchId}`}
                        </div>
                      ))
                    ) : (
                      <span className="text-secondary-light">No branches</span>
                    )}
                  </td>
                  <td><StatusChip status={r.status} /></td>
                  <td className="text-end">
                    <a className="btn btn-sm btn-primary" href={`/admin/verifications/staff/${r.id}`}>
                      Review
                    </a>
                  </td>
                </tr>
              ))}
              {!filtered.length && !loading ? (
                <tr><td colSpan={6} className="text-secondary text-center" style={{ fontSize: 13 }}>No items found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
