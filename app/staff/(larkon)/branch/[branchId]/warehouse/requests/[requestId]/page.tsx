"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { allocationPlanGet, staffStockRequestGet, warehouseAccessible } from "@/lib/api";
import StaffBranchLayout from "@/src/components/branch/StaffBranchLayout";
import { useBranchContext } from "@/lib/useBranchContext";
import { getWarehouseCapabilities } from "@/src/lib/warehouseRbac";
import WarehouseAccessFallback from "../../_components/WarehouseAccessFallback";
import {
  fulfillmentRequestStatusBadgeClass,
  fulfillmentRequestStatusLabel,
} from "@/src/lib/staffFulfillmentRequestsUi";

type PickListRow = {
  id: number;
  status?: string;
  stockDispatchId?: number | null;
  fromLocationId?: number;
};

function primaryPickList(picks: PickListRow[] | null | undefined): PickListRow | null {
  if (!picks?.length) return null;
  const list = [...picks].sort((a, b) => b.id - a.id);
  const open = list.filter((p) => ["DRAFT", "IN_PROGRESS"].includes(String(p.status || "").toUpperCase()));
  if (open.length) return open[0];
  const completed = list.filter(
    (p) => String(p.status || "").toUpperCase() === "COMPLETED" && !p.stockDispatchId
  );
  if (completed.length) return completed[0];
  return list[0];
}

export default function StaffWarehouseFulfillmentRequestDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const branchId = String(params?.branchId ?? "");
  const requestId = Number(params?.requestId);
  const focus = searchParams.get("focus");
  const dispatchId = searchParams.get("dispatchId");

  const { myAccess } = useBranchContext(branchId);
  const caps = getWarehouseCapabilities(myAccess?.permissions ?? []);

  const [sr, setSr] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [whId, setWhId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!Number.isFinite(requestId) || requestId < 1) {
      setError("Invalid request");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const list = await warehouseAccessible().catch(() => []);
      const first = Array.isArray(list) && list.length ? Number((list[0] as { id?: number })?.id) : null;
      setWhId(Number.isFinite(first) ? first : null);

      const data = await staffStockRequestGet(requestId);
      setSr(data);

      const planId = data?.allocationPlan?.id ?? data?.allocationPlans?.[0]?.id;
      const orgId = data?.orgId != null ? Number(data.orgId) : undefined;
      if (planId && orgId) {
        try {
          const p = await allocationPlanGet(Number(planId), orgId);
          setPlan(p);
        } catch {
          setPlan(null);
        }
      } else {
        setPlan(null);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      setError(msg);
      setSr(null);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pick = useMemo(() => primaryPickList(plan?.pickLists as PickListRow[] | undefined), [plan]);

  const primaryOpen = useMemo(() => {
    if (!branchId) return null;
    const base = `/staff/branch/${branchId}`;
    if (focus === "dispatch" && dispatchId) {
      return { href: `${base}/inventory/receive?dispatch=${dispatchId}`, label: "Dispatch / receive" };
    }
    if (pick?.id) {
      const st = String(pick.status || "").toUpperCase();
      if (["DRAFT", "IN_PROGRESS", "COMPLETED"].includes(st)) {
        return { href: `${base}/warehouse/pick-lists/${pick.id}`, label: "Pick list" };
      }
    }
    if (plan?.id) {
      return { href: `${base}/warehouse/requests/${requestId}`, label: "Review plan status" };
    }
    return { href: `${base}/inventory/stock-request-detail/${requestId}`, label: "Request details" };
  }, [branchId, dispatchId, focus, pick, plan?.id, requestId]);

  const dispatches = Array.isArray(sr?.dispatches) ? sr.dispatches : [];
  const items = Array.isArray(sr?.items) ? sr.items : [];

  if (!caps.hasAnyWarehouseAccess) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <WarehouseAccessFallback
          branchId={branchId}
          title="Warehouse access required"
          message="This fulfillment view requires warehouse permissions."
        />
      </StaffBranchLayout>
    );
  }

  return (
    <StaffBranchLayout branchId={branchId} requiredPermission={null}>
      <div className="container-fluid py-3 px-2 px-sm-3">
        <nav aria-label="breadcrumb" className="mb-2">
          <ol className="breadcrumb mb-0 small">
            <li className="breadcrumb-item">
              <Link href="/staff">Staff</Link>
            </li>
            <li className="breadcrumb-item">
              <Link href={`/staff/branch/${branchId}/warehouse`}>Warehouse</Link>
            </li>
            <li className="breadcrumb-item">
              <Link href={`/staff/branch/${branchId}/warehouse/requests`}>Fulfillment requests</Link>
            </li>
            <li className="breadcrumb-item active">Request #{requestId}</li>
          </ol>
        </nav>

        <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
          <div>
            <h5 className="fw-semibold mb-1">Fulfillment request #{requestId}</h5>
            <p className="text-muted small mb-0">Pick, dispatch, and receive — enterprise allocation path.</p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Link href={`/staff/branch/${branchId}/warehouse/requests`} className="btn btn-sm btn-outline-secondary radius-12">
              ← Queue
            </Link>
            {primaryOpen ? (
              <Link href={primaryOpen.href} className="btn btn-sm btn-primary radius-12">
                {primaryOpen.label}
              </Link>
            ) : null}
          </div>
        </div>

        {focus === "dispatch" && dispatchId ? (
          <div className="alert alert-info radius-12 py-2 px-3 small mb-4" role="status">
            <strong>Dispatch focus:</strong> dispatch #{dispatchId}. Use <strong>Dispatch / receive</strong> to open the receive workspace.
          </div>
        ) : null}

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" />
            <p className="mt-2 text-muted small">Loading request…</p>
          </div>
        ) : error ? (
          <div className="alert alert-danger radius-12">
            <div className="fw-semibold mb-1">Unable to load this request</div>
            <div className="small mb-0">{error}</div>
            {error.toLowerCase().includes("not authorized") ? (
              <p className="small text-muted mt-2 mb-0">
                If you expect access, confirm you are on the correct branch shell and have warehouse permissions, or that this
                request is tied to your warehouse (pick/dispatch from your locations).
              </p>
            ) : null}
          </div>
        ) : !sr ? (
          <div className="alert alert-warning radius-12">Request not found.</div>
        ) : (
          <>
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div className="card radius-12 border h-100">
                  <div className="card-header py-2 px-3">
                    <h6 className="mb-0 fw-semibold">Status</h6>
                  </div>
                  <div className="card-body px-3 py-3">
                    <span className={`badge ${fulfillmentRequestStatusBadgeClass(sr.status)}`}>
                      {fulfillmentRequestStatusLabel(sr.status)}
                    </span>
                    {sr.derivedStatusDisplay ? (
                      <div className="small text-muted mt-2">Workflow: {String(sr.derivedStatusDisplay)}</div>
                    ) : sr.derivedStatus ? (
                      <div className="small text-muted mt-2">Workflow: {String(sr.derivedStatus)}</div>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card radius-12 border h-100">
                  <div className="card-header py-2 px-3">
                    <h6 className="mb-0 fw-semibold">Branch &amp; org</h6>
                  </div>
                  <div className="card-body px-3 py-3 small">
                    <div className="mb-2">
                      <span className="text-muted d-block">Requesting branch</span>
                      <span className="fw-medium">{sr.branch?.name ?? "—"}</span>
                    </div>
                    <div className="mb-0">
                      <span className="text-muted d-block">Organization</span>
                      <span>{sr.org?.name ?? "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card radius-12 border h-100">
                  <div className="card-header py-2 px-3">
                    <h6 className="mb-0 fw-semibold">Requester</h6>
                  </div>
                  <div className="card-body px-3 py-3 small">
                    <div className="mb-2">
                      <span className="text-muted d-block">Requested by</span>
                      <span>{sr.requester?.profile?.displayName ?? "—"}</span>
                    </div>
                    <div className="mb-0 text-muted">
                      Created: {sr.createdAt ? new Date(sr.createdAt).toLocaleString() : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {plan?.id != null && (
              <div className="card radius-12 border mb-4">
                <div className="card-header py-2 px-3 d-flex align-items-center justify-content-between">
                  <h6 className="mb-0 fw-semibold">Allocation plan #{plan.id}</h6>
                  <span className="badge bg-light text-dark border">{plan.status ?? "—"}</span>
                </div>
                <div className="card-body px-3 py-3">
                  <div className="row g-2 small text-muted mb-3">
                    <div className="col-sm-4">
                      Demand: <span className="text-dark fw-medium">{plan.totalDemandQty ?? "—"}</span>
                    </div>
                    <div className="col-sm-4">
                      Allocated: <span className="text-dark fw-medium">{plan.totalAllocatedQty ?? "—"}</span>
                    </div>
                    <div className="col-sm-4">
                      Shortage: <span className="text-dark fw-medium">{plan.shortageQty ?? "—"}</span>
                    </div>
                  </div>
                  {pick?.id != null && (
                    <Link
                      href={`/staff/branch/${branchId}/warehouse/pick-lists/${pick.id}`}
                      className="btn btn-sm btn-primary radius-12"
                    >
                      Open pick list #{pick.id} ({pick.status ?? "?"})
                    </Link>
                  )}
                </div>
              </div>
            )}

            <div className="card radius-12 border mb-4">
              <div className="card-header py-2 px-3">
                <h6 className="mb-0 fw-semibold">Line items</h6>
              </div>
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th className="px-3">SKU</th>
                      <th className="px-3">Product</th>
                      <th className="text-end px-3">Requested</th>
                      <th className="text-end px-3">Fulfilled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-muted text-center py-4">
                          No lines
                        </td>
                      </tr>
                    ) : (
                      items.map((it: any) => (
                        <tr key={it.id}>
                          <td className="small px-3">{it.variant?.sku ?? "—"}</td>
                          <td className="small px-3">{it.variant?.title ?? it.product?.name ?? "—"}</td>
                          <td className="text-end small px-3">{it.requestedQty ?? 0}</td>
                          <td className="text-end small px-3">{it.fulfilledQty ?? 0}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card radius-12 border mb-4">
              <div className="card-header py-2 px-3">
                <h6 className="mb-0 fw-semibold">Dispatches</h6>
              </div>
              <div className="table-responsive">
                <table className="table table-sm mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th className="px-3">ID</th>
                      <th className="px-3">Status</th>
                      <th className="px-3">From loc.</th>
                      <th className="px-3">To loc.</th>
                      <th className="text-end px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatches.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-muted text-center py-4">
                          No dispatches yet
                        </td>
                      </tr>
                    ) : (
                      dispatches.map((d: any) => (
                        <tr key={d.id}>
                          <td className="px-3 fw-medium">#{d.id}</td>
                          <td className="px-3">
                            <span className="badge bg-secondary-subtle text-dark">{d.status ?? "—"}</span>
                          </td>
                          <td className="small px-3">{d.fromLocationId ?? "—"}</td>
                          <td className="small px-3">{d.toLocationId ?? "—"}</td>
                          <td className="text-end px-3">
                            <Link
                              href={`/staff/branch/${branchId}/warehouse/requests/${requestId}?focus=dispatch&dispatchId=${d.id}`}
                              className="btn btn-sm btn-outline-primary"
                            >
                              Receive
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 mb-3">
              {primaryOpen && (
                <Link href={primaryOpen.href} className="btn btn-dark btn-sm radius-12">
                  {primaryOpen.label}
                </Link>
              )}
              <Link
                href={`/staff/branch/${branchId}/inventory/stock-request-detail/${requestId}`}
                className="btn btn-outline-secondary btn-sm radius-12"
              >
                Branch request (read-only)
              </Link>
              <Link href={`/staff/branch/${branchId}/warehouse`} className="btn btn-outline-secondary btn-sm radius-12">
                Warehouse dashboard
              </Link>
            </div>
            {whId != null && <p className="small text-muted mb-0">Warehouse context: #{whId}</p>}
          </>
        )}
      </div>
    </StaffBranchLayout>
  );
}
