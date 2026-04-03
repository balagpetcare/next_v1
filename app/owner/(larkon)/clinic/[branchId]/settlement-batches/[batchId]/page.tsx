"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicSettlementBatchById,
  ownerClinicSettlementBatchReview,
  ownerClinicSettlementBatchApprove,
  ownerClinicSettlementBatchPay,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import ClinicConsoleTabs from "@/app/owner/_components/clinic/ClinicConsoleTabs";

export default function SettlementBatchDetailPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const batchId = params?.batchId as string | undefined;
  const [batch, setBatch] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioning, setActioning] = useState(false);

  useEffect(() => {
    if (!branchId || !batchId) return;
    let mounted = true;
    ownerClinicSettlementBatchById(branchId, batchId)
      .then((d) => { if (mounted) setBatch((d ?? null) as Record<string, unknown> | null); })
      .catch((e) => { if (mounted) setError((e as Error)?.message ?? "Failed to load"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [branchId, batchId]);

  const load = () => {
    if (!branchId || !batchId) return;
    ownerClinicSettlementBatchById(branchId, batchId)
      .then(setBatch as (d: unknown) => void)
      .catch(() => setBatch(null));
  };

  const handleReview = async () => {
    if (!branchId || !batchId) return;
    setActioning(true);
    try {
      await ownerClinicSettlementBatchReview(branchId, Number(batchId));
      load();
    } catch (e) {
      setError((e as Error)?.message ?? "Failed");
    } finally {
      setActioning(false);
    }
  };

  const handleApprove = async () => {
    if (!branchId || !batchId || !confirm("Approve this batch for payment?")) return;
    setActioning(true);
    try {
      await ownerClinicSettlementBatchApprove(branchId, Number(batchId));
      load();
    } catch (e) {
      setError((e as Error)?.message ?? "Failed");
    } finally {
      setActioning(false);
    }
  };

  const handlePay = async () => {
    if (!branchId || !batchId) return;
    const amount = prompt("Payment amount (leave empty to use net payable):");
    const ref = prompt("Payment reference (optional):");
    setActioning(true);
    try {
      const net = Number(batch?.netPayable ?? 0);
      const payAmount = amount?.trim() ? parseFloat(amount) : net;
      await ownerClinicSettlementBatchPay(branchId, Number(batchId), {
        amount: payAmount,
        paymentMethod: "BANK_TRANSFER",
        reference: ref?.trim() || undefined,
      });
      load();
    } catch (e) {
      setError((e as Error)?.message ?? "Failed");
    } finally {
      setActioning(false);
    }
  };

  if (!branchId || !batchId) {
    return <div className="dashboard-main-body"><div className="alert alert-warning radius-12">Invalid branch or batch.</div></div>;
  }
  if (loading && !batch) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12"><div className="card-body text-center py-5"><div className="spinner-border text-primary" /><p className="text-muted mt-2 mb-0">Loading…</p></div></div>
      </div>
    );
  }
  if (!batch) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Batch not found.</div>
        <Link href={`/owner/clinic/${branchId}/settlement-batches`} className="btn btn-outline-primary radius-12 mt-2">Back to batches</Link>
      </div>
    );
  }

  const status = String(batch.status ?? "");
  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={`Settlement batch #${batchId}`}
        subtitle={`Branch #${branchId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Settlement batches", href: `/owner/clinic/${branchId}/settlement-batches` },
          { label: `Batch #${batchId}`, href: `/owner/clinic/${branchId}/settlement-batches/${batchId}` },
        ]}
        actions={[
          <Link key="back" href={`/owner/clinic/${branchId}/settlement-batches`} className="btn btn-outline-secondary radius-12">Back to batches</Link>,
        ]}
      />
      <ClinicConsoleTabs branchId={branchId} />
      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      <div className="card radius-12">
        <div className="card-body p-24">
          <div className="d-flex flex-wrap gap-3 mb-3">
            <span><strong>Period</strong> {batch.periodStart ? new Date(String(batch.periodStart)).toLocaleDateString() : "—"} – {batch.periodEnd ? new Date(String(batch.periodEnd)).toLocaleDateString() : "—"}</span>
            <span><strong>Doctor profile</strong> #{String(batch.clinicStaffProfileId ?? "—")}</span>
            <span><strong>Total accrued</strong> {Number(batch.totalAccrued ?? 0)}</span>
            <span><strong>Net payable</strong> {Number(batch.netPayable ?? 0)}</span>
            <span className={`badge radius-8 ${status === "PAID" ? "bg-success" : status === "APPROVED" ? "bg-info" : "bg-secondary"}`}>{status || "—"}</span>
          </div>
          <div className="d-flex gap-2">
            {status === "DRAFT" && <button type="button" className="btn btn-primary radius-8" onClick={handleReview} disabled={actioning}>Review</button>}
            {(status === "DRAFT" || status === "UNDER_REVIEW") && <button type="button" className="btn btn-info radius-8" onClick={handleApprove} disabled={actioning}>Approve</button>}
            {status === "APPROVED" && <button type="button" className="btn btn-success radius-8" onClick={handlePay} disabled={actioning}>Record payment</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
