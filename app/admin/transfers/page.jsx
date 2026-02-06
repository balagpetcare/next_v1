"use client";

import { useEffect, useState, useMemo } from 'react';
import { Icon } from '@iconify/react';
import PageHeader from '@/src/bpa/components/PageHeader';
import { apiGet, apiPost } from '@/lib/api';
import SectionCard from '@/src/bpa/admin/components/SectionCard';
import StatusChip from '@/src/bpa/admin/components/StatusChip';

const STATUS = ["", "PENDING", "APPROVED", "IN_TRANSIT", "COMPLETED", "REJECTED", "CANCELLED"];

export default function Page() {
  const [transfers, setTransfers] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      const r = await apiGet(`/api/v1/transfers?${params.toString()}`);
      setTransfers(Array.isArray(r?.data) ? r.data : r?.data?.items || []);
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
    if (!search) return transfers;
    const q = search.toLowerCase();
    return transfers.filter((t) => {
      const transferId = String(t.id || '');
      const fromBranch = (t.fromBranch?.name || '').toLowerCase();
      const toBranch = (t.toBranch?.name || '').toLowerCase();
      return transferId.includes(q) || fromBranch.includes(q) || toBranch.includes(q);
    });
  }, [transfers, search]);

  return (
    <div className="container-fluid">
      <PageHeader
        title="Inventory Transfers"
        subtitle={`Total: ${filtered.length} transfers`}
        right={
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <input
              type="text"
              className="form-control"
              placeholder="Search transfer ID, branches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 300 }}
            />
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 200 }}>
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

      <SectionCard title="Transfers">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Transfer ID</th>
                <th>From Branch</th>
                <th>To Branch</th>
                <th>Items</th>
                <th>Status</th>
                <th>Date</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="fw-semibold">#{t.id}</td>
                  <td style={{ fontSize: 13 }}>{t.fromBranch?.name || `Branch #${t.fromBranchId}`}</td>
                  <td style={{ fontSize: 13 }}>{t.toBranch?.name || `Branch #${t.toBranchId}`}</td>
                  <td style={{ fontSize: 13 }}>{t.items?.length || 0} items</td>
                  <td><StatusChip status={t.status} /></td>
                  <td style={{ fontSize: 12 }}>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="text-end">
                    <a className="btn btn-sm btn-primary" href={`/admin/transfers/${t.id}`}>
                      View
                    </a>
                  </td>
                </tr>
              ))}
              {!filtered.length && !loading ? (
                <tr><td colSpan={7} className="text-secondary text-center" style={{ fontSize: 13 }}>No transfers found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
