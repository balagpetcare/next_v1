"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ownerClinicSupplyRequestsList,
  ownerClinicSupplyRequestById,
  ownerClinicSupplyRequestReview,
  ownerClinicSupplyRequestMarkOrdered,
  ownerClinicSupplyRequestMarkReceived,
  ownerClinicTransferFromRequest,
  ownerClinicTransfersList,
  ownerClinicTransferById,
  ownerClinicTransferDispatch,
  ownerClinicBranches,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

type SupplyRequestRow = {
  id: number;
  requestNo: string;
  branchId: number;
  branch?: { id: number; name: string };
  status: string;
  priority?: string;
  requestedAt?: string;
  items?: Array<{
    id: number;
    clinicalItemId: number;
    variantId?: number;
    requestedQty: number;
    approvedQty?: number;
    clinicalItem?: { id: number; name: string; itemCode?: string };
    variant?: { id: number; variantName: string };
  }>;
};

type TransferRow = {
  id: number;
  transferNo: string;
  fromBranchId: number;
  toBranchId: number;
  fromBranch?: { id: number; name: string };
  toBranch?: { id: number; name: string };
  status: string;
  supplyRequestId?: number;
  items?: Array<{
    id: number;
    clinicalItemId: number;
    qtySent: number;
    qtyReceived?: number;
    clinicalItem?: { id: number; name: string };
    variant?: { id: number; variantName: string };
  }>;
};

type BranchRow = { id: number; name: string };

const OWNER_CLINIC_NAV = [
  { key: "overview", label: "Clinic Network", href: "/owner/clinic" },
  { key: "doctors", label: "Doctors", href: "/owner/clinic?view=doctors" },
  { key: "services", label: "Services", href: "/owner/clinic?view=services" },
  { key: "catalog", label: "Catalog", href: "/owner/clinic?view=catalog" },
  { key: "packages", label: "Packages", href: "/owner/clinic?view=packages" },
  { key: "inventory", label: "Inventory", href: "/owner/clinic?view=inventory" },
  { key: "supply-requests", label: "Supply requests", href: "/owner/clinic/supply-requests" },
  { key: "schedule", label: "Schedule", href: "/owner/clinic?view=schedule" },
  { key: "reports", label: "Reports", href: "/owner/clinic?view=reports" },
  { key: "settings", label: "Settings", href: "/owner/clinic?view=settings" },
];

