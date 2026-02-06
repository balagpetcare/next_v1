"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffInventoryLocations,
  staffInventoryList,
  staffTransfersList,
  staffCreateTransfer,
  staffSendTransfer,
  staffReceiveTransfer,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const REQUIRED_PERM = "inventory.transfer";
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "IN_TRANSIT", label: "In transit" },
  { value: "RECEIVED", label: "Received" },
  { value: "PARTIAL", label: "Partial" },
  { value: "DISPUTED", label: "Disputed" },
];

function statusBadgeClass(status) {
  switch (String(status).toUpperCase()) {
    case "DRAFT":
      return "bg-secondary";
    case "IN_TRANSIT":
      return "bg-info";
    case "RECEIVED":
      return "bg-success";
    case "PARTIAL":
      return "bg-warning text-dark";
    case "DISPUTED":
      return "bg-danger";
    default:
      return "bg-light text-dark";
  }
}

export default function StaffBranchInventoryTransfersPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);

  const [tab, setTab] = useState("outgoing"); // outgoing | incoming
  const [statusFilter, setStatusFilter] = useState("");
  const [transfers, setTransfers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [branchLocationIds, setBranchLocationIds] = useState([]);
  const [otherBranchLocations, setOtherBranchLocations] = useState([]); // { id, name, branchName }
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    fromLocationId: "",
    toLocationId: "",
    items: [{ variantId: "", quantity: "" }],
  });
  const [submitting, setSubmitting] = useState(false);
  const [receiveModal, setReceiveModal] = useState(null); // { transfer, lineItems }
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  const permissions = myAccess?.permissions ?? [];
  const canTransfer = permissions.includes(REQUIRED_PERM);
  const canReceive = permissions.includes("inventory.receive");
  const canApprove = permissions.includes("approvals.manage") || permissions.includes("inventory.transfer.approve");

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  // Load locations and variants for create form
  useEffect(() => {
    if (!branchId || !canTransfer) return;
    let cancelled = false;
    Promise.all([staffInventoryLocations(), staffInventoryList(branchId, { limit: 200 })])
      .then(([locs, listRes]) => {
        if (cancelled) return;
        const all = locs || [];
        const branchLocs = all.filter((l) => l.branch && String(l.branch.id) === String(branchId));
        const other = all.filter((l) => l.branch && String(l.branch.id) !== String(branchId));
        setLocations(branchLocs);
        setBranchLocationIds(branchLocs.map((l) => l.id));
        setOtherBranchLocations(
          other.map((l) => ({
            id: l.id,
            name: l.name ?? `Location ${l.id}`,
            branchName: l.branch?.name ?? l.branch?.id ?? "—",
          }))
        );
        const items = listRes?.items ?? [];
        const seen = new Set();
        const list = items
          .filter((i) => i.variant && !seen.has(i.variant.id))
          .map((i) => {
            seen.add(i.variant.id);
            return { id: i.variant.id, sku: i.variant.sku, title: i.variant.title };
          });
        setVariants(list);
        if (branchLocs.length && !createForm.fromLocationId)
          setCreateForm((f) => ({ ...f, fromLocationId: String(branchLocs[0].id) }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [branchId, canTransfer]);

  const retryTransfers = () => {
    if (!branchId || !canTransfer) return;
    setLoading(true);
    setError("");
    staffTransfersList({ limit: 200, status: statusFilter || undefined })
      .then((res) => setTransfers(res?.items ?? []))
      .catch((e) => setError(e?.message ?? "Failed to load transfers"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!branchId || !canTransfer) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    staffTransfersList({ limit: 200, status: statusFilter || undefined })
      .then((res) => {
        if (!cancelled) setTransfers(res?.items ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Failed to load transfers");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [branchId, canTransfer, statusFilter]);

  const filteredTransfers = useMemo(() => {
    const fromIds = new Set(branchLocationIds);
    let list = transfers;
    if (tab === "outgoing") list = list.filter((t) => fromIds.has(t.fromLocationId));
    else list = list.filter((t) => fromIds.has(t.toLocationId));
    return list;
  }, [transfers, tab, branchLocationIds]);

  const addCreateLine = () =>
    setCreateForm((f) => ({ ...f, items: [...f.items, { variantId: "", quantity: "" }] }));
  const setCreateLine = (idx, field, value) =>
    setCreateForm((f) => ({
      ...f,
      items: f.items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    }));

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const fromId = Number(createForm.fromLocationId);
    const toId = Number(createForm.toLocationId);
    const items = createForm.items
      .filter((i) => i.variantId && Number(i.quantity) > 0)
      .map((i) => ({ variantId: Number(i.variantId), quantity: Number(i.quantity) }));
    if (!fromId || !toId || items.length === 0) {
      setError("Select from/to location and at least one item with quantity.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await staffCreateTransfer({ fromLocationId: fromId, toLocationId: toId, items });
      setActionSuccess("Transfer created (Draft). You can dispatch it when ready.");
      setShowCreate(false);
      setCreateForm((f) => ({ ...f, toLocationId: "", items: [{ variantId: "", quantity: "" }] }));
      // Refetch list
      const res = await staffTransfersList({ limit: 200 });
      setTransfers(res?.items ?? []);
    } catch (err) {
      setError(err?.message ?? "Failed to create transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatch = async (transferId) => {
    if (!canTransfer) return;
    setSubmitting(true);
    setError("");
    try {
      await staffSendTransfer(transferId);
      setActionSuccess("Transfer dispatched (In transit).");
      const res = await staffTransfersList({ limit: 200 });
      setTransfers(res?.items ?? []);
    } catch (err) {
      setError(err?.message ?? "Failed to dispatch");
    } finally {
      setSubmitting(false);
    }
  };

  const openReceiveModal = (t) => {
    const lineItems = (t.items || []).map((item) => ({
      variantId: item.variantId,
      lotId: item.lotId ?? null,
      variant: item.variant,
      lot: item.lot,
      quantitySent: item.quantitySent ?? 0,
      quantityReceived: item.quantityReceived ?? 0,
      quantityReceivedInput: String(item.quantitySent ?? 0),
      quantityDamaged: "0",
      quantityExpired: "0",
    }));
    setReceiveModal({ transfer: t, lineItems });
  };

  const handleReceiveSubmit = async () => {
    if (!receiveModal || !canReceive) return;
    setReceiveSubmitting(true);
    setError("");
    try {
      const items = receiveModal.lineItems.map((line) => ({
        variantId: line.variantId,
        lotId: line.lotId ?? undefined,
        quantityReceived: parseInt(line.quantityReceivedInput || 0, 10),
        quantityDamaged: parseInt(line.quantityDamaged || 0, 10),
        quantityExpired: parseInt(line.quantityExpired || 0, 10),
      }));
      await staffReceiveTransfer(receiveModal.transfer.id, { items });
      setActionSuccess("Transfer received.");
      setReceiveModal(null);
      const res = await staffTransfersList({ limit: 200 });
      setTransfers(res?.items ?? []);
    } catch (err) {
      setError(err?.message ?? "Failed to receive transfer");
    } finally {
      setReceiveSubmitting(false);
    }
  };

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }
  if (errorCode === "forbidden" || !hasViewPermission || !canTransfer) {
    return (
      <AccessDenied missingPerm={REQUIRED_PERM} onBack={() => router.push(`/staff/branch/${branchId}`)} />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <div className="d-flex align-items-center gap-12 mb-24">
        <Link href={`/staff/branch/${branchId}/inventory`} className="btn btn-outline-secondary btn-sm">
          ← Back to Inventory
        </Link>
        <h5 className="mb-0">Transfers</h5>
        <div className="ms-auto d-flex gap-12">
          <select
            className="form-select form-select-sm"
            style={{ width: 140 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>{o.label}</option>
            ))}
          </select>
          {canTransfer && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
              Create transfer
            </button>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="alert alert-success d-flex align-items-center justify-content-between">
          <span>{actionSuccess}</span>
          <button type="button" className="btn btn-sm btn-outline-success" onClick={() => setActionSuccess("")}>
            Dismiss
          </button>
        </div>
      )}
      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between flex-wrap gap-12">
          <span>{error}</span>
          <div className="d-flex gap-8">
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={retryTransfers}>
              Retry
            </button>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <ul className="nav nav-tabs mb-16">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === "outgoing" ? "active" : ""}`}
            onClick={() => setTab("outgoing")}
          >
            Outgoing
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === "incoming" ? "active" : ""}`}
            onClick={() => setTab("incoming")}
          >
            Incoming
          </button>
        </li>
      </ul>

      <Card
        title={tab === "outgoing" ? "Outgoing transfers" : "Incoming transfers"}
        subtitle={
          <>
            Branch scope: {branchId}. Filter: {statusFilter || "All"}. Lifecycle: DRAFT → IN_TRANSIT → RECEIVED
            {(statusFilter === "PARTIAL" || statusFilter === "DISPUTED") && " (or PARTIAL/DISPUTED)"}.
          </>
        }
      >
        {loading ? (
          <div className="py-24">
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>From → To</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td><span className="placeholder col-2" /></td>
                      <td><span className="placeholder col-4" /></td>
                      <td><span className="placeholder col-2" /></td>
                      <td><span className="placeholder col-1" /></td>
                      <td><span className="placeholder col-3" /></td>
                      <td><span className="placeholder col-2" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-center text-secondary-light mt-16">Loading transfers...</p>
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div className="py-40 text-center text-secondary-light">
            No {tab} transfers found. {canTransfer && tab === "outgoing" && "Create a transfer above."}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>From → To</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.map((t) => {
                  const fromName = t.fromLocation?.name ?? `Location ${t.fromLocationId}`;
                  const toName = t.toLocation?.name ?? `Location ${t.toLocationId}`;
                  const itemCount = (t.items || []).length;
                  const canDispatch = canTransfer && tab === "outgoing" && t.status === "DRAFT";
                  const canReceiveThis = canReceive && tab === "incoming" && (t.status === "IN_TRANSIT" || t.status === "SENT");
                  return (
                    <tr key={t.id}>
                      <td>{t.id}</td>
                      <td>
                        <span className="text-secondary">{fromName}</span>
                        <span className="mx-8">→</span>
                        <span>{toName}</span>
                      </td>
                      <td>
                        <span className={`badge ${statusBadgeClass(t.status)}`}>{t.status}</span>
                      </td>
                      <td>{itemCount}</td>
                      <td>{t.createdAt ? new Date(t.createdAt).toLocaleString() : "—"}</td>
                      <td>
                        <div className="d-flex gap-8">
                          {canDispatch && (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              disabled={submitting}
                              onClick={() => handleDispatch(t.id)}
                            >
                              Dispatch
                            </button>
                          )}
                          {canReceiveThis && (
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              onClick={() => openReceiveModal(t)}
                            >
                              Receive
                            </button>
                          )}
                          {canApprove && t.status === "DRAFT" && tab === "outgoing" && (
                            <span className="badge bg-light text-dark" title="Approval workflow not configured">
                              Approve (N/A)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create transfer modal */}
      {showCreate && (
        <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)" }} aria-modal="true">
          <div className="modal-dialog modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Create transfer (outgoing)</h6>
                <button type="button" className="btn-close" onClick={() => setShowCreate(false)} aria-label="Close" />
              </div>
              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body">
                  <div className="mb-16">
                    <label className="form-label text-sm">From (this branch)</label>
                    <select
                      className="form-select form-select-sm"
                      value={createForm.fromLocationId}
                      onChange={(e) => setCreateForm((f) => ({ ...f, fromLocationId: e.target.value }))}
                      required
                    >
                      <option value="">Select</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>{loc.name ?? `Location ${loc.id}`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-16">
                    <label className="form-label text-sm">To (other branch)</label>
                    <select
                      className="form-select form-select-sm"
                      value={createForm.toLocationId}
                      onChange={(e) => setCreateForm((f) => ({ ...f, toLocationId: e.target.value }))}
                      required
                    >
                      <option value="">Select</option>
                      {otherBranchLocations.map((loc) => (
                        <option key={loc.id} value={loc.id}>{loc.branchName} – {loc.name}</option>
                      ))}
                    </select>
                  </div>
                  {otherBranchLocations.length === 0 && (
                    <p className="text-warning small mb-16">No other branch locations available. Add locations for other branches first.</p>
                  )}
                  <label className="form-label text-sm">Items</label>
                  {createForm.items.map((line, idx) => (
                    <div key={idx} className="row g-8 mb-8">
                      <div className="col-7">
                        <select
                          className="form-select form-select-sm"
                          value={line.variantId}
                          onChange={(e) => setCreateLine(idx, "variantId", e.target.value)}
                        >
                          <option value="">Variant</option>
                          {variants.map((v) => (
                            <option key={v.id} value={v.id}>{v.sku ?? v.title ?? v.id}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-3">
                        <input
                          type="number"
                          min="1"
                          className="form-control form-control-sm"
                          placeholder="Qty"
                          value={line.quantity}
                          onChange={(e) => setCreateLine(idx, "quantity", e.target.value)}
                        />
                      </div>
                      <div className="col-2">
                        {createForm.items.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() =>
                              setCreateForm((f) => ({
                                ...f,
                                items: f.items.filter((_, i) => i !== idx),
                              }))
                            }
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button type="button" className="btn btn-sm btn-outline-secondary mt-8" onClick={addCreateLine}>
                    + Add line
                  </button>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCreate(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Creating..." : "Create transfer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Receive transfer modal */}
      {receiveModal && (
        <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)" }} aria-modal="true">
          <div className="modal-dialog modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Receive transfer #{receiveModal.transfer.id}</h6>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setReceiveModal(null)}
                  aria-label="Close"
                />
              </div>
              <div className="modal-body">
                <p className="text-secondary small mb-16">Enter received / damaged / expired quantities per line.</p>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Variant</th>
                        <th>Sent</th>
                        <th>Received</th>
                        <th>Damaged</th>
                        <th>Expired</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiveModal.lineItems.map((line, idx) => (
                        <tr key={idx}>
                          <td>{line.variant?.sku ?? line.variant?.title ?? line.variantId}</td>
                          <td>{line.quantitySent}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              className="form-control form-control-sm"
                              value={line.quantityReceivedInput}
                              onChange={(e) =>
                                setReceiveModal((m) => ({
                                  ...m,
                                  lineItems: m.lineItems.map((l, i) =>
                                    i === idx ? { ...l, quantityReceivedInput: e.target.value } : l
                                  ),
                                }))
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              className="form-control form-control-sm"
                              value={line.quantityDamaged}
                              onChange={(e) =>
                                setReceiveModal((m) => ({
                                  ...m,
                                  lineItems: m.lineItems.map((l, i) =>
                                    i === idx ? { ...l, quantityDamaged: e.target.value } : l
                                  ),
                                }))
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              className="form-control form-control-sm"
                              value={line.quantityExpired}
                              onChange={(e) =>
                                setReceiveModal((m) => ({
                                  ...m,
                                  lineItems: m.lineItems.map((l, i) =>
                                    i === idx ? { ...l, quantityExpired: e.target.value } : l
                                  ),
                                }))
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setReceiveModal(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  disabled={receiveSubmitting}
                  onClick={handleReceiveSubmit}
                >
                  {receiveSubmitting ? "Receiving..." : "Confirm receive"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
