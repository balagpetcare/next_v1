"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/app/(public)/_lib/LanguageContext";
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
  const { t } = useLanguage();
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
      setError(e?.message || t("owner.failedToLoadDashboard"));
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
    <div className="container py-3 owner-dashboard bpa-page bpa-owner-dashboard">
      <header className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="mb-1">{t("owner.dashboardTitle")}</h2>
          <div className="text-secondary">{t("owner.dashboardSubtitle")}</div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={handleRefresh} disabled={loading}>
            <i className="solar:refresh-outline me-1" />
            {loading ? t("common.refreshing") : t("common.refresh")}
          </button>
          <Link className="btn btn-primary" href="/owner/organizations/new">
            <i className="solar:add-circle-outline me-1" />
            {t("owner.newOrganization")}
          </Link>
        </div>
      </header>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      <StaffInviteNotifications />

      <section className="row g-3 mb-4" aria-label="Key metrics">
        <div className="col-6 col-md-4 col-lg-2">
          <MetricCard
            label={t("owner.todaySales")}
            value={metrics ? formatCurrency(metrics.revenue?.today || 0) : "—"}
            sub={metrics ? `Week: ${formatCurrency(metrics.revenue?.week || 0)}` : null}
            variant="primary"
            icon={<i className="solar:wallet-money-outline fs-4" />}
            loading={loading}
          />
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <MetricCard
            label={t("owner.monthSales")}
            value={metrics ? formatCurrency(metrics.revenue?.month || 0) : "—"}
            sub={metrics ? `Orders: ${metrics.orders?.total || 0}` : null}
            variant="primary"
            icon={<i className="solar:chart-2-outline fs-4" />}
            loading={loading}
          />
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <MetricCard
            label={t("owner.ordersPending")}
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
            label={t("owner.lowStock")}
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
            label={t("owner.returns")}
            value={metrics?.returns != null ? String(metrics.returns) : "—"}
            sub={t("common.toReview")}
            variant="secondary"
            icon={<i className="solar:refresh-outline fs-4" />}
            loading={loading}
            onClick={() => (window.location.href = "/owner/returns")}
          />
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <MetricCard
            label={t("owner.activeBranches")}
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
            label={t("owner.pendingRequests")}
            value={loading ? "—" : String(pendingRequestsCount)}
            sub={t("common.branchAccess")}
            variant="warning"
            icon={<i className="solar:user-check-outline fs-4" />}
            loading={loading}
            onClick={() => (window.location.href = "/owner/access/requests")}
          />
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <MetricCard
            label={t("owner.walletBalance")}
            value={metrics ? formatCurrency(metrics.wallet?.available || 0) : "—"}
            sub={metrics ? `Pending: ${formatCurrency(metrics.wallet?.pending || 0)}` : null}
            variant="success"
            icon={<i className="solar:wallet-outline fs-4" />}
            loading={loading}
            onClick={() => (window.location.href = "/owner/wallet")}
          />
        </div>
      </section>

      <section className="row g-3 mb-4" aria-label="Charts">
        <div className="col-12 col-lg-8">
          <div className="card radius-12">
            <div className="card-body p-24">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="mb-0 fw-semibold">{t("owner.salesTrend")}</h6>
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={`btn ${revenuePeriod === "7d" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setRevenuePeriod("7d")}
                  >
                    {t("owner.period7d")}
                  </button>
                  <button
                    type="button"
                    className={`btn ${revenuePeriod === "30d" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setRevenuePeriod("30d")}
                  >
                    {t("owner.period30d")}
                  </button>
                  <button
                    type="button"
                    className={`btn ${revenuePeriod === "6m" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setRevenuePeriod("6m")}
                  >
                    {t("owner.period6m")}
                  </button>
                  <button
                    type="button"
                    className={`btn ${revenuePeriod === "1y" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setRevenuePeriod("1y")}
                  >
                    {t("owner.period1y")}
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
      </section>

      <section className="row g-3 mb-4" aria-label="Quick actions">
        <div className="col-12">
          <QuickActionsPanel />
        </div>
      </section>

      <section className="row g-3 mb-4" aria-label="Products and activity">
        <div className="col-12 col-lg-4">
          <ProductSummaryCard loading={loading} />
        </div>
        <div className="col-12 col-lg-8">
          <TopProductsTable products={topProducts} loading={loading} />
        </div>
      </section>

      <section className="row g-3" aria-label="Activity and alerts">
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
      </section>
    </div>
  );
}
