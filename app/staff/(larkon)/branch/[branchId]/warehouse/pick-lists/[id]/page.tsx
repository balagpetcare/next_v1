"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  pickListComplete,
  pickListGet,
  pickListHandoff,
  pickListStart,
  pickListUpdateLine,
  staffInventoryLocations,
  dispatchSend,
  dispatchPrintUrl,
} from "@/lib/api";
import StaffBranchLayout from "@/src/components/branch/StaffBranchLayout";
import { useBranchContext } from "@/lib/useBranchContext";
import { getWarehouseCapabilities } from "@/src/lib/warehouseRbac";
import WarehouseAccessFallback from "../../_components/WarehouseAccessFallback";

type PickLine = {
  id: number;
  quantityToPick: number;
  quantityPicked: number;
  variantId?: number;
  variant?: { sku?: string; title?: string; barcode?: string | null };
  location?: { id?: number; name?: string; zone?: { code?: string; name?: string } };
};

function normalizeScanToken(raw: string) {
  return raw.replace(/\u200b/g, "").trim();
}

function scanMatchesLine(token: string, line: PickLine): boolean {
  const t = normalizeScanToken(token).toLowerCase();
  if (t.length < 2) return false;
  const sku = String(line.variant?.sku || "").toLowerCase();
  const bc = String(line.variant?.barcode || "").toLowerCase();
  if (sku && sku === t) return true;
  if (bc && bc === t) return true;
  if (/^\d+$/.test(t) && bc) {
    const strip = (s: string) => s.replace(/^0+/, "") || "0";
    return strip(bc) === strip(t);
  }
  return false;
}

