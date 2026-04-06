"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import StatusBadge from "@/app/owner/_components/StatusBadge";

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolveModal, setResolveModal] = useState<{ transferId: number; note: string } | null>(null);

  useEffect(() => {
    loadTransfers();
  }, []);

  const loadTransfers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = (await ownerGet("/api/v1/transfers").catch(() => ({ success: false, data: [] }))) as {
        data?: { items?: unknown[] } | unknown[];
      };
      const items = res?.data && typeof res.data === "object" && "items" in res.data
        ? (res.data as { items: unknown[] }).items
        : Array.isArray(res?.data)
          ? res.data
          : [];
      setTransfers(Array.isArray(items) ? items : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load transfers");
      console.error("Load transfers error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (transferId: number) => {
    if (!confirm("Send this transfer?")) return;
    try {
      await ownerPost(`/api/v1/transfers/${transferId}/send`, {});
      alert("Transfer sent successfully");
      loadTransfers();
    } catch (err: any) {
      alert(err?.message || "Failed to send transfer");
    }
  };

  const handleReceive = async (transferId: number) => {
    if (!confirm("Mark this transfer as received (full receive)?")) return;
    try {
      await ownerPost(`/api/v1/transfers/${transferId}/receive`, { items: [] });
      alert("Transfer received successfully");
      loadTransfers();
    } catch (err: any) {
      alert(err?.message || "Failed to receive transfer");
    }
  };

  const handleResolveDispute = async (transferId: number) => {
    if (!resolveModal || resolveModal.transferId !== transferId) return;
    try {
      await ownerPost(`/api/v1/transfers/${transferId}/resolve-dispute`, {
        resolutionType: "ACCEPT_LOSS",
        note: resolveModal.note || undefined,
      });
      setResolveModal(null);
      alert("Dispute resolved");
      loadTransfers();
    } catch (err: any) {
      alert(err?.message || "Failed to resolve dispute");
    }
  };

  return (
    <div className="container py-3">
      {/* Deprecation Notice */}
      <div className="alert alert-warning mb-4">
        <div className="d-flex align-items-center gap-2">
          <i className="ri-error-warning-line fs-4" />
          <div>
            <strong>Legacy Stock Transfer</strong>
            <p className="mb-0 small">
              This module is deprecated. For new transfers, use{" "}
              <Link href="/owner/inventory/stock-requests" className="fw-semibold">
                Stock Requests → Allocation → Dispatch
              </Link>{" "}
              flow which includes controlled receiving and manager confirmation.
            </p>
          </div>
        </div>
      </div>

      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="mb-1">Stock Transfers (Legacy)</h2>
          <div className="text-secondary">View existing stock transfers — use Stock Requests for new transfers</div>
        </div>
        {/* Create button hidden - redirect to canonical flow */}
        <Link href="/owner/inventory/stock-requests" className="btn btn-primary">
          <i className="ri-add-circle-line me-1" />
          New Stock Request
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card radius-12">
        <div className="card-body p-24">
          {loading ? (
            <div className="text-center text-secondary py-4">Loading transfers...</div>
          ) : transfers.length === 0 ? (
            <div className="text-center text-secondary py-4">No transfers found</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Transfer ID</th>
                    <th>From Branch</th>
                    <th>To Branch</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th style={{ width: 150 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((transfer) => (
                    <tr key={transfer.id}>
                      <td className="fw-semibold">#{transfer.id}</td>
                      <td>{transfer.fromLocation?.name || transfer.fromBranch?.name || "—"}</td>
                      <td>{transfer.toLocation?.name || transfer.toBranch?.name || "—"}</td>
                      <td>
                        <StatusBadge status={transfer.status || "DRAFT"} />
                      </td>
                      <td className="text-muted small">{formatDate(transfer.createdAt)}</td>
                      <td className="text-end">
                        <div className="d-flex gap-2 justify-content-end">
                          {transfer.status === "DRAFT" && (
                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => handleSend(transfer.id)}
                            >
                              Send
                            </button>
                          )}
                          {(transfer.status === "SENT" || transfer.status === "IN_TRANSIT") && (
                            <button
                              className="btn btn-outline-success btn-sm"
                              onClick={() => handleReceive(transfer.id)}
                            >
                              Receive
                            </button>
                          )}
                          {transfer.status === "DISPUTED" && (
                            <button
                              className="btn btn-outline-warning btn-sm"
                              onClick={() => setResolveModal({ transferId: transfer.id, note: "" })}
                            >
                              Resolve
                            </button>
                          )}
                          <Link href={`/owner/transfers/${transfer.id}`} className="btn btn-outline-secondary btn-sm">
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {resolveModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setResolveModal(null)}
        >
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Resolve Disputed Transfer</h6>
                <button type="button" className="btn-close" onClick={() => setResolveModal(null)} />
              </div>
              <div className="modal-body">
                <p className="text-muted small">Accept loss for missing quantity. A ledger entry will be created.</p>
                <label className="form-label">Note (optional)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={resolveModal.note}
                  onChange={(e) => setResolveModal({ ...resolveModal, note: e.target.value })}
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setResolveModal(null)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleResolveDispute(resolveModal.transferId)}
                >
                  Accept Loss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
