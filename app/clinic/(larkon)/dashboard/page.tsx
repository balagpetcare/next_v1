"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { staffClinicDashboardSummary } from "@/lib/api";

export default function ClinicDashboardPage() {
  const searchParams = useSearchParams();
  const branchIdParam = searchParams?.get("branchId") || "";
  const [branchId, setBranchId] = useState(branchIdParam);
  const [summary, setSummary] = useState<{ visitCount: number; orderCount: number; revenue: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setBranchId(branchIdParam);
  }, [branchIdParam]);

  useEffect(() => {
    if (!branchId) return;
    loadSummary();
  }, [branchId]);

  async function loadSummary() {
    if (!branchId) return;
    setLoading(true);
    setError("");
    try {
      const today = new Date().toISOString().slice(0, 10);
      const data = await staffClinicDashboardSummary(branchId, { dateFrom: today, dateTo: today });
      setSummary(data ?? { visitCount: 0, orderCount: 0, revenue: 0 });
    } catch (e) {
      setError((e as Error)?.message || "Failed to load dashboard");
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
          <h6 className="mb-0">Clinic Dashboard</h6>
          <div className="d-flex align-items-center gap-2">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Branch ID"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              style={{ width: "120px" }}
            />
          </div>
        </div>
      </div>

      {!branchId && (
        <div className="card radius-12">
          <div className="card-body text-center text-muted py-5">
            <p className="mb-0">Enter a clinic branch ID above (or open with <code>?branchId=...</code>) to see today&apos;s summary.</p>
          </div>
        </div>
      )}

      {branchId && error && (
        <div className="alert alert-danger radius-12" role="alert">
          {error}
        </div>
      )}

      {branchId && !error && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <Link href={`/clinic/queue${q}`} className="text-decoration-none">
                <div className="card radius-12 h-100 border-primary">
                  <div className="card-body">
                    <h6 className="text-muted text-uppercase small mb-1">Queue</h6>
                    <p className="mb-0">Open queue console</p>
                  </div>
                </div>
              </Link>
            </div>
            <div className="col-md-4">
              <Link href={`/clinic/appointments${q}`} className="text-decoration-none">
                <div className="card radius-12 h-100 border-primary">
                  <div className="card-body">
                    <h6 className="text-muted text-uppercase small mb-1">Appointments</h6>
                    <p className="mb-0">Today&apos;s appointments</p>
                  </div>
                </div>
              </Link>
            </div>
            <div className="col-md-4">
              <Link href={`/clinic/patients${q}`} className="text-decoration-none">
                <div className="card radius-12 h-100 border-primary">
                  <div className="card-body">
                    <h6 className="text-muted text-uppercase small mb-1">Patients</h6>
                    <p className="mb-0">Patients (pets) list</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          <div className="card radius-12">
            <div className="card-header">
              <h6 className="mb-0">Today&apos;s summary</h6>
            </div>
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
        </>
      )}
    </div>
  );
}