export default function StaffPickListDetailPage() {
  const params = useParams();
  const branchId = String(params?.branchId ?? "");
  const id = Number(params?.id);
  const { myAccess } = useBranchContext(branchId);
  const caps = getWarehouseCapabilities(myAccess?.permissions ?? []);
  const [pick, setPick] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [toLoc, setToLoc] = useState("");
  const [destLocations, setDestLocations] = useState<Array<{ id: number; name?: string; type?: string }>>([]);
  const [lineQty, setLineQty] = useState<Record<number, string>>({});
  const [scanInput, setScanInput] = useState("");
  const [highlightLineId, setHighlightLineId] = useState<number | null>(null);
  const lineRowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await pickListGet(id);
      setPick(data);
      const lines = (data as { lines?: PickLine[] })?.lines || [];
      const next: Record<number, string> = {};
      for (const l of lines) {
        next[l.id] = String(l.quantityPicked ?? 0);
      }
      setLineQty(next);
    } catch (e: any) {
      setError(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!caps.canViewPickLists) {
      setLoading(false);
      setError("");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, caps.canViewPickLists]);

  useEffect(() => {
    setToLoc("");
  }, [pick?.id]);

  useEffect(() => {
    const bid =
      pick?.allocationPlan?.stockRequest?.branchId ?? pick?.allocationPlan?.medicineRequisition?.branchId;
    const orgId = pick?.orgId;
    if (bid == null || orgId == null) {
      setDestLocations([]);
      return;
    }
    let cancelled = false;
    staffInventoryLocations({ orgId: Number(orgId) })
      .then((all) => {
        if (cancelled) return;
        const filtered = (all || []).filter(
          (l: { branch?: { id?: number }; isActive?: boolean }) =>
            l.branch != null && String(l.branch.id) === String(bid) && l.isActive !== false
        );
        const mapped = filtered.map((l: { id: number; name?: string; type?: string }) => ({
          id: l.id,
          name: l.name,
          type: l.type,
        }));
        setDestLocations(mapped);
        if (mapped.length === 1) {
          setToLoc(String(mapped[0].id));
        }
      })
      .catch(() => {
        if (!cancelled) setDestLocations([]);
      });
    return () => {
      cancelled = true;
    };
  }, [
    pick?.orgId,
    pick?.allocationPlan?.stockRequest?.branchId,
    pick?.allocationPlan?.medicineRequisition?.branchId,
    pick?.id,
  ]);

  const zoneGroups = useMemo(() => {
    const lines = (pick?.lines || []) as PickLine[];
    const m = new Map<string, PickLine[]>();
    for (const l of lines) {
      const z = l.location?.zone?.code || l.location?.zone?.name || "—";
      const k = String(z);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(l);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [pick]);

  async function handleStart() {
    setActing(true);
    setError("");
    try {
      await pickListStart(id);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed");
    } finally {
      setActing(false);
    }
  }

  async function handleComplete() {
    setActing(true);
    setError("");
    try {
      const lines = ((pick?.lines || []) as PickLine[]).map((l) => ({
        lineId: l.id,
        quantityPicked: Math.min(
          l.quantityToPick ?? 0,
          Math.max(0, parseInt(String(lineQty[l.id] ?? "0"), 10))
        ),
      }));
      await pickListComplete(id, (pick as { orgId?: number })?.orgId, { lines });
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed");
    } finally {
      setActing(false);
    }
  }

  async function saveLine(lineId: number, quantityToPick: number) {
    const raw = lineQty[lineId];
    const n = parseInt(String(raw), 10);
    if (!Number.isFinite(n) || n < 0 || n > quantityToPick) {
      setError(`Line ${lineId}: picked qty must be 0–${quantityToPick}`);
      return;
    }
    setActing(true);
    setError("");
    try {
      await pickListUpdateLine(id, lineId, { quantityPicked: n });
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed");
    } finally {
      setActing(false);
    }
  }

  function handleScanLookup() {
    const lines = (pick?.lines || []) as PickLine[];
    const hit = lines.find((l) => scanMatchesLine(scanInput, l));
    if (!hit) {
      setError("No line matches this SKU / barcode scan.");
      setHighlightLineId(null);
      return;
    }
    setError("");
    setHighlightLineId(hit.id);
    setScanInput("");
    const el = lineRowRefs.current[hit.id];
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleHandoff() {
    const trimmed = toLoc.trim();
    if (!trimmed || !Number.isFinite(Number(trimmed))) {
      setError("Select the destination receive location for the requester branch.");
      return;
    }
    setActing(true);
    setError("");
    try {
      await pickListHandoff(id, { toLocationId: Number(trimmed) });
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed");
    } finally {
      setActing(false);
    }
  }

  async function handleSendDispatch(dispatchDbId: number) {
    setActing(true);
    setError("");
    try {
      await dispatchSend(dispatchDbId);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to send dispatch");
    } finally {
      setActing(false);
    }
  }

  if (loading && !pick) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
          <p className="mt-2 text-muted">Loading pick list...</p>
        </div>
      </StaffBranchLayout>
    );
  }

  if (!pick) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <div className="alert alert-danger radius-12">{error || "Pick list not found"}</div>
        <Link href={`/staff/branch/${branchId}/warehouse/pick-lists`} className="btn btn-outline-secondary radius-12">← Back to Pick Lists</Link>
      </StaffBranchLayout>
    );
  }

  if (!caps.canViewPickLists) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <WarehouseAccessFallback
          branchId={branchId}
          title="Pick list permission required"
          message="You need pick list permission to access this page."
        />
      </StaffBranchLayout>
    );
  }

  const st = (pick.status || "").toUpperCase();
  const lines = (pick.lines || []) as PickLine[];
  const pendingSummary = lines.map((l) => ({
    id: l.id,
    to: l.quantityToPick,
    picked: parseInt(lineQty[l.id] ?? "0", 10) || 0,
  }));

  return (
    <StaffBranchLayout branchId={branchId} requiredPermission={null}>
      <Link href={`/staff/branch/${branchId}/warehouse/pick-lists`} className="text-muted text-decoration-none small">
        ← Pick lists
      </Link>
      <h4 className="mt-2 mb-2">
        Pick list #{pick.id}{" "}
        <span className="badge bg-secondary">{pick.status}</span>
      </h4>
      {pick.allocationPlan?.medicineRequisitionId && (
        <p className="small text-muted mb-2">
          Medicine requisition #{pick.allocationPlan.medicineRequisitionId}
          {pick.allocationPlan?.medicineRequisition?.requisitionNumber
            ? ` (${pick.allocationPlan.medicineRequisition.requisitionNumber})`
            : ""}
        </p>
      )}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card border mb-3">
        <div className="card-body d-flex flex-wrap gap-2">
          {st === "DRAFT" && (
            <button className="btn btn-sm btn-primary" disabled={acting} onClick={handleStart}>
              Start picking
            </button>
          )}
          {["DRAFT", "IN_PROGRESS"].includes(st) && (
            <button className="btn btn-sm btn-success" disabled={acting} onClick={handleComplete}>
              Complete pick (partial OK)
            </button>
          )}
          {st === "COMPLETED" && !pick.dispatch && (
            <div className="d-flex flex-column align-items-start gap-2">
              <div className="d-flex flex-wrap align-items-end gap-2">
                <select
                  className="form-select form-select-sm"
                  style={{ minWidth: 220, maxWidth: 360 }}
                  value={toLoc}
                  onChange={(e) => setToLoc(e.target.value)}
                  aria-label="Destination inventory location"
                >
                  <option value="">Select receive location…</option>
                  {destLocations.map((l) => (
                    <option key={l.id} value={String(l.id)}>
                      {l.name ?? `Location ${l.id}`}
                      {l.type ? ` (${l.type})` : ""}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-sm btn-dark"
                  disabled={acting || !toLoc.trim()}
                  title={!toLoc.trim() ? "Choose destination location" : ""}
                  onClick={handleHandoff}
                >
                  Handoff dispatch
                </button>
              </div>
              {destLocations.length === 0 &&
                (pick.allocationPlan?.stockRequest?.branchId != null ||
                  pick.allocationPlan?.medicineRequisition?.branchId != null) && (
                  <span className="small text-danger">
                    No active inventory locations found for the requester branch in this organization. Create at least one
                    active location for that branch (Owner / branch setup), then refresh.
                  </span>
                )}
            </div>
          )}
        </div>
      </div>

      {["DRAFT", "IN_PROGRESS"].includes(st) && lines.length > 0 && (
        <div className="alert alert-light border small mb-3 py-2">
          <strong>Review</strong>{" "}
          {pendingSummary.map((s) => (
            <span key={s.id} className="me-2">
              #{s.id}: {s.picked}/{s.to}
            </span>
          ))}
        </div>
      )}

      {["DRAFT", "IN_PROGRESS"].includes(st) && lines.length > 0 && (
        <div className="card border mb-3">
          <div className="card-body py-2 d-flex flex-wrap align-items-center gap-2">
            <span className="small text-muted me-1">Scan SKU or barcode</span>
            <input
              className="form-control form-control-sm"
              style={{ minWidth: 200, maxWidth: 360 }}
              placeholder="Scan or type, then Enter"
              autoComplete="off"
              inputMode="search"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleScanLookup();
                }
              }}
            />
            <button type="button" className="btn btn-sm btn-outline-primary" disabled={acting} onClick={handleScanLookup}>
              Find line
            </button>
            {highlightLineId != null && (
              <span className="small text-success">Highlighted line #{highlightLineId}</span>
            )}
          </div>
        </div>
      )}

      <div className="card border">
        <div className="card-header py-2">Lines (grouped by zone)</div>
        <div className="card-body p-0">
          {zoneGroups.map(([zoneKey, zlines]) => (
            <div key={zoneKey} className="border-bottom">
              <div className="px-3 py-2 bg-light small fw-semibold">Zone: {zoneKey}</div>
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr className="table-light">
                      <th>SKU</th>
                      <th>Bin / loc</th>
                      <th>To pick</th>
                      <th style={{ minWidth: 120 }}>Picked</th>
                      <th style={{ width: 90 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {zlines.map((l) => (
                      <tr
                        key={l.id}
                        ref={(el) => {
                          lineRowRefs.current[l.id] = el;
                        }}
                        className={highlightLineId === l.id ? "table-warning" : undefined}
                      >
                        <td className="small">{l.variant?.sku || l.variantId}</td>
                        <td className="small text-muted">{l.location?.name ?? "—"}</td>
                        <td>{l.quantityToPick}</td>
                        <td>
                          {["DRAFT", "IN_PROGRESS"].includes(st) ? (
                            <input
                              type="number"
                              min={0}
                              max={l.quantityToPick}
                              className="form-control form-control-sm"
                              inputMode="numeric"
                              value={lineQty[l.id] ?? "0"}
                              onChange={(e) => setLineQty((prev) => ({ ...prev, [l.id]: e.target.value }))}
                            />
                          ) : (
                            l.quantityPicked
                          )}
                        </td>
                        <td>
                          {["DRAFT", "IN_PROGRESS"].includes(st) && (
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              disabled={acting}
                              onClick={() => saveLine(l.id, l.quantityToPick)}
                            >
                              Save
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>

      {pick.dispatch && (
        <div className="card border mt-3">
          <div className="card-body">
            <h6 className="card-title mb-2">Dispatch #{pick.dispatch.id}</h6>
            <p className="small text-muted mb-2">
              Status: <span className="badge bg-secondary">{pick.dispatch.status}</span>
              {pick.dispatch.status === "IN_TRANSIT" && (
                <span className="ms-2">Branch can receive in Receive Center.</span>
              )}
              {(pick.dispatch.status === "CREATED" || pick.dispatch.status === "PACKED") && (
                <span className="ms-2">
                  Send dispatch to move stock out and mark <strong>IN_TRANSIT</strong> before the branch can receive.
                </span>
              )}
            </p>
            {(pick.dispatch.status === "CREATED" || pick.dispatch.status === "PACKED") && (
              <button
                type="button"
                className="btn btn-primary btn-sm me-2"
                disabled={acting}
                onClick={() => handleSendDispatch(pick.dispatch.id)}
              >
                Send dispatch (mark in transit)
              </button>
            )}
            {(caps.canViewPickLists || caps.canViewOperations) && (
              <div className="d-flex flex-wrap gap-2 mt-2">
                <a
                  href={dispatchPrintUrl(pick.dispatch.id, "challan")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-secondary btn-sm"
                >
                  Challan
                </a>
                <a
                  href={dispatchPrintUrl(pick.dispatch.id, "delivery-note")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-secondary btn-sm"
                >
                  Delivery note (carrier)
                </a>
                <a
                  href={dispatchPrintUrl(pick.dispatch.id, "branch-receiving-record")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-secondary btn-sm"
                >
                  Branch file copy
                </a>
                <a
                  href={dispatchPrintUrl(pick.dispatch.id, "branch-worksheet")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-secondary btn-sm"
                >
                  Receive worksheet
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </StaffBranchLayout>
  );
}
