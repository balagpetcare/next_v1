"use client";

import { useEffect, useState, useMemo } from 'react';
import { Icon } from '@iconify/react';
import PageHeader from '@/src/bpa/components/PageHeader';
import { apiGet } from '@/lib/api';
import StatCard from '@/src/bpa/admin/components/StatCard';
import SectionCard from '@/src/bpa/admin/components/SectionCard';
import StatusChip from '@/src/bpa/admin/components/StatusChip';

export default function Page() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      // Note: POS transactions might be stored as orders with specific payment methods
      // Adjust endpoint based on actual API structure
      const [orders, revenue] = await Promise.all([
        apiGet('/api/v1/orders?paymentMethod=CASH&limit=100').catch(() => ({ data: [] })),
        apiGet('/api/v1/admin/dashboard/revenue?period=day').catch(() => ({ data: null })),
      ]);
      setTransactions(Array.isArray(orders?.data) ? orders.data : orders?.data?.items || []);
      setSummary(revenue?.data || null);
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return transactions;
    const q = search.toLowerCase();
    return transactions.filter((t) => {
      const orderId = String(t.id || '');
      const branchName = (t.branch?.name || '').toLowerCase();
      return orderId.includes(q) || branchName.includes(q);
    });
  }, [transactions, search]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount || 0);
  };

  const paymentMethodBreakdown = useMemo(() => {
    const breakdown = {};
    transactions.forEach((t) => {
      const method = t.paymentMethod || 'UNKNOWN';
      if (!breakdown[method]) {
        breakdown[method] = { method, count: 0, total: 0 };
      }
      breakdown[method].count += 1;
      breakdown[method].total += parseFloat(t.totalAmount?.toString() || '0');
    });
    return Object.values(breakdown);
  }, [transactions]);

  return (
    <div className="container-fluid">
      <PageHeader
        title="POS Transactions"
        subtitle={`Total: ${filtered.length} transactions`}
        right={
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <input
              type="text"
              className="form-control"
              placeholder="Search order ID, branch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 300 }}
            />
            <button onClick={load} disabled={loading} className="btn btn-outline-primary d-flex align-items-center gap-2">
              <Icon icon="solar:refresh-outline" />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {summary && (
        <div className="row g-3 mb-3">
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Today's Revenue" 
              value={formatCurrency(summary.totalRevenue)}
              icon={<Icon icon="solar:wallet-money-bold" />}
              tone="success"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Today's Orders" 
              value={summary.totalOrders}
              icon={<Icon icon="solar:cart-bold" />}
              tone="primary"
            />
          </div>
        </div>
      )}

      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <SectionCard title="Recent Transactions">
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Branch</th>
                    <th>Amount</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id}>
                      <td className="fw-semibold">#{t.id}</td>
                      <td style={{ fontSize: 13 }}>{t.branch?.name || '—'}</td>
                      <td className="fw-semibold">{formatCurrency(t.totalAmount)}</td>
                      <td style={{ fontSize: 13 }}>{t.paymentMethod || '—'}</td>
                      <td><StatusChip status={t.status} /></td>
                      <td style={{ fontSize: 12 }}>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                  {!filtered.length && !loading ? (
                    <tr><td colSpan={6} className="text-secondary text-center" style={{ fontSize: 13 }}>No transactions found.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div className="col-12 col-lg-4">
          <SectionCard title="Payment Methods Breakdown">
            {paymentMethodBreakdown.length > 0 ? (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th className="text-end">Count</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentMethodBreakdown.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.method}</td>
                        <td className="text-end">{item.count}</td>
                        <td className="text-end fw-semibold">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-secondary-light">No data available</div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
