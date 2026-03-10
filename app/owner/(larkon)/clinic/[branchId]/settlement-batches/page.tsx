"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicSettlementBatchesList,
  ownerClinicSettlementBatchesGenerate,
  ownerClinicSettlementBatchById,
  ownerClinicSettlementBatchReview,
  ownerClinicSettlementBatchApprove,
  ownerClinicSettlementBatchPay,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import ClinicConsoleTabs from "@/app/owner/_components/clinic/ClinicConsoleTabs";

type BatchItem = {
  id: number;
  periodStart?: string;
  periodEnd?: string;
  totalAccrued?: number | string;
  netPayable?: number | string;
  status?: string;
  clinicStaffProfileId?: number;
};

export default function ClinicSettlementBatchesPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [items, setItems] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [actioning, setActioning] = useState<number | null>(null);

  const load = async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const res = await ownerClinicSettlementBatchesList(branchId, { limit: 50 });
      setItems((res.items ?? []) as BatchItem[]);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load settlement batches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [branchId]);

  const handleGenerate = async () => {
    if (!branchId || !confirm("Generate settlement batches for the current cycle?")) return;
    try {
      setGenerating(true);
      setError("");
      await ownerClinicSettlementBatchesGenerate(branchId, {});
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to generate batches");
    } finally {
      setGenerating(false);
    }
  };

  const handleReview = async (batchId: number) => {
    if (!branchId) return;
    try {
      setActioning(batchId);
      await ownerClinicSettlementBatchReview(branchId, batchId);
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to review");
    } finally {
      setActioning(null);
    }
  };

  const handleApprove = async (batchId: number) => {
    if (!branchId || !confirm("Approve this batch for payment?")) return;
    try {
      setActioning(batchId);
      await ownerClinicSettlementBatchApprove(branchId, batchId);
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to approve");
    } finally {
      setActioning(null);
    }
  };

  const handlePay = async (batchId: number) => {
    if (!branchId) return;
    const amount = prompt("Payment amount (leave empty to use net payable):");
    const ref = prompt("Payment reference (optional):");
    try {
      setActioning(batchId);
      const batch = await ownerClinicSettlementBatchById(branchId, batchId) as { netPayable?: number };
      const payAmount = amount ? parseFloat(amount) : Number(batch?.netPayable ?? 0);
      await ownerClinicSettlementBatchPay(branchId, batchId, {
        amount: payAmount,
        paymentMethod: "BANK_TRANSFER",
        reference: ref ?? undefined,
      });
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to record payment");
    } finally {
      setActioning(null);
    }
  };

  if (!branchId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Settlement batches"
        subtitle={`Branch #${branchId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Settlement batches", href: `/owner/clinic/${branchId}/settlement-batches` },
        ]}
        actions={[
          <button
            key="generate"
            type="button"
            className="btn btn-primary radius-12"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "Generating…" : "Generate batches"}
          </button>,
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      <div className="card radius-12">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Doctor profile</th>
                    <th>Total accrued</th>
                    <th>Net payable</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-muted text-center py-4">
                        No settlement batches. Click &quot;Generate batches&quot; to create from pending ledger entries.
                      </td>
                    </tr>
                  ) : (
                    items.map((b) => (
                      <tr key={b.id}>
                        <td>
                          {b.periodStart ? new Date(b.periodStart).toLocaleDateString() : "—"} – {b.periodEnd ? new Date(b.periodEnd).toLocaleDateString() : "—"}
                        </td>
                        <td>#{b.clinicStaffProfileId ?? "—"}</td>
                        <td>{typeof b.totalAccrued === "number" ? b.totalAccrued : Number(b.totalAccrued ?? 0)}</td>
                        <td>{typeof b.netPayable === "number" ? b.netPayable : Number(b.netPayable ?? 0)}</td>
                        <td><span className={`badge radius-8 ${b.status === "PAID" ? "bg-success" : b.status === "APPROVED" ? "bg-info" : "bg-secondary"}`}>{b.status ?? "—"}</span></td>
                        <td className="text-end">
                          <Link href={`/owner/clinic/${branchId}/settlement-batches/${b.id}`} className="btn btn-sm btn-outline-secondary radius-12 me-1">View</Link>
                          {b.status === "DRAFT" && (
                            <button type="button" className="btn btn-sm btn-outline-primary radius-12 me-1" onClick={() => handleReview(b.id)} disabled={actioning === b.id}>
                              Review
                            </button>
                          )}
                          {(b.status === "DRAFT" || b.status === "UNDER_REVIEW") && (
                            <button type="button" className="btn btn-sm btn-outline-info radius-12 me-1" onClick={() => handleApprove(b.id)} disabled={actioning === b.id}>
                              Approve
                            </button>
                          )}
                          {b.status === "APPROVED" && (
                            <button type="button" className="btn btn-sm btn-success radius-12" onClick={() => handlePay(b.id)} disabled={actioning === b.id}>
                              Record payment
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <Link href={`/owner/clinic/${branchId}`} className="btn btn-outline-secondary radius-12">
          <i className="ri-arrow-left-line me-1" />
          Back to clinic
        </Link>
      </div>
    </div>
  );
}
