"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import StatusBadge from "@/app/owner/_components/StatusBadge";
import BranchMetricsCards from "@/app/owner/_components/branch/BranchMetricsCards";
import BranchQuickActions from "@/app/owner/_components/branch/BranchQuickActions";
import BranchActivityFeed from "@/app/owner/_components/branch/BranchActivityFeed";
import StaffAccessApprovals from "@/app/owner/_components/branch/StaffAccessApprovals";
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

export default function BranchDashboardPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.id || ""), [params]);

  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [stockData, setStockData] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [ordersData, setOrdersData] = useState([]);
  const [services, setServices] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
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
    const branchIdNum = parseInt(branchId, 10);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    async function loadAnalytics() {
      try {
        setAnalyticsLoading(true);
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
          ordersRes,
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
          ownerGet(`/api/v1/orders?branchId=${branchIdNum}&limit=10`).catch(() => ({ data: [], items: [] })),
        ]);

        const todaySales = todaySalesRes?.data?.summary?.totalSales || 0;
        const yesterdaySales = yesterdaySalesRes?.data?.summary?.totalSales || 0;
        const weekSales = weekSalesRes?.data?.summary?.totalSales || 0;
        const lastWeekSales = lastWeekSalesRes?.data?.summary?.totalSales || 0;
        const monthSales = monthSalesRes?.data?.summary?.totalSales || 0;
        const lastMonthSales = lastMonthSalesRes?.data?.summary?.totalSales || 0;
        const monthOrders = monthSalesRes?.data?.summary?.totalOrders || 0;
        const lastMonthOrders = lastMonthSalesRes?.data?.summary?.totalOrders || 0;
        const totalProfit = monthSales * 0.2;
        const lastMonthProfit = lastMonthSales * 0.2;

        setMetrics({
          todaySales,
          todaySalesChange: yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : 0,
          weekSales,
          weekSalesChange: lastWeekSales > 0 ? ((weekSales - lastWeekSales) / lastWeekSales) * 100 : 0,
          totalProfit,
          profitChange: lastMonthProfit > 0 ? ((totalProfit - lastMonthProfit) / lastMonthProfit) * 100 : 0,
          totalOrders: monthOrders,
          ordersChange: lastMonthOrders > 0 ? ((monthOrders - lastMonthOrders) / lastMonthOrders) * 100 : 0,
        });

        const salesGrouped = salesReportRes?.data?.grouped || [];
        setSalesData(salesGrouped.map((d) => ({ date: d.date, sales: d.sales || 0, orders: d.orders || 0 })));
        setTopProducts((topProductsRes?.data || []).map((p) => ({
          productName: p.productName || "Unknown",
          revenue: p.totalRevenue || 0,
          quantity: p.totalQuantity || 0,
        })));
        setStockData(stockReportRes?.data || null);
        setRevenueData(salesGrouped.map((d) => ({ date: d.date, revenue: d.sales || 0 })));
        setOrdersData(salesGrouped.map((d) => ({ date: d.date, orders: d.orders || 0 })));
        setServices(pickArray(servicesRes?.data || servicesRes || []));
        setRecentOrders(pickArray(ordersRes?.data || ordersRes).concat(pickArray(ordersRes?.items || [])));
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
          title="Branch Dashboard"
          breadcrumbs={[
            { label: "Home", href: "/owner/dashboard" },
            { label: "Branches", href: "/owner/branches" },
          ]}
        />
        <div className="alert alert-danger radius-12">
          <i className="ri-error-warning-line me-2" />
          {error || "Branch not found"}
        </div>
      </div>
    );
  }

  const branchName = branch.name || `Branch #${branch.id}`;
  const base = `/owner/branches/${branchId}`;

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={branchName}
        subtitle="Branch dashboard and analytics"
        breadcrumbs={[
          { label: "Home", href: "/owner/dashboard" },
          { label: "Branches", href: "/owner/branches" },
          { label: branchName, href: base },
        ]}
        actions={[
          <Link key="edit" href={`${base}/edit`} className="btn btn-primary radius-12">
            <i className="ri-edit-line me-1" />
            Edit Branch
          </Link>,
          <Link key="back" href="/owner/branches" className="btn btn-outline-secondary radius-12">
            <i className="ri-arrow-left-line me-1" />
            All Branches
          </Link>,
        ]}
      />

      <div className="mb-4">
        <BranchMetricsCards metrics={metrics} loading={analyticsLoading} />
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-8">
          <SalesTrendChart data={salesData} loading={analyticsLoading} />
        </div>
        <div className="col-12 col-lg-4">
          <ProductSalesPieChart data={topProducts.slice(0, 6)} loading={analyticsLoading} />
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-6">
          <OrdersBarChart data={ordersData} loading={analyticsLoading} />
        </div>
        <div className="col-12 col-lg-6">
          <RevenueAreaChart data={revenueData} loading={analyticsLoading} />
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-8">
          <BranchQuickActions branchId={branchId} />
        </div>
        <div className="col-12 col-lg-4">
          <BranchActivityFeed branchId={branchId} orders={recentOrders} loading={analyticsLoading} />
        </div>
      </div>

      {/* Staff Access Approvals Section */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <StaffAccessApprovals branchId={branchId} />
        </div>
      </div>

      {stockData && (stockData.summary || (stockData.items && stockData.items.length > 0)) && (
        <div className="row g-4 mb-4">
          <div className="col-12">
            <div className="card radius-12">
              <div className="card-body p-24">
                <h5 className="mb-20 fw-bold">
                  <i className="ri-stack-line me-2 text-primary" />
                  Stock Status
                </h5>
                <div className="row g-4">
                  <div className="col-md-3">
                    <div className="text-center p-3 bg-light radius-12">
                      <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>Total Items</div>
                      <h3 className="mb-0 fw-bold text-primary">{stockData.summary?.totalItems || 0}</h3>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="text-center p-3 bg-light radius-12">
                      <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>Low Stock</div>
                      <h3 className="mb-0 fw-bold text-warning">{stockData.summary?.lowStockCount || 0}</h3>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="text-center p-3 bg-light radius-12">
                      <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>Out of Stock</div>
                      <h3 className="mb-0 fw-bold text-danger">{stockData.summary?.outOfStockCount || 0}</h3>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="text-center p-3 bg-light radius-12">
                      <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>Total Value</div>
                      <h3 className="mb-0 fw-bold text-success">
                        ৳{Number(stockData.summary?.totalValue || 0).toLocaleString("en-BD")}
                      </h3>
                    </div>
                  </div>
                </div>
                {stockData.items && stockData.items.length > 0 && (
                  <div className="mt-4">
                    <Link href={`${base}/inventory`} className="btn btn-sm btn-outline-primary radius-12">
                      View inventory
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Products Table */}
      {topProducts.length > 0 && (
        <div className="row g-4 mb-4">
          <div className="col-12">
            <div className="card radius-12">
              <div className="card-body p-24">
                <h5 className="mb-20 fw-bold">
                  <i className="ri-star-line me-2 text-primary" />
                  Top Selling Products
                </h5>
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Product Name</th>
                        <th className="text-end">Quantity Sold</th>
                        <th className="text-end">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((product, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td className="fw-semibold">{product.productName}</td>
                          <td className="text-end">{product.quantity.toLocaleString("en-BD")}</td>
                          <td className="text-end fw-bold text-success">
                            ৳{Number(product.revenue).toLocaleString("en-BD", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Services Section */}
      {services.length > 0 && (
        <div className="row g-4 mb-4">
          <div className="col-12">
            <div className="card radius-12">
              <div className="card-body p-24">
                <h5 className="mb-20 fw-bold">
                  <i className="ri-service-line me-2 text-primary" />
                  Available Services
                </h5>
                <div className="row g-3">
                  {services.map((service, idx) => (
                    <div key={idx} className="col-md-6 col-lg-4">
                      <div className="card bg-light radius-12">
                        <div className="card-body p-3">
                          <h6 className="mb-1 fw-semibold">{service.name || service.title || "Service"}</h6>
                          {service.description && (
                            <p className="text-secondary-light mb-0" style={{ fontSize: 13 }}>
                              {service.description}
                            </p>
                          )}
                          {service.price && (
                            <div className="mt-2">
                              <span className="badge bg-primary radius-8">
                                ৳{Number(service.price).toLocaleString("en-BD")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Branch Information */}
      <div className="row g-4">
        {/* Basic Information */}
        <div className="col-12 col-lg-6">
          <div className="card radius-12">
            <div className="card-body p-24">
              <h5 className="mb-20 fw-bold">
                <i className="ri-information-line me-2 text-primary" />
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
                      Organization
                    </div>
                    <div className="fw-semibold">
                      {branch.org?.name || `Organization #${branch.orgId || "N/A"}`}
                    </div>
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
                    <StatusBadge status={branch.status || "ACTIVE"} />
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
                <i className="ri-phone-line me-2 text-primary" />
                Contact Information
              </h5>
              <div className="row g-4">
                <div className="col-12">
                  <div className="mb-3">
                    <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>
                      Branch Phone
                    </div>
                    <div className="fw-semibold">
                      {branch.profileDetails?.branchPhone || branch.branchPhone || branch.phone || "Not provided"}
                    </div>
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3">
                    <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>
                      Branch Email
                    </div>
                    <div className="fw-semibold">
                      {branch.profileDetails?.branchEmail || branch.branchEmail || branch.email || "Not provided"}
                    </div>
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3">
                    <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>
                      Manager Name
                    </div>
                    <div className="fw-semibold">
                      {branch.profileDetails?.managerName || branch.managerName || branch.manager?.name || "Not provided"}
                    </div>
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3">
                    <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>
                      Manager Phone
                    </div>
                    <div className="fw-semibold">
                      {branch.profileDetails?.managerPhone || branch.managerPhone || branch.manager?.phone || "Not provided"}
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
                <i className="ri-map-pin-line me-2 text-primary" />
                Location
              </h5>
              <div className="mb-3">
                <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>
                  Address
                </div>
                <div className="fw-semibold">
                  {branch.profileDetails?.addressJson?.text ||
                    branch.profileDetails?.addressJson?.fullPathText ||
                    branch.profileDetails?.addressText ||
                    branch.addressJson?.text ||
                    branch.addressJson?.fullPathText ||
                    branch.addressText ||
                    branch.address ||
                    "Not provided"}
                </div>
              </div>
              {(branch.profileDetails?.googleMapLink || branch.googleMapLink) && (
                <div className="mt-3">
                  <a
                    href={branch.profileDetails?.googleMapLink || branch.googleMapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline-primary radius-12"
                  >
                    <i className="ri-map-2-line me-1" />
                    View on Google Maps
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
