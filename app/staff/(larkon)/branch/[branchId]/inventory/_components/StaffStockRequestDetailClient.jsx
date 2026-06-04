"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffDispatchReceiveWorkspacePath, staffStockRequestListPath } from "@/lib/staffInventoryRoutes";
import { staffStockRequestGet, staffStockRequestSubmit, staffStockRequestCancel } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { useToast } from "@/src/hooks/useToast";
import {
  formatStockRequestStatusLabel,
  getStockRequestIntentBadgeProps,
  stockRequestAttentionMessage,
  stockRequestNeedsAttention,
  stockRequestNextStepHint,
  stockRequestProgressSteps,
  stockRequestStatusBadgeClass,
} from "@/src/lib/stockRequestUi";

const REQUIRED_PERM = "inventory.read";

function formatDateTime(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-BD", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatDateShort(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function formatTimeShort(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function numOrDash(v) {
  if (v == null || Number.isNaN(Number(v))) return null;
  return Number(v);
}

/** Larkon-style read-only stat tile (matches list page metric density). */
function StatTile({ label, value }) {
  return (
    <div className="card h-100 radius-12 border bg-body">
      <div className="card-body py-10 px-12">
        <div className="small text-muted mb-0">{label}</div>
        <div className="fw-semibold fs-6 tabular-nums mb-0">{value}</div>
      </div>
    </div>
  );
}

