"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerPatch, ownerPost } from "@/app/owner/_lib/ownerApi";

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

/** Prefer hub / warehouse-like locations for default "from" selection (deterministic). */
const SOURCE_LOCATION_TYPE_PRIORITY: Record<string, number> = {
  CENTRAL_WAREHOUSE: 0,
  ONLINE_HUB: 1,
  STAGING: 2,
  PHARMACY: 3,
  CLINIC_STORE: 4,
  BRANCH_STORE: 5,
  SHOP: 6,
  CLINIC: 7,
  DAMAGE_AREA: 99,
  RETURN_AREA: 99,
  QUARANTINE: 99,
};

function sortLocationsForDefaultSource(locs: any[]): any[] {
  return [...locs].sort((a, b) => {
    const ta = String(a.type ?? "");
    const tb = String(b.type ?? "");
    const pa = SOURCE_LOCATION_TYPE_PRIORITY[ta] ?? 50;
    const pb = SOURCE_LOCATION_TYPE_PRIORITY[tb] ?? 50;
    if (pa !== pb) return pa - pb;
    const an = `${a.branch?.name ?? ""} ${a.name ?? ""}`.trim();
    const bn = `${b.branch?.name ?? ""} ${b.name ?? ""}`.trim();
    return an.localeCompare(bn);
  });
}

type ExtraLine = {
  key: string;
  productId: number;
  variantId: number;
  productName: string;
  variantLabel: string;
  fulfillQty: number;
  /** From picker / server max at source; used to clamp fulfill qty client-side. */
  maxDispatchableHint?: number;
};

type ExtraPickerRow = {
  productId: number;
  productName: string;
  variantId: number;
  variantLabel: string;
  bookQty: number;
  lotFefoQty: number;
  maxDispatchable: number;
  availableQty: number;
  rawLotOnHandQty?: number;
};

