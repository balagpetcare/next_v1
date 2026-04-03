"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { warehouseById, qcInspectionById, qcInspectionSubmit } from "@/lib/api";

export default function OwnerQcInspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const warehouseId = Number(params?.id);
  const inspectionId = Number(params?.inspectionId);
  const [wh, setWh] = useState<any>(null);
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passedQty, setPassedQty] = useState(0);
  const [failedQty, setFailedQty] = useState(0);
  const [disposition, setDisposition] = useState<string>("ACCEPT");
  const [quarantineLocationId, setQuarantineLocationId] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!warehouseId || !inspectionId) return;
    let cancelled = false;
    (async () => {
      try {
        const w = await warehouseById(warehouseId);
        const orgId = (w as any)?.orgId;
        if (!orgId) throw new Error("Missing org");
        const r = await qcInspectionById(inspectionId, orgId);
        if (cancelled) return;
        setWh(w);
        setRow(r);
        const exp = (r as any)?.expectedQty ?? 0;
        setPassedQty(exp);
        setFailedQty(0);
        if ((r as any)?.status !== "PENDING") {
          setError("This inspection is already complete.");
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [warehouseId, inspectionId]);

  const expected = row?.expectedQty ?? 0;

  function syncPassedFailed(nextP: number, nextF: number) {
    setPassedQty(nextP);
    setFailedQty(nextF);
    if (nextF === 0) setDisposition("ACCEPT");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const orgId = wh?.orgId;
    if (!orgId) return;
    if (passedQty + failedQty !== expected) {
      alert(`passedQty + failedQty must equal expected (${expected})`);
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
      router.push(`/owner/warehouse/${warehouseId}/qc`);
    } catch (e: any) {
      alert(e?.message || "Submit failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <Link href={`/owner/warehouse/${warehouseId}/qc`} className="text-muted small text-decoration-none">
        ← QC queue
      </Link>
      <h4 className="mt-2">QC inspection #{inspectionId}</h4>
      {error && <div className="alert alert-warning">{error}</div>}
      {row && (
        <div className="card border mb-3">
          <div className="card-body small">
            <div>
              <strong>Variant:</strong> {row.variant?.sku} — {row.variant?.title}
            </div>
            <div>
              <strong>Lot:</strong> {row.lot?.lotCode} (#{row.lotId})
            </div>
            <div>
              <strong>Expected:</strong> {expected} @ location #{row.locationId}
            </div>
          </div>
        </div>
      )}

      {row?.status === "PENDING" && (
        <form onSubmit={handleSubmit} className="card border">
          <div className="card-header">
            <h6 className="mb-0">Record inspection</h6>
          </div>
          <div className="card-body vstack gap-3">
            <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label small">Passed qty</label>
                <input
                  type="number"
                  min={0}
                  max={expected}
                  className="form-control form-control-sm"
                  value={passedQty}
                  onChange={(e) => {
                    const p = Math.min(expected, Math.max(0, Number(e.target.value)));
                    syncPassedFailed(p, expected - p);
                  }}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Failed qty</label>
                <input
                  type="number"
                  min={0}
                  max={expected}
                  className="form-control form-control-sm"
                  value={failedQty}
                  onChange={(e) => {
                    const f = Math.min(expected, Math.max(0, Number(e.target.value)));
                    syncPassedFailed(expected - f, f);
                  }}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Disposition (when failed &gt; 0)</label>
                <select
                  className="form-select form-select-sm"
                  value={disposition}
                  onChange={(e) => setDisposition(e.target.value)}
                  disabled={failedQty === 0}
                >
                  <option value="ACCEPT">ACCEPT</option>
                  <option value="QUARANTINE">QUARANTINE</option>
                  <option value="REJECT">REJECT (loss at dock)</option>
                  <option value="RETURN_TO_VENDOR">RETURN_TO_VENDOR</option>
                </select>
              </div>
            </div>
            {disposition === "QUARANTINE" && failedQty > 0 && (
              <div>
                <label className="form-label small">Quarantine location ID (QUARANTINE or DAMAGE_AREA)</label>
                <input
                  className="form-control form-control-sm"
                  value={quarantineLocationId}
                  onChange={(e) => setQuarantineLocationId(e.target.value)}
                  placeholder="e.g. branch quarantine bin"
                />
              </div>
            )}
            <div>
              <label className="form-label small">Failure reason</label>
              <textarea className="form-control form-control-sm" rows={2} value={failureReason} onChange={(e) => setFailureReason(e.target.value)} />
            </div>
            <div>
              <label className="form-label small">Note</label>
              <textarea className="form-control form-control-sm" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              Submit inspection
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
