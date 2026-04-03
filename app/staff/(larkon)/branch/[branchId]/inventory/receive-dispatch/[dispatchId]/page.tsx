"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  dispatchDiscrepanciesList,
  dispatchDiscrepancyCreate,
  staffGetDispatch,
  staffReceiveDispatch,
} from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

export default function StaffReceiveDispatchPage() {
  const params = useParams();
  const branchId = String(params?.branchId ?? "");
  const dispatchId = String(params?.dispatchId ?? "");
  const toast = useToast();
  const [dispatch, setDispatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [discRows, setDiscRows] = useState<any[]>([]);
  const [reasonCode, setReasonCode] = useState("SHORT_SHIP");
  const [discQty, setDiscQty] = useState(1);
  const [discVariantId, setDiscVariantId] = useState<number | "">("");
  const [discLotId, setDiscLotId] = useState<number | "">("");

  const load = useCallback(async () => {
    if (!dispatchId) return;
    setLoading(true);
    setError(null);
    try {
      const d = await staffGetDispatch(dispatchId);
      const raw = (d as any)?.data ?? d;
      setDispatch(raw);
      const firstLine = Array.isArray(raw?.items) ? raw.items[0] : null;
      if (firstLine?.variantId) setDiscVariantId(Number(firstLine.variantId));
      if (firstLine?.lotId) setDiscLotId(Number(firstLine.lotId));
      const dr = await dispatchDiscrepanciesList(Number(dispatchId)).catch(() => []);
      setDiscRows(Array.isArray(dr) ? dr : []);
    } catch (e: any) {
      setError(getMessageFromApiError(e));
    } finally {
      setLoading(false);
    }
  }, [dispatchId]);

  useEffect(() => {
    load();
  }, [load]);

  const items = Array.isArray(dispatch?.items) ? dispatch.items : [];

  return (
    <div className="container-fluid py-4">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item">
            <Link href={`/staff/branch/${branchId}/inventory`}>Inventory</Link>
          </li>
          <li className="breadcrumb-item active">Dispatch #{dispatchId}</li>
        </ol>
      </nav>

      {loading && <div className="placeholder-glow py-5"><div className="placeholder col-12" /></div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && dispatch && (
        <>
          <div className="d-flex flex-wrap gap-2 mb-3">
            <h4 className="mb-0">Receive dispatch</h4>
            <span className="badge bg-info text-dark">{dispatch.status}</span>
          </div>

          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <p className="small text-muted mb-2">
                From: {dispatch.fromLocation?.name ?? dispatch.fromLocationId} → To:{" "}
                {dispatch.toLocation?.name ?? dispatch.toLocationId}
              </p>
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Variant</th>
                      <th>Dispatched</th>
                      <th>Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it: any) => (
                      <tr key={it.id}>
                        <td>{it.variant?.sku ?? it.variantId}</td>
                        <td>{it.quantityDispatched}</td>
                        <td>{it.quantityReceived}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                className="btn btn-primary mt-3"
                disabled={submitting || dispatch.status !== "IN_TRANSIT"}
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    const body = {
                      items: items.map((it: any) => ({
                        variantId: it.variantId,
                        lotId: it.lotId,
                        quantityReceived: Math.max(0, it.quantityDispatched - it.quantityReceived),
                        quantityDamaged: 0,
                        quantityShort: 0,
                      })),
                    };
                    await staffReceiveDispatch(dispatchId, body);
                    toast.success("Receive recorded");
                    await load();
                  } catch (e: any) {
                    toast.error(getMessageFromApiError(e));
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                Receive remaining (full)
              </button>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white">
              <strong>Report discrepancy</strong>
            </div>
            <div className="card-body">
              <div className="row g-2 align-items-end">
                <div className="col-md-3">
                  <label className="form-label small">Reason</label>
                  <input
                    className="form-control form-control-sm"
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label small">Qty</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={discQty}
                    min={1}
                    onChange={(e) => setDiscQty(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label small">Variant ID</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={discVariantId === "" ? "" : discVariantId}
                    onChange={(e) => setDiscVariantId(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label small">Lot ID</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={discLotId === "" ? "" : discLotId}
                    onChange={(e) => setDiscLotId(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                  />
                </div>
                <div className="col-md-3">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-warning"
                    disabled={discVariantId === ""}
                    onClick={async () => {
                      try {
                        await dispatchDiscrepancyCreate(Number(dispatchId), {
                          variantId: Number(discVariantId),
                          lotId: discLotId === "" ? undefined : Number(discLotId),
                          reasonCode,
                          quantity: discQty,
                        });
                        toast.success("Discrepancy logged");
                        await load();
                      } catch (e: any) {
                        toast.error(getMessageFromApiError(e));
                      }
                    }}
                  >
                    Log discrepancy
                  </button>
                </div>
              </div>

              {discRows.length > 0 && (
                <ul className="list-group list-group-flush mt-3">
                  {discRows.map((r: any) => (
                    <li key={r.id} className="list-group-item px-0 small">
                      #{r.id} {r.reasonCode} × {r.quantity}{" "}
                      <span className="text-muted">({r.status})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
