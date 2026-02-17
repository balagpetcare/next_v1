"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import BranchMetricsCards from "@/app/owner/_components/branch/BranchMetricsCards";
import {
  SalesTrendChart,
  ProductSalesPieChart,
  OrdersBarChart,
  RevenueAreaChart,
} from "@/app/owner/_components/branch/BranchCharts";

function pickArray(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.data)) return resp.data;
  if (Array.isArray(resp.items)) return resp.items;
  if (Array.isArray(resp.data?.items)) return resp.data.items;
  return [];
}

export default function BranchDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const orgId = useMemo(() => String(params?.id || ""), [params]);
  const branchId = useMemo(() => String(params?.branchId || ""), [params]);

  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Analytics data states
  const [metrics, setMetrics] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [stockData, setStockData] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [ordersData, setOrdersData] = useState([]);
  const [services, setServices] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    if (!branchId) return;

    async function loadBranch() {
      try {
        setLoading(true);
        setError("");
        const data = await ownerGet(`/api/v1/owner/branches/${branchId}`);
        const branchData = data?.data ?? data;
        setBranch(branchData);
      } catch (e) {
        setError(e?.message || "Failed to load branch");
      } finally {
        setLoading(false);
      }
    }

    loadBranch();
  }, [branchId]);

  useEffect(() => {
    if (!branchId) return;

    async function loadAnalytics() {
      try {
        setAnalyticsLoading(true);
        const branchIdNum = parseInt(branchId);

        // Calculate date ranges
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        // Load all analytics in parallel
        const [
          todaySalesRes,
          yesterdaySalesRes,
          weekSalesRes,
          lastWeekSalesRes,
          monthSalesRes,
          lastMonthSalesRes,
          salesReportRes,
          topProductsRes,
          stockReportRes,
          revenueRes,
          servicesRes,
        ] = await Promise.all([
          ownerGet(`/api/v1/reports/sales?branchId=${branchIdNum}&startDate=${today.toISOString().split("T")[0]}&groupBy=day`).catch(() => ({ data: { summary: { totalSales: 0 } } })),
          ownerGet(`/api/v1/reports/sales?branchId=${branchIdNum}&startDate=${yesterday.toISOString().split("T")[0]}&endDate=${yesterday.toISOString().split("T")[0]}&groupBy=day`).catch(() => ({ data: { summary: { totalSales: 0 } } })),
          ownerGet(`/api/v1/reports/sales?branchId=${branchIdNum}&startDate=${lastWeek.toISOString().split("T")[0]}&groupBy=day`).catch(() => ({ data: { summary: { totalSales: 0 } } })),
          ownerGet(`/api/v1/reports/sales?branchId=${branchIdNum}&startDate=${new Date(lastWeek.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}&endDate=${lastWeek.toISOString().split("T")[0]}&groupBy=day`).catch(() => ({ data: { summary: { totalSales: 0 } } })),
          ownerGet(`/api/v1/reports/sales?branchId=${branchIdNum}&startDate=${lastMonth.toISOString().split("T")[0]}&groupBy=month`).catch(() => ({ data: { summary: { totalSales: 0, totalOrders: 0 } } })),
          ownerGet(`/api/v1/reports/sales?branchId=${branchIdNum}&startDate=${new Date(lastMonth.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}&endDate=${lastMonth.toISOString().split("T")[0]}&groupBy=month`).catch(() => ({ data: { summary: { totalSales: 0, totalOrders: 0 } } })),
          ownerGet(`/api/v1/reports/sales?branchId=${branchIdNum}&startDate=${sixMonthsAgo.toISOString().split("T")[0]}&groupBy=month`).catch(() => ({ data: { grouped: [] } })),
          ownerGet(`/api/v1/reports/top-products?branchId=${branchIdNum}&limit=10&startDate=${sixMonthsAgo.toISOString().split("T")[0]}`).catch(() => ({ data: [] })),
          ownerGet(`/api/v1/reports/stock?branchId=${branchIdNum}`).catch(() => ({ data: { summary: {}, items: [] } })),
          ownerGet(`/api/v1/reports/revenue?branchId=${branchIdNum}&startDate=${sixMonthsAgo.toISOString().split("T")[0]}`).catch(() => ({ data: {} })),
          ownerGet(`/api/v1/services?branchId=${branchIdNum}`).catch(() => ({ data: [] })),
        ]);

        // Calculate metrics
        const todaySales = todaySalesRes?.data?.summary?.totalSales || 0;
        const yesterdaySales = yesterdaySalesRes?.data?.summary?.totalSales || 0;
        const weekSales = weekSalesRes?.data?.summary?.totalSales || 0;
        const lastWeekSales = lastWeekSalesRes?.data?.summary?.totalSales || 0;
        const monthSales = monthSalesRes?.data?.summary?.totalSales || 0;
        const lastMonthSales = lastMonthSalesRes?.data?.summary?.totalSales || 0;
        const monthOrders = monthSalesRes?.data?.summary?.totalOrders || 0;
        const lastMonthOrders = lastMonthSalesRes?.data?.summary?.totalOrders || 0;

        // Calculate profit (simplified - would need cost data from backend)
        const totalProfit = monthSales * 0.2; // Assuming 20% profit margin
        const lastMonthProfit = lastMonthSales * 0.2;

        const calculatedMetrics = {
          todaySales,
          todaySalesChange: yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : 0,
          weekSales,
          weekSalesChange: lastWeekSales > 0 ? ((weekSales - lastWeekSales) / lastWeekSales) * 100 : 0,
          totalProfit,
          profitChange: lastMonthProfit > 0 ? ((totalProfit - lastMonthProfit) / lastMonthProfit) * 100 : 0,
          totalOrders: monthOrders,
          ordersChange: lastMonthOrders > 0 ? ((monthOrders - lastMonthOrders) / lastMonthOrders) * 100 : 0,
        };

        setMetrics(calculatedMetrics);

        // Process sales data for charts
        const salesGrouped = salesReportRes?.data?.grouped || [];
        setSalesData(
          salesGrouped.map((item) => ({
            date: item.date,
            sales: item.sales || 0,
            orders: item.orders || 0,
          }))
        );

        // Process top products
        const products = topProductsRes?.data || [];
        setTopProducts(
          products.map((p) => ({
            productName: p.productName || "Unknown",
            revenue: p.totalRevenue || 0,
            quantity: p.totalQuantity || 0,
          }))
        );

        // Process stock data
        const stock = stockReportRes?.data || {};
        setStockData(stock);

        // Process revenue data
        const revenue = revenueRes?.data || {};
        setRevenueData(salesGrouped.map((item) => ({ date: item.date, revenue: item.sales || 0 })));

        // Process orders data
        setOrdersData(
          salesGrouped.map((item) => ({
            date: item.date,
            orders: item.orders || 0,
          }))
        );

        // Process services
        const servicesList = pickArray(servicesRes?.data || servicesRes || []);
        setServices(servicesList);
      } catch (e) {
        console.error("Failed to load analytics:", e);
      } finally {
        setAnalyticsLoading(false);
      }
    }

    loadAnalytics();
  }, [branchId]);

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !branch) {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Branch Details"
          breadcrumbs={[
            { label: "Home", href: "/owner" },
            { label: "Organizations", href: "/owner/organizations" },
            { label: "Branches", href: `/owner/organizations/${orgId}/branches` },
          ]}
        />
        <div className="alert alert-danger radius-12">
          <i className="ri-error-warning-line me-2" />
          {error || "Branch not found"}
        </div>
      </div>
    );
  }

  const profile = branch?.profileDetails || {};
  const addressJson = profile?.addressJson || branch?.addressJson || {};
  const addressText =
    addressJson?.text ||
    addressJson?.fullPathText ||
    profile?.addressText ||
    branch?.addressText ||
    branch?.address ||
    "";

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={branch.name || `Branch #${branch.id}`}
        subtitle="Branch dashboard and analytics"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Organizations", href: "/owner/organizations" },
          { label: "Branches", href: `/owner/organizations/${orgId}/branches` },
          { label: branch.name || "Branch", href: `/owner/organizations/${orgId}/branches/${branchId}` },
        ]}
        actions={[
          <Link
            key="full-details"
            href={`/owner/branches/${branchId}`}
            className="btn btn-primary radius-12"
          >
            <i className="ri-eye-line me-1" />
            View Full Details
          </Link>,
          <Link
            key="edit"
            href={`/owner/organizations/${orgId}/branches/${branchId}/edit`}
            className="btn btn-outline-primary radius-12"
          >
            <i className="ri-edit-line me-1" />
            Edit Branch
          </Link>,
          <Link
            key="back"
            href={`/owner/organizations/${orgId}/branches`}
            className="btn btn-outline-secondary radius-12"
          >
            <i className="ri-arrow-left-line me-1" />
            Back to List
          </Link>,
        ]}
      />

      {/* Call to Action for Full Details */}
      <div className="mb-4">
        <div className="card radius-12 border-primary" style={{ borderWidth: 2 }}>
          <div className="card-body p-24 text-center">
            <i className="ri-information-line text-primary" style={{ fontSize: 48 }} />
            <h4 className="mt-3 mb-2 fw-bold">Branch Overview</h4>
            <p className="text-muted mb-4">
              This is a quick overview of the branch. For complete details, analytics, charts, and full information, please visit the detailed branch page.
            </p>
            <Link
              href={`/owner/branches/${branchId}`}
              className="btn btn-primary btn-lg radius-12"
            >
              <i className="ri-eye-line me-2" />
              View Full Branch Details
            </Link>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards - Overview Only */}
      <div className="mb-4">
        <BranchMetricsCards metrics={metrics} loading={analyticsLoading} />
      </div>

      {/* Branch Information */}
      <div className="row g-4">
        {/* Basic Information */}
        <div className="col-12 col-lg-6">
          <div className="card radius-12">
            <div className="card-body p-24">
              <h5 className="mb-20 fw-bold">
                <i className="ri-information-line me-2 text-primary"></i>
                Basic Information
              </h5>
              <div className="row g-4">
                <div className="col-12">
                  <div className="mb-3">
                    <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>
                      Branch Name
                    </div>
                    <div className="fw-semibold">{branch.name || "Not provided"}</div>
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3">
                    <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>
                      Branch Types
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      {Array.isArray(branch.types) && branch.types.length > 0 ? (
                        branch.types.map((type, idx) => (
                          <span key={idx} className="badge bg-primary radius-8">
                            {type?.type?.nameEn || type?.code || "Unknown"}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted">Not provided</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3">
                    <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>
                      Status
                    </div>
                    <span className="badge bg-success radius-8">{branch.status || "ACTIVE"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="col-12 col-lg-6">
          <div className="card radius-12">
            <div className="card-body p-24">
              <h5 className="mb-20 fw-bold">
                <i className="ri-phone-line me-2 text-primary"></i>
                Contact Information
              </h5>
              <div className="row g-4">
                <div className="col-12">
                  <div className="mb-3">
                    <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>
                      Branch Phone
                    </div>
                    <div className="fw-semibold">
                      {profile.branchPhone || branch.branchPhone || branch.phone || "Not provided"}
                    </div>
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3">
                    <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>
                      Branch Email
                    </div>
                    <div className="fw-semibold">
                      {profile.branchEmail || branch.branchEmail || branch.email || "Not provided"}
                    </div>
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3">
                    <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>
                      Manager Name
                    </div>
                    <div className="fw-semibold">
                      {profile.managerName || branch.managerName || branch.manager?.name || "Not provided"}
                    </div>
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3">
                    <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>
                      Manager Phone
                    </div>
                    <div className="fw-semibold">
                      {profile.managerPhone || branch.managerPhone || branch.manager?.phone || "Not provided"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="col-12">
          <div className="card radius-12">
            <div className="card-body p-24">
              <h5 className="mb-20 fw-bold">
                <i className="ri-map-pin-line me-2 text-primary"></i>
                Location
              </h5>
              <div className="mb-3">
                <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>
                  Address
                </div>
                <div className="fw-semibold">{addressText || "Not provided"}</div>
              </div>
              {profile.googleMapLink || branch.googleMapLink ? (
                <div className="mt-3">
                  <a
                    href={profile.googleMapLink || branch.googleMapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline-primary radius-12"
                  >
                    <i className="ri-map-2-line me-1" />
                    View on Google Maps
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
