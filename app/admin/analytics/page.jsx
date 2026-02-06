"use client";

import { useEffect, useState, useMemo } from 'react';
import { Icon } from '@iconify/react';
import PageHeader from '@/src/bpa/components/PageHeader';
import { apiGet } from '@/lib/api';
import StatCard from '@/src/bpa/admin/components/StatCard';
import SectionCard from '@/src/bpa/admin/components/SectionCard';

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [salesReport, setSalesReport] = useState(null);
  const [topProducts, setTopProducts] = useState(null);
  const [stockReport, setStockReport] = useState(null);
  const [revenueAnalytics, setRevenueAnalytics] = useState(null);
  const [branchPerformance, setBranchPerformance] = useState(null);
  const [userAnalytics, setUserAnalytics] = useState(null);

  async function loadReports() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (period) params.append('groupBy', period);

      const [sales, products, stock, revenue, branches, users] = await Promise.all([
        apiGet(`/api/v1/reports/sales?${params.toString()}`).catch(() => ({ data: null })),
        apiGet(`/api/v1/reports/top-products?${params.toString()}&limit=10`).catch(() => ({ data: null })),
        apiGet('/api/v1/reports/stock').catch(() => ({ data: null })),
        apiGet(`/api/v1/reports/revenue?${params.toString()}`).catch(() => ({ data: null })),
        apiGet(`/api/v1/admin/dashboard/revenue?period=${period}`).catch(() => ({ data: null })),
        apiGet('/api/v1/admin/dashboard/analytics').catch(() => ({ data: null })),
      ]);

      setSalesReport(sales?.data || null);
      setTopProducts(products?.data || null);
      setStockReport(stock?.data || null);
      setRevenueAnalytics(revenue?.data || null);
      setBranchPerformance(branches?.data || null);
      setUserAnalytics(users?.data || null);
    } catch (e) {
      setError(e?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, [period, startDate, endDate]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount || 0);
  };

  return (
    <div className="container-fluid">
      <PageHeader
        title="Analytics & Reports"
        subtitle="Comprehensive system analytics and performance metrics"
        right={
          <button className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={loadReports} disabled={loading}>
            <Icon icon="solar:refresh-outline" />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {/* Filters */}
      <SectionCard title="Filters" className="mb-3">
        <div className="row g-3">
          <div className="col-12 col-md-3">
            <label className="form-label">Period</label>
            <select className="form-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Start Date</label>
            <input 
              type="date" 
              className="form-select" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">End Date</label>
            <input 
              type="date" 
              className="form-select" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </SectionCard>

      {/* Sales Analytics */}
      {salesReport && (
        <div className="row g-3 mb-3">
          <div className="col-12">
            <h6 className="text-secondary mb-2">Sales Analytics</h6>
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Total Sales" 
              value={formatCurrency(salesReport.summary?.totalSales)}
              icon={<Icon icon="solar:wallet-money-bold" />}
              tone="success"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Total Orders" 
              value={salesReport.summary?.totalOrders}
              icon={<Icon icon="solar:cart-bold" />}
              tone="primary"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Total Items" 
              value={salesReport.summary?.totalItems}
              icon={<Icon icon="solar:box-bold" />}
              tone="info"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Avg Order Value" 
              value={formatCurrency(salesReport.summary?.averageOrderValue)}
              icon={<Icon icon="solar:chart-2-bold" />}
              tone="success"
            />
          </div>
        </div>
      )}

      {/* Revenue Analytics */}
      {revenueAnalytics && (
        <div className="row g-3 mb-3">
          <div className="col-12">
            <h6 className="text-secondary mb-2">Revenue Analytics</h6>
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Total Revenue" 
              value={formatCurrency(revenueAnalytics.totalRevenue)}
              icon={<Icon icon="solar:wallet-money-bold" />}
              tone="success"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Total Orders" 
              value={revenueAnalytics.totalOrders}
              icon={<Icon icon="solar:cart-bold" />}
              tone="primary"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Avg Order Value" 
              value={formatCurrency(revenueAnalytics.averageOrderValue)}
              icon={<Icon icon="solar:chart-2-bold" />}
              tone="success"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Payment Methods" 
              value={revenueAnalytics.byPaymentMethod?.length || 0}
              icon={<Icon icon="solar:card-bold" />}
              tone="info"
            />
          </div>
        </div>
      )}

      {/* User Analytics */}
      {userAnalytics && (
        <div className="row g-3 mb-3">
          <div className="col-12">
            <h6 className="text-secondary mb-2">User Analytics</h6>
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="New Users Today" 
              value={userAnalytics.users?.today || 0}
              icon={<Icon icon="solar:user-plus-bold" />}
              tone="primary"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="New Users This Week" 
              value={userAnalytics.users?.week || 0}
              icon={<Icon icon="solar:users-group-rounded-bold" />}
              tone="primary"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="New Users This Month" 
              value={userAnalytics.users?.month || 0}
              icon={<Icon icon="solar:users-group-two-rounded-bold" />}
              tone="primary"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Total Users" 
              value={userAnalytics.totals?.users || 0}
              icon={<Icon icon="solar:user-bold" />}
              tone="info"
            />
          </div>
        </div>
      )}

      <div className="row g-3">
        {/* Top Products */}
        <div className="col-12 col-lg-6">
          <SectionCard title="Top Selling Products">
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th className="text-end">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts && topProducts.length > 0 ? (
                    topProducts.map((product, idx) => (
                      <tr key={idx}>
                        <td>
                          <div className="fw-semibold">{product.productName}</div>
                          {product.variantName && product.variantName !== 'Standard' && (
                            <div className="text-secondary-light" style={{ fontSize: 12 }}>{product.variantName}</div>
                          )}
                        </td>
                        <td>{product.totalQuantity}</td>
                        <td className="text-end">{formatCurrency(product.totalRevenue)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={3} className="text-secondary text-center">No data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* Branch Performance */}
        <div className="col-12 col-lg-6">
          <SectionCard title="Branch Performance">
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Orders</th>
                    <th className="text-end">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {branchPerformance?.byBranch && branchPerformance.byBranch.length > 0 ? (
                    branchPerformance.byBranch.map((branch, idx) => (
                      <tr key={idx}>
                        <td>
                          <div className="fw-semibold">{branch.branchName}</div>
                          <div className="text-secondary-light" style={{ fontSize: 12 }}>ID: {branch.branchId}</div>
                        </td>
                        <td>{branch.orders}</td>
                        <td className="text-end">{formatCurrency(branch.revenue)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={3} className="text-secondary text-center">No data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* Stock Report */}
        {stockReport && (
          <div className="col-12 col-lg-6">
            <SectionCard title="Stock Summary">
              <div className="row g-3">
                <div className="col-6">
                  <StatCard 
                    title="Total Items" 
                    value={stockReport.summary?.totalItems}
                    tone="info"
                  />
                </div>
                <div className="col-6">
                  <StatCard 
                    title="Low Stock" 
                    value={stockReport.summary?.lowStockCount}
                    tone="warning"
                  />
                </div>
                <div className="col-6">
                  <StatCard 
                    title="Out of Stock" 
                    value={stockReport.summary?.outOfStockCount}
                    tone="danger"
                  />
                </div>
                <div className="col-6">
                  <StatCard 
                    title="Total Value" 
                    value={formatCurrency(stockReport.summary?.totalValue)}
                    tone="success"
                  />
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* Payment Methods */}
        {revenueAnalytics?.byPaymentMethod && (
          <div className="col-12 col-lg-6">
            <SectionCard title="Payment Methods Breakdown">
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th>Count</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueAnalytics.byPaymentMethod.map((method, idx) => (
                      <tr key={idx}>
                        <td>{method.method}</td>
                        <td>{method.count}</td>
                        <td className="text-end">{formatCurrency(method.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}
