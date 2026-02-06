"use client";

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/src/bpa/components/PageHeader';
import { apiGet, apiPost } from '@/lib/api';
import SectionCard from '@/src/bpa/admin/components/SectionCard';
import StatusChip from '@/src/bpa/admin/components/StatusChip';

const STATUS = ["", "ACTIVE", "INACTIVE", "PENDING_APPROVAL", "REJECTED"];
const APPROVAL_STATUS = ["", "PENDING_APPROVAL", "APPROVED", "REJECTED"];

export default function Page() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (approvalStatus) params.append('approvalStatus', approvalStatus);
      const r = await apiGet(`/api/v1/products?${params.toString()}`);
      setRows(Array.isArray(r?.data) ? r.data : r?.data?.items || []);
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status, approvalStatus]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const name = (r.name || '').toLowerCase();
      const slug = (r.slug || '').toLowerCase();
      const id = String(r.id || '');
      return name.includes(q) || slug.includes(q) || id.includes(q);
    });
  }, [rows, search]);

  const handleApprove = async (productId) => {
    if (!confirm("Approve this product?")) return;
    try {
      await apiPost(`/api/v1/products/${productId}/approve`, {});
      alert("Product approved");
      load();
    } catch (e) {
      alert(e?.message || "Failed to approve product");
    }
  };

  const handleReject = async (productId) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      await apiPost(`/api/v1/products/${productId}/reject`, { reason });
      alert("Product rejected");
      load();
    } catch (e) {
      alert(e?.message || "Failed to reject product");
    }
  };

  return (
    <div className="container-fluid">
      <PageHeader
        title="Products Management"
        subtitle={`Total: ${filtered.length}`}
        right={
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <input
              type="text"
              className="form-control"
              placeholder="Search name, slug, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 250 }}
            />
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 180 }}>
              {STATUS.map((s) => (
                <option key={s} value={s}>{s || "All Status"}</option>
              ))}
            </select>
            <select className="form-select" value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value)} style={{ width: 200 }}>
              {APPROVAL_STATUS.map((s) => (
                <option key={s} value={s}>{s || "All Approval"}</option>
              ))}
            </select>
            <button onClick={load} disabled={loading} className="btn btn-outline-primary d-flex align-items-center gap-2">
              <Icon icon="solar:refresh-outline" />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <a href="/admin/products/moderation" className="btn btn-outline-primary">Moderation queue</a>
            <a href="/admin/products/master-catalog" className="btn btn-primary">Master catalog</a>
          </div>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <SectionCard title="Products">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Variants</th>
                <th>Status</th>
                <th>Approval</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="fw-semibold">{r.name || '—'}</div>
                    <div className="text-secondary" style={{ fontSize: 12 }}>ID: {r.id} • {r.slug || '—'}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{r.category?.name || '—'}</td>
                  <td style={{ fontSize: 13 }}>{r.variants?.length || 0} variants</td>
                  <td><StatusChip status={r.status} /></td>
                  <td><StatusChip status={r.approvalStatus} /></td>
                  <td className="text-end">
                    <div className="d-flex gap-2 justify-content-end">
                      <a className="btn btn-sm btn-primary" href={`/admin/products/${r.id}`}>
                        View
                      </a>
                      {r.approvalStatus === 'PENDING_APPROVAL' && (
                        <>
                          <button className="btn btn-sm btn-success" onClick={() => handleApprove(r.id)}>
                            Approve
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleReject(r.id)}>
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && !loading ? (
                <tr><td colSpan={6} className="text-secondary text-center" style={{ fontSize: 13 }}>No products found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
