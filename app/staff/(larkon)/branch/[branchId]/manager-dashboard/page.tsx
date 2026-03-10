"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import AccessDenied from "@/src/components/branch/AccessDenied";

type DashboardKpis = {
  branchId: number;
  orgId: number;
  date: string;
  orders: { countToday: number; totalAmountToday: string };
  staff: { totalActive: number; managers: number; staff: number };
  accessRequests: { pending: number; approved: number };
  appointmentsToday?: number;
  patientsToday?: number;
  doctorsOnDutyToday?: number;
  lowStockCount?: number;
  pendingSupplyRequests?: number;
  pendingEscalations?: number;
};

export default function ManagerDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const [data, setData] = useState<DashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setErrorCode(null);
    apiGet<{ success: boolean; data?: DashboardKpis; message?: string }>(
      `/api/v1/manager/dashboard/${branchId}`
    )
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) setData(res.data);
        else setError(res.message || "Failed to load dashboard");
      })
      .catch((e: Error & { status?: number }) => {
        if (cancelled) return;
        setError(e?.message || "Server error");
        if (e?.status === 401) setErrorCode("unauthorized");
        else if (e?.status === 403) setErrorCode("forbidden");
        else if (e?.status === 404) setErrorCode("not_found");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  if (loading) {
    return (
      <div className="container py-4">
        <div className="row">
          <div className="col-12">
            <Card>
              <div className="placeholder-glow">
                <span className="placeholder col-6"></span>
                <span className="placeholder col-4 ms-2"></span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (errorCode === "forbidden" || errorCode === "not_found") {
    return (
      <AccessDenied
        message={errorCode === "not_found" ? "Branch not found or you are not the manager." : "You need manager access to view this dashboard."}
        onBack={() => router.push("/staff/branch")}
      />
    );
  }

  if (error && !data) {
    return (
      <div className="container py-4">
        <Card>
          <p className="text-danger mb-0">{error}</p>
          <button type="button" className="btn btn-outline-primary mt-3" onClick={() => router.push("/staff/branch/" + branchId)}>
            Back to branch
          </button>
        </Card>
      </div>
    );
  }

  const kpis = data!;
  const revenue = kpis.orders?.totalAmountToday ?? "0";

  return (
    <div className="container py-4">
      <div className="card radius-12 mb-24">
        <div className="card-body py-20">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-16">
            <div>
              <h5 className="mb-0 fw-semibold">Manager Dashboard</h5>
              <p className="mb-0 small text-muted mt-1">Branch ID: {branchId}</p>
            </div>
            <Link href={`/staff/branch/${branchId}`} className="btn btn-outline-secondary btn-sm">Branch overview</Link>
          </div>
        </div>
      </div>
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <Card className="h-100">
            <div className="d-flex align-items-center">
              <span className="text-muted small">Appointments today</span>
            </div>
            <h4 className="mb-0 mt-1">{kpis.appointmentsToday ?? 0}</h4>
          </Card>
        </div>
        <div className="col-6 col-md-3">
          <Card className="h-100">
            <span className="text-muted small">Patients today</span>
            <h4 className="mb-0 mt-1">{kpis.patientsToday ?? 0}</h4>
          </Card>
        </div>
        <div className="col-6 col-md-3">
          <Card className="h-100">
            <span className="text-muted small">Doctors on duty</span>
            <h4 className="mb-0 mt-1">{kpis.doctorsOnDutyToday ?? 0}</h4>
          </Card>
        </div>
        <div className="col-6 col-md-3">
          <Card className="h-100">
            <span className="text-muted small">Revenue today</span>
            <h4 className="mb-0 mt-1">${Number(revenue).toLocaleString()}</h4>
          </Card>
        </div>
      </div>
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-4">
          <Link href={`/staff/branch/${branchId}/inventory`} className="text-decoration-none">
            <Card className="h-100 border-primary">
              <span className="text-muted small">Low stock items</span>
              <h4 className="mb-0 mt-1 text-primary">{kpis.lowStockCount ?? 0}</h4>
            </Card>
          </Link>
        </div>
        <div className="col-6 col-md-4">
          <Link href={`/staff/branch/${branchId}/clinic/supply-requests`} className="text-decoration-none">
            <Card className="h-100">
              <span className="text-muted small">Pending supply requests</span>
              <h4 className="mb-0 mt-1">{kpis.pendingSupplyRequests ?? 0}</h4>
            </Card>
          </Link>
        </div>
        <div className="col-6 col-md-4">
          <Link href={`/staff/branch/${branchId}/escalations`} className="text-decoration-none">
            <Card className="h-100">
              <span className="text-muted small">Pending approvals</span>
              <h4 className="mb-0 mt-1">{kpis.pendingEscalations ?? 0}</h4>
            </Card>
          </Link>
        </div>
      </div>
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <Card>
            <h6 className="mb-3">Quick actions</h6>
            <div className="d-flex flex-wrap gap-2">
              <Link href={`/staff/branch/${branchId}/clinic/appointments`} className="btn btn-outline-primary btn-sm">
                Appointments
              </Link>
              <Link href={`/staff/branch/${branchId}/clinic/queue`} className="btn btn-outline-primary btn-sm">
                Queue
              </Link>
              <Link href={`/staff/branch/${branchId}/staff`} className="btn btn-outline-primary btn-sm">
                Staff
              </Link>
              <Link href={`/staff/branch/${branchId}/reports`} className="btn btn-outline-primary btn-sm">
                Reports
              </Link>
            </div>
          </Card>
        </div>
        <div className="col-12 col-md-6">
          <Card>
            <h6 className="mb-3">Staff summary</h6>
            <p className="mb-0 small text-muted">
              Active: {kpis.staff?.totalActive ?? 0} (Managers: {kpis.staff?.managers ?? 0}, Staff: {kpis.staff?.staff ?? 0})
            </p>
            <p className="mb-0 small text-muted">Access requests pending: {kpis.accessRequests?.pending ?? 0}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
