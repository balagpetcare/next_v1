"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Modal, Button } from "react-bootstrap";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { purchaseOrderAction, purchaseOrderGet } from "@/lib/api";

function statusBadgeClass(status: string) {
  const u = (status || "").toUpperCase();
  if (u === "DRAFT") return "bg-secondary";
  if (u === "SUBMITTED") return "bg-info text-dark";
  if (u === "APPROVED") return "bg-primary";
  if (u === "PARTIALLY_RECEIVED") return "bg-warning text-dark";
  if (u === "RECEIVED") return "bg-success";
  if (u === "VOIDED") return "bg-dark";
  if (["CANCELLED", "REJECTED"].includes(u)) return "bg-danger";
  return "bg-light text-dark";
}

function actorLabel(u: { id?: number; profile?: { displayName?: string; username?: string } } | null | undefined) {
  if (!u) return "—";
  return u.profile?.displayName || u.profile?.username || `User #${u.id}`;
}

function formatMoney(amount: unknown, currency?: string | null) {
  const n = amount != null ? Number(amount) : NaN;
  const cur = (currency || "").trim();
  const sym = cur === "USD" ? "$" : cur === "EUR" ? "€" : "৳";
  if (!Number.isFinite(n)) return "—";
  return `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Owner-facing vendor receive status from linked GRNs (requires vendorReceiveSession on PO API). */
function poVendorReceiveChip(po: { status?: string; grns?: any[] }): { label: string; className: string } | null {
  const st = (po.status || "").toUpperCase();
  if (!["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED"].includes(st)) return null;
  const grns = po.grns || [];
  const anyAwaiting = grns.some((g: any) => g.vendorReceiveSession?.status === "AWAITING_CONFIRMATION");
  if (anyAwaiting) return { label: "Pending warehouse confirmation", className: "bg-warning text-dark" };
  const anyDraft = grns.some(
    (g: any) =>
      g.status === "DRAFT" &&
      g.vendorReceiveSession?.status !== "AWAITING_CONFIRMATION" &&
      g.vendorReceiveSession?.status !== "POSTED"
  );
  if (anyDraft) return { label: "Vendor receive draft", className: "bg-secondary" };
  if (st === "RECEIVED") return { label: "Received", className: "bg-success" };
  if (["APPROVED", "PARTIALLY_RECEIVED"].includes(st))
    return { label: "Awaiting warehouse receipt", className: "bg-info text-dark" };
  return null;
}

export default function OwnerPurchaseOrderDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [modal, setModal] = useState<"reject" | "cancel" | null>(null);
  const [reason, setReason] = useState("");

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await purchaseOrderGet(id);
      setPo(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
     
  }, [id]);

  async function act(action: "submit" | "approve" | "reject" | "cancel", body?: Record<string, unknown>) {
    setActing(true);
    setError("");
    try {
      await purchaseOrderAction(id, action, body || {});
      setModal(null);
      setReason("");
      await load();
    } catch (e: any) {
      setError(e?.message || "Action failed");
    } finally {
      setActing(false);
    }
  }

  const receiveChip = useMemo(() => (po ? poVendorReceiveChip(po) : null), [po]);

  const draftGrnForOwner = useMemo(() => {
    const grns = po?.grns || [];
    return grns.find(
      (g: any) =>
        g.status === "DRAFT" &&
        g.vendorReceiveSession?.status !== "AWAITING_CONFIRMATION" &&
        g.vendorReceiveSession?.status !== "POSTED"
    ) as { id: number; vendorReceiveSession?: { status?: string } | null } | undefined;
  }, [po]);

  const bulkReceiveHref = useMemo(() => {
    if (!po?.id) return "/owner/inventory/receipts/bulk";
    const q = new URLSearchParams();
    q.set("purchaseOrderId", String(po.id));
    if (po.vendor?.id) q.set("vendorId", String(po.vendor.id));
    return `/owner/inventory/receipts/bulk?${q.toString()}`;
  }, [po]);

  if (loading || !po) {
    return (
      <div className="container-fluid py-4">
        {error && <div className="alert alert-danger">{error}</div>}
        {!error && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" />
          </div>
        )}
      </div>
    );
  }

  const st = (po.status || "").toUpperCase();

  return (
    <div className="container-fluid py-4">
      <PageHeader title={`Purchase order ${po.poNumber}`} subtitle={po.vendor?.name || "Vendor"} />
      <nav aria-label="breadcrumb" className="mb-2">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link href="/owner/inventory">Inventory</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href="/owner/inventory/purchase-orders">Purchase orders</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {po.poNumber}
          </li>
        </ol>
      </nav>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-3">
        <div className="col-lg-4">
          <div className="card border radius-12 h-100">
            <div className="card-body p-24">
              <div className="text-muted small">Status</div>
              <div className="mt-1">
                <span className={`badge ${statusBadgeClass(po.status)}`}>{po.status}</span>
              </div>
              <hr />
              <dl className="small mb-0">
                <dt className="text-muted">Subtotal</dt>
                <dd className="mb-2">{formatMoney(po.subtotal, po.currency)}</dd>
                <dt className="text-muted">Grand total</dt>
                <dd className="mb-2 fw-semibold">{formatMoney(po.grandTotal ?? po.subtotal, po.currency)}</dd>
                <dt className="text-muted">Warehouse</dt>
                <dd className="mb-2">{po.warehouse?.name || "—"}</dd>
                <dt className="text-muted">Expected delivery</dt>
                <dd className="mb-2">
                  {po.expectedDeliveryDate
                    ? new Date(po.expectedDeliveryDate).toLocaleDateString()
                    : "—"}
                </dd>
                <dt className="text-muted">Currency</dt>
                <dd className="mb-0">{po.currency || "—"}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="col-lg-8">
          <div className="card border radius-12 h-100">
            <div className="card-body p-24">
              <div className="text-muted small mb-2">Actions</div>
              <div className="d-flex flex-wrap gap-2">
                {st === "DRAFT" && (
                  <>
                    <button className="btn btn-sm btn-primary" disabled={acting} onClick={() => act("submit")}>
                      Submit for approval
                    </button>
                    <button className="btn btn-sm btn-success" disabled={acting} onClick={() => act("approve")}>
                      Approve (skip submit)
                    </button>
                  </>
                )}
                {st === "SUBMITTED" && (
                  <>
                    <button className="btn btn-sm btn-success" disabled={acting} onClick={() => act("approve")}>
                      Approve
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      disabled={acting}
                      onClick={() => {
                        setReason("");
                        setModal("reject");
                      }}
                    >
                      Reject
                    </button>
                  </>
                )}
                {!["RECEIVED", "CANCELLED", "REJECTED"].includes(st) && (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={acting}
                    onClick={() => {
                      setReason("");
                      setModal("cancel");
                    }}
                  >
                    Cancel PO
                  </button>
                )}
                {st === "RECEIVED" && receiveChip && (
                  <span className={`badge align-self-center ${receiveChip.className}`}>{receiveChip.label}</span>
                )}
                {["APPROVED", "PARTIALLY_RECEIVED"].includes(st) && (
                  <>
                    {receiveChip && (
                      <span className={`badge align-self-center ${receiveChip.className}`}>{receiveChip.label}</span>
                    )}
                    <Link href={bulkReceiveHref} className="btn btn-sm btn-primary">
                      <i className="ri-inbox-archive-line me-1" />
                      Create vendor receive draft
                    </Link>
                    {draftGrnForOwner && (
                      <Link href={`/owner/inventory/grn/${draftGrnForOwner.id}`} className="btn btn-sm btn-outline-primary">
                        Continue draft
                      </Link>
                    )}
                    {draftGrnForOwner && (
                      <Link href={`/owner/inventory/grn/${draftGrnForOwner.id}`} className="btn btn-sm btn-outline-warning">
                        Submit for confirmation
                      </Link>
                    )}
                    <Link href={`/owner/inventory/receipts?purchaseOrderId=${po.id}`} className="btn btn-sm btn-outline-secondary">
                      View GRNs for this PO
                    </Link>
                  </>
                )}
              </div>
              {po.notes && (
                <div className="mt-3 small">
                  <div className="text-muted">Vendor notes</div>
                  <div className="border rounded p-2 bg-light mt-1">{po.notes}</div>
                </div>
              )}
              {po.internalNote && (
                <div className="mt-2 small">
                  <div className="text-muted">Internal</div>
                  <div className="border rounded p-2 mt-1">{po.internalNote}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card border radius-12 mb-3">
        <div className="card-header py-2">
          <h6 className="mb-0 fw-semibold">Activity</h6>
        </div>
        <div className="card-body small">
          <ul className="list-unstyled mb-0">
            <li>
              <span className="text-muted">Created</span> ·{" "}
              {po.createdAt ? new Date(po.createdAt).toLocaleString() : "—"} ·{" "}
              <span className="text-muted">{actorLabel(po.createdBy)}</span>
            </li>
            {po.submittedAt && (
              <li className="mt-1">
                <span className="text-muted">Submitted</span> · {new Date(po.submittedAt).toLocaleString()}
              </li>
            )}
            {po.approvedAt && (
              <li className="mt-1">
                <span className="text-muted">Approved</span> · {new Date(po.approvedAt).toLocaleString()} ·{" "}
                {actorLabel(po.approvedBy)}
              </li>
            )}
            {po.rejectedAt && (
              <li className="mt-1">
                <span className="text-muted">Rejected</span> · {new Date(po.rejectedAt).toLocaleString()} ·{" "}
                {actorLabel(po.rejectedBy)}
                {po.rejectionReason && <div className="text-danger mt-1">Reason: {po.rejectionReason}</div>}
              </li>
            )}
            {po.cancelledAt && (
              <li className="mt-1">
                <span className="text-muted">Cancelled</span> · {new Date(po.cancelledAt).toLocaleString()}
                {po.cancelReason && <div className="mt-1">Reason: {po.cancelReason}</div>}
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="card border radius-12">
        <div className="card-header py-2 d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-semibold">Line items</h6>
          <span className="small text-muted">{(po.lines || []).length} line(s)</span>
        </div>
        <div className="table-responsive">
          <table className="table table-sm table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Variant</th>
                <th className="text-end">Ordered</th>
                <th className="text-end">Received</th>
                <th className="text-end">Pending</th>
                <th className="text-end">Unit cost</th>
                <th className="text-end">Line total</th>
              </tr>
            </thead>
            <tbody>
              {(po.lines || []).map((l: any) => {
                const pending = Math.max(0, (l.orderedQty ?? 0) - (l.receivedQty ?? 0));
                const uc = l.unitCost != null ? Number(l.unitCost) : NaN;
                const lineTot =
                  Number.isFinite(uc) && Number.isFinite(l.orderedQty) ? uc * l.orderedQty : null;
                return (
                  <tr key={l.id}>
                    <td>
                      <span className="small text-muted d-block">{l.variant?.sku}</span>
                      {l.variant?.title}
                      {l.note && <div className="small text-muted mt-1">{l.note}</div>}
                    </td>
                    <td className="text-end">{l.orderedQty}</td>
                    <td className="text-end">{l.receivedQty ?? 0}</td>
                    <td className="text-end">{pending}</td>
                    <td className="text-end">{Number.isFinite(uc) ? uc.toFixed(4) : "—"}</td>
                    <td className="text-end">
                      {lineTot != null ? formatMoney(lineTot, po.currency) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(po.grns || []).length > 0 && (
        <div className="card border radius-12 mt-3">
          <div className="card-header py-2">
            <h6 className="mb-0 fw-semibold">Linked GRNs</h6>
          </div>
          <ul className="list-group list-group-flush">
            {po.grns.map((g: any) => (
              <li key={g.id} className="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <Link href={`/owner/inventory/grn/${g.id}`} className="fw-medium text-decoration-none">
                    GRN #{g.id}
                  </Link>
                  {g._count?.lines != null && (
                    <span className="text-muted small ms-2">{g._count.lines} line(s)</span>
                  )}
                  {g.invoiceNo && <span className="text-muted small ms-2">Inv. {g.invoiceNo}</span>}
                  <div className="small text-muted">
                    {g.createdAt ? new Date(g.createdAt).toLocaleString() : ""}
                    {g.receivedAt && (
                      <span className="ms-2">Received {new Date(g.receivedAt).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <span className={`badge ${statusBadgeClass(g.status)}`}>{g.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal show={modal != null} onHide={() => !acting && setModal(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{modal === "reject" ? "Reject purchase order" : "Cancel purchase order"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <label className="form-label">Reason</label>
          <textarea
            className="form-control"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Required for audit trail"
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setModal(null)} disabled={acting}>
            Close
          </Button>
          <Button
            variant={modal === "reject" ? "danger" : "warning"}
            disabled={acting || !reason.trim()}
            onClick={() => {
              if (modal === "reject") act("reject", { reason: reason.trim() });
              else act("cancel", { reason: reason.trim() });
            }}
          >
            {acting ? "…" : modal === "reject" ? "Reject" : "Cancel PO"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
