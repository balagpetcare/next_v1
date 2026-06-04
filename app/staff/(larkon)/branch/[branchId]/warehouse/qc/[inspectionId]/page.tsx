"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { warehouseAccessible, qcInspectionById, qcInspectionSubmit } from "@/lib/api";
import StaffBranchLayout from "@/src/components/branch/StaffBranchLayout";
import { useBranchContext } from "@/lib/useBranchContext";
import { getWarehouseCapabilities } from "@/src/lib/warehouseRbac";
import WarehouseAccessFallback from "../../_components/WarehouseAccessFallback";

export default function StaffQcInspectionDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const branchId = String(params?.branchId ?? "");
  const inspectionId = Number(params?.inspectionId);
  const whQ = searchParams.get("wh");
  const { myAccess } = useBranchContext(branchId);
  const caps = getWarehouseCapabilities(myAccess?.permissions ?? []);

  const [orgId, setOrgId] = useState<number | null>(null);
  const [whId, setWhId] = useState<number | null>(null);
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passedQty, setPassedQty] = useState(0);
  const [failedQty, setFailedQty] = useState(0);
  const [disposition, setDisposition] = useState("ACCEPT");
  const [quarantineLocationId, setQuarantineLocationId] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!caps.canViewQc) {
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await warehouseAccessible().catch(() => []);
        const arr = (Array.isArray(list) ? list : []) as Array<{ id: number; orgId?: number }>;
        const fromQ = whQ ? Number(whQ) : null;
        const pick =
          (fromQ && arr.some((w) => Number(w.id) === fromQ) ? fromQ : null) ??
          (arr[0]?.id ? Number(arr[0].id) : null);
        const w = arr.find((x) => Number(x.id) === pick);
        if (!w?.orgId) throw new Error("No warehouse context");
        if (cancelled) return;
        setOrgId(w.orgId);
        setWhId(pick);
        const r = await qcInspectionById(inspectionId, w.orgId);
        if (cancelled) return;
        setRow(r);
        const exp = (r as any)?.expectedQty ?? 0;
        setPassedQty(exp);
        setFailedQty(0);
        if ((r as any)?.status !== "PENDING") setError("Already complete.");
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inspectionId, whQ, caps.canViewQc]);

  const expected = row?.expectedQty ?? 0;

  function syncPassedFailed(nextP: number, nextF: number) {
    setPassedQty(nextP);
    setFailedQty(nextF);
    if (nextF === 0) setDisposition("ACCEPT");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    if (passedQty + failedQty !== expected) {
      alert(`passed + failed must equal ${expected}`);
      return;
    }
    setSaving(true);
    try {
      await qcInspectionSubmit(inspectionId, orgId, {
        inspectedQty: expected,
        passedQty,
        failedQty,
        disposition,
        quarantineLocationId: disposition === "QUARANTINE" ? Number(quarantineLocationId) || null : null,
        failureReason: failureReason || null,
        note: note || null,
      });
      window.location.href = `/staff/branch/${branchId}/warehouse/qc${whId ? `?wh=${whId}` : ""}`;
    } catch (e: any) {
      alert(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
          <p className="mt-2 text-muted">Loading QC inspection...</p>
        </div>
      </StaffBranchLayout>
    );
  }

  if (!caps.canViewQc) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <WarehouseAccessFallback
          branchId={branchId}
          title="QC permission required"
          message="Inspection details are available to quality-control roles only."
        />
      </StaffBranchLayout>
    );
  }

  return (
    <StaffBranchLayout branchId={branchId} requiredPermission={null}>
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
        <div>
          <nav aria-label="breadcrumb" className="mb-2">
            <ol className="breadcrumb mb-0 small">
              <li className="breadcrumb-item"><Link href="/staff">Staff</Link></li>
              <li className="breadcrumb-item"><Link href="/staff/branch">Branches</Link></li>
              <li className="breadcrumb-item"><Link href={`/staff/branch/${branchId}`}>Branch #{branchId}</Link></li>
              <li className="breadcrumb-item"><Link href={`/staff/branch/${branchId}/warehouse`}>Warehouse</Link></li>
              <li className="breadcrumb-item"><Link href={`/staff/branch/${branchId}/warehouse/qc${whId ? `?wh=${whId}` : ""}`}>QC Queue</Link></li>
              <li className="breadcrumb-item active">QC #{inspectionId}</li>
            </ol>
          </nav>
          <h5 className="mb-1 fw-semibold">QC Inspection #{inspectionId}</h5>
          <p className="text-muted small mb-0">Quality control inspection details and actions.</p>
        </div>
      </div>
      {error && <div className="alert alert-warning">{error}</div>}
      {row && (
        <div className="card border mb-3">
          <div className="card-body small">
            <div>
              SKU {row.variant?.sku} — Lot {row.lot?.lotCode} — Expected {expected}
            </div>
          </div>
        </div>
      )}
      {row?.status === "PENDING" && (
        <form onSubmit={handleSubmit} className="card border">
          <div className="card-body vstack gap-2">
            <div className="row g-2">
              <div className="col-4">
                <label className="form-label small">Passed</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  min={0}
                  max={expected}
                  value={passedQty}
                  onChange={(e) => {
                    const p = Math.min(expected, Math.max(0, Number(e.target.value)));
                    syncPassedFailed(p, expected - p);
                  }}
                />
              </div>
              <div className="col-4">
                <label className="form-label small">Failed</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  min={0}
                  max={expected}
                  value={failedQty}
                  onChange={(e) => {
                    const f = Math.min(expected, Math.max(0, Number(e.target.value)));
                    syncPassedFailed(expected - f, f);
                  }}
                />
              </div>
              <div className="col-4">
                <label className="form-label small">Disposition</label>
                <select
                  className="form-select form-select-sm"
                  value={disposition}
                  disabled={failedQty === 0}
                  onChange={(e) => setDisposition(e.target.value)}
                >
                  <option value="ACCEPT">ACCEPT</option>
                  <option value="QUARANTINE">QUARANTINE</option>
                  <option value="REJECT">REJECT</option>
                  <option value="RETURN_TO_VENDOR">RETURN_TO_VENDOR</option>
                </select>
              </div>
            </div>
            {disposition === "QUARANTINE" && failedQty > 0 && (
              <input
                className="form-control form-control-sm"
                placeholder="Quarantine location ID"
                value={quarantineLocationId}
                onChange={(e) => setQuarantineLocationId(e.target.value)}
              />
            )}
            <textarea
              className="form-control form-control-sm"
              placeholder="Failure reason"
              rows={2}
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              Submit
            </button>
          </div>
        </form>
      )}
    </StaffBranchLayout>
  );
}
