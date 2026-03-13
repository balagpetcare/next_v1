"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace, PageHeader, LoadingState, SectionCard, EmptyState, StatusBadge } from "@/src/components/dashboard";
import {
  staffClinicSettlementBatchesList,
  staffClinicSettlementBatchesGenerate,
  staffClinicSettlementBatchReview,
  staffClinicSettlementBatchApprove,
} from "@/lib/api";

const SETTLEMENT_PERMS = ["clinic.settlement.read", "clinic.settlement.review"];

type Batch = {
  id: number;
  status?: string;
  periodStart?: string;
  periodEnd?: string;
  netPayable?: number;
  clinicStaffProfile?: { branchMember?: { user?: { profile?: { displayName?: string } } } };
};

export default function StaffClinicSettlementPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = SETTLEMENT_PERMS.some((p) => permissions.includes(p));
  const canReview = permissions.includes("clinic.settlement.review");
  const canApprove = permissions.includes("clinic.settlement.approve");

  const loadBatches = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    setError("");
    staffClinicSettlementBatchesList(branchId, { page, limit: 20, status: statusFilter || undefined })
      .then((data) => {
        setBatches(data?.batches ?? []);
        setTotal(data?.total ?? 0);
      })
      .catch((e) => {
        setError(e?.message ?? "Failed to load settlement batches");
        setBatches([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [branchId, page, statusFilter]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  async function handleGenerate() {
    if (!branchId) return;
    setGenerating(true);
    setError("");
    try {
      await staffClinicSettlementBatchesGenerate(branchId, {});
      await loadBatches();
    } catch (e) {
      setError((e as Error)?.message ?? "Generate failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleReview(batchId: number) {
    setActioningId(batchId);
    setError("");
    try {
      await staffClinicSettlementBatchReview(batchId, { notes: "Reviewed from staff panel" });
      await loadBatches();
    } catch (e) {
      setError((e as Error)?.message ?? "Review failed");
    } finally {
      setActioningId(null);
    }
  }

  async function handleApprove(batchId: number) {
    setActioningId(batchId);
    setError("");
    try {
      await staffClinicSettlementBatchApprove(batchId);
      await loadBatches();
    } catch (e) {
      setError((e as Error)?.message ?? "Approve failed");
    } finally {
      setActioningId(null);
    }
  }

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
        missingPerm="clinic.settlement.read"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic`)}
      />
    );
  }

  return (
    <PageWorkspace>
      <div className="row g-0">
        <div className="col-12">
          <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <Link href={`/staff/branch/${branchId}/clinic`} className="btn btn-outline-secondary btn-sm radius-8">← Clinic</Link>
            <nav aria-label="Breadcrumb" className="d-flex align-items-center gap-2">
              <Link href={`/staff/branch/${branchId}/clinic`} className="text-muted small">Clinic</Link>
              <span className="text-muted small">/</span>
              <span className="fw-semibold">Settlement</span>
            </nav>
          </div>
          <PageHeader
            title="Settlement"
            subtitle="View and review doctor settlement batches"
            breadcrumbs={[{ label: "Clinic", href: `/staff/branch/${branchId}/clinic` }, { label: "Settlement" }]}
          />

          {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

          <SectionCard title="Settlement batches" subtitle="Doctor settlement batches for this branch." noPadding>
            <div className="card-body border-bottom">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <select
                  className="form-select form-select-sm"
                  style={{ width: 140 }}
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                >
                  <option value="">All statuses</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="PAID">PAID</option>
                </select>
                {canReview && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleGenerate} disabled={generating}>
                    {generating ? "Generating…" : "Generate batches"}
                  </button>
                )}
              </div>
            </div>
            {loading ? (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Doctor</th>
                      <th>Period end</th>
                      <th>Status</th>
                      <th>Net payable</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">Loading…</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : batches.length === 0 ? (
              <EmptyState
                title="No settlement batches"
                description="Settlement batches are generated from completed visits and doctor earnings. Generate batches to create drafts for review."
                icon="ri:bank-line"
                action={
                  canReview ? (
                    <button type="button" className="btn btn-primary btn-sm radius-8" onClick={handleGenerate} disabled={generating}>
                      {generating ? "Generating…" : "Generate batches"}
                    </button>
                  ) : undefined
                }
              />
            ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Doctor</th>
                    <th>Period end</th>
                    <th>Status</th>
                    <th>Net payable</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                    {batches.map((b) => {
                      const doctorName = b.clinicStaffProfile?.branchMember?.user?.profile?.displayName ?? "—";
                      const periodEnd = b.periodEnd ? new Date(b.periodEnd).toLocaleDateString() : "—";
                      const acting = actioningId === b.id;
                      return (
                        <tr key={b.id}>
                          <td>{b.id}</td>
                          <td>{doctorName}</td>
                          <td>{periodEnd}</td>
                          <td><StatusBadge status={b.status} /></td>
                          <td>{b.netPayable != null ? Number(b.netPayable).toFixed(2) : "—"}</td>
                          <td className="text-end">
                            {b.status === "DRAFT" && canReview && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary me-1"
                                onClick={() => handleReview(b.id)}
                                disabled={acting}
                              >
                                {acting ? "…" : "Mark under review"}
                              </button>
                            )}
                            {(b.status === "DRAFT" || b.status === "UNDER_REVIEW") && canApprove && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-success"
                                onClick={() => handleApprove(b.id)}
                                disabled={acting}
                              >
                                {acting ? "…" : "Approve"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            )}
            {total > 0 && (
              <div className="card-body border-top small text-muted">
                Total: {total} batch(es). Page {page}.
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </PageWorkspace>
  );
}
