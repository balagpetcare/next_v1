"use client";

import { useEffect, useState, useMemo } from 'react';
import { Icon } from '@iconify/react';
import PageHeader from '@/src/bpa/components/PageHeader';
import { apiGet, apiPost } from '@/lib/api';
import SectionCard from '@/src/bpa/admin/components/SectionCard';
import StatusChip from '@/src/bpa/admin/components/StatusChip';

const STATUS = ["", "PENDING", "APPROVED", "REJECTED", "PROCESSED", "REFUNDED"];

export default function Page() {
  const [returns, setReturns] = useState([]);
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
      const r = await apiGet(`/api/v1/returns?${params.toString()}`);
      setReturns(Array.isArray(r?.data) ? r.data : r?.data?.items || []);
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
    if (!search) return returns;
    const q = search.toLowerCase();
    return returns.filter((r) => {
      const returnId = String(r.id || '');
      const orderId = String(r.orderId || '');
      return returnId.includes(q) || orderId.includes(q);
    });
  }, [returns, search]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount || 0);
  };

  return (
    <div className="container-fluid">
      <PageHeader
        title="Returns Management"
        subtitle={`Total: ${filtered.length} returns`}
        right={
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <input
              type="text"
              className="form-control"
              placeholder="Search return ID, order ID..."
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

      <SectionCard title="Returns">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Return ID</th>
                <th>Order ID</th>
                <th>Reason</th>
                <th>Refund Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="fw-semibold">#{r.id}</td>
                  <td>Order #{r.orderId}</td>
                  <td style={{ fontSize: 13 }}>{r.reason || '—'}</td>
                  <td className="fw-semibold">{formatCurrency(r.refundAmount)}</td>
                  <td><StatusChip status={r.status} /></td>
                  <td style={{ fontSize: 12 }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="text-end">
                    <a className="btn btn-sm btn-primary" href={`/admin/returns/${r.id}`}>
                      View
                    </a>
                  </td>
                </tr>
              ))}
              {!filtered.length && !loading ? (
                <tr><td colSpan={7} className="text-secondary text-center" style={{ fontSize: 13 }}>No returns found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
