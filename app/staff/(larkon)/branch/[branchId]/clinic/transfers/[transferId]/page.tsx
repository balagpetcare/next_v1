"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  staffClinicTransferById,
  staffClinicTransferReceive,
} from "@/lib/api";

type TransferItem = {
  id: number;
  clinicalItemId: number;
  variantId?: number | null;
  qtySent: number;
  qtyReceived?: number | null;
  qtyDamaged?: number | null;
  clinicalItem?: { id: number; name: string; itemCode?: string };
  variant?: { id: number; variantName: string } | null;
};

type TransferDetail = {
  id: number;
  transferNo: string;
  fromBranchId: number;
  toBranchId: number;
  fromBranch?: { id: number; name: string };
  toBranch?: { id: number; name: string };
  status: string;
  supplyRequest?: { id: number; requestNo: string } | null;
  items?: TransferItem[];
  createdAt?: string;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
};

function statusBadgeClass(status: string): string {
  switch (status) {
    case "CREATED":
      return "bg-secondary";
    case "IN_TRANSIT":
      return "bg-warning text-dark";
    case "RECEIVED":
      return "bg-success";
    default:
      return "bg-secondary";
  }
}

export default function StaffClinicTransferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params?.branchId as string | undefined;
  const transferId = params?.transferId as string | undefined;
  const [transfer, setTransfer] = useState<TransferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receivedQtys, setReceivedQtys] = useState<Record<number, number>>({});
  const [damagedQtys, setDamagedQtys] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!branchId || !transferId) return;
    let cancelled = false;
    staffClinicTransferById(branchId, Number(transferId))
      .then((data) => {
        if (!cancelled && data) {
          setTransfer(data as TransferDetail);
          const t = data as TransferDetail;
          const received: Record<number, number> = {};
          const damaged: Record<number, number> = {};
          (t.items || []).forEach((i) => {
            received[i.id] = i.qtyReceived ?? i.qtySent;
            damaged[i.id] = i.qtyDamaged ?? 0;
          });
          setReceivedQtys(received);
          setDamagedQtys(damaged);
        }
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error)?.message || "Failed to load transfer");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, transferId]);

  const handleReceive = async () => {
    if (!branchId || !transferId || !transfer || transfer.status !== "IN_TRANSIT") return;
    const receivedItems = (transfer.items || []).map((line) => ({
      transferItemId: line.id,
      qtyReceived: Math.max(0, receivedQtys[line.id] ?? line.qtySent),
      qtyDamaged: Math.max(0, damagedQtys[line.id] ?? 0),
    }));
    setSubmitting(true);
    setError("");
    try {
      await staffClinicTransferReceive(branchId, Number(transferId), { receivedItems });
      setSuccess("Transfer received. Stock has been updated.");
      const updated = await staffClinicTransferById(branchId, Number(transferId));
      if (updated) setTransfer(updated as TransferDetail);
    } catch (e) {
      setError((e as Error)?.message || "Receive failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!branchId || !transferId) {
    return (
      <div className="p-4">
        <div className="alert alert-warning">Invalid branch or transfer.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
          <p className="text-muted mt-2 mb-0">Loading transfer…</p>
        </div>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning">Transfer not found.</div>
        <Link
          href={`/staff/branch/${branchId}/clinic/transfers`}
          className="btn btn-outline-primary btn-sm radius-8"
        >
          Back to list
        </Link>
      </div>
    );
  }

  const canReceive = transfer.status === "IN_TRANSIT" && (transfer.items?.length ?? 0) > 0;

  return (
    <div className="dashboard-main-body">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h5 mb-0">Transfer {transfer.transferNo}</h1>
        <Link
          href={`/staff/branch/${branchId}/clinic/transfers`}
          className="btn btn-outline-secondary btn-sm radius-8"
        >
          Back to list
        </Link>
      </div>

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      {success && <div className="alert alert-success radius-12 mb-3">{success}</div>}

      <div className="card radius-12 mb-4">
        <div className="card-body p-24">
          <div className="row g-3">
            <div className="col-md-2">
              <span className="text-muted small d-block">Transfer #</span>
              <span className="fw-semibold">{transfer.transferNo}</span>
            </div>
            <div className="col-md-2">
              <span className="text-muted small d-block">Status</span>
              <span className={`badge ${statusBadgeClass(transfer.status)}`}>{transfer.status}</span>
            </div>
            <div className="col-md-3">
              <span className="text-muted small d-block">From</span>
              <span>{transfer.fromBranch?.name ?? transfer.fromBranchId}</span>
            </div>
            <div className="col-md-3">
              <span className="text-muted small d-block">To</span>
              <span>{transfer.toBranch?.name ?? transfer.toBranchId}</span>
            </div>
            {transfer.supplyRequest && (
              <div className="col-md-2">
                <span className="text-muted small d-block">Supply request</span>
                <span>{transfer.supplyRequest.requestNo}</span>
              </div>
            )}
          </div>
          {transfer.createdAt && (
            <div className="mt-3 pt-3 border-top">
              <span className="text-muted small">Created: {new Date(transfer.createdAt).toLocaleString()}</span>
              {transfer.dispatchedAt && (
                <span className="text-muted small ms-3">Dispatched: {new Date(transfer.dispatchedAt).toLocaleString()}</span>
              )}
              {transfer.receivedAt && (
                <span className="text-muted small ms-3">Received: {new Date(transfer.receivedAt).toLocaleString()}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card radius-12">
        <div className="card-header bg-transparent p-24">
          <h6 className="mb-0 fw-semibold">Items ({(transfer.items?.length ?? 0)} line(s))</h6>
        </div>
        <div className="card-body p-24">
          {!transfer.items?.length ? (
            <p className="text-muted mb-0">No items on this transfer.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Item</th>
                    <th>Variant</th>
                    <th>Qty sent</th>
                    {canReceive && (
                      <>
                        <th>Qty received</th>
                        <th>Qty damaged</th>
                      </>
                    )}
                    {transfer.status === "RECEIVED" && (
                      <>
                        <th>Qty received</th>
                        <th>Qty damaged</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {transfer.items.map((row) => (
                    <tr key={row.id}>
                      <td>{row.clinicalItem?.name ?? row.clinicalItemId}</td>
                      <td>{row.variant?.variantName ?? (row.variantId ? String(row.variantId) : "—")}</td>
                      <td>{row.qtySent}</td>
                      {canReceive && (
                        <>
                          <td>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              min={0}
                              max={row.qtySent}
                              value={receivedQtys[row.id] ?? row.qtySent}
                              onChange={(e) =>
                                setReceivedQtys((prev) => ({
                                  ...prev,
                                  [row.id]: Math.max(0, parseInt(e.target.value, 10) || 0),
                                }))
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              min={0}
                              value={damagedQtys[row.id] ?? 0}
                              onChange={(e) =>
                                setDamagedQtys((prev) => ({
                                  ...prev,
                                  [row.id]: Math.max(0, parseInt(e.target.value, 10) || 0),
                                }))
                              }
                            />
                          </td>
                        </>
                      )}
                      {transfer.status === "RECEIVED" && (
                        <>
                          <td>{row.qtyReceived ?? "—"}</td>
                          <td>{row.qtyDamaged ?? 0}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {canReceive && (
            <div className="mt-4 pt-3 border-top">
              <button
                type="button"
                className="btn btn-primary radius-8"
                disabled={submitting}
                onClick={handleReceive}
              >
                {submitting ? "Receiving…" : "Confirm receipt"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
