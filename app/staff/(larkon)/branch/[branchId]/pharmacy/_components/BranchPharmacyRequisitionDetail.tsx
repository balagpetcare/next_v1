"use client";

/**
 * Shared staff branch requisition detail UI. Rendered from
 * `pharmacy/requisitions/[requisitionId]/page.tsx` (canonical URL).
 */
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { medicineRequisitionById, medicineRequisitionSubmit, medicineRequisitionCancel, medicineRequisitionReceive } from "@/lib/api";
import { pharmacyApiUserMessage, logPharmacyApiError } from "@/src/lib/pharmacyApiMessage";
import { useToast } from "@/src/hooks/useToast";
import PharmacyActionConfirmModal from "./PharmacyActionConfirmModal";

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

type ConfirmKind = "submit" | "cancel" | "receive";

export default function BranchPharmacyRequisitionDetail() {
  const params = useParams();
  const toast = useToast();
  const branchId = params?.branchId as string;
  const branchIdNum = Number(branchId);
  const rawId = params?.requisitionId ?? params?.id;
  const id = Number(rawId);
  const idValid = Number.isFinite(id) && id > 0;

  const [requisition, setRequisition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [wrongBranch, setWrongBranch] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [receivedQtys, setReceivedQtys] = useState<Record<number, number>>({});
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);

  const load = useCallback(async () => {
    if (!idValid) {
      setLoading(false);
      setRequisition(null);
      setLoadFailed(true);
      setWrongBranch(false);
      return;
    }
    setLoading(true);
    setLoadFailed(false);
    setWrongBranch(false);
    try {
      const data: any = await medicineRequisitionById(id);
      if (data == null) {
        setRequisition(null);
        setLoadFailed(true);
        return;
      }
      if (data && Number.isFinite(branchIdNum) && Number(data.branchId) !== branchIdNum) {
        setRequisition(null);
        setWrongBranch(true);
        setLoadFailed(true);
        toast.error("This requisition does not belong to this branch.");
        return;
      }
      setRequisition(data);
      if (data?.items) {
        const qtys: Record<number, number> = {};
        data.items.forEach((item: any) => {
          qtys[item.id] = item.receivedQty ?? item.dispensedQty ?? item.approvedQty ?? item.requestedQty;
        });
        setReceivedQtys(qtys);
      }
    } catch (e: unknown) {
      logPharmacyApiError("requisition by id", e);
      toast.error(pharmacyApiUserMessage(e, "Could not load this requisition."));
      setRequisition(null);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [id, idValid, branchIdNum, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const canSubmit = requisition?.status === "DRAFT";
  const canCancel = ["DRAFT", "SUBMITTED"].includes(requisition?.status);
  const canReceive = ["DISPATCHED", "IN_TRANSIT"].includes(requisition?.status);

  async function executeConfirmedAction() {
    if (!confirmKind || !idValid) return;
    if (confirmKind === "receive" && !requisition?.items?.length) {
      toast.warning("Nothing to receive.");
      setConfirmKind(null);
      return;
    }
    setActionLoading(true);
    try {
      if (confirmKind === "submit") {
        await medicineRequisitionSubmit(id);
        toast.success("Requisition submitted for review.");
      } else if (confirmKind === "cancel") {
        await medicineRequisitionCancel(id);
        toast.success("Requisition cancelled.");
      } else if (confirmKind === "receive") {
        await medicineRequisitionReceive(
          id,
          requisition.items.map((item: any) => ({
            itemId: item.id,
            receivedQty: receivedQtys[item.id] ?? 0,
          }))
        );
        toast.success("Receipt confirmed.");
      }
      setConfirmKind(null);
      await load();
    } catch (e: unknown) {
      logPharmacyApiError(`requisition ${confirmKind}`, e);
      toast.error(pharmacyApiUserMessage(e, "Action could not be completed."));
    } finally {
      setActionLoading(false);
    }
  }

  const medicineName = (item: any) => {
    const g = item.medicineListing?.presentation?.generic?.displayName;
    const b = item.medicineListing?.brand?.displayName;
    const s = item.medicineListing?.presentation?.strengthDisplay;
    const d = item.medicineListing?.presentation?.dosageForm?.displayName;
    const parts = [g, b, s, d].filter(Boolean);
    return parts.length ? parts.join(" — ") : item.medicineListing?.packageMarkDisplay ?? `Listing #${item.medicineListingId}`;
  };

  const listHref = `/staff/branch/${branchId}/pharmacy/requisitions`;

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12">
          <div className="card-body text-center py-4 text-secondary">Loading…</div>
        </div>
      </div>
    );
  }

  if (wrongBranch) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12 mb-3 border-warning">
          <div className="card-body text-center py-4">
            <div className="fw-semibold mb-2">Wrong branch</div>
            <div className="text-secondary small">This requisition is not for the branch you are viewing. Open it from the correct branch requisitions list.</div>
          </div>
        </div>
        <Link href={listHref} className="btn btn-outline-secondary btn-sm">
          ← Back to Requisitions
        </Link>
      </div>
    );
  }

  if (loadFailed || !requisition) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12 mb-3">
          <div className="card-body text-center py-4 text-secondary">
            This requisition could not be loaded. Use Back to return to the list.
          </div>
        </div>
        <Link href={listHref} className="btn btn-outline-secondary btn-sm">
          ← Back
        </Link>
      </div>
    );
  }

  const confirmCopy =
    confirmKind === "submit"
      ? {
          title: "Submit for review?",
          message:
            "This sends the requisition to your organization for approval. You won’t be able to edit it while it is under review.",
          confirmLabel: "Submit",
          variant: "primary" as const,
        }
      : confirmKind === "cancel"
        ? {
            title: "Cancel this requisition?",
            message: "The branch will no longer be waiting on this request. You can create a new requisition later if needed.",
            confirmLabel: "Cancel requisition",
            variant: "danger" as const,
          }
        : confirmKind === "receive"
          ? {
              title: "Confirm receipt?",
              message:
                "This records the quantities you entered and updates branch stock. Make sure the amounts match what was delivered.",
              confirmLabel: "Confirm received",
              variant: "success" as const,
            }
          : null;

  return (
    <div className="dashboard-main-body">
      <PharmacyActionConfirmModal
        show={!!confirmKind && !!confirmCopy}
        title={confirmCopy?.title ?? ""}
        message={confirmCopy?.message ?? ""}
        confirmLabel={confirmCopy?.confirmLabel}
        variant={confirmCopy?.variant ?? "primary"}
        busy={actionLoading}
        onClose={() => !actionLoading && setConfirmKind(null)}
        onConfirm={executeConfirmedAction}
      />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="mb-0">Requisition {requisition.requisitionNumber}</h5>
          <div className="text-muted small">{formatDate(requisition.createdAt)}</div>
        </div>
        <div className="d-flex gap-2">
          {canSubmit && (
            <button type="button" className="btn btn-primary btn-sm" disabled={actionLoading} onClick={() => setConfirmKind("submit")}>
              Submit for Review
            </button>
          )}
          {canCancel && (
            <button type="button" className="btn btn-outline-danger btn-sm" disabled={actionLoading} onClick={() => setConfirmKind("cancel")}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="card radius-12 mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-6 col-md-3">
              <div className="text-muted small">Status</div>
              <span className={`badge ${statusClass(requisition.status)}`}>{requisition.status}</span>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-muted small">Urgency</div>
              <span
                className={`badge ${requisition.urgency === "CRITICAL" ? "bg-danger" : requisition.urgency === "URGENT" ? "bg-warning text-dark" : "bg-light text-dark"}`}
              >
                {requisition.urgency}
              </span>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-muted small">Branch</div>
              <div>{requisition.branch?.name ?? "—"}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-muted small">Requested By</div>
              <div>{requisition.requestedBy?.profile?.displayName ?? "—"}</div>
            </div>
          </div>
          {requisition.note && (
            <div className="mt-2">
              <div className="text-muted small">Note</div>
              <div>{requisition.note}</div>
            </div>
          )}
          {requisition.rejectionReason && (
            <div className="mt-2">
              <div className="text-muted small text-danger">Rejection Reason</div>
              <div className="text-danger">{requisition.rejectionReason}</div>
            </div>
          )}
          {requisition.reviewNote && (
            <div className="mt-2">
              <div className="text-muted small">Review Note</div>
              <div>{requisition.reviewNote}</div>
            </div>
          )}
        </div>
      </div>

      <div className="card radius-12 mb-3">
        <div className="card-header">
          <h6 className="mb-0">Items ({requisition.items?.length ?? 0})</h6>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th className="text-center">Requested</th>
                  <th className="text-center">Approved</th>
                  {canReceive ? <th className="text-center">Receive Qty</th> : <th className="text-center">Received</th>}
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {(requisition.items || []).map((item: any) => (
                  <tr key={item.id}>
                    <td>
                      <div className="fw-semibold">{medicineName(item)}</div>
                      {item.medicineListing?.packageMarkDisplay && <div className="text-muted small">{item.medicineListing.packageMarkDisplay}</div>}
                      {item.substitutedListing && (
                        <div className="text-warning small">Substituted → {item.substitutedListing.brand?.displayName ?? `#${item.substitutedListing.id}`}</div>
                      )}
                    </td>
                    <td className="text-center fw-semibold">{item.requestedQty}</td>
                    <td className="text-center">{item.approvedQty ?? "—"}</td>
                    <td className="text-center">
                      {canReceive ? (
                        <input
                          type="number"
                          className="form-control form-control-sm text-center"
                          style={{ width: 80, margin: "0 auto" }}
                          min={0}
                          value={receivedQtys[item.id] ?? 0}
                          onChange={(e) => setReceivedQtys((q) => ({ ...q, [item.id]: Number(e.target.value) }))}
                        />
                      ) : (
                        <span>{item.receivedQty ?? "—"}</span>
                      )}
                    </td>
                    <td className="text-muted small">{item.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {canReceive && (
        <div className="card radius-12 mb-3">
          <div className="card-body d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="text-muted small">Confirm the quantities received from central pharmacy.</div>
            <button type="button" className="btn btn-success btn-sm" disabled={actionLoading} onClick={() => setConfirmKind("receive")}>
              {actionLoading ? "Processing…" : "Confirm Received"}
            </button>
          </div>
        </div>
      )}

      {requisition.timeline && requisition.timeline.length > 0 && (
        <div className="card radius-12 mb-3">
          <div className="card-header">
            <h6 className="mb-0">Timeline</h6>
          </div>
          <div className="card-body">
            <ul className="list-unstyled mb-0">
              {requisition.timeline.map((entry: any) => (
                <li key={entry.id} className="d-flex gap-2 mb-2 pb-2 border-bottom">
                  <span className="badge bg-light text-dark">{entry.action}</span>
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

      <Link href={listHref} className="btn btn-outline-secondary btn-sm mb-4">
        ← Back to Requisitions
      </Link>
    </div>
  );
}
