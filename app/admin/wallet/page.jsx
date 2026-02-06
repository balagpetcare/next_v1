"use client";

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import PageHeader from '@/src/bpa/components/PageHeader';
import { apiGet, apiPatch } from '@/lib/api';
import SectionCard from '@/src/bpa/admin/components/SectionCard';
import StatusChip from '@/src/bpa/admin/components/StatusChip';
import StatCard from '@/src/bpa/admin/components/StatCard';

const STATUS_OPTIONS = ["", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"];

export default function Page() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('limit', '100');
      
      const [w, s] = await Promise.all([
        apiGet(`/api/v1/wallet/admin/withdraw/requests?${params.toString()}`).catch(() => ({ data: [] })),
        apiGet('/api/v1/admin/dashboard/summary').catch(() => ({ data: null })),
      ]);
      
      setWithdrawals(Array.isArray(w?.data) ? w.data : []);
      setSummary(s?.data || null);
    } catch (e) {
      setError(e?.message || "Failed to load withdrawal requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status]);

  const filtered = useMemo(() => {
    return withdrawals;
  }, [withdrawals]);

  const handleStatusUpdate = async (requestId, newStatus) => {
    if (!confirm(`Update withdrawal request status to ${newStatus}?`)) return;
    try {
      await apiPatch(`/api/v1/wallet/admin/withdraw/requests/${requestId}/status`, { 
        status: newStatus 
      });
      await load();
    } catch (e) {
      alert(e?.message || "Failed to update status");
    }
  };

  const handleApprove = async (requestId) => {
    if (!confirm("Approve and queue this withdrawal request?")) return;
    try {
      await apiPatch(`/api/v1/wallet/admin/withdraw/requests/${requestId}/approve`, {});
      await load();
    } catch (e) {
      alert(e?.message || "Failed to approve withdrawal");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-BD', { 
      style: 'currency', 
      currency: 'BDT', 
      minimumFractionDigits: 0 
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-BD', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const summaryStats = useMemo(() => {
    const submitted = withdrawals.filter(w => w.status === 'SUBMITTED').length;
    const underReview = withdrawals.filter(w => w.status === 'UNDER_REVIEW').length;
    const totalAmount = withdrawals
      .filter(w => ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(w.status))
      .reduce((sum, w) => sum + parseFloat(w.amount?.toString() || '0'), 0);
    
    return { submitted, underReview, totalAmount };
  }, [withdrawals]);

  return (
    <div className="container-fluid">
      <PageHeader
        title="Wallet Management"
        subtitle="Withdrawal requests and wallet transactions"
        right={
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <select 
              className="form-select" 
              value={status} 
              onChange={(e) => setStatus(e.target.value)} 
              style={{ width: 180 }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s || "All Status"}</option>
              ))}
            </select>
            <button 
              onClick={load} 
              disabled={loading} 
              className="btn btn-outline-primary d-flex align-items-center gap-2"
            >
              <Icon icon="solar:refresh-outline" />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {/* Summary Cards */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard 
            title="Pending Submissions" 
            value={summaryStats.submitted}
            icon={<Icon icon="solar:wallet-money-bold" />}
            tone="warning"
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard 
            title="Under Review" 
            value={summaryStats.underReview}
            icon={<Icon icon="solar:clock-circle-bold" />}
            tone="info"
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard 
            title="Pending Amount" 
            value={formatCurrency(summaryStats.totalAmount)}
            icon={<Icon icon="solar:dollar-bold" />}
            tone="warning"
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard 
            title="Total Requests" 
            value={filtered.length}
            icon={<Icon icon="solar:document-bold" />}
            tone="primary"
          />
        </div>
      </div>

      <SectionCard title="Withdrawal Requests">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>User</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Submitted</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="fw-semibold">#{r.id}</div>
                    {r.payoutDetails ? (
                      <div className="text-secondary" style={{ fontSize: 12 }}>
                        {r.payoutDetails.bankName || r.payoutDetails.accountType || r.method || '—'}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <div style={{ fontSize: 13 }}>
                      User #{r.userId}
                    </div>
                  </td>
                  <td>
                    <div className="fw-semibold">{formatCurrency(r.amount)}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {r.method || '—'}
                  </td>
                  <td>
                    <StatusChip status={r.status} />
                  </td>
                  <td style={{ fontSize: 13 }} className="text-secondary">
                    {formatDate(r.createdAt)}
                  </td>
                  <td className="text-end">
                    <div className="d-flex gap-2 justify-content-end">
                      <a 
                        className="btn btn-sm btn-primary" 
                        href={`/admin/wallet/${r.id}`}
                      >
                        View
                      </a>
                      {r.status === 'SUBMITTED' && (
                        <>
                          <button 
                            className="btn btn-sm btn-success" 
                            onClick={() => handleApprove(r.id)}
                          >
                            Approve
                          </button>
                          <button 
                            className="btn btn-sm btn-warning" 
                            onClick={() => handleStatusUpdate(r.id, 'UNDER_REVIEW')}
                          >
                            Review
                          </button>
                        </>
                      )}
                      {r.status === 'UNDER_REVIEW' && (
                        <button 
                          className="btn btn-sm btn-success" 
                          onClick={() => handleApprove(r.id)}
                        >
                          Approve
                        </button>
                      )}
                      {['SUBMITTED', 'UNDER_REVIEW'].includes(r.status) && (
                        <button 
                          className="btn btn-sm btn-danger" 
                          onClick={() => handleStatusUpdate(r.id, 'REJECTED')}
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && !loading ? (
                <tr>
                  <td colSpan={7} className="text-secondary text-center" style={{ fontSize: 13 }}>
                    No withdrawal requests found.
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
