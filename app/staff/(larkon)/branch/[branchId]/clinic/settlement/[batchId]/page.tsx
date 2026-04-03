"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicSettlementBatchGet,
  staffClinicSettlementBatchApprove,
  staffClinicSettlementBatchPay,
} from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import {
  PageWorkspace,
  PageHeader,
  LoadingState,
  SectionCard,
  StatusBadge,
} from "@/src/components/dashboard";

const SETTLEMENT_PERMS = ["clinic.settlement.read", "clinic.settlement.review"];

type LedgerEntry = {
  id: number;
  entryType?: string;
  visitId?: number;
  orderId?: number;
  surgeryCaseId?: number;
  grossAmount?: number;
  doctorShare?: number;
  settlementStatus?: string;
  createdAt?: string;
};

type BatchDetail = {
  id: number;
  status?: string;
  periodStart?: string;
  periodEnd?: string;
  totalAccrued?: number;
  totalAdjustments?: number;
  totalDeductions?: number;
  netPayable?: number;
  clinicStaffProfileId?: number;
  clinicStaffProfile?: { branchMember?: { user?: { profile?: { displayName?: string } } } };
  ledgerEntries?: LedgerEntry[];
  payments?: Array<{ amount?: number; paymentMethod?: string; paidAt?: string; receiptRef?: string }>;
};

