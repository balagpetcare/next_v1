"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/src/hooks/useToast";
import ProducerPageShell from "../../_components/ProducerPageShell";
import ProducerSectionCard from "../../_components/ProducerSectionCard";
import { producerApprovalsList, producerApprovalApprove, producerApprovalReject } from "../../_lib/producerApi";
import { normalizeApiError, useApiErrorPopup } from "../../_lib/apiErrorPopup";

export default function ProducerApprovalsPage() {
  const router = useRouter();
  const toast = useToast();
  const { showApiErrorPopup, ApiErrorModal } = useApiErrorPopup();
  const [tab, setTab] = useState("PRODUCT");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState({ open: false, mode: null, approval: null, note: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await producerApprovalsList({ status: "SUBMITTED", type: tab, limit: 100 });
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      if (e?.status === 401) {
        router.replace("/producer/login?from=/producer/approvals");
        return;
      }
      setItems([]);
      showApiErrorPopup(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab]);

  const openModal = (mode, approval) => {
    setModal({ open: true, mode, approval, note: "" });
  };

  const closeModal = () => {
    setModal({ open: false, mode: null, approval: null, note: "" });
  };

  const submitDecision = async () => {
    if (!modal.approval || !modal.mode) return;
    const id = modal.approval.id;
    try {
      if (modal.mode === "approve") {
        await producerApprovalApprove(id, { note: modal.note || undefined });
        toast.success("Approved");
      } else {
        await producerApprovalReject(id, { note: modal.note || undefined });
        toast.success("Rejected");
      }
      closeModal();
      await load();
    } catch (e) {
      showApiErrorPopup(normalizeApiError(e));
    }
  };

  const rows = useMemo(() => items || [], [items]);

  return (
    <>
      <ApiErrorModal />
      <ProducerPageShell
      title="Approvals"
      breadcrumbs={[{ label: "Dashboard", href: "/producer/dashboard" }, { label: "Approvals" }]}
      actions={
        <button type="button" className="btn btn-outline-secondary btn-sm radius-12" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      }
    >
      <ProducerSectionCard title="Pending approvals" className="mb-4">
        <div className="d-flex gap-2 mb-3">
          <button
            type="button"
            className={`btn btn-sm ${tab === "PRODUCT" ? "btn-primary" : "btn-outline-primary"} radius-12`}
            onClick={() => setTab("PRODUCT")}
          >
            Products
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tab === "BATCH" ? "btn-primary" : "btn-outline-primary"} radius-12`}
            onClick={() => setTab("BATCH")}
          >
            Batches
          </button>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <span className="spinner-border spinner-border-sm" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-muted mb-0">No pending approvals.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-bordered table-sm align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Entity</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th style={{ width: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td className="text-nowrap">{a.id}</td>
                    <td>
                      {a.entityType === "PRODUCT" ? (
                        <div>
                          <div className="fw-medium">{a.entity?.productName || `Product #${a.entityId}`}</div>
                          <div className="text-muted small">{a.entity?.sku || "—"}</div>
                        </div>
                      ) : (
                        <div>
                          <div className="fw-medium">{a.entity?.batchNo || `Batch #${a.entityId}`}</div>
                          <div className="text-muted small">{a.entity?.status || "—"}</div>
                        </div>
                      )}
                    </td>
                    <td className="text-nowrap">{a.status}</td>
                    <td className="text-nowrap small">{a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <button type="button" className="btn btn-sm btn-success" onClick={() => openModal("approve", a)}>
                          Approve
                        </button>
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => openModal("reject", a)}>
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ProducerSectionCard>

      {modal.open ? (
        <div className="modal fade show" style={{ display: "block" }} tabIndex={-1} role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{modal.mode === "approve" ? "Approve" : "Reject"}</h5>
                <button type="button" className="btn-close" onClick={closeModal} aria-label="Close" />
              </div>
              <div className="modal-body">
                <label className="form-label">Note (optional)</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={modal.note}
                  onChange={(e) => setModal((p) => ({ ...p, note: e.target.value }))}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="button" className={`btn ${modal.mode === "approve" ? "btn-success" : "btn-danger"}`} onClick={submitDecision}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {modal.open ? <div className="modal-backdrop fade show" /> : null}
    </ProducerPageShell>
    </>
  );
}

