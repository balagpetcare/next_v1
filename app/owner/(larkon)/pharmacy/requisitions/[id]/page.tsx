"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { notify } from "@/app/owner/_components/Notification";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import { pharmacyApiUserMessage, logPharmacyApiError } from "@/src/lib/pharmacyApiMessage";

type RequisitionItem = {
  id: number;
  medicineListingId: number;
  requestedQty: number;
  approvedQty?: number | null;
  dispensedQty?: number | null;
  receivedQty?: number | null;
  unit?: string | null;
  note?: string | null;
  allowSubstitute?: boolean;
  medicineListing?: {
    id: number;
    packageMarkDisplay?: string;
    presentation?: {
      strengthDisplay?: string;
      generic?: { displayName?: string };
      dosageForm?: { displayName?: string };
    };
    brand?: {
      displayName?: string;
      manufacturer?: { displayName?: string };
    };
  };
  substitutedListing?: { id: number; packageMarkDisplay?: string; brand?: { displayName?: string } } | null;
  product?: { id: number; name?: string } | null;
  variant?: { id: number; sku?: string; title?: string } | null;
};

type TimelineEntry = {
  id: number;
  action: string;
  note?: string | null;
  createdAt: string;
  performedBy?: { id: number; profile?: { displayName?: string } } | null;
};

type Requisition = {
  id: number;
  requisitionNumber: string;
  orgId: number;
  branchId: number;
  status: string;
  urgency: string;
  note?: string | null;
  createdAt: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  completedAt?: string | null;
  rejectionReason?: string | null;
  reviewNote?: string | null;
  branch?: { id: number; name?: string };
  requestedBy?: { id: number; profile?: { displayName?: string } };
  reviewedBy?: { id: number; profile?: { displayName?: string } } | null;
  approvedBy?: { id: number; profile?: { displayName?: string } } | null;
  rejectedBy?: { id: number; profile?: { displayName?: string } } | null;
  items: RequisitionItem[];
  timeline?: TimelineEntry[];
};

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function statusClass(s: string) {
  const u = (s || "").toUpperCase();
  if (["DRAFT"].includes(u)) return "bg-secondary";
  if (["SUBMITTED", "UNDER_REVIEW"].includes(u)) return "bg-info";
  if (["APPROVED", "PARTIALLY_APPROVED", "READY_TO_DISPATCH"].includes(u)) return "bg-primary";
  if (["DISPATCHED", "IN_TRANSIT"].includes(u)) return "bg-warning text-dark";
  if (["RECEIVED", "PARTIALLY_RECEIVED", "COMPLETED"].includes(u)) return "bg-success";
  if (["REJECTED", "CANCELLED"].includes(u)) return "bg-danger";
  return "bg-light text-dark";
}

export default function OwnerPharmacyRequisitionDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const idValid = Number.isFinite(id) && id > 0;

  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Approval state: per-item approved qty
  const [approvedQtys, setApprovedQtys] = useState<Record<number, number>>({});
  const [reviewNote, setReviewNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const fetchRequisition = useCallback(async () => {
    if (!idValid) {
      setLoading(false);
      setRequisition(null);
      setLoadFailed(true);
      return;
    }
    setLoading(true);
    setLoadFailed(false);
    try {
      const res: any = await ownerGet(`/api/v1/medicine-requisitions/${id}`);
      if (res == null) {
        setRequisition(null);
        setLoadFailed(true);
        return;
      }
      const data = res?.data ?? res;
      setRequisition(data);
      if (data?.items) {
        const qtys: Record<number, number> = {};
        data.items.forEach((item: RequisitionItem) => {
          qtys[item.id] = item.approvedQty ?? item.requestedQty;
        });
        setApprovedQtys(qtys);
      }
    } catch (e: unknown) {
      logPharmacyApiError("owner requisition detail", e);
      notify.error("Could not load requisition", pharmacyApiUserMessage(e, "Please go back and try again."));
      setRequisition(null);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [id, idValid]);

  useEffect(() => { fetchRequisition(); }, [fetchRequisition]);

  const canApprove = requisition && ["SUBMITTED", "UNDER_REVIEW"].includes(requisition.status);
  const canReject = requisition && ["SUBMITTED", "UNDER_REVIEW"].includes(requisition.status);
  const canDispatch = requisition && ["APPROVED", "PARTIALLY_APPROVED", "READY_TO_DISPATCH"].includes(requisition.status);

  function validateApproval(): string | null {
    if (!requisition) return "Nothing to approve.";
    for (const item of requisition.items) {
      const q = approvedQtys[item.id] ?? item.requestedQty;
      if (!Number.isFinite(q) || q < 0) {
        return "Each approved quantity must be zero or greater.";
      }
      if (q > item.requestedQty) {
        return "Approved quantity cannot exceed requested quantity.";
      }
    }
    return null;
  }

  function requestApprove() {
    if (!requisition) return;
    const invalid = validateApproval();
    if (invalid) {
      notify.warning("Check line items", invalid);
      return;
    }
    notify.confirm(
      "Approve this requisition?",
      "Approved quantities will be used for dispatch and stock. You can add an optional review note above.",
      () => {
        void (async () => {
          setActionLoading(true);
          try {
            await ownerPost(`/api/v1/medicine-requisitions/${id}/approve`, {
              reviewNote: reviewNote || undefined,
              items: requisition.items.map((item) => ({
                itemId: item.id,
                approvedQty: approvedQtys[item.id] ?? item.requestedQty,
              })),
            });
            notify.success("Requisition approved.");
            await fetchRequisition();
          } catch (e: unknown) {
            logPharmacyApiError("requisition approve", e);
            notify.error("Approval failed", pharmacyApiUserMessage(e, "Could not approve this requisition."));
          } finally {
            setActionLoading(false);
          }
        })();
      },
      undefined,
      "Approve",
      "Cancel"
    );
  }

  function requestReject() {
    if (!requisition) return;
    const msg = rejectReason.trim()
      ? "The branch will see this request as rejected."
      : "You have not entered a rejection reason. Continue anyway?";
    notify.confirm(
      "Reject this requisition?",
      msg,
      () => {
        void (async () => {
          setActionLoading(true);
          try {
            await ownerPost(`/api/v1/medicine-requisitions/${id}/reject`, {
              reason: rejectReason.trim() || undefined,
            });
            notify.success("Requisition rejected.");
            await fetchRequisition();
          } catch (e: unknown) {
            logPharmacyApiError("requisition reject", e);
            notify.error("Rejection failed", pharmacyApiUserMessage(e, "Could not reject this requisition."));
          } finally {
            setActionLoading(false);
          }
        })();
      },
      undefined,
      "Reject",
      "Cancel"
    );
  }

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12"><div className="card-body text-center py-4 text-secondary">Loading requisition…</div></div>
      </div>
    );
  }

  if (loadFailed || !requisition) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12 mb-3">
          <div className="card-body text-center py-4 text-secondary">
            This requisition could not be loaded. Return to the list and try again.
          </div>
        </div>
        <Link href="/owner/pharmacy/requisitions" className="btn btn-outline-secondary btn-sm">
          ← Back to list
        </Link>
      </div>
    );
  }

  const medicineName = (item: RequisitionItem) => {
    const g = item.medicineListing?.presentation?.generic?.displayName;
    const b = item.medicineListing?.brand?.displayName;
    const s = item.medicineListing?.presentation?.strengthDisplay;
    const d = item.medicineListing?.presentation?.dosageForm?.displayName;
    const parts = [g, b, s, d].filter(Boolean);
    return parts.length ? parts.join(" — ") : item.medicineListing?.packageMarkDisplay ?? `Listing #${item.medicineListingId}`;
  };

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={`Requisition ${requisition.requisitionNumber}`}
        subtitle={`From ${requisition.branch?.name ?? "Branch"} · ${formatDate(requisition.createdAt)}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Pharmacy", href: "/owner/pharmacy/requisitions" },
          { label: "Requisitions", href: "/owner/pharmacy/requisitions" },
          { label: requisition.requisitionNumber, href: `/owner/pharmacy/requisitions/${id}` },
        ]}
      />

      {/* Status + Meta */}
      <div className="card radius-12 mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-sm-6 col-md-3">
              <div className="text-muted small">Status</div>
              <span className={`badge ${statusClass(requisition.status)}`}>{requisition.status}</span>
            </div>
            <div className="col-sm-6 col-md-3">
              <div className="text-muted small">Urgency</div>
              <span className={`badge ${requisition.urgency === "CRITICAL" ? "bg-danger" : requisition.urgency === "URGENT" ? "bg-warning text-dark" : "bg-light text-dark"}`}>
                {requisition.urgency}
              </span>
            </div>
            <div className="col-sm-6 col-md-3">
              <div className="text-muted small">Requested By</div>
              <div>{requisition.requestedBy?.profile?.displayName ?? "—"}</div>
            </div>
            <div className="col-sm-6 col-md-3">
              <div className="text-muted small">Branch</div>
              <div>{requisition.branch?.name ?? "—"}</div>
            </div>
          </div>
          {requisition.note && (
            <div className="mt-3">
              <div className="text-muted small">Note</div>
              <div>{requisition.note}</div>
            </div>
          )}
          {requisition.rejectionReason && (
            <div className="mt-3">
              <div className="text-muted small text-danger">Rejection Reason</div>
              <div className="text-danger">{requisition.rejectionReason}</div>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="card radius-12 mb-3">
        <div className="card-header"><h6 className="mb-0">Items ({requisition.items.length})</h6></div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Manufacturer</th>
                  <th className="text-center">Requested</th>
                  {canApprove ? <th className="text-center">Approve Qty</th> : <th className="text-center">Approved</th>}
                  <th className="text-center">Received</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {requisition.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="fw-semibold">{medicineName(item)}</div>
                      {item.medicineListing?.packageMarkDisplay && (
                        <div className="text-muted small">{item.medicineListing.packageMarkDisplay}</div>
                      )}
                      {item.substitutedListing && (
                        <div className="text-warning small">
                          Substituted → {item.substitutedListing.brand?.displayName ?? `#${item.substitutedListing.id}`}
                        </div>
                      )}
                    </td>
                    <td className="text-muted small">{item.medicineListing?.brand?.manufacturer?.displayName ?? "—"}</td>
                    <td className="text-center fw-semibold">{item.requestedQty}</td>
                    <td className="text-center">
                      {canApprove ? (
                        <input
                          type="number"
                          className="form-control form-control-sm text-center"
                          style={{ width: 80, margin: "0 auto" }}
                          min={0}
                          max={item.requestedQty}
                          value={approvedQtys[item.id] ?? item.requestedQty}
                          onChange={(e) => setApprovedQtys((q) => ({ ...q, [item.id]: Number(e.target.value) }))}
                        />
                      ) : (
                        <span>{item.approvedQty ?? "—"}</span>
                      )}
                    </td>
                    <td className="text-center">{item.receivedQty ?? "—"}</td>
                    <td className="text-muted small">{item.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Actions */}
      {(canApprove || canReject) && (
        <div className="card radius-12 mb-3">
          <div className="card-header"><h6 className="mb-0">Review Actions</h6></div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label small">Review Note (optional)</label>
              <textarea className="form-control form-control-sm" rows={2} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Add a note for the branch..." />
            </div>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              {canApprove && (
                <button type="button" className="btn btn-success btn-sm" disabled={actionLoading} onClick={requestApprove}>
                  {actionLoading ? "Processing…" : "Approve"}
                </button>
              )}
              {canReject && (
                <>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    style={{ maxWidth: 300 }}
                    placeholder="Rejection reason (optional)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <button type="button" className="btn btn-danger btn-sm" disabled={actionLoading} onClick={requestReject}>
                    {actionLoading ? "Processing…" : "Reject"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {canDispatch && (
        <div className="card radius-12 mb-3">
          <div className="card-header"><h6 className="mb-0">Dispatch</h6></div>
          <div className="card-body">
            <p className="text-muted small mb-2">
              This requisition is approved and ready for dispatch. Use the Inventory → Transfers workflow to dispatch stock using FEFO lot selection.
            </p>
            <Link href={`/owner/inventory/transfers/new?requisitionId=${id}`} className="btn btn-primary btn-sm">
              Create Dispatch
            </Link>
          </div>
        </div>
      )}

      {/* Timeline */}
      {requisition.timeline && requisition.timeline.length > 0 && (
        <div className="card radius-12 mb-3">
          <div className="card-header"><h6 className="mb-0">Timeline</h6></div>
          <div className="card-body">
            <ul className="list-unstyled mb-0">
              {requisition.timeline.map((entry) => (
                <li key={entry.id} className="d-flex gap-2 mb-2 pb-2 border-bottom">
                  <div>
                    <span className="badge bg-light text-dark">{entry.action}</span>
                  </div>
                  <div className="flex-grow-1">
                    <div className="small">
                      {entry.performedBy?.profile?.displayName ?? "System"} · {formatDate(entry.createdAt)}
                    </div>
                    {entry.note && <div className="text-muted small">{entry.note}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mb-4">
        <Link href="/owner/pharmacy/requisitions" className="btn btn-outline-secondary btn-sm">← Back to Requisitions</Link>
      </div>
    </div>
  );
}
