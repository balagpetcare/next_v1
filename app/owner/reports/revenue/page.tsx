"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/apiFetch";

interface RevenueAnalytics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  byPaymentMethod: Array<{
    method: string;
    count: number;
    total: number;
  }>;
}

export default function OwnerRevenueReportPage() {
  const [analytics, setAnalytics] = useState<RevenueAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    loadAnalytics();
  }, [startDate, endDate]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      let url = "/api/v1/reports/revenue?";
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      url += params.toString();

      const data = (await apiFetch(url)) as { data?: unknown } | unknown;
      setAnalytics(((data && typeof data === "object" && "data" in data ? (data as { data: unknown }).data : data) ?? null) as RevenueAnalytics | null);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load revenue analytics");
      console.error("Load analytics error:", e);
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
                  <h5 className="mb-1">Revenue Analytics</h5>
                  <small className="text-muted">View revenue breakdown by payment method</small>
                </div>
              </div>

              {/* Filters */}
              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-control radius-12"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-control radius-12"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="col-md-4 d-flex align-items-end">
                  <button
                    className="btn btn-primary radius-12 w-100"
                    onClick={loadAnalytics}
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
              ) : analytics ? (
                <>
                  {/* Summary Cards */}
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <div className="card radius-12 bg-primary-focus">
                        <div className="card-body text-center">
                          <h6 className="text-muted mb-2">Total Revenue</h6>
                          <h4 className="text-primary-main mb-0">
                            ৳{parseFloat(analytics.totalRevenue.toString()).toFixed(2)}
                          </h4>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card radius-12 bg-info-focus">
                        <div className="card-body text-center">
                          <h6 className="text-muted mb-2">Total Orders</h6>
                          <h4 className="text-info-main mb-0">{analytics.totalOrders}</h4>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card radius-12 bg-success-focus">
                        <div className="card-body text-center">
                          <h6 className="text-muted mb-2">Avg Order Value</h6>
                          <h4 className="text-success-main mb-0">
                            ৳{parseFloat(analytics.averageOrderValue.toString()).toFixed(2)}
                          </h4>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Breakdown */}
                  <div className="table-responsive">
                    <h6 className="mb-3">Revenue by Payment Method</h6>
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Payment Method</th>
                          <th>Orders</th>
                          <th>Total Revenue</th>
                          <th>Average</th>
                          <th>Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.byPaymentMethod.map((method, index) => {
                          const percentage = analytics.totalRevenue > 0
                            ? (method.total / analytics.totalRevenue) * 100
                            : 0;
                          return (
                            <tr key={index}>
                              <td>
                                <strong>{method.method || "UNKNOWN"}</strong>
                              </td>
                              <td>{method.count}</td>
                              <td>
                                <strong>৳{parseFloat(method.total.toString()).toFixed(2)}</strong>
                              </td>
                              <td>
                                ৳{method.count > 0
                                  ? (method.total / method.count).toFixed(2)
                                  : "0.00"}
                              </td>
                              <td>
                                <div className="d-flex align-items-center">
                                  <div className="progress flex-grow-1 me-2" style={{ height: "20px" }}>
                                    <div
                                      className="progress-bar bg-primary"
                                      role="progressbar"
                                      style={{ width: `${percentage}%` }}
                                    >
                                      {percentage.toFixed(1)}%
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
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
