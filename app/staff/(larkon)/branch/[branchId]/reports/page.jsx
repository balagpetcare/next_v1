"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBranchContext } from "@/lib/useBranchContext";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { ReportDataDisplay } from "@/src/components/dashboard";
import {
  staffClinicDashboardSummary,
  staffClinicReportProfitability,
  staffClinicReportSettlementSummary,
  staffClinicReportDiscountAnalysis,
  staffClinicReportInventoryVariance,
  staffClinicReportDoctorContribution,
} from "@/lib/api";

const REQUIRED_PERM = "reports.view";

export default function StaffBranchReportsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [dashboard, setDashboard] = useState(null);
  const [profitability, setProfitability] = useState(null);
  const [settlementSummary, setSettlementSummary] = useState(null);
  const [discountAnalysis, setDiscountAnalysis] = useState(null);
  const [inventoryVariance, setInventoryVariance] = useState(null);
  const [doctorContribution, setDoctorContribution] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportError, setReportError] = useState("");

  const permissions = myAccess?.permissions ?? [];
  const canView = permissions.includes(REQUIRED_PERM) || permissions.includes("manager.reports.daily_revenue");
  const hasClinic = branch?.clinicEnabled === true;

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  useEffect(() => {
    if (!branchId || !hasClinic) return;
    setLoading(true);
    setReportError("");
    const range = { dateFrom, dateTo };
    Promise.all([
      staffClinicDashboardSummary(branchId, range).catch(() => null),
      staffClinicReportProfitability(branchId, range).catch(() => null),
      staffClinicReportSettlementSummary(branchId, range).catch(() => null),
      staffClinicReportDiscountAnalysis(branchId, range).catch(() => null),
      staffClinicReportInventoryVariance(branchId, range).catch(() => null),
      staffClinicReportDoctorContribution(branchId, range).catch(() => null),
    ])
      .then(([d, p, s, disc, inv, doc]) => {
        setDashboard(d ?? null);
        setProfitability(p ?? null);
        setSettlementSummary(s ?? null);
        setDiscountAnalysis(disc ?? null);
        setInventoryVariance(inv ?? null);
        setDoctorContribution(doc ?? null);
      })
      .catch((e) => setReportError(e?.message ?? "Failed to load reports"))
      .finally(() => setLoading(false));
  }, [branchId, dateFrom, dateTo, hasClinic]);

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (errorCode === "forbidden" || !hasViewPermission || !canView) {
    return (
      <AccessDenied
        missingPerm={REQUIRED_PERM}
        onBack={() => router.push(`/staff/branch/${branchId}`)}
      />
    );
  }

  const summary = dashboard ?? {};
  const rev = summary.revenue;
  const visits = summary.visitCount;
  const orders = summary.orderCount;

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}`} className="btn btn-outline-secondary btn-sm">
          ← Branch
        </Link>
        <h5 className="mb-0">Reports</h5>
      </div>

      {hasClinic ? (
        <>
          {reportError && <div className="alert alert-danger py-2 mb-3">{reportError}</div>}
          <Card title="Branch Reports" subtitle="Broader branch analytics: profitability, settlement, discounts, inventory variance, doctor contribution. Export requires reports.export permission.">
            <div className="mb-3 d-flex flex-wrap align-items-center gap-2">
              <input
                type="date"
                className="form-control form-control-sm"
                style={{ width: 140 }}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <span className="text-muted small">to</span>
              <input
                type="date"
                className="form-control form-control-sm"
                style={{ width: 140 }}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            {loading ? (
              <div className="py-24 text-center text-secondary-light">Loading reports…</div>
            ) : (
              <>
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <div className="card radius-12 border">
                      <div className="card-body">
                        <h6 className="text-muted text-uppercase small mb-1">Revenue</h6>
                        <p className="mb-0 fs-4 fw-semibold">{rev != null ? Number(rev).toLocaleString() : "—"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card radius-12 border">
                      <div className="card-body">
                        <h6 className="text-muted text-uppercase small mb-1">Visits</h6>
                        <p className="mb-0 fs-4 fw-semibold">{visits != null ? visits : "—"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card radius-12 border">
                      <div className="card-body">
                        <h6 className="text-muted text-uppercase small mb-1">Orders</h6>
                        <p className="mb-0 fs-4 fw-semibold">{orders != null ? orders : "—"}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="small text-muted mb-2">Profitability</div>
                {profitability != null ? <div className="small bg-light p-2 radius-8 mb-3"><ReportDataDisplay data={profitability} maxHeight={160} showExport /></div> : <p className="text-muted small mb-3">No data.</p>}
                <div className="small text-muted mb-2">Settlement summary</div>
                {settlementSummary != null ? <div className="small bg-light p-2 radius-8 mb-3"><ReportDataDisplay data={settlementSummary} maxHeight={160} showExport /></div> : <p className="text-muted small mb-3">No data.</p>}
                <div className="small text-muted mb-2">Discount analysis</div>
                {discountAnalysis != null ? <div className="small bg-light p-2 radius-8 mb-3"><ReportDataDisplay data={discountAnalysis} maxHeight={160} showExport /></div> : <p className="text-muted small mb-3">No data.</p>}
                <div className="small text-muted mb-2">Inventory variance</div>
                {inventoryVariance != null ? <div className="small bg-light p-2 radius-8 mb-3"><ReportDataDisplay data={inventoryVariance} maxHeight={160} showExport /></div> : <p className="text-muted small mb-3">No data.</p>}
                <div className="small text-muted mb-2">Doctor contribution</div>
                {doctorContribution != null ? <div className="small bg-light p-2 radius-8 mb-0"><ReportDataDisplay data={doctorContribution} maxHeight={160} showExport /></div> : <p className="text-muted small mb-0">No data.</p>}
              </>
            )}
          </Card>
          <p className="mt-2 small text-muted">For more analytics, use Clinic → Analytics.</p>
        </>
      ) : (
        <Card title="Branch Reports" subtitle="Sales, inventory, and analytics.">
          <div className="py-24 text-center text-secondary-light">
            <p className="mb-16">Reports for this branch will appear here when wired to backend.</p>
            <p className="text-sm mb-0">Clinic reports are available when this branch has clinic enabled. Use Overview dashboard for KPIs.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