export default function OwnerClinicSupplyRequestsPage() {
  const [tab, setTab] = useState<"requests" | "transfers">("requests");
  const [requests, setRequests] = useState<SupplyRequestRow[]>([]);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [totalRequests, setTotalRequests] = useState(0);
  const [totalTransfers, setTotalTransfers] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailRequest, setDetailRequest] = useState<SupplyRequestRow | null>(null);
  const [detailTransfer, setDetailTransfer] = useState<TransferRow | null>(null);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [reviewDecision, setReviewDecision] = useState<"APPROVED" | "PARTIAL_APPROVED" | "REJECTED">("APPROVED");
  const [reviewNote, setReviewNote] = useState("");
  const [approvedQtys, setApprovedQtys] = useState<Record<number, number>>({});
  const [fromBranchId, setFromBranchId] = useState<number | "">("");
  const [receivedQtys, setReceivedQtys] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      const { items, total } = await ownerClinicSupplyRequestsList({
        status: statusFilter || undefined,
        limit: 100,
        offset: 0,
      });
      setRequests((items || []) as SupplyRequestRow[]);
      setTotalRequests(total ?? 0);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load requests");
    }
  }, [statusFilter]);

  const loadTransfers = useCallback(async () => {
    try {
      const { items, total } = await ownerClinicTransfersList({
        status: statusFilter || undefined,
      });
      setTransfers((items || []) as TransferRow[]);
      setTotalTransfers(total ?? 0);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load transfers");
    }
  }, [statusFilter]);

  useEffect(() => {
    let mounted = true;
    setError("");
    (async () => {
      setLoading(true);
      try {
        const [branchesRes] = await Promise.all([
          ownerClinicBranches(),
          tab === "requests" ? loadRequests() : loadTransfers(),
        ]);
        if (!mounted) return;
        const branchList = Array.isArray((branchesRes as { data?: unknown[] })?.data)
          ? ((branchesRes as { data: unknown[] }).data as BranchRow[])
          : [];
        setBranches(branchList);
      } catch (e) {
        if (mounted) setError((e as Error)?.message ?? "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [tab, loadRequests, loadTransfers]);

  useEffect(() => {
    if (tab === "requests") loadRequests();
    else loadTransfers();
  }, [tab, statusFilter, loadRequests, loadTransfers]);

  const openRequestDetail = async (id: number) => {
    setActionError("");
    setActionSuccess("");
    try {
      const data = await ownerClinicSupplyRequestById(id);
      setDetailRequest(data as SupplyRequestRow);
      const req = data as SupplyRequestRow;
      const qtys: Record<number, number> = {};
      (req?.items || []).forEach((i) => {
        qtys[i.id] = i.approvedQty ?? i.requestedQty;
      });
      setApprovedQtys(qtys);
      setReviewDecision("APPROVED");
      setReviewNote("");
      setFromBranchId(req?.branchId ?? "");
    } catch (e) {
      setActionError((e as Error)?.message ?? "Failed to load request");
    }
  };

  const openTransferDetail = async (id: number) => {
    setActionError("");
    setActionSuccess("");
    try {
      const data = await ownerClinicTransferById(id);
      setDetailTransfer(data as TransferRow);
    } catch (e) {
      setActionError((e as Error)?.message ?? "Failed to load transfer");
    }
  };

  const handleReview = async () => {
    if (!detailRequest) return;
    setSaving(true);
    setActionError("");
    try {
      const items = (detailRequest.items || []).map((i) => ({
        requestItemId: i.id,
        approvedQty: reviewDecision === "REJECTED" ? 0 : (approvedQtys[i.id] ?? i.requestedQty),
      }));
      await ownerClinicSupplyRequestReview(detailRequest.id, {
        decision: reviewDecision,
        reviewNote: reviewNote || undefined,
        items,
      });
      setActionSuccess("Review submitted.");
      setDetailRequest(null);
      loadRequests();
    } catch (e) {
      setActionError((e as Error)?.message ?? "Review failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTransfer = async () => {
    if (!detailRequest || fromBranchId === "" || typeof fromBranchId !== "number") {
      setActionError("Select source branch");
      return;
    }
    setSaving(true);
    setActionError("");
    try {
      await ownerClinicTransferFromRequest(detailRequest.id, { fromBranchId });
      setActionSuccess("Transfer created. You can dispatch it from the Transfers tab.");
      setDetailRequest(null);
      loadRequests();
      loadTransfers();
    } catch (e) {
      setActionError((e as Error)?.message ?? "Create transfer failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDispatch = async () => {
    if (!detailTransfer) return;
    setSaving(true);
    setActionError("");
    try {
      await ownerClinicTransferDispatch(detailTransfer.id);
      setActionSuccess("Transfer dispatched. Branch can now receive it.");
      setDetailTransfer(null);
      loadTransfers();
    } catch (e) {
      setActionError((e as Error)?.message ?? "Dispatch failed");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkOrdered = async () => {
    if (!detailRequest) return;
    setSaving(true);
    setActionError("");
    try {
      await ownerClinicSupplyRequestMarkOrdered(detailRequest.id);
      setActionSuccess("Request marked as ordered.");
      setDetailRequest(null);
      loadRequests();
    } catch (e) {
      setActionError((e as Error)?.message ?? "Mark ordered failed");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReceived = async () => {
    if (!detailRequest?.items?.length) return;
    setSaving(true);
    setActionError("");
    try {
      const items = detailRequest.items.map((i) => ({
        requestItemId: i.id,
        receivedQty: receivedQtys[i.id] ?? i.approvedQty ?? i.requestedQty ?? 0,
      }));
      await ownerClinicSupplyRequestMarkReceived(detailRequest.id, { items, postToInventory: true });
      setActionSuccess("Receipt recorded.");
      setReceivedQtys({});
      setDetailRequest(null);
      loadRequests();
    } catch (e) {
      setActionError((e as Error)?.message ?? "Mark received failed");
    } finally {
      setSaving(false);
    }
  };

  const canReview = (r: SupplyRequestRow) => r.status === "OWNER_REVIEW";
  const canMarkOrdered = (r: SupplyRequestRow) =>
    r.status === "APPROVED" || r.status === "PARTIAL_APPROVED" || r.status === "PARTIALLY_APPROVED";
  const canMarkReceived = (r: SupplyRequestRow) =>
    r.status === "ORDERED" || r.status === "PARTIALLY_RECEIVED";
  const canCreateTransfer = (r: SupplyRequestRow) =>
    (r.status === "APPROVED" || r.status === "PARTIAL_APPROVED" || r.status === "PARTIALLY_APPROVED") && (r.items?.length ?? 0) > 0;
  const canDispatch = (t: TransferRow) => t.status === "CREATED";

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Supply requests"
        subtitle="Review branch supply requests and manage stock transfers"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Supply requests", href: "/owner/clinic/supply-requests" },
        ]}
      />

      <div className="card radius-12 mb-4">
        <div className="card-body p-16">
          <ul className="nav sub-navbar-nav">
            {OWNER_CLINIC_NAV.map((item) => (
              <li className="sub-nav-item" key={item.key}>
                <Link
                  href={item.href}
                  className={`sub-nav-link ${item.key === "supply-requests" ? "active" : ""}`.trim()}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger radius-12 mb-3">{error}</div>
      )}
      {actionSuccess && (
        <div className="alert alert-success radius-12 mb-3">{actionSuccess}</div>
      )}

      <div className="card radius-12 mb-3">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <button
              type="button"
              className={`btn ${tab === "requests" ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setTab("requests")}
            >
              Requests
            </button>
            <button
              type="button"
              className={`btn ${tab === "transfers" ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setTab("transfers")}
            >
              Transfers
            </button>
            <select
              className="form-select form-select-sm w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              {tab === "requests" && (
                <>
                  <option value="DRAFT">Draft</option>
                  <option value="OWNER_REVIEW">Under review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PARTIAL_APPROVED">Partially approved</option>
                  <option value="PARTIALLY_APPROVED">Partially approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="ORDERED">Ordered</option>
                  <option value="PARTIALLY_RECEIVED">Partially received</option>
                  <option value="RECEIVED">Received</option>
                  <option value="CANCELLED">Cancelled</option>
                </>
              )}
              {tab === "transfers" && (
                <>
                  <option value="CREATED">Created</option>
                  <option value="IN_TRANSIT">In transit</option>
                  <option value="RECEIVED">Received</option>
                </>
              )}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" />
              <p className="text-muted mt-2 mb-0">Loading…</p>
            </div>
          ) : tab === "requests" ? (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Request #</th>
                    <th>Branch</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Requested</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr><td colSpan={6} className="text-muted text-center py-4">No supply requests</td></tr>
                  ) : (
                    requests.map((r) => (
                      <tr key={r.id}>
                        <td>{r.requestNo}</td>
                        <td>{r.branch?.name ?? r.branchId}</td>
                        <td><span className="badge bg-secondary">{r.status}</span></td>
                        <td>{r.priority ?? "—"}</td>
                        <td>{r.requestedAt ? new Date(r.requestedAt).toLocaleDateString() : "—"}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openRequestDetail(r.id)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Transfer #</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.length === 0 ? (
                    <tr><td colSpan={5} className="text-muted text-center py-4">No transfers</td></tr>
                  ) : (
                    transfers.map((t) => (
                      <tr key={t.id}>
                        <td>{t.transferNo}</td>
                        <td>{t.fromBranch?.name ?? t.fromBranchId}</td>
                        <td>{t.toBranch?.name ?? t.toBranchId}</td>
                        <td><span className="badge bg-secondary">{t.status}</span></td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openTransferDetail(t.id)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Request detail modal */}
      {detailRequest && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Request {detailRequest.requestNo}</h5>
                <button type="button" className="btn-close" onClick={() => setDetailRequest(null)} />
              </div>
              <div className="modal-body">
                <p><strong>Branch:</strong> {detailRequest.branch?.name ?? detailRequest.branchId}</p>
                <p><strong>Status:</strong> {detailRequest.status}</p>
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Variant</th>
                      <th>Requested</th>
                      {canReview(detailRequest) && <th>Approve qty</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(detailRequest.items || []).map((i) => (
                      <tr key={i.id}>
                        <td>{i.clinicalItem?.name ?? i.clinicalItemId}</td>
                        <td>{i.variant?.variantName ?? "—"}</td>
                        <td>{i.requestedQty}</td>
                        {canReview(detailRequest) && (
                          <td>
                            <input
                              type="number"
                              className="form-control form-control-sm w-80"
                              min={0}
                              value={approvedQtys[i.id] ?? i.requestedQty}
                              onChange={(e) =>
                                setApprovedQtys((prev) => ({
                                  ...prev,
                                  [i.id]: parseInt(e.target.value, 10) || 0,
                                }))
                              }
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {canReview(detailRequest) && (
                  <>
                    <label className="form-label mt-2">Decision</label>
                    <select
                      className="form-select mb-2"
                      value={reviewDecision}
                      onChange={(e) => setReviewDecision(e.target.value as "APPROVED" | "PARTIAL_APPROVED" | "REJECTED")}
                    >
                      <option value="APPROVED">Approve</option>
                      <option value="PARTIAL_APPROVED">Partial approve</option>
                      <option value="REJECTED">Reject</option>
                    </select>
                    <label className="form-label">Review note</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="Optional note"
                    />
                  </>
                )}
                {canMarkReceived(detailRequest) && (detailRequest.items?.length ?? 0) > 0 && (
                  <>
                    <label className="form-label mt-2">Record receipt (qty received per line)</label>
                    <table className="table table-sm mt-1">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Approved</th>
                          <th>Received qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detailRequest.items || []).map((i) => (
                          <tr key={i.id}>
                            <td>{i.clinicalItem?.name ?? i.clinicalItemId}</td>
                            <td>{i.approvedQty ?? "—"}</td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm w-80"
                                min={0}
                                max={i.approvedQty ?? i.requestedQty}
                                value={receivedQtys[i.id] ?? i.approvedQty ?? i.requestedQty ?? 0}
                                onChange={(e) =>
                                  setReceivedQtys((prev) => ({
                                    ...prev,
                                    [i.id]: parseInt(e.target.value, 10) || 0,
                                  }))
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
                {canCreateTransfer(detailRequest) && (
                  <>
                    <label className="form-label mt-2">Create transfer from branch</label>
                    <select
                      className="form-select"
                      value={fromBranchId}
                      onChange={(e) => setFromBranchId(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                    >
                      <option value="">Select branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </>
                )}
                {actionError && <div className="alert alert-danger mt-2 mb-0">{actionError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDetailRequest(null)}>
                  Close
                </button>
                {canReview(detailRequest) && (
                  <button type="button" className="btn btn-primary" disabled={saving} onClick={handleReview}>
                    {saving ? "Saving…" : "Submit review"}
                  </button>
                )}
                {canMarkOrdered(detailRequest) && (
                  <button type="button" className="btn btn-outline-primary" disabled={saving} onClick={handleMarkOrdered}>
                    {saving ? "Saving…" : "Mark ordered"}
                  </button>
                )}
                {canMarkReceived(detailRequest) && (
                  <button type="button" className="btn btn-outline-success" disabled={saving} onClick={handleMarkReceived}>
                    {saving ? "Saving…" : "Mark received"}
                  </button>
                )}
                {canCreateTransfer(detailRequest) && (
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={saving || fromBranchId === ""}
                    onClick={handleCreateTransfer}
                  >
                    {saving ? "Creating…" : "Create transfer"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer detail modal */}
      {detailTransfer && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Transfer {detailTransfer.transferNo}</h5>
                <button type="button" className="btn-close" onClick={() => setDetailTransfer(null)} />
              </div>
              <div className="modal-body">
                <p><strong>From:</strong> {detailTransfer.fromBranch?.name ?? detailTransfer.fromBranchId}</p>
                <p><strong>To:</strong> {detailTransfer.toBranch?.name ?? detailTransfer.toBranchId}</p>
                <p><strong>Status:</strong> {detailTransfer.status}</p>
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Variant</th>
                      <th>Qty sent</th>
                      <th>Qty received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detailTransfer.items || []).map((i) => (
                      <tr key={i.id}>
                        <td>{i.clinicalItem?.name ?? i.clinicalItemId}</td>
                        <td>{i.variant?.variantName ?? "—"}</td>
                        <td>{i.qtySent}</td>
                        <td>{i.qtyReceived ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {actionError && <div className="alert alert-danger mb-0">{actionError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDetailTransfer(null)}>
                  Close
                </button>
                {canDispatch(detailTransfer) && (
                  <button type="button" className="btn btn-primary" disabled={saving} onClick={handleDispatch}>
                    {saving ? "Dispatching…" : "Dispatch"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
