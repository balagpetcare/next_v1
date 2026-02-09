"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Icon } from '@iconify/react';
import { useSearchParams } from 'next/navigation';
import { apiGet } from "../../../../lib/api";
import PageHeader from '@/src/bpa/components/PageHeader';
import SectionCard from '@/src/bpa/admin/components/SectionCard';
import StatusChip from '@/src/bpa/admin/components/StatusChip';

const STATUS = ["", "SUBMITTED", "REQUEST_CHANGES", "VERIFIED", "REJECTED", "SUSPENDED", "UNSUBMITTED"];

function OwnersVerificationsContent() {
  const sp = useSearchParams();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState(sp.get('status') || "");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const q = status ? `?status=${encodeURIComponent(status)}` : "";
      const r = await apiGet(`/api/v1/admin/verifications/owners${q}`);
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
      const phone = (r.user?.auth?.phone || '').toLowerCase();
      const email = (r.user?.auth?.email || '').toLowerCase();
      const nid = (r.nidNumber || '').toLowerCase();
      const userId = String(r.userId || '');
      return name.includes(q) || phone.includes(q) || email.includes(q) || nid.includes(q) || userId.includes(q);
    });
  }, [rows, search]);

  const count = useMemo(() => filtered.length, [filtered]);

  return (
    <div className="container-fluid">
      <PageHeader
        title="Owner KYC Queue"
        subtitle={`Total: ${count} ${status ? `(${status})` : ''}`}
        right={
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <input
              type="text"
              className="form-control"
              placeholder="Search name, phone, email, NID..."
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
                <th>Owner</th>
                <th>Contact</th>
                <th>NID / Submitted</th>
                <th>Status</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="fw-semibold">{r.fullName || '—'}</div>
                    <div className="text-secondary" style={{ fontSize: 12 }}>User #{r.userId} • KYC #{r.id}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    <div>{r.user?.auth?.phone || '—'}</div>
                    <div className="text-secondary" style={{ fontSize: 12 }}>{r.user?.auth?.email || '—'}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    <div>NID: {r.nidNumber || '—'}</div>
                    <div className="text-secondary" style={{ fontSize: 12 }}>{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—'}</div>
                  </td>
                  <td><StatusChip status={r.verificationStatus} /></td>
                  <td className="text-end">
                    <a className="btn btn-sm btn-primary" href={`/admin/verifications/owners/${r.id}`}>
                      Review
                    </a>
                  </td>
                </tr>
              ))}
              {!filtered.length && !loading ? (
                <tr><td colSpan={5} className="text-secondary text-center" style={{ fontSize: 13 }}>No items found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="container-fluid p-4 text-secondary">Loading…</div>}>
      <OwnersVerificationsContent />
    </Suspense>
  );
}