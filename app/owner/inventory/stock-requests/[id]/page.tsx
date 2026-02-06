"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function statusClass(s: string) {
  const u = (s || "").toUpperCase();
  if (["DRAFT"].includes(u)) return "bg-secondary";
  if (["SUBMITTED", "OWNER_REVIEW"].includes(u)) return "bg-info";
  if (["FULFILLED_PARTIAL", "FULFILLED_FULL", "DISPATCHED"].includes(u)) return "bg-primary";
  if (["RECEIVED_PARTIAL", "RECEIVED_FULL", "CLOSED"].includes(u)) return "bg-success";
  if (["CANCELLED"].includes(u)) return "bg-danger";
  return "bg-light text-dark";
}

type FulfillRow = { variantId: number; lotId: number; quantity: number; lotCode?: string; expDate?: string; onHandQty?: number };

export default function OwnerStockRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [request, setRequest] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [fromLocationId, setFromLocationId] = useState("");
  const [fulfillRows, setFulfillRows] = useState<FulfillRow[]>([]);
  const [extraFulfillRows, setExtraFulfillRows] = useState<FulfillRow[]>([]);
  const [addExtraVariantId, setAddExtraVariantId] = useState("");
  const [addExtraLots, setAddExtraLots] = useState<Array<{ lotId: number; lotCode?: string; expDate?: string; onHandQty: number; quantity: number }>>([]);
  const [addExtraLoading, setAddExtraLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lotsLoading, setLotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [declineSubmitting, setDeclineSubmitting] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declineSource, setDeclineSource] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setSuccess("");
    (async () => {
      try {
        const [locRes, reqRes] = await Promise.all([
          ownerGet("/api/v1/inventory/locations").catch(() => ({ data: [] })),
          ownerGet(`/api/v1/stock-requests/${id}`).catch(() => null),
        ]);
        if (cancelled) return;
        const locs = (locRes as any)?.data ?? [];
        setLocations(Array.isArray(locs) ? locs : []);
        const req = (reqRes as any)?.data ?? reqRes;
        setRequest(req);
        if (locs?.length && !fromLocationId) {
          setFromLocationId(String(locs[0]?.id ?? ""));
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!request?.availableLotsByVariant || !fromLocationId) return;
    const byVariant = request.availableLotsByVariant as Record<number, Array<{ lotId: number; lotCode: string; expDate: string; onHandQty: number }>>;
    const rows: FulfillRow[] = [];
    for (const item of request.items ?? []) {
      const vid = item.variantId;
      const lots = byVariant[vid] ?? [];
      for (const lot of lots) {
        if (lot.onHandQty > 0) {
          rows.push({
            variantId: vid,
            lotId: lot.lotId,
            quantity: 0,
            lotCode: lot.lotCode,
            expDate: lot.expDate,
            onHandQty: lot.onHandQty,
          });
        }
      }
    }
    setFulfillRows(rows.length ? rows : []);
  }, [request?.availableLotsByVariant, request?.items, fromLocationId]);

  const loadDetailWithLots = async (locId: string) => {
    if (!id || !locId) return;
    setLotsLoading(true);
    try {
      const res: any = await ownerGet(`/api/v1/stock-requests/${id}?fromLocationId=${locId}`);
      setRequest(res?.data ?? res);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load stock availability");
    } finally {
      setLotsLoading(false);
    }
  };

  useEffect(() => {
    if (!id || !fromLocationId) return;
    loadDetailWithLots(String(fromLocationId));
  }, [id, fromLocationId]);

  const setFulfillQty = (idx: number, qty: number) => {
    setFulfillRows((r) => r.map((row, i) => (i === idx ? { ...row, quantity: Math.max(0, qty) } : row)));
  };

  const setExtraFulfillQty = (idx: number, qty: number) => {
    setExtraFulfillRows((r) => r.map((row, i) => (i === idx ? { ...row, quantity: Math.max(0, qty) } : row)));
  };

  const loadFefoLotsForExtra = async () => {
    const vid = Number(addExtraVariantId);
    const locId = fromLocationId;
    if (!vid || !locId) {
      setError("Select from location and enter a variant ID.");
      return;
    }
    setAddExtraLoading(true);
    setError("");
    try {
      const res: any = await ownerGet(`/api/v1/inventory/fefo?locationId=${locId}&variantId=${vid}`);
      const data = res?.data ?? [];
      setAddExtraLots(
        (Array.isArray(data) ? data : []).map((x: any) => ({
          lotId: x.lotId ?? x.lot?.id,
          lotCode: x.lot?.lotCode ?? x.lotCode,
          expDate: x.lot?.expDate ?? x.expDate,
          onHandQty: x.availableQty ?? x.onHandQty ?? 0,
          quantity: 0,
        }))
      );
    } catch (e: any) {
      setError(e?.message ?? "Failed to load FEFO lots");
      setAddExtraLots([]);
    } finally {
      setAddExtraLoading(false);
    }
  };

  const addExtraToDispatch = () => {
    const vid = Number(addExtraVariantId);
    if (!vid) return;
    const toAdd = addExtraLots.filter((r) => r.quantity > 0).map((r) => ({
      variantId: vid,
      lotId: r.lotId,
      quantity: r.quantity,
      lotCode: r.lotCode,
      expDate: r.expDate,
      onHandQty: r.onHandQty,
    }));
    if (toAdd.length === 0) return;
    setExtraFulfillRows((prev) => [...prev, ...toAdd]);
    setAddExtraLots([]);
    setAddExtraVariantId("");
  };

  const setAddExtraLotQty = (idx: number, qty: number) => {
    setAddExtraLots((r) => r.map((row, i) => (i === idx ? { ...row, quantity: Math.max(0, qty) } : row)));
  };

  const branchLocations = request?.branch?.inventoryLocations ?? [];
  const toLocationId = branchLocations[0]?.id ?? "";
  const selectedQty = useMemo(
    () =>
      fulfillRows.reduce((sum, row) => sum + (row.quantity || 0), 0) +
      extraFulfillRows.reduce((sum, row) => sum + (row.quantity || 0), 0),
    [fulfillRows, extraFulfillRows]
  );
  const canDispatch = ["SUBMITTED", "OWNER_REVIEW"].includes(request?.status);
  const canDecline = canDispatch;

  const handleDecline = async () => {
    if (!request?.id) return;
    setDeclineSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res: any = await ownerPost(`/api/v1/stock-requests/${request.id}/decline`, {
        reason: declineReason.trim() || undefined,
        source: declineSource.trim() || undefined,
      });
      setSuccess("Request declined.");
      setShowDeclineForm(false);
      setDeclineReason("");
      setDeclineSource("");
      if (res?.data) setRequest(res.data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to decline");
    } finally {
      setDeclineSubmitting(false);
    }
  };

  const handleDispatch = async () => {
    if (!request || !canDispatch) {
      setError("Request is not in a state that can be dispatched");
      return;
    }
    const fromId = Number(fromLocationId);
    const toId = Number(toLocationId);
    if (!fromId || !toId) {
      setError("Select from and to locations");
      return;
    }
    const requestedItems = fulfillRows.filter((r) => r.quantity > 0).map((r) => ({ variantId: r.variantId, lotId: r.lotId, quantity: r.quantity }));
    const extraItems = extraFulfillRows.filter((r) => r.quantity > 0).map((r) => ({ variantId: r.variantId, lotId: r.lotId, quantity: r.quantity }));
    const items = [...requestedItems, ...extraItems];
    if (!items.length) {
      setError("Add at least one quantity to fulfill");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res: any = await ownerPost(`/api/v1/stock-requests/${request.id}/dispatch`, {
        fromLocationId: fromId,
        toLocationId: toId,
        items,
      });
      setSuccess("Dispatched and transfer created.");
      if (res?.data) setRequest(res.data?.request ?? res.data);
      await loadDetailWithLots(String(fromId));
    } catch (e: any) {
      setError(e?.message ?? "Failed to dispatch");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !request) {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title={`Stock Request #${id}`}
          breadcrumbs={[
            { label: "Home", href: "/owner" },
            { label: "Inventory", href: "/owner/inventory" },
            { label: "Stock Requests", href: "/owner/inventory/stock-requests" },
          ]}
        />
        {loading ? <p className="text-secondary">Loading...</p> : <p className="text-danger">Request not found.</p>}
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={`Stock Request #${request.id}`}
        subtitle="Review requested items, fulfill from batches, and dispatch"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Stock Requests", href: "/owner/inventory/stock-requests" },
          { label: `#${request.id}`, href: `/owner/inventory/stock-requests/${request.id}` },
        ]}
        actions={[
          <Link key="back" href="/owner/inventory/stock-requests" className="btn btn-outline-secondary btn-sm">
            ← Back to list
          </Link>,
        ]}
      />

      <div className="d-flex align-items-center gap-2 mb-3">
        <span className={`badge ${statusClass(request.status)}`}>{request.status}</span>
        {request.transfer && <span className="badge bg-light text-dark">Transfer #{request.transfer.id}</span>}
        {request.status === "CANCELLED" && (request as any).declineReason && (
          <span className="text-muted small">Reason: {(request as any).declineReason}</span>
        )}
      </div>

      {error && <div className="alert alert-danger radius-12">{error}</div>}
      {success && <div className="alert alert-success radius-12">{success}</div>}

      <div className="card radius-12 mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-sm-6">
              <p className="mb-1"><strong>Branch:</strong> {request.branch?.name ?? request.branchId}</p>
              <p className="mb-1"><strong>Submitted:</strong> {formatDate(request.submittedAt)}</p>
              <p className="mb-0"><strong>Created:</strong> {formatDate(request.createdAt)}</p>
            </div>
            <div className="col-sm-6">
              {request.transfer && (
                <>
                  <p className="mb-1"><strong>Transfer:</strong> #{request.transfer.id} — {request.transfer.status}</p>
                  {request.transfer.sentAt && <p className="mb-0 text-muted small">Sent: {formatDate(request.transfer.sentAt)}</p>}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card radius-12 mb-3">
        <div className="card-header">
          <h6 className="mb-0">Requested items</h6>
        </div>
        <div className="card-body p-0">
          <table className="table table-sm mb-0">
            <thead>
              <tr>
                <th>Product</th>
                <th>Variant</th>
                <th>Requested Qty</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {(request.items ?? []).map((item: any) => (
                <tr key={item.id}>
                  <td>{item.product?.name ?? item.productId}</td>
                  <td>{item.variant?.title ?? item.variant?.sku ?? item.variantId}</td>
                  <td>{item.requestedQty}</td>
                  <td>{item.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {canDispatch && (
        <div className="card radius-12">
          <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
            <h6 className="mb-0">Fulfill & Dispatch</h6>
            <div className="d-flex align-items-center gap-2">
              <span className="small text-secondary">Selected qty: {selectedQty}</span>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => loadDetailWithLots(String(fromLocationId))}
                disabled={lotsLoading}
              >
                {lotsLoading ? "Refreshing…" : "Reload availability"}
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <label className="form-label small">From location (your stock)</label>
                <select
                  className="form-select form-select-sm"
                  value={fromLocationId}
                  onChange={(e) => setFromLocationId(e.target.value)}
                >
                  <option value="">Select</option>
                  {locations.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>{loc.name ?? loc.type ?? loc.id}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label small">To location (branch)</label>
                <select className="form-select form-select-sm" value={toLocationId} disabled aria-readonly>
                  <option value={toLocationId}>{branchLocations[0]?.name ?? `Location ${toLocationId}`}</option>
                </select>
              </div>
            </div>
            <p className="small text-secondary mb-2">Set fulfill quantity per lot. Only rows with qty &gt; 0 will be dispatched.</p>
            <div className="table-responsive mb-3">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th>Lot</th>
                    <th>Expiry</th>
                    <th>Available</th>
                    <th>Fulfill Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {fulfillRows.map((row, idx) => {
                    const item = request.items?.find((i: any) => i.variantId === row.variantId);
                    const available = row.onHandQty ?? 0;
                    return (
                      <tr key={`${row.variantId}-${row.lotId}-${idx}`}>
                        <td>{item?.variant?.title ?? row.variantId}</td>
                        <td>{row.lotCode ?? row.lotId}</td>
                        <td>{row.expDate ? formatDate(row.expDate) : "—"}</td>
                        <td>{available}</td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            min={0}
                            max={available}
                            value={row.quantity}
                            onChange={(e) => setFulfillQty(idx, parseInt(e.target.value, 10) || 0)}
                            style={{ width: 80 }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {fulfillRows.length === 0 && fromLocationId && (
              <p className="small text-warning mb-2">No lot stock found at selected location for these variants. Add stock at this location or choose another.</p>
            )}

            {/* Add extra item (variant + FEFO lots) */}
            <div className="border-top pt-3 mt-3">
              <h6 className="mb-2">Add extra item (not requested)</h6>
              <div className="row g-2 mb-2">
                <div className="col-auto">
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="Variant ID"
                    value={addExtraVariantId}
                    onChange={(e) => setAddExtraVariantId(e.target.value)}
                    style={{ width: 100 }}
                  />
                </div>
                <div className="col-auto">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={loadFefoLotsForExtra}
                    disabled={addExtraLoading || !fromLocationId}
                  >
                    {addExtraLoading ? "Loading…" : "Load FEFO lots"}
                  </button>
                </div>
              </div>
              {addExtraLots.length > 0 && (
                <>
                  <div className="table-responsive mb-2">
                    <table className="table table-sm mb-0">
                      <thead>
                        <tr>
                          <th>Lot</th>
                          <th>Expiry</th>
                          <th>Available</th>
                          <th>Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {addExtraLots.map((lot, idx) => (
                          <tr key={lot.lotId}>
                            <td>{lot.lotCode ?? lot.lotId}</td>
                            <td className="text-muted small">{lot.expDate ? formatDate(lot.expDate) : "—"}</td>
                            <td>{lot.onHandQty}</td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                min={0}
                                max={lot.onHandQty}
                                value={lot.quantity}
                                onChange={(e) => setAddExtraLotQty(idx, parseInt(e.target.value, 10) || 0)}
                                style={{ width: 70 }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" className="btn btn-outline-primary btn-sm me-2" onClick={addExtraToDispatch}>
                    Add to dispatch
                  </button>
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setAddExtraLots([]); setAddExtraVariantId(""); }}>
                    Clear
                  </button>
                </>
              )}
              {extraFulfillRows.length > 0 && (
                <div className="mt-2">
                  <div className="small text-muted mb-1">Extra items in this dispatch:</div>
                  <div className="table-responsive">
                    <table className="table table-sm mb-0">
                      <thead>
                        <tr>
                          <th>Variant</th>
                          <th>Lot</th>
                          <th>Expiry</th>
                          <th>Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extraFulfillRows.map((row, idx) => (
                          <tr key={`extra-${row.variantId}-${row.lotId}-${idx}`}>
                            <td>{row.variantId}</td>
                            <td>{row.lotCode ?? row.lotId}</td>
                            <td className="text-muted small">{row.expDate ? formatDate(row.expDate) : "—"}</td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                min={0}
                                value={row.quantity}
                                onChange={(e) => setExtraFulfillQty(idx, parseInt(e.target.value, 10) || 0)}
                                style={{ width: 70 }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="d-flex flex-wrap gap-2 align-items-center mt-3">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={submitting || lotsLoading || (!fulfillRows.some((r) => r.quantity > 0) && !extraFulfillRows.some((r) => r.quantity > 0))}
                onClick={handleDispatch}
              >
                {submitting ? "Dispatching…" : "Fulfill & Dispatch"}
              </button>
              {canDecline && (
                <>
                  {!showDeclineForm ? (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setShowDeclineForm(true)}
                    >
                      Decline request
                    </button>
                  ) : (
                    <div className="d-inline-flex flex-column gap-2 p-2 border rounded">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Source (e.g. OUT_OF_STOCK)"
                        value={declineSource}
                        onChange={(e) => setDeclineSource(e.target.value)}
                      />
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        placeholder="Reason (optional)"
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                      />
                      <div className="d-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          disabled={declineSubmitting}
                          onClick={handleDecline}
                        >
                          {declineSubmitting ? "Declining…" : "Confirm decline"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => {
                            setShowDeclineForm(false);
                            setDeclineReason("");
                            setDeclineSource("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
