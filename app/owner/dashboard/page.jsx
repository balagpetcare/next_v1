"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import MetricCard from "@/app/owner/_components/dashboard/MetricCard";
import RevenueChart from "@/app/owner/_components/dashboard/RevenueChart";
import SalesByBranchChart from "@/app/owner/_components/dashboard/SalesByBranchChart";
import TopProductsTable from "@/app/owner/_components/dashboard/TopProductsTable";
import QuickActionsPanel from "@/app/owner/_components/dashboard/QuickActionsPanel";
import RecentActivityFeed from "@/app/owner/_components/dashboard/RecentActivityFeed";
import AttentionRequiredPanel from "@/app/owner/_components/dashboard/AttentionRequiredPanel";
import ProductSummaryCard from "@/app/owner/_components/dashboard/ProductSummaryCard";
import StaffInviteNotifications from "@/app/owner/_components/dashboard/StaffInviteNotifications";

function formatCurrency(amount) {
  return `৳${Number(amount).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function OwnerDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [salesByBranch, setSalesByBranch] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [alerts, setAlerts] = useState({});
  const [revenuePeriod, setRevenuePeriod] = useState("30d");
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      // Load all dashboard data in parallel (including pending access requests for KPI)
      const [metricsRes, revenueRes, salesRes, productsRes, activityRes, alertsRes, pendingRes] = await Promise.all([
        ownerGet("/api/v1/owner/dashboard/metrics").catch(() => ({ success: false, data: null })),
        ownerGet(`/api/v1/owner/dashboard/revenue?period=${revenuePeriod}`).catch(() => ({ success: false, data: null })),
        ownerGet("/api/v1/owner/dashboard/sales-by-branch?period=30d").catch(() => ({ success: false, data: null })),
        ownerGet("/api/v1/owner/dashboard/top-products?limit=10&period=30d").catch(() => ({ success: false, data: null })),
        ownerGet("/api/v1/owner/dashboard/recent-activity?limit=10").catch(() => ({ success: false, data: null })),
        ownerGet("/api/v1/owner/dashboard/alerts").catch(() => ({ success: false, data: null })),
        ownerGet("/api/v1/owner/branch-access?status=PENDING").catch(() => []),
      ]);

      if (metricsRes?.success && metricsRes.data) {
        setMetrics(metricsRes.data);
      }

      if (revenueRes?.success && revenueRes.data) {
        const chartData = revenueRes.data.labels.map((label, index) => ({
          date: label,
          revenue: revenueRes.data.data[index] || 0,
        }));
        setRevenueData(chartData);
      }

      if (salesRes?.success && salesRes.data?.branches) {
        setSalesByBranch(salesRes.data.branches);
      }

      if (productsRes?.success && productsRes.data?.products) {
        setTopProducts(productsRes.data.products);
      }

      if (activityRes?.success && activityRes.data?.activities) {
        setRecentActivity(activityRes.data.activities);
      }

      if (alertsRes?.success && alertsRes.data) {
        setAlerts(alertsRes.data);
      }

      const raw = pendingRes?.data ?? pendingRes;
      const pendingList = Array.isArray(raw) ? raw : [];
      setPendingRequestsCount(pendingList.length);
    } catch (e) {
      setError(e?.message || "Failed to load dashboard");
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [revenuePeriod]);

  async function handleRefresh() {
    await loadDashboard();
  }

  return (
    <div className="container py-3">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="mb-1">Dashboard</h2>
          <div className="text-secondary">Complete overview of your business performance</div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={handleRefresh} disabled={loading}>
            <i className="solar:refresh-outline me-1" />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <Link className="btn btn-primary" href="/owner/organizations/new">
            <i className="solar:add-circle-outline me-1" />
            New Organization
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Staff Invitation Notifications */}
      <StaffInviteNotifications />

      {/* Key Metrics Cards — IA 8: Today Sales, Month Sales, Orders Pending, Low Stock, Returns, Active Branches, Pending Requests, Wallet Balance */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-4 col-lg-2">
          <MetricCard
            label="Today Sales"
            value={metrics ? formatCurrency(metrics.revenue?.today || 0) : "—"}
            sub={metrics ? `Week: ${formatCurrency(metrics.revenue?.week || 0)}` : null}
            variant="primary"
            icon={<i className="solar:wallet-money-outline fs-4" />}
            loading={loading}
          />
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <MetricCard
            label="Month Sales"
            value={metrics ? formatCurrency(metrics.revenue?.month || 0) : "—"}
            sub={metrics ? `Orders: ${metrics.orders?.total || 0}` : null}
            variant="primary"
            icon={<i className="solar:chart-2-outline fs-4" />}
            loading={loading}
          />
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <MetricCard
            label="Orders Pending"
            value={metrics ? String(metrics.orders?.pending || 0) : "—"}
            sub={metrics ? `Total: ${metrics.orders?.total || 0}` : null}
            variant="info"
            icon={<i className="solar:cart-large-2-outline fs-4" />}
            loading={loading}
            onClick={() => (window.location.href = "/owner/orders")}
          />
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <MetricCard
            label="Low Stock"
            value={metrics ? String(metrics.products?.lowStock ?? 0) : "—"}
            sub={metrics ? `Out: ${metrics.products?.outOfStock ?? 0}` : null}
            variant="warning"
            icon={<i className="solar:box-outline fs-4" />}
            loading={loading}
            onClick={() => (window.location.href = "/owner/inventory")}
          />
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <MetricCard
            label="Returns"
            value={metrics?.returns != null ? String(metrics.returns) : "—"}
            sub="To review"
            variant="secondary"
            icon={<i className="solar:refresh-outline fs-4" />}
            loading={loading}
            onClick={() => (window.location.href = "/owner/returns")}
          />
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <MetricCard
            label="Active Branches"
            value={metrics ? String(metrics.branches?.active ?? 0) : "—"}
            sub={metrics ? `Total: ${metrics.branches?.total || 0}` : null}
            variant="secondary"
            icon={<i className="solar:shop-2-outline fs-4" />}
            loading={loading}
            onClick={() => (window.location.href = "/owner/branches")}
          />
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <MetricCard
            label="Pending Requests"
            value={loading ? "—" : String(pendingRequestsCount)}
            sub="Branch access"
            variant="warning"
            icon={<i className="solar:user-check-outline fs-4" />}
            loading={loading}
            onClick={() => (window.location.href = "/owner/access/requests")}
          />
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <MetricCard
            label="Wallet Balance"
            value={metrics ? formatCurrency(metrics.wallet?.available || 0) : "—"}
            sub={metrics ? `Pending: ${formatCurrency(metrics.wallet?.pending || 0)}` : null}
            variant="success"
            icon={<i className="solar:wallet-outline fs-4" />}
            loading={loading}
            onClick={() => (window.location.href = "/owner/wallet")}
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-8">
          <div className="card radius-12">
            <div className="card-body p-24">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="mb-0 fw-semibold">Sales Trend</h6>
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={`btn ${revenuePeriod === "7d" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setRevenuePeriod("7d")}
                  >
                    7 Days
                  </button>
                  <button
                    type="button"
                    className={`btn ${revenuePeriod === "30d" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setRevenuePeriod("30d")}
                  >
                    30 Days
                  </button>
                  <button
                    type="button"
                    className={`btn ${revenuePeriod === "6m" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setRevenuePeriod("6m")}
                  >
                    6 Months
                  </button>
                  <button
                    type="button"
                    className={`btn ${revenuePeriod === "1y" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setRevenuePeriod("1y")}
                  >
                    1 Year
                  </button>
                </div>
              </div>
              <RevenueChart data={revenueData} period={revenuePeriod} loading={loading} />
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <SalesByBranchChart data={salesByBranch} loading={loading} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <QuickActionsPanel />
        </div>
      </div>

      {/* Product Summary and Recent Activity */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-4">
          <ProductSummaryCard loading={loading} />
        </div>
        <div className="col-12 col-lg-8">
          <TopProductsTable products={topProducts} loading={loading} />
        </div>
      </div>

      {/* Recent Activity and Alerts */}
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <RecentActivityFeed activities={recentActivity} loading={loading} />
        </div>
        <div className="col-12 col-lg-6">
          <AttentionRequiredPanel
            alerts={alerts}
            pendingApprovalsCount={pendingRequestsCount}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
