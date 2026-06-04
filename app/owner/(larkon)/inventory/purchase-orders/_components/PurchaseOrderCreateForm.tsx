"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { getProcurementDemand, getStockRequest, ownerGet } from "@/app/owner/_lib/ownerApi";
import { Modal } from "react-bootstrap";
import { purchaseOrderCreate } from "@/lib/api";
import {
  getEligibleStockRequestLinesForPoPrefill,
  mapEligibleStockRequestItemsToPoPrefillPatches,
  parseOwnerStockRequestPrefillId,
  stockRequestDetailFromOwnerGetBody,
} from "@/lib/stockRequestPoPrefill";
import type { VariantOption } from "../../receipts/bulk/types";
import { POProductPicker } from "./POProductPicker";

type Org = { id: number; name?: string };
type WarehouseRow = { id: number; name: string };
type VendorPick = { id: number; name: string; code?: string; phone?: string };

type LineDraft = {
  key: string;
  variantId: number | null;
  sku: string;
  title: string;
  productLabel: string;
  orderedQty: string;
  unitCost: string;
  note: string;
};

function newLine(): LineDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    variantId: null,
    sku: "",
    title: "",
    productLabel: "",
    orderedQty: "1",
    unitCost: "",
    note: "",
  };
}

function VariantSearchInput({
  line,
  onPick,
  disabled,
  orgId,
}: {
  line: LineDraft;
  onPick: (v: VariantOption) => void;
  disabled?: boolean;
  orgId?: number | null;
}) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<VariantOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOpts = useCallback(async (term: string) => {
    if (!term.trim() || term.trim().length < 2) {
      setOpts([]);
      return;
    }
    setLoading(true);
    try {
      const orgQ =
        orgId != null && Number.isFinite(orgId) ? `&orgId=${encodeURIComponent(String(orgId))}` : "";
      const res = await ownerGet<{ data?: VariantOption[] }>(
        `/api/v1/inventory/variants/search?q=${encodeURIComponent(term.trim())}&limit=30${orgQ}`
      );
      setOpts(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setOpts([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!open) return;
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => {
      fetchOpts(q);
      tRef.current = null;
    }, 280);
    return () => {
      if (tRef.current) clearTimeout(tRef.current);
    };
  }, [q, open, fetchOpts]);

  if (line.variantId != null && !changing) {
    return (
      <div className="d-flex align-items-start gap-2 flex-wrap">
        <div className="small">
          <span className="fw-semibold">{line.sku || "—"}</span>
          <span className="text-muted ms-1">{line.title}</span>
        </div>
        <button
          type="button"
          className="btn btn-link btn-sm p-0 text-decoration-none"
          disabled={disabled}
          onClick={() => {
            setChanging(true);
            setQ("");
            setOpts([]);
            setOpen(true);
          }}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="position-relative">
      <input
        type="text"
        className="form-control form-control-sm"
        placeholder="Search SKU / product (min 2 chars)…"
        disabled={disabled}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && (
        <ul
          className="list-group position-absolute w-100 mt-1 shadow-sm"
          style={{ zIndex: 1050, maxHeight: 220, overflowY: "auto" }}
        >
          {loading && <li className="list-group-item text-muted small">Searching…</li>}
          {!loading && opts.length === 0 && q.trim().length >= 2 && (
            <li className="list-group-item text-muted small">No variants</li>
          )}
          {!loading &&
            opts.map((v) => (
              <li
                key={v.id}
                className="list-group-item list-group-item-action py-2 small"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(v);
                  setQ("");
                  setOpen(false);
                  setChanging(false);
                }}
              >
                <span className="fw-semibold">{v.sku}</span>
                <span className="text-muted ms-1">{v.title}</span>
                <div className="text-muted text-truncate" style={{ maxWidth: "100%" }}>
                  {v.product?.name ?? ""}
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

type SourceRequestMeta = {
  id: number;
  status: string;
  requestIntent?: string;
  eligibleLineCount: number;
  totalLineCount: number;
};

export default function PurchaseOrderCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromProcurementDemandId = searchParams.get("fromProcurementDemand");
  const fromRequestId = searchParams.get("fromRequestId");
  const procurementPrefillDoneRef = useRef(false);
  /** Invalidates in-flight stock-request prefill when the query param changes or is cleared. */
  const requestPrefillSeqRef = useRef(0);
  const [sourceRequest, setSourceRequest] = useState<SourceRequestMeta | null>(null);
  const [requestPrefillError, setRequestPrefillError] = useState("");

  const fromRequestIdParsed = useMemo(() => parseOwnerStockRequestPrefillId(fromRequestId), [fromRequestId]);

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [vendor, setVendor] = useState<VendorPick | null>(null);
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [currency, setCurrency] = useState("");
  const [notes, setNotes] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [newLine()]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorModalQ, setVendorModalQ] = useState("");
  const [vendorModalOpts, setVendorModalOpts] = useState<VendorPick[]>([]);
  const [vendorModalLoading, setVendorModalLoading] = useState(false);

  const [showWhModal, setShowWhModal] = useState(false);
  const [whFilter, setWhFilter] = useState("");

  const [pickerCollapsed, setPickerCollapsed] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoadingMeta(true);
      try {
        const res = await ownerGet<{ success?: boolean; data?: Org[] }>("/api/v1/owner/organizations");
        if (c) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        setOrgs(list);
        if (list[0]?.id) setOrgId(list[0].id);
      } catch {
        if (!c) setOrgs([]);
      } finally {
        if (!c) setLoadingMeta(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  useEffect(() => {
    setVendor(null);
    setWarehouseId("");
  }, [orgId]);

  useEffect(() => {
    if (orgId == null) {
      setWarehouses([]);
      return;
    }
    let c = false;
    (async () => {
      try {
        const res = await ownerGet<{ data?: WarehouseRow[] }>(`/api/v1/warehouse?orgId=${orgId}`);
        if (!c) setWarehouses(Array.isArray(res?.data) ? res.data : []);
      } catch {
        if (!c) setWarehouses([]);
      }
    })();
    return () => {
      c = true;
    };
  }, [orgId]);

  /** Pre-fill one line from procurement demand (central warehouse shortage → PO). */
  useEffect(() => {
    if (fromRequestId?.trim()) return;
    if (!fromProcurementDemandId || orgId == null || loadingMeta || procurementPrefillDoneRef.current) return;
    const demandId = Number(fromProcurementDemandId);
    if (!Number.isFinite(demandId) || demandId < 1) return;
    procurementPrefillDoneRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const res = await getProcurementDemand(demandId, orgId);
        const envelope = res as { data?: any } | null;
        const row = envelope?.data ?? res;
        if (cancelled || !row?.variantId) return;
        const v = row.variant || {};
        const productName = v.product?.name ?? "";
        const remaining = Math.max(1, Number(row.demandQty || 1) - Number(row.fulfilledQty || 0));
        const line: LineDraft = {
          ...newLine(),
          variantId: row.variantId,
          sku: v.sku || "",
          title: v.title || "",
          productLabel: productName,
          orderedQty: String(remaining),
          unitCost: "",
          note: row.stockRequestId
            ? `Procurement demand #${demandId} (stock request #${row.stockRequestId})`
            : `Procurement demand #${demandId}`,
        };
        setLines([line]);
      } catch {
        procurementPrefillDoneRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fromProcurementDemandId, fromRequestId, orgId, loadingMeta]);

  /** Clear request-prefill UI state when the query param is removed (client navigation). */
  useEffect(() => {
    if (!fromRequestId?.trim()) {
      requestPrefillSeqRef.current += 1;
      setSourceRequest(null);
      setRequestPrefillError("");
    }
  }, [fromRequestId]);

  /** Pre-fill lines from stock request (procurement intent or replenishment). */
  useEffect(() => {
    if (!fromRequestId?.trim()) return;
    if (!fromRequestIdParsed.ok) {
      requestPrefillSeqRef.current += 1;
      setSourceRequest(null);
      setRequestPrefillError("Invalid stock request id in URL");
      setLines([newLine()]);
      return;
    }
    if (loadingMeta) return;

    const reqId = fromRequestIdParsed.id;
    requestPrefillSeqRef.current += 1;
    const seq = requestPrefillSeqRef.current;
    let cancelled = false;

    (async () => {
      try {
        const res = await getStockRequest(reqId);
        if (cancelled || seq !== requestPrefillSeqRef.current) return;
        if (res == null) {
          setSourceRequest(null);
          setRequestPrefillError(`Stock request #${reqId} not found or not accessible`);
          setLines([newLine()]);
          return;
        }
        const req = stockRequestDetailFromOwnerGetBody(res);
        if (!req?.id) {
          setSourceRequest(null);
          setRequestPrefillError(`Stock request #${reqId} not found or not accessible`);
          setLines([newLine()]);
          return;
        }
        const rid = Number(req.id);
        if (!Number.isFinite(rid) || rid < 1) {
          setSourceRequest(null);
          setRequestPrefillError(`Stock request #${reqId} not found or not accessible`);
          setLines([newLine()]);
          return;
        }
        const status = typeof req.status === "string" ? req.status : "";
        const requestIntent = typeof req.requestIntent === "string" ? req.requestIntent : undefined;
        const { allItems, eligible } = getEligibleStockRequestLinesForPoPrefill(req.items);
        setSourceRequest({
          id: rid,
          status,
          requestIntent,
          eligibleLineCount: eligible.length,
          totalLineCount: allItems.length,
        });
        setRequestPrefillError("");
        if (eligible.length === 0) {
          setRequestPrefillError(
            allItems.length > 0
              ? "All request lines are already fulfilled, cancelled, or have no remaining quantity."
              : "This stock request has no line items."
          );
          setLines([newLine()]);
          return;
        }
        const patches = mapEligibleStockRequestItemsToPoPrefillPatches(eligible, rid);
        const prefillLines: LineDraft[] = patches.map((p) => ({ ...newLine(), ...p }));
        setLines(prefillLines);
      } catch (err: unknown) {
        if (cancelled || seq !== requestPrefillSeqRef.current) return;
        setSourceRequest(null);
        setLines([newLine()]);
        const msg = err instanceof Error ? err.message : "Failed to load stock request";
        setRequestPrefillError(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fromRequestId, fromRequestIdParsed, loadingMeta]);

  useEffect(() => {
    if (!showVendorModal || orgId == null) return;
    let cancelled = false;
    const t = setTimeout(() => {
      (async () => {
        setVendorModalLoading(true);
        try {
          const params = new URLSearchParams({ orgId: String(orgId), limit: "50", status: "ACTIVE" });
          if (vendorModalQ.trim()) params.set("q", vendorModalQ.trim());
          const res = await ownerGet<{ data?: VendorPick[] }>(`/api/v1/vendors/lookup?${params}`);
          if (!cancelled) setVendorModalOpts(Array.isArray(res?.data) ? res.data : []);
        } catch {
          if (!cancelled) setVendorModalOpts([]);
        } finally {
          if (!cancelled) setVendorModalLoading(false);
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [showVendorModal, orgId, vendorModalQ]);


  const filteredWarehouses = useMemo(() => {
    const t = whFilter.trim().toLowerCase();
    if (!t) return warehouses;
    return warehouses.filter((w) => w.name.toLowerCase().includes(t));
  }, [warehouses, whFilter]);

  const totals = useMemo(() => {
    let sub = 0;
    let qty = 0;
    for (const l of lines) {
      const q = parseInt(l.orderedQty, 10);
      const u = parseFloat(l.unitCost);
      if (Number.isFinite(q) && q > 0) qty += q;
      if (Number.isFinite(q) && q > 0 && Number.isFinite(u) && u >= 0) {
        sub += q * u;
      }
    }
    return { subtotal: sub, totalQty: qty, lineCount: lines.filter((l) => l.variantId != null).length };
  }, [lines]);

  function setLine(key: string, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()]);
  }

  function duplicateLine(key: string) {
    const src = lines.find((l) => l.key === key);
    if (!src) return;
    const copy: LineDraft = {
      ...newLine(),
      variantId: src.variantId,
      sku: src.sku,
      title: src.title,
      productLabel: src.productLabel,
      orderedQty: src.orderedQty,
      unitCost: src.unitCost,
      note: src.note,
    };
    setLines((prev) => {
      const i = prev.findIndex((l) => l.key === key);
      const next = [...prev];
      next.splice(i + 1, 0, copy);
      return next;
    });
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  }

  function pickVariant(lineKey: string, v: VariantOption, usedIds: Set<number>) {
    if (usedIds.has(v.id)) {
      setError("This variant is already on another line. Change quantity or remove the other line.");
      return;
    }
    setError("");
    setLine(lineKey, {
      variantId: v.id,
      sku: v.sku,
      title: v.title,
      productLabel: v.product?.name ?? "",
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (orgId == null) {
      setError("No organization context.");
      return;
    }
    if (!vendor?.id) {
      setError("Select a vendor.");
      return;
    }
    const built: Array<{ variantId: number; orderedQty: number; unitCost?: number; note?: string }> = [];
    const seen = new Set<number>();
    for (const l of lines) {
      if (l.variantId == null) continue;
      if (seen.has(l.variantId)) {
        setError("Duplicate variant on multiple lines. Merge quantities into one line.");
        return;
      }
      seen.add(l.variantId);
      const orderedQty = parseInt(l.orderedQty, 10);
      if (!Number.isFinite(orderedQty) || orderedQty < 1) {
        setError("Each line needs ordered quantity ≥ 1.");
        return;
      }
      const ucRaw = l.unitCost.trim();
      const unitCost = ucRaw === "" ? undefined : parseFloat(ucRaw);
      if (ucRaw !== "" && (!Number.isFinite(unitCost) || (unitCost as number) < 0)) {
        setError("Unit cost must be a non-negative number.");
        return;
      }
      built.push({
        variantId: l.variantId,
        orderedQty,
        unitCost: unitCost as number | undefined,
        note: l.note.trim() || undefined,
      });
    }
    if (!built.length) {
      setError("Add at least one line with a selected product variant.");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        orgId,
        vendorId: vendor.id,
        lines: built,
      };
      if (warehouseId) body.warehouseId = Number(warehouseId);
      if (expectedDeliveryDate) body.expectedDeliveryDate = expectedDeliveryDate;
      if (currency.trim()) body.currency = currency.trim().toUpperCase();
      if (notes.trim()) body.notes = notes.trim();
      if (internalNote.trim()) body.internalNote = internalNote.trim();

      const po = await purchaseOrderCreate(body);
      const id = (po as { id?: number })?.id;
      if (id) router.push(`/owner/inventory/purchase-orders/${id}`);
      else router.push("/owner/inventory/purchase-orders");
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : "Failed to create purchase order";
      setError(m);
    } finally {
      setSubmitting(false);
    }
  }

  const usedVariantIds = useMemo(() => {
    const s = new Set<number>();
    for (const l of lines) {
      if (l.variantId != null) s.add(l.variantId);
    }
    return s;
  }, [lines]);


  const selectedWarehouseLabel =
    warehouseId && warehouses.length
      ? warehouses.find((w) => String(w.id) === warehouseId)?.name ?? `Warehouse #${warehouseId}`
      : "";

  if (loadingMeta) {
    return (
      <div className="container-fluid py-4 text-center">
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <PageHeader
        title="New purchase order"
        subtitle="Create a draft PO with vendor, receiving warehouse, and line items. Submit for approval from the PO detail page."
      />
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link href="/owner/inventory">Inventory</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href="/owner/inventory/purchase-orders">Purchase orders</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            New
          </li>
        </ol>
      </nav>

      {sourceRequest && (
        <div className="alert alert-info d-flex align-items-center gap-2 mb-3">
          <i className="ri-file-list-3-line fs-5" aria-hidden />
          <div>
            <strong>Creating purchase order from stock request #{sourceRequest.id}</strong>
            <span className="ms-2 small text-muted">
              {sourceRequest.eligibleLineCount} of {sourceRequest.totalLineCount} lines prefilled
              {sourceRequest.requestIntent === "PROCUREMENT" && " (procurement request)"}
            </span>
            <Link
              href={`/owner/inventory/stock-requests/${sourceRequest.id}`}
              className="ms-2 small"
            >
              View request →
            </Link>
          </div>
        </div>
      )}
      {requestPrefillError && (
        <div className="alert alert-warning d-flex align-items-start gap-2 mb-3">
          <i className="ri-alert-line fs-5" aria-hidden />
          <div>
            <strong>Could not prefill from request</strong>
            <div className="small">{requestPrefillError}</div>
            {fromRequestIdParsed.ok && (
              <Link
                href={`/owner/inventory/stock-requests/${fromRequestIdParsed.id}`}
                className="small"
              >
                View request #{fromRequestIdParsed.id} →
              </Link>
            )}
          </div>
        </div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}
      {orgs.length === 0 && !loadingMeta && (
        <div className="alert alert-warning">
          No organizations found. Complete owner setup before creating purchase orders.
        </div>
      )}

      <form onSubmit={submit}>
        <div className="row g-3">
          <div className="col-lg-8">
            <div className="card border radius-12 mb-3">
              <div className="card-header py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div className="d-flex align-items-baseline gap-3 flex-wrap">
                  <h6 className="mb-0 fw-semibold">Order header</h6>
                  {sourceRequest ? (
                    <span className="small text-muted mb-0">Stock request #{sourceRequest.id}</span>
                  ) : null}
                </div>
                <span className="badge bg-light text-dark">Draft on save</span>
              </div>
              <div className="card-body p-24">
                {orgs.length > 1 && (
                  <div className="mb-3">
                    <label className="form-label">Organization</label>
                    <select
                      className="form-select"
                      value={orgId ?? ""}
                      onChange={(e) => setOrgId(Number(e.target.value) || null)}
                    >
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name || `Org #${o.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {orgs.length === 1 && (
                  <div className="mb-2 small text-muted">
                    Organization:{" "}
                    <span className="text-dark">{orgs[0].name || `Org #${orgs[0].id}`}</span>
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">Vendor *</label>
                  {orgId == null ? (
                    <div className="text-muted small">
                      {orgs.length === 0 ? "No organization available for this account." : "Loading…"}
                    </div>
                  ) : (
                    <div className="d-flex flex-wrap align-items-stretch gap-2">
                      <button
                        type="button"
                        className="form-control text-start"
                        onClick={() => {
                          setVendorModalQ("");
                          setShowVendorModal(true);
                        }}
                        disabled={submitting}
                      >
                        {vendor ? (
                          <>
                            <span className="fw-semibold">{vendor.name}</span>
                            {vendor.code && <span className="text-muted small ms-2">{vendor.code}</span>}
                          </>
                        ) : (
                          <span className="text-muted">Search and select vendor…</span>
                        )}
                      </button>
                      {vendor && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setVendor(null)}
                          disabled={submitting}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Receiving warehouse</label>
                    {orgId == null ? (
                      <div className="text-muted small">—</div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="form-control text-start"
                          onClick={() => {
                            setWhFilter("");
                            setShowWhModal(true);
                          }}
                          disabled={submitting}
                        >
                          {warehouseId ? (
                            selectedWarehouseLabel
                          ) : (
                            <span className="text-muted">Optional — search and select warehouse…</span>
                          )}
                        </button>
                        <div className="form-text">Links inbound planning to a central warehouse record.</div>
                      </>
                    )}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Expected delivery</label>
                    <input
                      type="date"
                      className="form-control"
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Currency</label>
                    <select
                      className="form-select"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      disabled={submitting}
                    >
                      <option value="">Default</option>
                      <option value="BDT">BDT</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="form-label">Notes to vendor</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={submitting}
                    placeholder="Delivery instructions, reference numbers…"
                  />
                </div>
                <div className="mt-2">
                  <label className="form-label">Internal remarks</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    disabled={submitting}
                    placeholder="Internal-only (priority, approver hints…)"
                  />
                </div>
              </div>
            </div>

            <div className="card border radius-12 mb-3">
              <div className="card-header py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                <h6 className="mb-0 fw-semibold">Line items</h6>
                <div className="d-flex flex-wrap gap-2">
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={addLine} disabled={submitting}>
                    + Add blank line
                  </button>
                </div>
              </div>
              {orgId != null && (
                <POProductPicker
                  orgId={orgId}
                  disabled={submitting}
                  selectedVariantIds={usedVariantIds}
                  collapsed={pickerCollapsed}
                  onToggleCollapse={() => setPickerCollapsed((v) => !v)}
                  onAddVariant={(v) => {
                    if (usedVariantIds.has(v.id)) {
                      setError("Variant already on a line. Adjust quantity on that line.");
                      return;
                    }
                    setError("");
                    setLines((prev) => {
                      const emptyIdx = prev.findIndex((l) => l.variantId == null);
                      if (emptyIdx >= 0) {
                        return prev.map((l, i) =>
                          i === emptyIdx
                            ? {
                                ...l,
                                variantId: v.id,
                                sku: v.sku,
                                title: v.title,
                                productLabel: v.product?.name ?? "",
                                orderedQty: "1",
                                unitCost: "",
                                note: "",
                              }
                            : l
                        );
                      }
                      return [
                        ...prev,
                        {
                          ...newLine(),
                          variantId: v.id,
                          sku: v.sku,
                          title: v.title,
                          productLabel: v.product?.name ?? "",
                          orderedQty: "1",
                          unitCost: "",
                          note: "",
                        },
                      ];
                    });
                  }}
                />
              )}
              <div className="table-responsive d-none d-md-block">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ minWidth: 220 }}>Variant</th>
                      <th style={{ width: 100 }}>Qty</th>
                      <th style={{ width: 120 }}>Unit cost</th>
                      <th style={{ width: 120 }}>Line total</th>
                      <th>Line note</th>
                      <th style={{ width: 100 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => {
                      const q = parseInt(l.orderedQty, 10);
                      const u = parseFloat(l.unitCost);
                      const lineTot =
                        Number.isFinite(q) && q > 0 && Number.isFinite(u) && u >= 0 ? q * u : null;
                      const otherUsed = new Set(usedVariantIds);
                      if (l.variantId != null) otherUsed.delete(l.variantId);
                      return (
                        <tr key={l.key}>
                          <td>
                            <VariantSearchInput
                              line={l}
                              orgId={orgId}
                              disabled={submitting}
                              onPick={(v) => pickVariant(l.key, v, otherUsed)}
                            />
                            {l.productLabel && (
                              <div className="small text-muted text-truncate mt-1">{l.productLabel}</div>
                            )}
                          </td>
                          <td>
                            <input
                              type="number"
                              min={1}
                              className="form-control form-control-sm"
                              value={l.orderedQty}
                              onChange={(e) => setLine(l.key, { orderedQty: e.target.value })}
                              disabled={submitting}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              step="0.0001"
                              className="form-control form-control-sm"
                              placeholder="—"
                              value={l.unitCost}
                              onChange={(e) => setLine(l.key, { unitCost: e.target.value })}
                              disabled={submitting}
                            />
                          </td>
                          <td className="small">
                            {lineTot != null ? lineTot.toFixed(2) : "—"}
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Optional"
                              value={l.note}
                              onChange={(e) => setLine(l.key, { note: e.target.value })}
                              disabled={submitting}
                            />
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-link btn-sm text-decoration-none p-1 me-1"
                              onClick={() => duplicateLine(l.key)}
                              disabled={submitting}
                              title="Duplicate line"
                              aria-label="Duplicate line"
                            >
                              <i className="ri-file-copy-line fs-5" aria-hidden />
                            </button>
                            <button
                              type="button"
                              className="btn btn-link btn-sm text-danger text-decoration-none p-1"
                              onClick={() => removeLine(l.key)}
                              disabled={submitting || lines.length <= 1}
                              title="Remove line"
                              aria-label="Remove line"
                            >
                              <i className="ri-delete-bin-line fs-5" aria-hidden />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="d-md-none p-3">
                {lines.map((l) => {
                  const q = parseInt(l.orderedQty, 10);
                  const u = parseFloat(l.unitCost);
                  const lineTot =
                    Number.isFinite(q) && q > 0 && Number.isFinite(u) && u >= 0 ? q * u : null;
                  const otherUsed = new Set(usedVariantIds);
                  if (l.variantId != null) otherUsed.delete(l.variantId);
                  return (
                    <div key={l.key} className="card border mb-3 p-3">
                      <VariantSearchInput
                        line={l}
                        orgId={orgId}
                        disabled={submitting}
                        onPick={(v) => pickVariant(l.key, v, otherUsed)}
                      />
                      {l.productLabel && <div className="small text-muted mt-1">{l.productLabel}</div>}
                      <div className="row g-2 mt-2">
                        <div className="col-6">
                          <label className="form-label small">Qty</label>
                          <input
                            type="number"
                            min={1}
                            className="form-control form-control-sm"
                            value={l.orderedQty}
                            onChange={(e) => setLine(l.key, { orderedQty: e.target.value })}
                          />
                        </div>
                        <div className="col-6">
                          <label className="form-label small">Unit cost</label>
                          <input
                            type="number"
                            min={0}
                            step="0.0001"
                            className="form-control form-control-sm"
                            value={l.unitCost}
                            onChange={(e) => setLine(l.key, { unitCost: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="mt-2 small text-muted">Line total: {lineTot != null ? lineTot.toFixed(2) : "—"}</div>
                      <div className="d-flex gap-2 mt-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => duplicateLine(l.key)}
                          title="Duplicate line"
                          aria-label="Duplicate line"
                        >
                          <i className="ri-file-copy-line" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeLine(l.key)}
                          disabled={lines.length <= 1}
                          title="Remove line"
                          aria-label="Remove line"
                        >
                          <i className="ri-delete-bin-line" aria-hidden />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <button type="button" className="btn btn-sm btn-outline-primary w-100" onClick={addLine}>
                  + Add line
                </button>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card border radius-12 sticky-top" style={{ top: "1rem" }}>
              <div className="card-header py-3">
                <h6 className="mb-0 fw-semibold">Summary</h6>
              </div>
              <div className="card-body p-24">
                <dl className="row small mb-0">
                  <dt className="col-7 text-muted">Lines with SKU</dt>
                  <dd className="col-5 text-end mb-2">{totals.lineCount}</dd>
                  <dt className="col-7 text-muted">Total quantity</dt>
                  <dd className="col-5 text-end mb-2">{totals.totalQty}</dd>
                  <dt className="col-7 text-muted">Subtotal</dt>
                  <dd className="col-5 text-end mb-2 fw-semibold">
                    {currency ? `${currency} ` : ""}
                    {totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </dd>
                  <dt className="col-7 text-muted">Tax</dt>
                  <dd className="col-5 text-end mb-2 text-muted">—</dd>
                  <dt className="col-7">Grand total</dt>
                  <dd className="col-5 text-end fw-bold">
                    {currency ? `${currency} ` : ""}
                    {totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </dd>
                </dl>
                <hr />
                <div className="d-grid gap-2">
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Saving draft…" : "Save draft"}
                  </button>
                  <Link href="/owner/inventory/purchase-orders" className="btn btn-outline-secondary">
                    Cancel
                  </Link>
                </div>
                <p className="small text-muted mt-3 mb-0">
                  After creation, open the PO to <strong>submit</strong> for approval, then <strong>approve</strong> before posting GRNs against it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>

      <Modal
        show={showVendorModal}
        onHide={() => setShowVendorModal(false)}
        centered
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>Select vendor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input
            type="text"
            className="form-control mb-3"
            placeholder="Search name or code…"
            value={vendorModalQ}
            onChange={(e) => setVendorModalQ(e.target.value)}
            autoFocus
          />
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {vendorModalLoading && <div className="text-muted small py-2">Loading…</div>}
            {!vendorModalLoading && vendorModalOpts.length === 0 && (
              <div className="text-muted small py-2">No vendors match.</div>
            )}
            <ul className="list-group list-group-flush">
              {!vendorModalLoading &&
                vendorModalOpts.map((v) => (
                  <li
                    key={v.id}
                    className="list-group-item list-group-item-action"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setVendor({ id: v.id, name: v.name, code: v.code, phone: v.phone });
                        setShowVendorModal(false);
                        setVendorModalQ("");
                      }
                    }}
                    onClick={() => {
                      setVendor({ id: v.id, name: v.name, code: v.code, phone: v.phone });
                      setShowVendorModal(false);
                      setVendorModalQ("");
                    }}
                  >
                    <span className="fw-semibold">{v.name}</span>
                    {v.code && <span className="text-muted small ms-2">{v.code}</span>}
                    {v.phone && <span className="text-muted small ms-2">{v.phone}</span>}
                  </li>
                ))}
            </ul>
          </div>
        </Modal.Body>
      </Modal>

      <Modal show={showWhModal} onHide={() => setShowWhModal(false)} centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Receiving warehouse</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input
            type="text"
            className="form-control mb-3"
            placeholder="Filter by name…"
            value={whFilter}
            onChange={(e) => setWhFilter(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-link btn-sm px-0 mb-2"
            onClick={() => {
              setWarehouseId("");
              setShowWhModal(false);
            }}
          >
            Clear selection (optional)
          </button>
          {warehouses.length === 0 ? (
            <div className="text-muted small">No warehouses for this organization.</div>
          ) : (
            <ul className="list-group" style={{ maxHeight: 280, overflowY: "auto" }}>
              {filteredWarehouses.map((w) => (
                <li
                  key={w.id}
                  className="list-group-item list-group-item-action"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setWarehouseId(String(w.id));
                      setShowWhModal(false);
                    }
                  }}
                  onClick={() => {
                    setWarehouseId(String(w.id));
                    setShowWhModal(false);
                  }}
                >
                  {w.name}
                </li>
              ))}
            </ul>
          )}
        </Modal.Body>
      </Modal>

    </div>
  );
}
