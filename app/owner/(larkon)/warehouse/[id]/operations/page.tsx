"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  warehouseById,
  warehouseOperationsSummary,
  warehouseOperationsInbound,
  warehouseOperationsRequisitions,
  warehouseOperationsOutbound,
  warehouseOperationsDiscrepancies,
  warehouseOperationsVisibility,
} from "@/lib/api";

function badge(status: string) {
  const u = (status || "").toUpperCase();
  if (["DRAFT", "CREATED"].includes(u)) return "bg-secondary";
  if (["SUBMITTED", "OWNER_REVIEW", "IN_TRANSIT", "PACKED"].includes(u)) return "bg-info text-dark";
  if (["APPROVED", "PARTIALLY_DISPATCHED"].includes(u)) return "bg-primary";
  if (["RECEIVED", "DELIVERED", "FULFILLED_FULL"].includes(u)) return "bg-success";
  if (["CANCELLED", "REJECTED", "FAILED"].includes(u)) return "bg-danger";
  return "bg-light text-dark";
}

export default function OwnerWarehouseOperationsPage() {
  const params = useParams();
  const warehouseId = Number(params?.id);

  const [wh, setWh] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [inbound, setInbound] = useState<any[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [outbound, setOutbound] = useState<any[]>([]);
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [riskTab, setRiskTab] = useState<"returns" | "recalls" | "near_expiry" | "expired" | "quarantine" | "writeoffs">("returns");
  const [riskRows, setRiskRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskLoading, setRiskLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCore = useCallback(async () => {
    if (!warehouseId) return;
    setLoading(true);
    setError(null);
    try {
      const [w, s, i, r, o, d] = await Promise.all([
        warehouseById(warehouseId),
        warehouseOperationsSummary(warehouseId),
        warehouseOperationsInbound(warehouseId, { page: 1, limit: 25 }),
        warehouseOperationsRequisitions(warehouseId, { page: 1, limit: 25 }),
        warehouseOperationsOutbound(warehouseId, { page: 1, limit: 25 }),
        warehouseOperationsDiscrepancies(warehouseId, { page: 1, limit: 25 }),
      ]);
      setWh(w);
      setSummary(s);
      setInbound(i.items || []);
      setRequisitions(r.items || []);
      setOutbound(o.items || []);
      setDiscrepancies(d.items || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load operations");
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    loadCore();
  }, [loadCore]);

  useEffect(() => {
    if (!warehouseId) return;
    let cancelled = false;
    setRiskLoading(true);
    warehouseOperationsVisibility(warehouseId, riskTab, { limit: 40 })
      .then((rows) => {
        if (!cancelled) setRiskRows(rows as any[]);
      })
      .catch(() => {
        if (!cancelled) setRiskRows([]);
      })
      .finally(() => {
        if (!cancelled) setRiskLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [warehouseId, riskTab]);

  if (!warehouseId) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-warning">Invalid warehouse</div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <Link href={`/owner/warehouse/${warehouseId}`} className="text-muted text-decoration-none small">
            ← Warehouse overview
          </Link>
          <h4 className="mb-0 mt-1">Warehouse operations</h4>
          <p className="text-muted small mb-0">
            {wh?.name ? <span className="fw-medium text-body">{wh.name}</span> : `Warehouse #${warehouseId}`}
            {" · "}
            Linked locations: {summary?.linkedLocationCount ?? "—"}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link href={`/owner/inventory/receipts?warehouseId=${warehouseId}`} className="btn btn-sm btn-outline-primary">
            All receipts (GRN)
          </Link>
          <Link href={`/owner/inventory/stock-requests`} className="btn btn-sm btn-outline-secondary">
            All stock requests
          </Link>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted small">Loading operational queues…</p>
        </div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && summary && (
        <>
          <div className="row g-2 mb-4">
            {[
              { k: "draftGrnCount", label: "Draft GRNs (inbound)" },
              { k: "requisitionQueueCount", label: "Open requisitions" },
              { k: "outboundPackOrCreateCount", label: "Outbound to pack/send" },
              { k: "inTransitFromWarehouseCount", label: "In transit (from hub)" },
              { k: "dispatchesWithLineDiscrepancyCount", label: "Dispatches w/ damage/short" },
              { k: "returnsInboundOpenCount", label: "Returns heading to hub" },
              { k: "activeRecallsWithStockAtWarehouseCount", label: "Active recalls (stock here)" },
              { k: "nearExpiryLotBalanceRows", label: "Near-expiry lot rows" },
              { k: "expiredOnHandLotBalanceRows", label: "Expired on-hand rows" },
              { k: "quarantineOnHandTotal", label: "Quarantine units (linked)" },
              { k: "expiryWriteOffsLast30d", label: "Expiry write-offs (30d)" },
            ].map((c) => (
              <div key={c.k} className="col-6 col-md-4 col-xl-3">
                <div className="card border h-100">
                  <div className="card-body py-2 px-3">
                    <div className="fs-5 fw-semibold">{summary[c.k] ?? 0}</div>
                    <div className="text-muted small">{c.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card border mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Inbound queue (draft GRNs at linked locations)</h6>
              <Link href={`/owner/inventory/receipts?warehouseId=${warehouseId}`} className="btn btn-sm btn-outline-primary">
                Open receipts
              </Link>
            </div>
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Vendor</th>
                    <th>Lines</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {inbound.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-muted text-center py-4">
                        No draft receipts. Vendor GRNs appear here until posted.
                      </td>
                    </tr>
                  ) : (
                    inbound.map((g: any) => (
                      <tr key={g.id}>
                        <td className="fw-medium">{g.id}</td>
                        <td>
                          <span className={`badge ${badge(g.status)}`}>{g.status}</span>
                        </td>
                        <td className="small">{g.location?.name ?? "—"}</td>
                        <td className="small">{g.vendor?.name ?? "—"}</td>
                        <td>{g.lines?.length ?? 0}</td>
                        <td className="text-muted small">{g.createdAt ? new Date(g.createdAt).toLocaleString() : "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card border mb-4">
            <div className="card-header">
              <h6 className="mb-0">Requisition queue (branch requests needing fulfillment)</h6>
            </div>
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Branch</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th>Dispatches</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {requisitions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-muted text-center py-4">
                        No open requisitions in this status set.
                      </td>
                    </tr>
                  ) : (
                    requisitions.map((req: any) => (
                      <tr key={req.id}>
                        <td className="fw-medium">{req.id}</td>
                        <td className="small">{req.branch?.name ?? "—"}</td>
                        <td>
                          <span className={`badge ${badge(req.status)}`}>{req.status}</span>
                        </td>
                        <td>{req._meta?.lineCount ?? req.items?.length ?? 0}</td>
                        <td>{req._meta?.dispatchCount ?? req.dispatches?.length ?? 0}</td>
                        <td className="text-muted small">{req.createdAt ? new Date(req.createdAt).toLocaleString() : "—"}</td>
                        <td>
                          <Link href={`/owner/inventory/stock-requests/${req.id}`} className="btn btn-sm btn-outline-primary">
                            Fulfill
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card border mb-4">
            <div className="card-header">
              <h6 className="mb-0">Outbound & fulfillment (from linked hub locations)</h6>
            </div>
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Dispatch</th>
                    <th>Status</th>
                    <th>To branch / loc</th>
                    <th>Request</th>
                    <th>Items</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {outbound.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-muted text-center py-4">
                        No active outbound dispatches from this warehouse.
                      </td>
                    </tr>
                  ) : (
                    outbound.map((d: any) => (
                      <tr key={d.id}>
                        <td className="fw-medium">{d.id}</td>
                        <td>
                          <span className={`badge ${badge(d.status)}`}>{d.status}</span>
                        </td>
                        <td className="small">
                          {d.toLocation?.name ?? "—"}
                          {d.toLocation?.branchId != null && (
                            <span className="text-muted"> · branch #{d.toLocation.branchId}</span>
                          )}
                        </td>
                        <td>{d.stockRequestId ?? "—"}</td>
                        <td>{d.items?.length ?? 0}</td>
                        <td>
                          {d.stockRequestId ? (
                            <Link
                              href={`/owner/inventory/stock-requests/${d.stockRequestId}/challan/${d.id}`}
                              className="btn btn-sm btn-outline-secondary"
                            >
                              Challan
                            </Link>
                          ) : (
                            <Link href={`/owner/warehouse/${warehouseId}/dispatches`} className="btn btn-sm btn-outline-secondary">
                              View
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card border mb-4">
            <div className="card-header">
              <h6 className="mb-0">Dispatch line discrepancies (damage / short recorded on receive)</h6>
            </div>
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Dispatch</th>
                    <th>Status</th>
                    <th>Route</th>
                    <th>Affected lines</th>
                  </tr>
                </thead>
                <tbody>
                  {discrepancies.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-muted text-center py-4">
                        No dispatches with damaged or short lines yet.
                      </td>
                    </tr>
                  ) : (
                    discrepancies.map((d: any) => {
                      const bad = (d.items || []).filter((it: any) => (it.quantityDamaged || 0) + (it.quantityShort || 0) > 0);
                      return (
                        <tr key={d.id}>
                          <td className="fw-medium">{d.id}</td>
                          <td>
                            <span className={`badge ${badge(d.status)}`}>{d.status}</span>
                          </td>
                          <td className="small">
                            {d.fromLocation?.name ?? "—"} → {d.toLocation?.name ?? "—"}
                          </td>
                          <td className="small">
                            {bad.map((it: any) => (
                              <div key={it.id}>
                                {it.variant?.sku ?? it.variantId}: D {it.quantityDamaged ?? 0}, S {it.quantityShort ?? 0}
                              </div>
                            ))}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="card-footer text-muted small">
              Branch receive is done under <strong>Staff → Receive stock</strong> (permission <code>inventory.receive</code>). Quantities flow into
              dispatch lines and GRN; discrepancies are written to the audit log.
            </div>
          </div>

          <div className="card border mb-4">
            <div className="card-header d-flex flex-wrap gap-2 align-items-center">
              <h6 className="mb-0 me-2">Risk &amp; visibility</h6>
              {(["returns", "recalls", "near_expiry", "expired", "quarantine", "writeoffs"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`btn btn-sm ${riskTab === t ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => setRiskTab(t)}
                >
                  {t.replace(/_/g, " ")}
                </button>
              ))}
            </div>
            <div className="card-body">
              {riskLoading && <p className="text-muted small mb-0">Loading…</p>}
              {!riskLoading && riskTab === "returns" && (
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Return</th>
                        <th>Status</th>
                        <th>From → To</th>
                        <th>Items</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-muted">
                            No stock returns targeting this warehouse.
                          </td>
                        </tr>
                      ) : (
                        riskRows.map((r: any) => (
                          <tr key={r.id}>
                            <td>{r.id}</td>
                            <td>
                              <span className={`badge ${badge(r.status)}`}>{r.status}</span>
                            </td>
                            <td className="small">
                              {r.fromLocation?.name} → {r.toLocation?.name}
                            </td>
                            <td>{r.items?.length ?? 0}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {!riskLoading && riskTab === "recalls" && (
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Recall</th>
                        <th>Severity</th>
                        <th>Lot</th>
                        <th>On hand (hub locs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-muted">
                            No active recalls with on-hand stock at linked locations.
                          </td>
                        </tr>
                      ) : (
                        riskRows.map((r: any) => (
                          <tr key={r.id}>
                            <td>{r.id}</td>
                            <td>{r.severity}</td>
                            <td className="small">{r.lot?.lotCode}</td>
                            <td className="small">
                              {(r.lot?.stockLotBalances || []).map((b: any) => (
                                <div key={b.locationId}>
                                  {b.location?.name}: {b.onHandQty}
                                </div>
                              ))}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {!riskLoading && (riskTab === "near_expiry" || riskTab === "expired") && (
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Location</th>
                        <th>Lot</th>
                        <th>Expiry</th>
                        <th>On hand</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-muted">
                            No rows in this bucket.
                          </td>
                        </tr>
                      ) : (
                        riskRows.map((row: any) => (
                          <tr key={`${row.locationId}-${row.lotId}`}>
                            <td className="small">{row.location?.name}</td>
                            <td className="small">{row.lot?.lotCode}</td>
                            <td className="small">{row.lot?.expDate ? new Date(row.lot.expDate).toLocaleDateString() : "—"}</td>
                            <td>{row.onHandQty}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {!riskLoading && riskTab === "quarantine" && (
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Location</th>
                        <th>SKU</th>
                        <th>On hand</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskRows.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-muted">
                            No quarantine locations linked to this warehouse, or no stock.
                          </td>
                        </tr>
                      ) : (
                        riskRows.map((row: any) => (
                          <tr key={`${row.locationId}-${row.variantId}`}>
                            <td className="small">{row.location?.name}</td>
                            <td className="small">{row.variant?.sku}</td>
                            <td>{row.onHandQty}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {!riskLoading && riskTab === "writeoffs" && (
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Location</th>
                        <th>Variant</th>
                        <th>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-muted">
                            No expiry write-off logs at linked locations.
                          </td>
                        </tr>
                      ) : (
                        riskRows.map((row: any) => (
                          <tr key={row.id}>
                            <td className="small">{row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}</td>
                            <td className="small">{row.location?.name}</td>
                            <td className="small">{row.variant?.sku}</td>
                            <td>{row.quantity}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="card-footer text-muted small">
              Owner tools:{" "}
              <Link href="/owner/inventory/expiry-management" className="text-decoration-none">
                Expiry management
              </Link>
              {" · "}
              <Link href="/owner/inventory/recalls" className="text-decoration-none">
                Recalls
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
