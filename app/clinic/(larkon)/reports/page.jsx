"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { staffClinicDashboardSummary } from "@/lib/api";

export default function ClinicReportsPage() {
  const searchParams = useSearchParams();
  const branchIdParam = searchParams?.get("branchId") || "";
  const [branchId, setBranchId] = useState(branchIdParam);
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setBranchId(branchIdParam);
  }, [branchIdParam]);

  useEffect(() => {
    if (!branchId) return;
    loadSummary();
  }, [branchId, dateFrom, dateTo]);

  async function loadSummary() {
    if (!branchId) return;
    setLoading(true);
    setError("");
    try {
      const data = await staffClinicDashboardSummary(branchId, { dateFrom, dateTo });
      setSummary(data ?? { visitCount: 0, orderCount: 0, revenue: 0 });
    } catch (e) {
      setError((e && e.message) || "Failed to load report");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";

  return (
    <div className="dashboard-main-body">
      <div className="card radius-12 mb-3">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="mb-0">Reports dashboard</h6>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Branch ID"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              style={{ width: "100px" }}
            />
            <input
              type="date"
              className="form-control form-control-sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: "140px" }}
            />
            <input
              type="date"
              className="form-control form-control-sm"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ width: "140px" }}
            />
            <Link href={`/clinic${q}`} className="btn btn-sm btn-outline-primary radius-12">Back</Link>
          </div>
        </div>
      </div>

      {!branchId && (
        <div className="card radius-12">
          <div className="card-body text-center text-muted py-5">
            <p className="mb-0">Enter branch ID and date range to view visit/order/revenue summary.</p>
          </div>
        </div>
      )}

      {branchId && error && (
        <div className="alert alert-danger radius-12 mb-3" role="alert">{error}</div>
      )}

      {branchId && !error && (
        <div className="card radius-12">
          <div className="card-header"><h6 className="mb-0">Summary ({dateFrom} – {dateTo})</h6></div>
          <div className="card-body">
            {loading && <p className="text-muted mb-0">Loading...</p>}
            {!loading && summary !== null && (
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="p-3 bg-light radius-12">
                    <div className="text-muted small">Visits (completed)</div>
                    <div className="h4 mb-0">{summary.visitCount}</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light radius-12">
                    <div className="text-muted small">Orders</div>
                    <div className="h4 mb-0">{summary.orderCount}</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light radius-12">
                    <div className="text-muted small">Revenue</div>
                    <div className="h4 mb-0">{typeof summary.revenue === "number" ? summary.revenue.toFixed(2) : summary.revenue}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
