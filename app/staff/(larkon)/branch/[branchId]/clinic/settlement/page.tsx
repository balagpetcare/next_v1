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
  staffClinicSettlementBatchPay,
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
  const canPay = permissions.includes("clinic.settlement.pay");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [periodEnd, setPeriodEnd] = useState("");
  const [doctorProfileIdsText, setDoctorProfileIdsText] = useState("");

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
      const doctorProfileIds = doctorProfileIdsText
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isFinite(v) && v > 0);
      await staffClinicSettlementBatchesGenerate(branchId, {
        periodEnd: periodEnd || undefined,
        doctorProfileIds: doctorProfileIds.length ? doctorProfileIds : undefined,
      });
      setShowCreateModal(false);
      setPeriodEnd("");
      setDoctorProfileIdsText("");
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

  async function handlePay(batchId: number) {
    const rawAmount = window.prompt("Payment amount (leave empty for net payable):", "");
    const reference = window.prompt("Payment reference (optional):", "") ?? "";
    const amount = rawAmount?.trim() ? Number(rawAmount) : undefined;
    if (rawAmount?.trim() && (!Number.isFinite(amount) || Number(amount) <= 0)) {
      setError("Payment amount must be a positive number.");
      return;
    }
    setActioningId(batchId);
    setError("");
    try {
      await staffClinicSettlementBatchPay(batchId, {
        amount,
        paymentMethod: "BANK_TRANSFER",
        receiptRef: reference.trim() || undefined,
      });
      await loadBatches();
    } catch (e) {
      setError((e as Error)?.message ?? "Payment failed");
    } finally {
      setActioningId(null);
    }
  }

  const summary = useMemo(() => {
    const draft = batches.filter((b) => b.status === "DRAFT").length;
    const approved = batches.filter((b) => b.status === "APPROVED").length;
    const paid = batches.filter((b) => b.status === "PAID").length;
    const netPayable = batches.reduce((sum, b) => sum + Number(b.netPayable ?? 0), 0);
    return { draft, approved, paid, netPayable };
  }, [batches]);

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
            actions={[
              canReview ? (
                <button key="create" type="button" className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
                  Create batch
                </button>
              ) : null,
            ]}
          />

          {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

          <div className="row g-3 mb-3">
            <div className="col-12 col-md-3">
              <div className="card radius-12"><div className="card-body"><p className="mb-1 text-muted small">Total batches</p><h6 className="mb-0">{total}</h6></div></div>
            </div>
            <div className="col-12 col-md-3">
              <div className="card radius-12"><div className="card-body"><p className="mb-1 text-muted small">Draft</p><h6 className="mb-0">{summary.draft}</h6></div></div>
            </div>
            <div className="col-12 col-md-3">
              <div className="card radius-12"><div className="card-body"><p className="mb-1 text-muted small">Approved</p><h6 className="mb-0">{summary.approved}</h6></div></div>
            </div>
            <div className="col-12 col-md-3">
              <div className="card radius-12"><div className="card-body"><p className="mb-1 text-muted small">Net payable</p><h6 className="mb-0">৳ {summary.netPayable.toFixed(2)}</h6></div></div>
            </div>
          </div>

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
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)} disabled={generating}>
                    {generating ? "Creating…" : "Create batch"}
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
                            <Link href={`/staff/branch/${branchId}/clinic/settlement/${b.id}`} className="btn btn-sm btn-outline-secondary me-1">
                              View
                            </Link>
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
                                className="btn btn-sm btn-outline-success me-1"
                                onClick={() => handleApprove(b.id)}
                                disabled={acting}
                              >
                                {acting ? "…" : "Approve"}
                              </button>
                            )}
                            {b.status === "APPROVED" && canPay && (
                              <button
                                type="button"
                                className="btn btn-sm btn-success"
                                onClick={() => handlePay(b.id)}
                                disabled={acting}
                              >
                                {acting ? "…" : "Pay"}
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

      {showCreateModal && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create settlement batch</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Period end (optional)</label>
                  <input type="date" className="form-control" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Doctor profile IDs (optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 12,18,24"
                    value={doctorProfileIdsText}
                    onChange={(e) => setDoctorProfileIdsText(e.target.value)}
                  />
                  <div className="form-text">Leave empty to generate for all pending doctors in branch.</div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setShowCreateModal(false)} disabled={generating}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
                  {generating ? "Creating…" : "Create batch"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageWorkspace>
  );
}
