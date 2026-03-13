"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace, PageHeader, LoadingState, SectionCard, ReportDataDisplay } from "@/src/components/dashboard";
import {
  staffClinicReportProfitability,
  staffClinicReportSettlementSummary,
  staffClinicReportDiscountAnalysis,
  staffClinicReportInventoryVariance,
  staffClinicReportDoctorContribution,
  staffClinicDashboardSummary,
} from "@/lib/api";

const ANALYTICS_PERMS = ["clinic.analytics.view", "clinic.stats.view", "clinic.reports.branch_analytics"];

function useReport<T>(fetcher: () => Promise<T | null>, deps: React.DependencyList): { data: T | null; loading: boolean; error: string } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetcher()
      .then((r) => { if (!cancelled) setData(r ?? null); })
      .catch((e) => { if (!cancelled) setError((e as Error)?.message ?? "Failed"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, deps);
  return { data, loading, error };
}

export default function StaffClinicAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const range = useMemo(() => ({ dateFrom, dateTo }), [dateFrom, dateTo]);

  const dashboard = useReport(() => branchId ? staffClinicDashboardSummary(branchId, range) : Promise.resolve(null), [branchId, dateFrom, dateTo]);
  const profitability = useReport(() => branchId ? staffClinicReportProfitability(branchId, range) : Promise.resolve(null), [branchId, dateFrom, dateTo]);
  const settlementSummary = useReport(() => branchId ? staffClinicReportSettlementSummary(branchId, range) : Promise.resolve(null), [branchId, dateFrom, dateTo]);
  const discountAnalysis = useReport(() => branchId ? staffClinicReportDiscountAnalysis(branchId, range) : Promise.resolve(null), [branchId, dateFrom, dateTo]);
  const inventoryVariance = useReport(() => branchId ? staffClinicReportInventoryVariance(branchId, range) : Promise.resolve(null), [branchId, dateFrom, dateTo]);
  const doctorContribution = useReport(() => branchId ? staffClinicReportDoctorContribution(branchId, range) : Promise.resolve(null), [branchId, dateFrom, dateTo]);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = ANALYTICS_PERMS.some((p) => permissions.includes(p));

  if (ctxLoading) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading..." />
      </PageWorkspace>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.analytics.view"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic`)}
      />
    );
  }

  const summary = dashboard.data as { visitCount?: number; orderCount?: number; revenue?: number } | null;
  const rev = summary?.revenue;
  const visits = summary?.visitCount;
  const orders = summary?.orderCount;

  return (
    <PageWorkspace>
      <div className="row g-0">
        <div className="col-12">
          <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <Link href={`/staff/branch/${branchId}/clinic`} className="btn btn-outline-secondary btn-sm radius-8">
              ← Clinic
            </Link>
            <nav aria-label="Breadcrumb" className="d-flex align-items-center gap-2">
              <Link href={`/staff/branch/${branchId}/clinic`} className="text-muted small">Clinic</Link>
              <span className="text-muted small">/</span>
              <span className="fw-semibold">Analytics</span>
            </nav>
          </div>
          <PageHeader
            title="Analytics"
            subtitle="Revenue, settlement, and operation reports"
            breadcrumbs={[
              { label: "Clinic", href: `/staff/branch/${branchId}/clinic` },
              { label: "Analytics" },
            ]}
          />

          <SectionCard title="Branch analytics" subtitle="Reports for the selected date range.">
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
            <div className="row g-3">
              <div className="col-md-4">
                <div className="card radius-12 border">
                  <div className="card-body">
                    <h6 className="text-muted text-uppercase small mb-1">Dashboard revenue</h6>
                    {dashboard.loading ? <p className="mb-0 text-muted">…</p> : <p className="mb-0 fs-4 fw-semibold">{rev != null ? Number(rev).toLocaleString() : "—"}</p>}
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card radius-12 border">
                  <div className="card-body">
                    <h6 className="text-muted text-uppercase small mb-1">Visits</h6>
                    {dashboard.loading ? <p className="mb-0 text-muted">…</p> : <p className="mb-0 fs-4 fw-semibold">{visits != null ? visits : "—"}</p>}
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card radius-12 border">
                  <div className="card-body">
                    <h6 className="text-muted text-uppercase small mb-1">Orders</h6>
                    {dashboard.loading ? <p className="mb-0 text-muted">…</p> : <p className="mb-0 fs-4 fw-semibold">{orders != null ? orders : "—"}</p>}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Profitability report" subtitle="">
            {profitability.loading && <p className="text-muted small mb-0">Loading…</p>}
            {!profitability.loading && profitability.error && <p className="text-muted small mb-0">No access or no data.</p>}
            {!profitability.loading && !profitability.error && profitability.data && (
              <div className="small bg-light p-2 radius-8"><ReportDataDisplay data={profitability.data} maxHeight={200} showExport /></div>
            )}
            {!profitability.loading && !profitability.error && !profitability.data && <p className="text-muted small mb-0">No data.</p>}
          </SectionCard>

          <SectionCard title="Settlement summary" subtitle="">
            {settlementSummary.loading && <p className="text-muted small mb-0">Loading…</p>}
            {!settlementSummary.loading && settlementSummary.error && <p className="text-muted small mb-0">No access or no data.</p>}
            {!settlementSummary.loading && !settlementSummary.error && settlementSummary.data && (
              <div className="small bg-light p-2 radius-8"><ReportDataDisplay data={settlementSummary.data} maxHeight={200} showExport /></div>
            )}
            {!settlementSummary.loading && !settlementSummary.error && !settlementSummary.data && <p className="text-muted small mb-0">No data.</p>}
          </SectionCard>

          <SectionCard title="Discount analysis" subtitle="">
            {discountAnalysis.loading && <p className="text-muted small mb-0">Loading…</p>}
            {!discountAnalysis.loading && discountAnalysis.error && <p className="text-muted small mb-0">No access or no data.</p>}
            {!discountAnalysis.loading && !discountAnalysis.error && discountAnalysis.data && (
              <div className="small bg-light p-2 radius-8"><ReportDataDisplay data={discountAnalysis.data} maxHeight={200} showExport /></div>
            )}
            {!discountAnalysis.loading && !discountAnalysis.error && !discountAnalysis.data && <p className="text-muted small mb-0">No data.</p>}
          </SectionCard>

          <SectionCard title="Inventory variance" subtitle="">
            {inventoryVariance.loading && <p className="text-muted small mb-0">Loading…</p>}
            {!inventoryVariance.loading && inventoryVariance.error && <p className="text-muted small mb-0">No access or no data.</p>}
            {!inventoryVariance.loading && !inventoryVariance.error && inventoryVariance.data && (
              <div className="small bg-light p-2 radius-8"><ReportDataDisplay data={inventoryVariance.data} maxHeight={200} showExport /></div>
            )}
            {!inventoryVariance.loading && !inventoryVariance.error && !inventoryVariance.data && <p className="text-muted small mb-0">No data.</p>}
          </SectionCard>

          <SectionCard title="Doctor contribution" subtitle="">
            {doctorContribution.loading && <p className="text-muted small mb-0">Loading…</p>}
            {!doctorContribution.loading && doctorContribution.error && <p className="text-muted small mb-0">No access or no data.</p>}
            {!doctorContribution.loading && !doctorContribution.error && doctorContribution.data && (
              <div className="small bg-light p-2 radius-8"><ReportDataDisplay data={doctorContribution.data} maxHeight={200} showExport /></div>
            )}
            {!doctorContribution.loading && !doctorContribution.error && !doctorContribution.data && <p className="text-muted small mb-0">No data.</p>}
          </SectionCard>
        </div>
      </div>
    </PageWorkspace>
  );
}
