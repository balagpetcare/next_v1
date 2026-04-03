"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import {
  getReverseStockReturn,
  receiveReverseStockReturn,
  setStockReturnDisposition,
  disputeStockReturn,
} from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

const DISPOSITIONS = ["RESTOCK_SELLABLE", "RESTOCK_QUARANTINE", "RETURN_TO_VENDOR", "DESTROY", "REWORK"];

export default function StockReturnDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [row, setRow] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dispPick, setDispPick] = useState(DISPOSITIONS[0]);

  const load = useCallback(async () => {
    if (!orgId || !Number.isFinite(id)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getReverseStockReturn(id, orgId);
      const body = res as { data?: any } | null;
      setRow(body?.data ?? null);
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setLoading(false);
    }
  }, [orgId, id]);

  useEffect(() => {
    (async () => {
      const br = await fetch("/api/v1/owner/branches", { credentials: "include" }).then((r) => r.json());
      const rows = (br?.data ?? []) as { org?: { id: number } }[];
      setOrgId(rows[0]?.org?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (orgId) load();
  }, [orgId, load]);

  const items = row?.items ?? [];

  return (
    <div className="container-fluid py-4">
      <PageHeader title={`Stock return #${id}`} subtitle="Receive, inspect, disposition, or dispute." />
      <Link href="/owner/inventory/reverse-logistics" className="btn btn-link btn-sm px-0 mb-3">
        ← Reverse logistics
      </Link>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="text-muted">Loading…</p>}
      {!loading && row && (
        <>
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <div className="text-muted small">Status</div>
              <div className="fw-semibold">{row.status}</div>
            </div>
            <div className="col-md-4">
              <div className="text-muted small">Disposition</div>
              <div className="fw-semibold">{row.disposition ?? "—"}</div>
            </div>
            <div className="col-md-4">
              <div className="text-muted small">Route</div>
              <div className="small">
                {row.fromLocation?.name} → {row.toLocation?.name}
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-white fw-semibold">Lines</div>
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Returned</th>
                    <th>Received</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it: any) => (
                    <tr key={it.id}>
                      <td>
                        {it.variant?.sku} — {it.variant?.product?.name}
                      </td>
                      <td>{it.quantityReturned}</td>
                      <td>{it.quantityReceived}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {row.status !== "CANCELLED" && orgId != null && row.status !== "RECEIVED" && (
            <p className="small text-muted mb-2">Receive the return before applying a final disposition.</p>
          )}

          {row.status !== "CANCELLED" && orgId != null && (
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busy || row.status === "RECEIVED"}
                onClick={async () => {
                  if (!orgId) return;
                  if (!confirm("Mark this return as received at full declared quantities?")) return;
                  setBusy(true);
                  try {
                    const lines = items.map((it: any) => ({
                      itemId: it.id,
                      quantityReceived: it.quantityReturned,
                    }));
                    await receiveReverseStockReturn(id, { orgId, lines });
                    await load();
                  } catch (e) {
                    setError(getMessageFromApiError(e as Error));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Mark received (full qty)
              </button>
              <div className="d-flex align-items-center gap-1">
                <select
                  className="form-select form-select-sm"
                  style={{ width: "auto" }}
                  value={dispPick}
                  onChange={(e) => setDispPick(e.target.value)}
                  disabled={busy || row.status !== "RECEIVED"}
                >
                  {DISPOSITIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={busy || row.status !== "RECEIVED"}
                  onClick={async () => {
                    if (!orgId) return;
                    if (row.status !== "RECEIVED") return;
                    const destructive = dispPick === "DESTROY";
                    if (
                      !confirm(
                        destructive
                          ? `Confirm ${dispPick} — this disposition is destructive.`
                          : `Apply disposition ${dispPick}?`
                      )
                    ) {
                      return;
                    }
                    setBusy(true);
                    try {
                      await setStockReturnDisposition(id, { orgId, disposition: dispPick });
                      await load();
                    } catch (e) {
                      setError(getMessageFromApiError(e as Error));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Apply disposition
                </button>
              </div>
              <button
                type="button"
                className="btn btn-outline-warning btn-sm"
                disabled={busy}
                onClick={async () => {
                  if (!orgId) return;
                  if (!confirm("Open a dispute on this return?")) return;
                  setBusy(true);
                  try {
                    await disputeStockReturn(id, orgId, "Quantity or condition mismatch");
                    await load();
                  } catch (e) {
                    setError(getMessageFromApiError(e as Error));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Open dispute
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
