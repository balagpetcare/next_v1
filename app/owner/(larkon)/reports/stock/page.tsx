"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/apiFetch";

interface StockReport {
  summary: {
    totalItems: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  items: Array<{
    id: number;
    product: { name: string; slug: string };
    variant: { title: string; sku: string } | null;
    branch: { name: string };
    quantity: number;
    minStock: number;
  }>;
}

export default function OwnerStockReportPage() {
  const [report, setReport] = useState<StockReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  useEffect(() => {
    loadReport();
  }, [lowStockOnly]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const url = lowStockOnly
        ? "/api/v1/reports/stock?lowStockOnly=true"
        : "/api/v1/reports/stock";
      const data = (await apiFetch(url)) as { data?: unknown } | unknown;
      setReport(((data && typeof data === "object" && "data" in data ? (data as { data: unknown }).data : data) ?? null) as StockReport | null);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load stock report");
      console.error("Load report error:", e);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (quantity: number, minStock: number) => {
    if (quantity === 0) return { label: "Out of Stock", class: "bg-danger-focus text-danger-main" };
    if (quantity <= minStock) return { label: "Low Stock", class: "bg-warning-focus text-warning-main" };
    return { label: "In Stock", class: "bg-success-focus text-success-main" };
  };

  return (
    <div className="dashboard-main-body">
      <div className="row g-3">
        <div className="col-12">
          <div className="card radius-12">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h5 className="mb-1">Stock Report</h5>
                  <small className="text-muted">View inventory levels and stock status</small>
                </div>
                <div className="d-flex gap-2">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={lowStockOnly}
                      onChange={(e) => setLowStockOnly(e.target.checked)}
                    />
                    <label className="form-check-label">Low Stock Only</label>
                  </div>
                  <button
                    className="btn btn-primary radius-12"
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
                      <div className="card radius-12 bg-info-focus">
                        <div className="card-body text-center">
                          <h6 className="text-muted mb-2">Total Items</h6>
                          <h4 className="text-info-main mb-0">{report.summary.totalItems}</h4>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card radius-12 bg-warning-focus">
                        <div className="card-body text-center">
                          <h6 className="text-muted mb-2">Low Stock</h6>
                          <h4 className="text-warning-main mb-0">{report.summary.lowStockCount}</h4>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card radius-12 bg-danger-focus">
                        <div className="card-body text-center">
                          <h6 className="text-muted mb-2">Out of Stock</h6>
                          <h4 className="text-danger-main mb-0">{report.summary.outOfStockCount}</h4>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card radius-12 bg-success-focus">
                        <div className="card-body text-center">
                          <h6 className="text-muted mb-2">In Stock</h6>
                          <h4 className="text-success-main mb-0">
                            {report.summary.totalItems - report.summary.lowStockCount - report.summary.outOfStockCount}
                          </h4>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stock Items Table */}
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Variant</th>
                          <th>Branch</th>
                          <th>Stock</th>
                          <th>Min Stock</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.items.map((item) => {
                          const status = getStockStatus(item.quantity, item.minStock);
                          return (
                            <tr key={item.id}>
                              <td>
                                <strong>{item.product.name}</strong>
                                <br />
                                <small className="text-muted">{item.product.slug}</small>
                              </td>
                              <td>
                                {item.variant ? (
                                  <>
                                    {item.variant.title}
                                    <br />
                                    <small className="text-muted">SKU: {item.variant.sku}</small>
                                  </>
                                ) : (
                                  <span className="text-muted">Standard</span>
                                )}
                              </td>
                              <td>{item.branch.name}</td>
                              <td>
                                <strong>{item.quantity}</strong>
                              </td>
                              <td>{item.minStock}</td>
                              <td>
                                <span className={`badge radius-12 ${status.class}`}>
                                  {status.label}
                                </span>
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
