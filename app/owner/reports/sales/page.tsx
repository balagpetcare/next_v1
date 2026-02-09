"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/apiFetch";

interface SalesReport {
  summary: {
    totalSales: number;
    totalOrders: number;
    totalItems: number;
    averageOrderValue: number;
  };
  orders: any[];
  grouped: any[] | null;
}

export default function OwnerSalesReportPage() {
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [groupBy, setGroupBy] = useState<string>("");

  useEffect(() => {
    loadReport();
  }, [startDate, endDate, groupBy]);

  const loadReport = async () => {
    try {
      setLoading(true);
      let url = "/api/v1/reports/sales?";
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (groupBy) params.append("groupBy", groupBy);
      url += params.toString();

      const data = (await apiFetch(url)) as { data?: unknown } | unknown;
      setReport(((data && typeof data === "object" && "data" in data ? (data as { data: unknown }).data : data) ?? null) as SalesReport | null);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load sales report");
      console.error("Load report error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-main-body">
      <div className="row g-3">
        <div className="col-12">
          <div className="card radius-12">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h5 className="mb-1">Sales Report</h5>
                  <small className="text-muted">View sales analytics and statistics</small>
                </div>
              </div>

              {/* Filters */}
              <div className="row g-3 mb-3">
                <div className="col-md-3">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-control radius-12"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-control radius-12"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Group By</label>
                  <select
                    className="form-select radius-12"
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                  >
                    <option value="">No Grouping</option>
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                  </select>
                </div>
                <div className="col-md-3 d-flex align-items-end">
                  <button
                    className="btn btn-primary radius-12 w-100"
                    onClick={loadReport}
                  >
                    <i className="ri-refresh-line me-2" />
                    Refresh
                  </button>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger radius-12" role="alert">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : report ? (
                <>
                  {/* Summary Cards */}
                  <div className="row g-3 mb-4">
                    <div className="col-md-3">
                      <div className="card radius-12 bg-primary-focus">
                        <div className="card-body text-center">
                          <h6 className="text-muted mb-2">Total Sales</h6>
                          <h4 className="text-primary-main mb-0">
                            ৳{parseFloat(report.summary.totalSales.toString()).toFixed(2)}
                          </h4>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card radius-12 bg-info-focus">
                        <div className="card-body text-center">
                          <h6 className="text-muted mb-2">Total Orders</h6>
                          <h4 className="text-info-main mb-0">{report.summary.totalOrders}</h4>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card radius-12 bg-success-focus">
                        <div className="card-body text-center">
                          <h6 className="text-muted mb-2">Total Items</h6>
                          <h4 className="text-success-main mb-0">{report.summary.totalItems}</h4>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card radius-12 bg-warning-focus">
                        <div className="card-body text-center">
                          <h6 className="text-muted mb-2">Avg Order Value</h6>
                          <h4 className="text-warning-main mb-0">
                            ৳{parseFloat(report.summary.averageOrderValue.toString()).toFixed(2)}
                          </h4>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Grouped Data */}
                  {report.grouped && report.grouped.length > 0 && (
                    <div className="table-responsive mb-4">
                      <h6 className="mb-3">Sales by {groupBy}</h6>
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Sales</th>
                            <th>Orders</th>
                            <th>Items</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.grouped.map((group: any, index: number) => (
                            <tr key={index}>
                              <td>{group.date}</td>
                              <td>
                                <strong>৳{parseFloat(group.sales.toString()).toFixed(2)}</strong>
                              </td>
                              <td>{group.orders}</td>
                              <td>{group.items}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Recent Orders */}
                  <div className="table-responsive">
                    <h6 className="mb-3">Recent Orders</h6>
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Order #</th>
                          <th>Branch</th>
                          <th>Total</th>
                          <th>Items</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.orders.slice(0, 10).map((order: any) => (
                          <tr key={order.id}>
                            <td>{order.orderNumber}</td>
                            <td>{order.branch?.name || "—"}</td>
                            <td>
                              <strong>৳{parseFloat(order.totalAmount.toString()).toFixed(2)}</strong>
                            </td>
                            <td>{order.items?.length || 0}</td>
                            <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-5 text-muted">
                  <p>No data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