export default function StaffClinicSettlementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const batchIdNum = useMemo(() => Number(params?.batchId), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioning, setActioning] = useState(false);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = SETTLEMENT_PERMS.some((p) => permissions.includes(p));
  const canApprove = permissions.includes("clinic.settlement.approve");
  const canPay = permissions.includes("clinic.settlement.pay");

  const loadBatch = useCallback(() => {
    if (!batchIdNum) return;
    setLoading(true);
    setError("");
    staffClinicSettlementBatchGet(batchIdNum)
      .then((data) => setBatch((data ?? null) as BatchDetail | null))
      .catch((e) => {
        setError((e as Error)?.message ?? "Failed to load settlement batch");
        setBatch(null);
      })
      .finally(() => setLoading(false));
  }, [batchIdNum]);

  useEffect(() => {
    loadBatch();
  }, [loadBatch]);

  async function handleApprove() {
    if (!batch) return;
    setActioning(true);
    setError("");
    try {
      await staffClinicSettlementBatchApprove(batch.id);
      await loadBatch();
    } catch (e) {
      setError((e as Error)?.message ?? "Approve failed");
    } finally {
      setActioning(false);
    }
  }

  async function handlePay() {
    if (!batch) return;
    const rawAmount = window.prompt("Payment amount (leave empty for net payable):", "");
    const reference = window.prompt("Payment reference (optional):", "") ?? "";
    const amount = rawAmount?.trim() ? Number(rawAmount) : undefined;
    if (rawAmount?.trim() && (!Number.isFinite(amount) || Number(amount) <= 0)) {
      setError("Payment amount must be a positive number.");
      return;
    }
    setActioning(true);
    setError("");
    try {
      await staffClinicSettlementBatchPay(batch.id, {
        amount,
        paymentMethod: "BANK_TRANSFER",
        receiptRef: reference.trim() || undefined,
      });
      await loadBatch();
    } catch (e) {
      setError((e as Error)?.message ?? "Payment failed");
    } finally {
      setActioning(false);
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
        onBack={() => router.push(`/staff/branch/${branchId}/clinic/settlement`)}
      />
    );
  }

  return (
    <PageWorkspace>
      <div className="row g-0">
        <div className="col-12">
          <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <Link href={`/staff/branch/${branchId}/clinic/settlement`} className="btn btn-outline-secondary btn-sm radius-8">← Settlement</Link>
            <nav aria-label="Breadcrumb" className="d-flex align-items-center gap-2">
              <Link href={`/staff/branch/${branchId}/clinic`} className="text-muted small">Clinic</Link>
              <span className="text-muted small">/</span>
              <Link href={`/staff/branch/${branchId}/clinic/settlement`} className="text-muted small">Settlement</Link>
              <span className="text-muted small">/</span>
              <span className="fw-semibold">Batch #{batchIdNum}</span>
            </nav>
          </div>

          <PageHeader
            title={`Settlement Batch #${batchIdNum}`}
            subtitle="Batch detail, ledger breakdown, and payout actions"
            breadcrumbs={[
              { label: "Clinic", href: `/staff/branch/${branchId}/clinic` },
              { label: "Settlement", href: `/staff/branch/${branchId}/clinic/settlement` },
              { label: `Batch #${batchIdNum}` },
            ]}
            actions={[
              <Link key="back" href={`/staff/branch/${branchId}/clinic/settlement`} className="btn btn-outline-secondary btn-sm">Back</Link>,
            ]}
          />

          {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

          {loading ? (
            <SectionCard title="Settlement batch">
              <LoadingState message="Loading batch..." />
            </SectionCard>
          ) : !batch ? (
            <div className="alert alert-warning py-3">Settlement batch not found.</div>
          ) : (
            <>
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-3"><div className="card radius-12"><div className="card-body"><p className="mb-1 text-muted small">Status</p><StatusBadge status={batch.status} /></div></div></div>
                <div className="col-12 col-md-3"><div className="card radius-12"><div className="card-body"><p className="mb-1 text-muted small">Total accrued</p><h6 className="mb-0">৳ {Number(batch.totalAccrued ?? 0).toFixed(2)}</h6></div></div></div>
                <div className="col-12 col-md-3"><div className="card radius-12"><div className="card-body"><p className="mb-1 text-muted small">Adjustments</p><h6 className="mb-0">৳ {Number(batch.totalAdjustments ?? 0).toFixed(2)}</h6></div></div></div>
                <div className="col-12 col-md-3"><div className="card radius-12"><div className="card-body"><p className="mb-1 text-muted small">Net payable</p><h6 className="mb-0">৳ {Number(batch.netPayable ?? 0).toFixed(2)}</h6></div></div></div>
              </div>

              <SectionCard title="Batch overview" subtitle="Doctor and settlement period">
                <div className="d-flex flex-wrap gap-4 align-items-center">
                  <div><span className="text-muted">Doctor:</span> {batch.clinicStaffProfile?.branchMember?.user?.profile?.displayName ?? `#${batch.clinicStaffProfileId ?? "—"}`}</div>
                  <div><span className="text-muted">Period:</span> {batch.periodStart ? new Date(batch.periodStart).toLocaleDateString() : "—"} – {batch.periodEnd ? new Date(batch.periodEnd).toLocaleDateString() : "—"}</div>
                  <div className="ms-auto d-flex gap-2">
                    {(batch.status === "DRAFT" || batch.status === "UNDER_REVIEW") && canApprove && (
                      <button type="button" className="btn btn-success btn-sm" onClick={handleApprove} disabled={actioning}>{actioning ? "..." : "Approve"}</button>
                    )}
                    {batch.status === "APPROVED" && canPay && (
                      <button type="button" className="btn btn-primary btn-sm" onClick={handlePay} disabled={actioning}>{actioning ? "..." : "Record payment"}</button>
                    )}
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Visit breakdown" subtitle="Ledger entries included in this batch" noPadding>
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Ledger ID</th>
                        <th>Type</th>
                        <th>Visit</th>
                        <th>Order</th>
                        <th>Surgery</th>
                        <th>Gross</th>
                        <th>Doctor share</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(batch.ledgerEntries ?? []).length === 0 ? (
                        <tr><td colSpan={9} className="text-center text-muted py-4">No ledger entries attached to this batch.</td></tr>
                      ) : (
                        (batch.ledgerEntries ?? []).map((row) => (
                          <tr key={row.id}>
                            <td>{row.id}</td>
                            <td>{row.entryType ?? "—"}</td>
                            <td>{row.visitId ?? "—"}</td>
                            <td>{row.orderId ?? "—"}</td>
                            <td>{row.surgeryCaseId ?? "—"}</td>
                            <td>৳ {Number(row.grossAmount ?? 0).toFixed(2)}</td>
                            <td>৳ {Number(row.doctorShare ?? 0).toFixed(2)}</td>
                            <td><StatusBadge status={row.settlementStatus} /></td>
                            <td>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </>
          )}
        </div>
      </div>
    </PageWorkspace>
  );
}