export default function StaffStockRequestDetailClient() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const requestId = useMemo(() => String(params?.requestId ?? params?.id ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);
  const toast = useToast();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const permissions = myAccess?.permissions ?? [];
  const canRead = permissions.includes(REQUIRED_PERM);
  const canSubmit = permissions.includes("inventory.update") || permissions.includes("inventory.transfer");
  const canReceive = permissions.includes("inventory.receive");

  const listPath = staffStockRequestListPath(branchId);

  const refetchRequest = useCallback(async () => {
    const idNum = Number(requestId);
    if (!requestId || !Number.isFinite(idNum) || idNum < 1) return;
    try {
      const data = await staffStockRequestGet(idNum);
      setRequest(data);
    } catch (e) {
      setError(e?.message ?? "Failed to refresh request.");
    }
  }, [requestId]);

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  useEffect(() => {
    if (!canRead) return;
    const idNum = Number(requestId);
    if (!requestId || !Number.isFinite(idNum) || idNum < 1) {
      setLoading(false);
      setRequest(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    staffStockRequestGet(idNum)
      .then((data) => {
        if (!cancelled) setRequest(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Failed to load stock request.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId, canRead]);

  const handleSubmit = async () => {
    if (!request || request.status !== "DRAFT") return;
    setActionLoading(true);
    setError("");
    try {
      await staffStockRequestSubmit(request.id);
      toast.success("Stock request submitted successfully");
      await refetchRequest();
    } catch (e) {
      const msg = e?.message ?? "Failed to submit";
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!request || !["DRAFT", "SUBMITTED"].includes(request.status)) return;
    if (typeof window !== "undefined" && !window.confirm("Cancel this request?")) return;
    setActionLoading(true);
    setError("");
    try {
      await staffStockRequestCancel(request.id);
      toast.success("Stock request cancelled");
      await refetchRequest();
    } catch (e) {
      const msg = e?.message ?? "Failed to cancel";
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const totalRequestedFromItems = useMemo(() => {
    return (request?.items || []).reduce((sum, item) => sum + (item.requestedQty || 0), 0);
  }, [request]);

  const summaryTiles = useMemo(() => {
    if (!request) return [];
    const c = request.canonicalRequestSummary;
    const s = request.summary;
    const src = c && typeof c === "object" ? c : s && typeof s === "object" ? s : null;
    const tiles = [];
    const lineCount = request.items?.length ?? 0;
    tiles.push({ key: "lines", label: "Lines", value: lineCount });

    const rq = numOrDash(src?.totalRequestedQty);
    if (rq != null) tiles.push({ key: "req", label: "Requested", value: rq });
    else if (totalRequestedFromItems > 0) tiles.push({ key: "req", label: "Requested", value: totalRequestedFromItems });

    const fq = numOrDash(src?.totalFulfilledQty);
    if (fq != null) tiles.push({ key: "fulf", label: "Fulfilled", value: fq });

    const rem = numOrDash(src?.totalRemainingQty);
    if (rem != null) tiles.push({ key: "rem", label: "Remaining", value: rem });

    const cq = numOrDash(src?.totalCancelledQty);
    if (cq != null && cq > 0) tiles.push({ key: "canc", label: "Cancelled", value: cq });

    const dCount = request.dispatches?.length ?? 0;
    if (dCount > 0) tiles.push({ key: "disp", label: "Dispatches", value: dCount });

    const plan = request.allocationPlan;
    if (plan?.shortageQty != null && Number(plan.shortageQty) > 0) {
      tiles.push({ key: "short", label: "Shortage", value: Number(plan.shortageQty) });
    }

    return tiles;
  }, [request, totalRequestedFromItems]);

  const progressSteps = useMemo(() => (request ? stockRequestProgressSteps(request) : []), [request]);

  const intentBadge = useMemo(() => (request ? getStockRequestIntentBadgeProps(request) : null), [request]);

  const attentionBanner = useMemo(() => (request ? stockRequestAttentionMessage(request) : null), [request]);

  const nextHint = useMemo(() => (request ? stockRequestNextStepHint(request) : ""), [request]);

  const firstDispatchId = request?.dispatches?.[0]?.id;
  const showReceiveCta =
    canReceive &&
    firstDispatchId &&
    stockRequestNeedsAttention(request) &&
    ["DISPATCHED", "PARTIALLY_DISPATCHED", "PARTIALLY_RECEIVED", "RECEIVED_PARTIAL"].includes(
      String(request?.derivedStatus || request?.status || "").toUpperCase()
    );

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" aria-label="Loading" />
        <p className="mt-16 text-secondary-light mb-0">Loading...</p>
      </div>
    );
  }
  if (errorCode === "forbidden" || !hasViewPermission || !canRead) {
    return (
      <AccessDenied
        missingPerm={REQUIRED_PERM}
        onBack={() => router.push(listPath)}
      />
    );
  }

  if (loading) {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="py-40 text-center text-secondary-light">
          <div className="spinner-border text-primary mb-12" role="status" aria-label="Loading" />
          <div>Loading request…</div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="py-40 text-center text-secondary-light">
          <div className="mb-12">Request not found or inaccessible.</div>
          <Link href={listPath} className="btn btn-sm btn-outline-secondary radius-12">
            Back to list
          </Link>
        </div>
      </div>
    );
  }

  const requesterName =
    request.requester?.profile?.displayName ?? (request.requesterUserId ? `User #${request.requesterUserId}` : "—");
  const branchName = request.branch?.name ?? `Branch #${branchId}`;

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <nav aria-label="breadcrumb" className="mb-16">
        <ol className="breadcrumb mb-0 small">
          <li className="breadcrumb-item">
            <Link href="/staff">Staff</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href="/staff/branch">Branches</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href={`/staff/branch/${branchId}`}>{branch?.name || `Branch #${branchId}`}</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href={`/staff/branch/${branchId}/inventory`}>Inventory</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href={listPath}>Stock requests</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            #{request.id}
          </li>
        </ol>
      </nav>

      {error ? (
        <div className="alert alert-danger d-flex align-items-center justify-content-between mb-16 radius-12">
          <span className="small">{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="d-flex flex-wrap align-items-start justify-content-between gap-12 mb-24">
        <div className="min-w-0 flex-grow-1">
          <div className="d-flex flex-wrap align-items-center gap-8 mb-8">
            <Link href={listPath} className="btn btn-outline-secondary btn-sm radius-12">
              ← List
            </Link>
          </div>
          <h5 className="mb-8">
            Stock request <span className="fw-semibold">#{request.id}</span>
          </h5>
          <div className="d-flex flex-wrap align-items-center gap-8 mb-8">
            {intentBadge ? (
              <span className={`small ${intentBadge.className}`}>{intentBadge.label}</span>
            ) : null}
            <span
              className={`badge ${stockRequestStatusBadgeClass(request)}`}
              title={
                request.derivedStatus && request.derivedStatus !== request.status
                  ? `Stored: ${request.status}`
                  : undefined
              }
            >
              {formatStockRequestStatusLabel(request)}
            </span>
            {request.linkedPurchaseOrderId ? (
              <span className="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle">
                PO #{request.linkedPurchaseOrderId}
              </span>
            ) : null}
            {nextHint ? <span className="text-muted small">{nextHint}</span> : null}
          </div>
          <p className="text-muted small mb-0">
            <span className="text-body">{requesterName}</span>
            <span className="mx-6">·</span>
            <span className="text-body">{branchName}</span>
            <span className="mx-6">·</span>
            Created {formatDateShort(request.createdAt)} {formatTimeShort(request.createdAt)}
            <span className="mx-6">·</span>
            Updated {formatDateShort(request.updatedAt)} {formatTimeShort(request.updatedAt)}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-8 shrink-0">
          {showReceiveCta ? (
            <Link
              href={staffDispatchReceiveWorkspacePath(branchId, firstDispatchId)}
              className="btn btn-primary btn-sm radius-12"
            >
              Receive dispatch
            </Link>
          ) : null}
          {canReceive && !showReceiveCta ? (
            <Link href={`/staff/branch/${branchId}/inventory/incoming`} className="btn btn-outline-secondary btn-sm radius-12">
              Incoming
            </Link>
          ) : null}
          {request.status === "DRAFT" && canSubmit ? (
            <button
              type="button"
              className="btn btn-primary btn-sm radius-12"
              onClick={handleSubmit}
              disabled={actionLoading}
            >
              {actionLoading ? "Submitting…" : "Submit"}
            </button>
          ) : null}
          {["DRAFT", "SUBMITTED"].includes(request.status) && canSubmit ? (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm radius-12"
              onClick={handleCancel}
              disabled={actionLoading}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      {attentionBanner ? (
        <div className="alert alert-warning py-8 px-12 small mb-16 radius-12">
          <strong className="me-4">Attention:</strong>
          {attentionBanner}
        </div>
      ) : null}

      <div className="row g-8 mb-24">
        {summaryTiles.map((t) => (
          <div key={t.key} className="col-6 col-md-4 col-lg-3 col-xl-2">
            <StatTile label={t.label} value={t.value} />
          </div>
        ))}
      </div>

      {request.allocationPlan?.status ? (
        <p className="small text-muted mb-16">
          Plan #{request.allocationPlan.id}: <strong>{request.allocationPlan.status}</strong>
          {request.allocationPlan.totalAllocatedQty != null ? ` · allocated ${request.allocationPlan.totalAllocatedQty}` : null}
        </p>
      ) : null}

      <Card title="Progress" className="mb-24">
        <div className="row g-16">
          <div className="col-12 col-md-5">
            <ul className="list-unstyled small mb-0">
              {progressSteps.map((step) => {
                const muted = step.state === "pending" || step.state === "skipped";
                const current = step.state === "current";
                const titleClass = current ? "fw-semibold text-primary" : muted ? "text-muted" : "fw-medium text-body";
                return (
                  <li key={step.key} className="mb-10 pb-8 border-bottom border-light">
                    <div className={titleClass}>{step.title}</div>
                    <div className="text-muted text-truncate small">{step.subtitle}</div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="col-12 col-md-7">
            <ul className="list-unstyled small mb-0">
              <li className="mb-10">
                <span className="text-muted">Created</span>{" "}
                <span className="text-body">{formatDateTime(request.createdAt)}</span>
              </li>
              {request.submittedAt ? (
                <li className="mb-10">
                  <span className="text-muted">Submitted</span>{" "}
                  <span className="text-body">{formatDateTime(request.submittedAt)}</span>
                </li>
              ) : null}
              {request.transfers?.[0] ? (
                <li className="mb-10">
                  <span className="text-muted">Transfer #{request.transfers[0].id}</span>{" "}
                  <span className="text-body">{request.transfers[0].status}</span>
                  {request.transfers[0].sentAt ? (
                    <span className="text-muted"> · {formatDateTime(request.transfers[0].sentAt)}</span>
                  ) : null}
                </li>
              ) : null}
              {(request.dispatches || []).map((d) => (
                <li key={d.id} className="mb-10">
                  <span className="text-muted">Dispatch #{d.id}</span>{" "}
                  <span className="text-body">{d.status}</span>
                  {canReceive ? (
                    <>
                      {" "}
                      <Link href={staffDispatchReceiveWorkspacePath(branchId, d.id)} className="small">
                        Receive
                      </Link>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <div className="row g-12 mb-24">
        <div className="col-12 col-lg-6">
          <Card
            title="Notes & context"
            subtitle="Procurement and branch messaging"
          >
            {request.requestIntent === "PROCUREMENT" && request.procurementNote ? (
              <div className="small text-break mb-0" style={{ maxHeight: "8rem", overflowY: "auto" }}>
                {request.procurementNote}
              </div>
            ) : (
              <p className="text-muted small mb-0">No procurement note.</p>
            )}
            {request.requestIntent === "INTERNAL_TRANSFER" &&
            Array.isArray(request.procurementDemandLines) &&
            request.procurementDemandLines.length > 0 ? (
              <div className="alert alert-info small mt-12 mb-0 py-8 px-12 radius-12" role="status">
                {request.procurementDemandLines.length} procurement demand line(s) linked (shortage path).
              </div>
            ) : null}
            {request.declineReason ? (
              <div className="mt-12 pt-12 border-top small">
                <div className="text-muted mb-4">Decline</div>
                <div className="text-danger text-break">{request.declineReason}</div>
              </div>
            ) : null}
          </Card>
        </div>
        <div className="col-12 col-lg-6">
          <Card title="Organization">
            <dl className="row small mb-0">
              <dt className="col-5 text-muted">Org</dt>
              <dd className="col-7 mb-8 text-break">{request.org?.name ?? `#${request.orgId}`}</dd>
              <dt className="col-5 text-muted">Branch</dt>
              <dd className="col-7 mb-0 text-break">{branchName}</dd>
            </dl>
          </Card>
        </div>
      </div>

      <Card title="Line items" subtitle="Requested quantities and fulfillment by line">
        <div className="table-responsive">
          <table className="table table-sm table-hover mb-0">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col" className="text-end">
                  Req
                </th>
                <th scope="col" className="text-end">
                  Ful
                </th>
                <th scope="col" className="text-end">
                  Canc
                </th>
                <th scope="col" className="text-end">
                  Rem
                </th>
                <th scope="col">BO</th>
                <th scope="col">Note</th>
              </tr>
            </thead>
            <tbody className="small">
              {(request.items || []).map((item) => {
                const rem =
                  item.remainingQty != null
                    ? item.remainingQty
                    : Math.max(0, (item.requestedQty || 0) - (item.fulfilledQty || 0) - (item.cancelledQty || 0));
                const partial = (item.fulfilledQty || 0) > 0 && rem > 0 ? "table-warning" : "";
                const pname = item.product?.name ?? `Product #${item.productId}`;
                const vtitle = item.variant?.title ?? item.variant?.sku ?? `#${item.variantId}`;
                const sku = item.variant?.sku;
                return (
                  <tr key={item.id} className={partial}>
                    <td className="lh-sm" style={{ maxWidth: "18rem" }}>
                      <div className="text-truncate" title={pname}>
                        {pname}
                      </div>
                      <div className="text-muted text-truncate small" title={sku ? `${vtitle} · ${sku}` : vtitle}>
                        {vtitle}
                        {sku ? ` · ${sku}` : null}
                      </div>
                    </td>
                    <td className="text-end tabular-nums fw-medium">{item.requestedQty ?? "—"}</td>
                    <td className="text-end tabular-nums">{item.fulfilledQty ?? "—"}</td>
                    <td className="text-end tabular-nums">{item.cancelledQty ?? "—"}</td>
                    <td className="text-end tabular-nums">{rem}</td>
                    <td>
                      {item.backorderStatus && item.backorderStatus !== "NONE" ? (
                        <span className={`badge bg-warning text-dark small`}>{item.backorderStatus}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td style={{ maxWidth: "10rem" }}>
                      {item.note ? (
                        <span className="d-inline-block text-truncate w-100" title={item.note}>
                          {item.note}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