export default function OwnerStockRequestDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [request, setRequest] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [fromLocationId, setFromLocationId] = useState("");
  const [fulfillByItemId, setFulfillByItemId] = useState<Record<number, number>>({});
  const [manualMode, setManualMode] = useState(false);
  const [extraLines, setExtraLines] = useState<ExtraLine[]>([]);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState("");
  const [pickerResults, setPickerResults] = useState<ExtraPickerRow[]>([]);
  const [pickerPage, setPickerPage] = useState(1);
  const [pickerPagination, setPickerPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [pickerMeta, setPickerMeta] = useState<{ candidateTruncated?: boolean } | null>(null);
  const [includeZeroStock, setIncludeZeroStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lotsLoading, setLotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [declineSubmitting, setDeclineSubmitting] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declineSource, setDeclineSource] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fulfillmentWarnings, setFulfillmentWarnings] = useState<Array<{ code: string; message: string }>>([]);
  const [fulfillmentLineErrors, setFulfillmentLineErrors] = useState<
    Array<{ code?: string; message?: string; variantId?: number; fulfillQty?: number; availableQty?: number }>
  >([]);
  const [enterpriseFulfillment, setEnterpriseFulfillment] = useState<any>(null);
  const [enterpriseLoading, setEnterpriseLoading] = useState(false);
  const [enterpriseActionLoading, setEnterpriseActionLoading] = useState(false);

  const prevFromLocationIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setSuccess("");
    setExtraLines([]);
    setFromLocationId("");
    setLocations([]);
    prevFromLocationIdRef.current = undefined;
    (async () => {
      try {
        const reqRes = await ownerGet(`/api/v1/stock-requests/${id}`).catch(() => null);
        if (cancelled) return;
        const req = (reqRes as any)?.data ?? reqRes;
        setRequest(req);
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
    if (!id || request?.orgId == null || String(request.id) !== String(id)) return;
    const orgId = request.orgId;
    let cancelled = false;
    (async () => {
      try {
        const locRes: any = await ownerGet(`/api/v1/inventory/locations?orgId=${encodeURIComponent(String(orgId))}`);
        if (cancelled) return;
        const raw = locRes?.data ?? [];
        const locs = Array.isArray(raw) ? raw : [];
        const sorted = sortLocationsForDefaultSource(locs);
        setLocations(sorted);
        setFromLocationId((prev) => {
          if (prev) return prev;
          return sorted.length ? String(sorted[0].id) : "";
        });
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load source locations for this organization");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, request?.id, request?.orgId]);

  useEffect(() => {
    if (!id || request?.orgId == null) return;
    let cancelled = false;
    setEnterpriseLoading(true);
    (async () => {
      try {
        const res = await ownerGet(
          `/api/v1/fulfillment/stock-requests/${encodeURIComponent(id)}/status?orgId=${encodeURIComponent(String(request.orgId))}`
        );
        if (cancelled) return;
        const data = (res as any)?.data ?? res;
        setEnterpriseFulfillment(data);
      } catch {
        if (!cancelled) setEnterpriseFulfillment(null);
      } finally {
        if (!cancelled) setEnterpriseLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, request?.orgId, request?.status]);

  /** Changing source invalidates picker-derived caps; clear extras to avoid stale max hints. */
  useEffect(() => {
    const prev = prevFromLocationIdRef.current;
    prevFromLocationIdRef.current = fromLocationId;
    if (prev === undefined) return;
    if (prev !== fromLocationId) {
      setExtraLines([]);
      setPickerResults([]);
      setPickerPagination(null);
      setPickerMeta(null);
      setPickerError("");
      setPickerLoading(Boolean(fromLocationId));
    }
  }, [fromLocationId]);

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

  const branchLocations = request?.branch?.inventoryLocations ?? [];
  const toLocationId = branchLocations[0]?.id ?? "";

  const requestedRows = useMemo(() => {
    const items = request?.items ?? [];
    return items.filter((i: any) => i.lineKind !== "EXTRA");
  }, [request?.items]);

  useEffect(() => {
    if (!requestedRows.length) return;
    setFulfillByItemId((prev) => {
      const next = { ...prev };
      for (const row of requestedRows) {
        const itemId = Number(row.id);
        if (next[itemId] === undefined) {
          next[itemId] = row.requestedQty ?? 0;
        }
      }
      return next;
    });
  }, [requestedRows]);

  const loadPicker = useCallback(async () => {
    if (!id || !fromLocationId) return;
    setPickerLoading(true);
    setPickerError("");
    try {
      const q = pickerSearch.trim() ? `&search=${encodeURIComponent(pickerSearch.trim())}` : "";
      const iz = includeZeroStock ? `&includeZeroStock=true` : "";
      const res: any = await ownerGet(
        `/api/v1/inventory/stock-request-extra-picker?stockRequestId=${encodeURIComponent(String(id))}&fromLocationId=${encodeURIComponent(String(fromLocationId))}&page=${pickerPage}&limit=20${q}${iz}`
      );
      const list = res?.data ?? [];
      setPickerResults(Array.isArray(list) ? list : []);
      const pag = res?.pagination;
      if (pag && typeof pag.page === "number") {
        setPickerPagination({
          page: pag.page,
          limit: pag.limit ?? 20,
          total: pag.total ?? 0,
          totalPages: pag.totalPages ?? 1,
        });
      } else {
        setPickerPagination(null);
      }
      setPickerMeta(res?.meta ?? null);
    } catch (e: any) {
      setPickerError(e?.message ?? "Failed to load inventory at this source");
      setPickerResults([]);
      setPickerPagination(null);
      setPickerMeta(null);
    } finally {
      setPickerLoading(false);
    }
  }, [id, fromLocationId, pickerSearch, pickerPage, includeZeroStock]);

  useEffect(() => {
    setPickerPage(1);
  }, [fromLocationId, includeZeroStock, pickerSearch]);

  useEffect(() => {
    if (!id || !fromLocationId) return;
    const t = setTimeout(() => loadPicker(), 350);
    return () => clearTimeout(t);
  }, [id, fromLocationId, pickerSearch, pickerPage, includeZeroStock, loadPicker]);

  const addExtraFromPicker = (row: ExtraPickerRow) => {
    const key = `extra-${row.productId}-${row.variantId}`;
    if (extraLines.some((e) => e.key === key)) return;
    if (row.maxDispatchable <= 0) return;
    const fulfillQty = Math.min(1, Math.max(0, row.maxDispatchable));
    setExtraLines((prev) => [
      ...prev,
      {
        key,
        productId: row.productId,
        variantId: row.variantId,
        productName: row.productName ?? "",
        variantLabel: row.variantLabel ?? String(row.variantId),
        fulfillQty,
        maxDispatchableHint: row.maxDispatchable,
      },
    ]);
  };

  const setExtraQty = (key: string, qty: number) => {
    setExtraLines((rows) =>
      rows.map((r) => {
        if (r.key !== key) return r;
        let q = Math.max(0, qty);
        const m = (request as any)?.maxDispatchableByVariant ?? {};
        const fromDetail = (m as Record<number | string, number | undefined>)[r.variantId] ??
          (m as Record<number | string, number | undefined>)[String(r.variantId)];
        const cap = typeof fromDetail === "number" ? fromDetail : r.maxDispatchableHint;
        if (cap != null && cap >= 0) q = Math.min(q, cap);
        return { ...r, fulfillQty: q };
      })
    );
  };

  const removeExtra = (key: string) => {
    setExtraLines((rows) => rows.filter((r) => r.key !== key));
  };

  const aggregateByVariant = (request as any)?.aggregateStockByVariant ?? {};
  const maxDispatchByVariant = (request as any)?.maxDispatchableByVariant ?? {};
  const maxDispatchByItemId = (request as any)?.maxDispatchableByItemId ?? {};
  const lotsByVariant = (request as any)?.availableLotsByVariant ?? {};
  const availabilityDiagnosticsByVariant = (request as any)?.availabilityDiagnosticsByVariant ?? {};

  const totalLotAvailable = (variantId: number) => {
    const lots = mapByVariantId(lotsByVariant, variantId) ?? [];
    return lots.reduce((s: number, l: { onHandQty?: number }) => s + (l.onHandQty ?? 0), 0);
  };

  const availabilityHintForVariant = (variantId: number, maxDisp: number) => {
    if (maxDisp > 0) return null;
    const d =
      availabilityDiagnosticsByVariant[variantId] ??
      (availabilityDiagnosticsByVariant as Record<string, { hint?: string }>)[String(variantId)];
    return d?.hint as string | null | undefined;
  };

  const mapByVariantId = <T,>(m: Record<number, T> | undefined, vid: number): T | undefined => {
    if (!m) return undefined;
    return (m as Record<number | string, T>)[vid] ?? (m as Record<number | string, T>)[String(vid)];
  };

  /** Same `fromLocationId` as GET stock-request detail + picker; used for display only. */
  const fromLocationLabel = useMemo(() => {
    if (!fromLocationId) return "";
    const loc = locations.find((l: any) => String(l.id) === String(fromLocationId));
    if (!loc) return `Location #${fromLocationId}`;
    const br = loc.branch?.name ? `${loc.branch.name} — ` : "";
    return `${br}${loc.name ?? loc.type ?? loc.id}`;
  }, [locations, fromLocationId]);

  /** Aligns with fulfill grid "Max dispatch": detail payload when variant is on request, else picker hint. */
  const maxAtSourceForExtraLine = (ex: ExtraLine) => {
    const fromDetail = mapByVariantId(maxDispatchByVariant, ex.variantId);
    if (fromDetail != null) return fromDetail;
    return ex.maxDispatchableHint ?? null;
  };

  const canDispatch = ["SUBMITTED", "OWNER_REVIEW", "FULFILLED_PARTIAL"].includes(request?.status);
  const canDecline = ["SUBMITTED", "OWNER_REVIEW"].includes(request?.status);

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
    const items = requestedRows
      .map((row: any) => {
        const itemId = Number(row.id);
        return {
          stockRequestItemId: itemId,
          fulfillQty: Number(fulfillByItemId[itemId] ?? 0),
        };
      })
      .filter((x: { fulfillQty: number }) => x.fulfillQty > 0);
    const extras = extraLines
      .filter((e) => e.fulfillQty > 0)
      .map((e) => ({
        productId: e.productId,
        variantId: e.variantId,
        fulfillQty: e.fulfillQty,
      }));
    if (!items.length && !extras.length) {
      setError("Set at least one fulfill quantity greater than zero");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    setFulfillmentWarnings([]);
    setFulfillmentLineErrors([]);
    try {
      const res: any = await ownerPatch(`/api/v1/stock-requests/${request.id}/fulfill`, {
        fromLocationId: fromId,
        toLocationId: toId,
        manualMode,
        items: items.length ? items : undefined,
        extraItems: extras.length ? extras : undefined,
      });
      const data = res?.data ?? res;
      const ful = data?.fulfillment ?? {};
      setFulfillmentWarnings(ful.warnings ?? []);
      setFulfillmentLineErrors(ful.lineErrors ?? []);
      setSuccess(
        ful.lineErrors?.length
          ? "Dispatched (some lines were skipped — see notices)."
          : "Dispatched and transfer created."
      );
      if (data?.request) setRequest(data.request);
      else await loadDetailWithLots(String(fromId));
    } catch (e: any) {
      const j = (e as any)?.response;
      const data = j?.data ?? j;
      const ful = data?.fulfillment;
      const errs = ful?.lineErrors ?? [];
      setFulfillmentLineErrors(errs);
      const w = ful?.warnings;
      if (Array.isArray(w)) setFulfillmentWarnings(w);
      if (data?.request) setRequest(data.request);
      else await loadDetailWithLots(String(fromId));
      if (errs.length) {
        setError(errs.map((x: { message?: string }) => x.message).filter(Boolean).join(" "));
      } else {
        setError(ful?.message || j?.message || e?.message || "Failed to dispatch");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const autoFillFefo = () => {
    setFulfillByItemId((prev) => {
      const next = { ...prev };
      for (const row of requestedRows) {
        const itemId = Number(row.id);
        const vid = row.variantId;
        const lots = [...(lotsByVariant[vid] ?? [])].sort(
          (a: any, b: any) => new Date(a.expDate).getTime() - new Date(b.expDate).getTime()
        );
        const remaining = Math.max(
          0,
          (row.requestedQty ?? 0) - (row.fulfilledQty ?? 0) - (row.cancelledQty ?? 0)
        );
        let need = remaining;
        let alloc = 0;
        for (const lot of lots) {
          if (need <= 0) break;
          const take = Math.min(need, lot.onHandQty ?? 0);
          alloc += take;
          need -= take;
        }
        next[itemId] = alloc;
      }
      return next;
    });
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
        subtitle="Review requested items, set fulfill quantities, and dispatch"
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
        {request.transfers?.[0] && <span className="badge bg-light text-dark">Transfer #{request.transfers[0].id}</span>}
        {request.status === "CANCELLED" && (request as any).declineReason && (
          <span className="text-muted small">Reason: {(request as any).declineReason}</span>
        )}
      </div>

      {error && <div className="alert alert-danger radius-12">{error}</div>}
      {success && <div className="alert alert-success radius-12">{success}</div>}
      {(request as any)?.fulfillmentSourceValidation &&
        (request as any).fulfillmentSourceValidation.ok === false && (
          <div className="alert alert-warning radius-12">
            <div className="small fw-semibold mb-1">Source location</div>
            <p className="mb-0 small">
              {(request as any).fulfillmentSourceValidation.message ??
                "Choose a source location under the same organization as this stock request."}
            </p>
            {(request as any).fulfillmentSourceValidation.code && (
              <code className="small d-block mt-1">{(request as any).fulfillmentSourceValidation.code}</code>
            )}
          </div>
        )}
      {fulfillmentLineErrors.length > 0 && (
        <div className="alert alert-danger radius-12">
          <div className="small fw-semibold mb-1">Line validation</div>
          <ul className="mb-0 ps-3 small">
            {fulfillmentLineErrors.map((w, i) => (
              <li key={i}>
                {w.code ? <code className="me-1">{w.code}</code> : null}
                {w.message}
                {w.availableQty != null && w.fulfillQty != null ? (
                  <span className="text-muted"> (asked {w.fulfillQty}, available {w.availableQty})</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
      {fulfillmentWarnings.length > 0 && (
        <div className="alert alert-warning radius-12">
          <div className="small fw-semibold mb-1">Fulfillment notices</div>
          <ul className="mb-0 ps-3 small">
            {fulfillmentWarnings.map((w, i) => (
              <li key={i}>
                {w.code ? <code className="me-1">{w.code}</code> : null}
                {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card radius-12 mb-3 border-primary border-opacity-25">
        <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
          <h6 className="mb-0">Enterprise fulfillment (allocation → pick → dispatch)</h6>
          {enterpriseLoading && <span className="small text-muted">Loading…</span>}
        </div>
        <div className="card-body small">
          {!enterpriseLoading && enterpriseFulfillment && (
            <>
              <p className="mb-2">
                <strong>Allocation plan:</strong>{" "}
                {enterpriseFulfillment.allocationPlan
                  ? `#${enterpriseFulfillment.allocationPlan.id} (${enterpriseFulfillment.allocationPlan.status})`
                  : "—"}
              </p>
              <p className="mb-2">
                <strong>Pick list:</strong>{" "}
                {enterpriseFulfillment.allocationPlan?.pickList
                  ? `#${enterpriseFulfillment.allocationPlan.pickList.id} (${enterpriseFulfillment.allocationPlan.pickList.status})`
                  : "—"}
              </p>
              <p className="mb-2">
                <strong>Dispatches:</strong>{" "}
                {Array.isArray(enterpriseFulfillment.dispatches) && enterpriseFulfillment.dispatches.length
                  ? enterpriseFulfillment.dispatches.map((d: any) => `#${d.id} ${d.status}`).join(", ")
                  : "—"}
              </p>
            </>
          )}
          {!enterpriseLoading && !enterpriseFulfillment && (
            <p className="text-muted mb-2">No enterprise pipeline data (or request not visible).</p>
          )}
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            disabled={enterpriseActionLoading || !fromLocationId || !request?.orgId}
            onClick={async () => {
              if (!fromLocationId || !request?.orgId || !id) return;
              setEnterpriseActionLoading(true);
              setError("");
              try {
                await ownerPost(`/api/v1/fulfillment/stock-requests/${encodeURIComponent(id)}/start`, {
                  fromLocationId: Number(fromLocationId),
                  orgId: request.orgId,
                });
                const res = await ownerGet(
                  `/api/v1/fulfillment/stock-requests/${encodeURIComponent(id)}/status?orgId=${encodeURIComponent(String(request.orgId))}`
                );
                setEnterpriseFulfillment((res as any)?.data ?? res);
              } catch (e: any) {
                setError(e?.message ?? "Failed to start enterprise fulfillment");
              } finally {
                setEnterpriseActionLoading(false);
              }
            }}
          >
            {enterpriseActionLoading ? "Starting…" : "Start allocation plan (draft)"}
          </button>
          <p className="text-muted mt-2 mb-0">
            Uses the selected source location. Staff complete FEFO run, confirm, pick, and dispatch in the warehouse
            operations UI. Legacy “Fulfill & Dispatch” below remains available.
          </p>
        </div>
      </div>

      <div className="card radius-12 mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-sm-6">
              <p className="mb-1">
                <strong>Branch:</strong> {request.branch?.name ?? request.branchId}
              </p>
              <p className="mb-1">
                <strong>Submitted:</strong> {formatDate(request.submittedAt)}
              </p>
              <p className="mb-0">
                <strong>Created:</strong> {formatDate(request.createdAt)}
              </p>
            </div>
            <div className="col-sm-6">
              {request.transfers?.[0] && (
                <>
                  <p className="mb-1">
                    <strong>Transfer:</strong> #{request.transfers[0].id} — {request.transfers[0].status}
                  </p>
                  {request.transfers[0].sentAt && (
                    <p className="mb-0 text-muted small">Sent: {formatDate(request.transfers[0].sentAt)}</p>
                  )}
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
                <th>Requested</th>
                <th>Fulfilled (recorded)</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {requestedRows.map((item: any) => (
                <tr key={item.id}>
                  <td>{item.product?.name ?? item.productId}</td>
                  <td>{item.variant?.title ?? item.variant?.sku ?? item.variantId}</td>
                  <td>{item.requestedQty}</td>
                  <td>{item.fulfilledQty ?? 0}</td>
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
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div className="form-check form-switch mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="manualMode"
                  checked={manualMode}
                  onChange={(e) => setManualMode(e.target.checked)}
                />
                <label className="form-check-label small" htmlFor="manualMode">
                  Manual mode (prefer non-lot from book stock; uses FEFO lots if book is insufficient)
                </label>
              </div>
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
                    <option key={loc.id} value={loc.id}>
                      {loc.branch?.name ? `${loc.branch.name} — ` : ""}
                      {loc.name ?? loc.type ?? loc.id}
                    </option>
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

            {fromLocationId && (
              <p className="small text-secondary mb-2">
                Enter fulfill quantity per line. Partial and over-fulfillment vs requested are allowed when stock
                exists; notices appear after dispatch. <strong>Max dispatch</strong> matches server validation (book
                balance vs FEFO-eligible lots). With manual mode off, lines are allocated FEFO by expiry; with manual
                on, non-lot is used when book stock covers the line, otherwise FEFO from lots.
              </p>
            )}

            <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
              <span className="small text-muted">Delta colors: under (red), over (green), match (neutral)</span>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={autoFillFefo}>
                Auto-fill FEFO (from lot availability)
              </button>
            </div>

            <div className="table-responsive mb-3">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th>Requested</th>
                    <th>Fulfill qty</th>
                    <th>Delta</th>
                    <th>Lot avail. (raw)</th>
                    <th>Book (non-lot)</th>
                    <th>Max dispatch</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {requestedRows.map((row: any) => {
                    const itemId = Number(row.id);
                    const fq = Number(fulfillByItemId[itemId] ?? 0);
                    const req = row.requestedQty ?? 0;
                    const fulfilled = row.fulfilledQty ?? 0;
                    const cancelled = row.cancelledQty ?? 0;
                    const remaining = Math.max(0, req - fulfilled - cancelled);
                    const delta = fq - remaining;
                    let deltaClass = "";
                    if (delta < 0) deltaClass = "text-danger";
                    else if (delta > 0) deltaClass = "text-success";
                    const lotAv = totalLotAvailable(row.variantId);
                    const agg = mapByVariantId(aggregateByVariant, row.variantId) ?? 0;
                    const maxDisp =
                      maxDispatchByItemId[itemId] ??
                      mapByVariantId(maxDispatchByVariant, row.variantId) ??
                      Math.max(lotAv, agg);
                    const zeroHint = availabilityHintForVariant(row.variantId, maxDisp);
                    const noLotsButAgg = lotAv <= 0 && agg > 0;
                    return (
                      <tr key={itemId}>
                        <td>
                          <span className="text-muted small me-1">#{itemId}</span>
                          {row.variant?.title ?? row.variant?.sku ?? row.variantId}
                        </td>
                        <td>{req}</td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            min={0}
                            value={Number.isFinite(fq) ? fq : 0}
                            onChange={(e) =>
                              setFulfillByItemId((m) => ({
                                ...m,
                                [itemId]: Math.max(0, parseInt(e.target.value, 10) || 0),
                              }))
                            }
                            style={{ width: 88 }}
                          />
                        </td>
                        <td className={deltaClass}>{delta > 0 ? `+${delta}` : delta}</td>
                        <td>{lotAv}</td>
                        <td>
                          {agg}
                          {noLotsButAgg && (
                            <span className="badge bg-warning text-dark ms-1" title="No lot rows; manual mode or aggregate dispatch may apply">
                              No lots
                            </span>
                          )}
                        </td>
                        <td className="fw-semibold">{maxDisp}</td>
                        <td className="small text-muted" style={{ maxWidth: 280 }}>
                          {maxDisp <= 0 ? (
                            <>
                              {zeroHint ||
                                "No dispatchable quantity at this source. Confirm stock is posted to stock_balances / stock_lot_balances at this location, or try another location on the same branch."}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-top pt-3 mt-3">
              <h6 className="mb-2">Add extra item (not on original request)</h6>
              <p className="small text-muted mb-2">
                Search stock at the same <strong>source location</strong> as the fulfill grid (
                <code className="small">fromLocationId</code>
                {fromLocationLabel ? (
                  <>
                    : <span className="text-dark">{fromLocationLabel}</span>
                  </>
                ) : null}
                ). Quantities match fulfillment validation (non-lot book vs FEFO-eligible lots). Manual / FEFO dispatch mode
                applies only when you submit — the picker does not change mode.
              </p>
              {!fromLocationId ? (
                <div className="alert alert-light border mb-2 py-2 small" role="status">
                  Select a <strong>source warehouse / location</strong> in the field above. The extra-item list is empty until a
                  source is selected — it does not load org-wide catalog stock.
                </div>
              ) : null}
              {pickerMeta?.candidateTruncated ? (
                <p className="small text-warning mb-2">
                  Large inventory at this source: results are capped for performance. Refine search to narrow variants.
                </p>
              ) : null}
              <div className="row g-2 mb-2 align-items-center">
                <div className="col-md-6">
                  <input
                    className="form-control form-control-sm"
                    placeholder="Search by product or variant (SKU, barcode)…"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    disabled={!fromLocationId || pickerLoading}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-check small mb-0 d-flex align-items-center gap-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={includeZeroStock}
                      onChange={(e) => setIncludeZeroStock(e.target.checked)}
                      disabled={!fromLocationId || pickerLoading}
                    />
                    Include zero dispatchable
                  </label>
                </div>
                <div className="col-md-3 text-md-end">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => loadPicker()}
                    disabled={pickerLoading || !fromLocationId}
                  >
                    {pickerLoading ? "Loading…" : "Refresh"}
                  </button>
                </div>
              </div>
              {pickerError ? (
                <div className="alert alert-danger py-2 small mb-2" role="alert">
                  <span className="fw-semibold me-1">Could not load picker.</span>
                  {pickerError}
                </div>
              ) : null}
              {fromLocationId && !pickerLoading && !pickerError && pickerResults.length === 0 ? (
                <p className="small text-muted mb-2" role="status">
                  {pickerSearch.trim()
                    ? "No variants match your search within inventory recorded at this source."
                    : includeZeroStock
                      ? "No inventory rows at this source match the current filter (or the candidate list is empty)."
                      : "No variants with dispatchable quantity greater than zero at this source. Enable “Include zero dispatchable” to inspect rows with no FEFO-eligible or book quantity."}
                </p>
              ) : null}
              <div className="table-responsive mb-2" style={{ maxHeight: 280, overflow: "auto" }}>
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Variant</th>
                      <th className="text-end">Avail. (max)</th>
                      <th className="text-end">Book</th>
                      <th className="text-end">Lot (FEFO)</th>
                      <th className="text-end">Lot (raw)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pickerLoading ? (
                      <tr>
                        <td colSpan={7} className="text-muted small py-3" role="status" aria-live="polite">
                          <span className="spinner-border spinner-border-sm me-2 align-middle text-primary" aria-hidden="true" />
                          Loading inventory for this source…
                        </td>
                      </tr>
                    ) : (
                      pickerResults.map((row) => {
                        const dup = extraLines.some(
                          (e) => e.productId === row.productId && e.variantId === row.variantId
                        );
                        const canAdd = row.maxDispatchable > 0 && !dup;
                        return (
                          <tr key={`${row.productId}-${row.variantId}`}>
                            <td className="small">{row.productName}</td>
                            <td className="small">{row.variantLabel}</td>
                            <td className="text-end small fw-semibold">{row.availableQty ?? row.maxDispatchable}</td>
                            <td className="text-end small">{row.bookQty}</td>
                            <td className="text-end small">{row.lotFefoQty}</td>
                            <td className="text-end small text-muted">{row.rawLotOnHandQty ?? 0}</td>
                            <td>
                              {dup ? (
                                <span className="small text-muted">Added</span>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary"
                                  disabled={!canAdd}
                                  title={
                                    row.maxDispatchable <= 0
                                      ? 'No dispatchable quantity at this source (enable "Include zero" to see why)'
                                      : undefined
                                  }
                                  onClick={() => addExtraFromPicker(row)}
                                >
                                  Add
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {pickerPagination && pickerPagination.totalPages > 1 ? (
                <div className="d-flex flex-wrap align-items-center gap-2 small mb-2">
                  <span className="text-muted">
                    Page {pickerPagination.page} of {pickerPagination.totalPages} ({pickerPagination.total} variants)
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={pickerLoading || pickerPagination.page <= 1}
                    onClick={() => setPickerPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={pickerLoading || pickerPagination.page >= pickerPagination.totalPages}
                    onClick={() => setPickerPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              ) : null}

              {extraLines.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Variant</th>
                        <th className="text-end">Max at source</th>
                        <th>Fulfill qty</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {extraLines.map((ex) => {
                        const cap = maxAtSourceForExtraLine(ex);
                        return (
                          <tr key={ex.key}>
                            <td className="small">{ex.productName}</td>
                            <td className="small">{ex.variantLabel}</td>
                            <td className="text-end small fw-semibold">{cap != null ? cap : "—"}</td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                min={0}
                                max={cap != null ? cap : undefined}
                                value={ex.fulfillQty}
                                onChange={(e) => setExtraQty(ex.key, parseInt(e.target.value, 10) || 0)}
                                style={{ width: 88 }}
                                aria-label={`Fulfill quantity for ${ex.variantLabel}`}
                              />
                            </td>
                            <td>
                              <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => removeExtra(ex.key)}>
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="d-flex flex-wrap gap-2 align-items-center mt-3">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={
                  submitting ||
                  lotsLoading ||
                  (!requestedRows.some((r: any) => (fulfillByItemId[Number(r.id)] ?? 0) > 0) &&
                    !extraLines.some((e) => e.fulfillQty > 0))
                }
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
