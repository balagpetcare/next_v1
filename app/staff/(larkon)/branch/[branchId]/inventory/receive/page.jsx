"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Nav, Tab } from "react-bootstrap";
import LkFormGroup from "@larkon-ui/components/LkFormGroup";
import LkInput from "@larkon-ui/components/LkInput";
import LkSelect from "@larkon-ui/components/LkSelect";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffInventoryLocations,
  staffCreateOpeningStock,
  staffInventoryList,
  staffGetIncomingInboundUnified,
  staffGetPendingPoReceipts,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import TransferReceiveDrawer from "./_components/TransferReceiveDrawer";
import {
  staffBranchInventoryPath,
  staffBranchPickerPath,
  staffDispatchReceiveWorkspacePath,
  staffInboundTransfersPath,
  staffReceiveCenterPath,
  staffReceiveCenterWithTransferPath,
  staffWarehouseReceivePoQueryPath,
} from "@/lib/staffInventoryRoutes";
import { getUniqueVariants, getUniqueVariantsFromStaffInventoryItems } from "@/src/lib/getUniqueVariants";
import { isWarehouseHubBranch } from "@/src/lib/branchSidebarConfig";
import {
  canLoadPendingPoReceipts,
  canReceiveStockAtBranch,
  canViewReceiveCenterPage,
  dispatchStatusBadgeClass,
} from "@/lib/inboundTransfersUi";

function StaffBranchInventoryReceivePageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);

  const [tab, setTab] = useState("incoming");
  const [inboundRows, setInboundRows] = useState([]);
  const [dispatchesLoading, setDispatchesLoading] = useState(true);
  const [dispatchesError, setDispatchesError] = useState("");
  const [drawerTransferId, setDrawerTransferId] = useState(null);

  const [pendingPoRows, setPendingPoRows] = useState([]);
  const [pendingPoLoading, setPendingPoLoading] = useState(false);
  const [pendingPoError, setPendingPoError] = useState("");

  const [locations, setLocations] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    locationId: "",
    reference: "",
    receiveDate: new Date().toISOString().split("T")[0],
    items: [{ variantId: "", quantity: "" }],
  });

  const permissions = myAccess?.permissions ?? [];
  const isHub = useMemo(() => isWarehouseHubBranch(branch), [branch]);
  const canViewShell = useMemo(() => canViewReceiveCenterPage(permissions, isHub), [permissions, isHub]);
  const canReceive = useMemo(() => canReceiveStockAtBranch(permissions), [permissions]);
  const readOnly = canViewShell && !canReceive;
  const canPo = useMemo(() => canLoadPendingPoReceipts(permissions), [permissions]);

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  const loadInbound = () => {
    if (!branchId) return;
    setDispatchesLoading(true);
    setDispatchesError("");
    staffGetIncomingInboundUnified(branchId)
      .then((list) => setInboundRows(Array.isArray(list) ? list : []))
      .catch((e) => setDispatchesError(e?.message ?? "Failed to load incoming shipments"))
      .finally(() => setDispatchesLoading(false));
  };

  const loadPendingPoReceipts = () => {
    if (!branchId) return;
    setPendingPoLoading(true);
    setPendingPoError("");
    staffGetPendingPoReceipts(branchId)
      .then((list) => setPendingPoRows(Array.isArray(list) ? list : []))
      .catch((e) => {
        const msg = e?.message ?? "";
        const forbidden = msg === "Forbidden" || msg.includes("403");
        setPendingPoRows([]);
        setPendingPoError(
          forbidden
            ? "Purchase order receipt list is not available for your role (API denied)."
            : msg || "Failed to load pending PO receipts"
        );
      })
      .finally(() => setPendingPoLoading(false));
  };

  useEffect(() => {
    if (branchId && canViewShell) loadInbound();
  }, [branchId, canViewShell]);

  useEffect(() => {
    if (!branchId || !canPo) {
      setPendingPoRows([]);
      setPendingPoError("");
      setPendingPoLoading(false);
      return;
    }
    loadPendingPoReceipts();
  }, [branchId, canPo]);

  useEffect(() => {
    const d = searchParams.get("dispatch");
    const t = searchParams.get("transfer");
    if (d && /^\d+$/.test(d)) {
      router.replace(staffDispatchReceiveWorkspacePath(branchId, d), { scroll: false });
      return;
    }
    if (t && /^\d+$/.test(t)) {
      setDrawerTransferId(Number(t));
      router.replace(staffReceiveCenterPath(branchId), { scroll: false });
    }
  }, [searchParams, branchId, router]);

  useEffect(() => {
    if (!branchId || !canReceive) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([staffInventoryLocations(), staffInventoryList(branchId, { limit: 200 })])
      .then(([locs, listRes]) => {
        if (cancelled) return;
        const branchLocs = (locs || []).filter((l) => l.branch && String(l.branch.id) === String(branchId));
        setLocations(branchLocs);
        const items = listRes.items ?? [];
        setVariants(getUniqueVariantsFromStaffInventoryItems(items));
        if (branchLocs.length && !form.locationId) setForm((f) => ({ ...f, locationId: String(branchLocs[0].id) }));
      })
      .catch((e) => !cancelled && setError(e?.message ?? "Failed to load"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [branchId, canReceive]);

  useEffect(() => {
    if (!canReceive && tab === "opening") setTab("incoming");
  }, [canReceive, tab]);

  /** Defense in depth: stable dedupe for dropdown keys even if state ever contained duplicates. */
  const variantOptions = useMemo(() => getUniqueVariants(variants), [variants]);

  const addLine = () => setForm((f) => ({ ...f, items: [...f.items, { variantId: "", quantity: "" }] }));
  const setLine = (idx, field, value) => setForm((f) => ({
    ...f,
    items: f.items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
  }));

  const handleOpeningSubmit = async (e) => {
    e.preventDefault();
    if (!form.locationId || !form.items.some((i) => i.variantId && Number(i.quantity) > 0)) {
      setError("Select location and at least one item with quantity.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      for (const line of form.items) {
        const qty = Number(line.quantity);
        const vid = Number(line.variantId);
        if (!vid || qty <= 0) continue;
        await staffCreateOpeningStock({
          locationId: Number(form.locationId),
          variantId: vid,
          quantity: qty,
        });
      }
      setSuccess(true);
      setTimeout(() => router.push(staffBranchInventoryPath(branchId)), 1500);
    } catch (err) {
      setError(err?.message ?? "Failed to record receive");
    } finally {
      setSubmitting(false);
    }
  };

  const enterpriseRows = useMemo(() => inboundRows.filter((r) => r.kind === "DISPATCH"), [inboundRows]);
  const legacyRows = useMemo(() => inboundRows.filter((r) => r.kind === "TRANSFER"), [inboundRows]);

  const receivableRows = inboundRows.filter((r) => r.receivable);
  const pendingCount = receivableRows.length;
  const pendingQty = inboundRows.reduce((s, r) => {
    const lines = r.items ?? [];
    return (
      s +
      lines.reduce((t, i) => {
        const q = i.quantity ?? i.quantityDispatched ?? 0;
        return t + (typeof q === "number" ? q : 0);
      }, 0)
    );
  }, 0);

  const totalPendingPoQty = pendingPoRows.reduce((s, po) => s + (po.pendingQty ?? 0), 0);

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }
  if (errorCode === "forbidden" || !hasViewPermission) {
    return (
      <AccessDenied
        title="Branch access required"
        message="You cannot open this branch, or your membership is not active. Pick another branch or contact an administrator."
        onBack={() => router.push(staffBranchPickerPath())}
      />
    );
  }

  if (!canViewShell) {
    return (
      <AccessDenied
        title="Receive Center unavailable"
        message="Your role does not include inbound visibility for this branch. Typical grants: inventory read, inbound read, dispatch view, or warehouse access at a hub branch."
        onBack={() => router.push(staffBranchInventoryPath(branchId))}
      />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      {readOnly ? (
        <div className="alert alert-light border small mb-16" role="status">
          <strong>Read-only.</strong> You can review incoming shipments and open dispatch workspaces in view mode. Posting receipts, opening stock, and PO receive
          actions require <span className="text-body">Receive stock</span> on your role.
        </div>
      ) : null}

      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-24">
        <div className="d-flex align-items-center gap-12 flex-wrap">
          <Link href={staffBranchInventoryPath(branchId)} className="btn btn-outline-secondary btn-sm">
            ← Back to Inventory
          </Link>
          <Link href={staffInboundTransfersPath(branchId)} className="btn btn-outline-secondary btn-sm">
            Inbound transfers
          </Link>
          <h5 className="mb-0">Receive Center</h5>
        </div>
        {tab === "incoming" && (pendingCount > 0 || pendingPoRows.length > 0) && (
          <div className="d-flex gap-8 flex-wrap">
            {pendingCount > 0 && (
              <span className="badge bg-info">
                {pendingCount} {canReceive ? "ready to receive" : "in queue (view)"} · {pendingQty} unit(s)
              </span>
            )}
            {pendingPoRows.length > 0 && (
              <span className="badge bg-warning text-dark">{pendingPoRows.length} PO(s) · {totalPendingPoQty} unit(s) pending</span>
            )}
          </div>
        )}
      </div>

      <Tab.Container activeKey={tab} onSelect={(k) => setTab(k ?? "incoming")}>
        <Nav variant="tabs" className="mb-24" role="tablist" aria-label="Receive Center tabs">
          <Nav.Item>
            <Nav.Link eventKey="incoming" role="tab" aria-selected={tab === "incoming"}>Incoming shipments</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="opening" role="tab" aria-selected={tab === "opening"} disabled={!canReceive} title={!canReceive ? "Requires Receive stock permission" : undefined}>
              Opening stock
            </Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="incoming">
          {/* ── Vendor PO receipts ── */}
          <Card
            title="Vendor purchase orders — pending receipt"
            subtitle="Approved purchase orders assigned to this warehouse that have not been fully received. Click 'Receive PO' to open the GRN receiving form."
          >
            {!canPo ? (
              <p className="small text-muted mb-0">
                PO receipt queue requires purchase/GRN receive permissions. You can still review dispatches and transfers below if your role includes inbound read.
              </p>
            ) : null}
            {pendingPoError && (
              <div className="alert alert-danger d-flex align-items-center justify-content-between">
                <span>{pendingPoError}</span>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setPendingPoError("")}>Dismiss</button>
              </div>
            )}
            {!canPo ? null : pendingPoLoading ? (
              <p className="text-secondary-light">Loading…</p>
            ) : pendingPoRows.length === 0 ? (
              <div className="text-center py-3">
                <p className="text-secondary-light mb-1">No purchase orders pending receipt.</p>
                <p className="small text-muted mb-0">
                  Purchase orders approved by the owner and assigned to this warehouse will appear here.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover">
                  <thead>
                    <tr>
                      <th>PO #</th>
                      <th>Vendor</th>
                      <th>Status</th>
                      <th>Lines</th>
                      <th>Pending qty</th>
                      <th>Expected delivery</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPoRows.map((po) => {
                      const receiveHref = staffWarehouseReceivePoQueryPath(branchId, { purchaseOrderId: po.id, vendorId: po.vendorId });
                      const isOverdue = po.expectedDeliveryDate && new Date(po.expectedDeliveryDate) < new Date();
                      return (
                        <tr key={`po-${po.id}`}>
                          <td className="fw-semibold">{po.poNumber}</td>
                          <td>{po.vendorName ?? "—"}</td>
                          <td>
                            <span className={`badge ${po.status === "PARTIALLY_RECEIVED" ? "bg-warning text-dark" : "bg-success"}`}>
                              {po.status === "PARTIALLY_RECEIVED" ? "Partial" : "Approved"}
                            </span>
                          </td>
                          <td>{po.lineCount} line(s)</td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="progress flex-grow-1" style={{ height: "6px", minWidth: "60px" }}>
                                <div
                                  className={`progress-bar ${po.totalReceivedQty >= po.totalOrderedQty ? "bg-success" : "bg-primary"}`}
                                  style={{ width: `${po.totalOrderedQty > 0 ? Math.min(100, (po.totalReceivedQty / po.totalOrderedQty) * 100) : 0}%` }}
                                />
                              </div>
                              <span className="small text-nowrap">
                                {po.pendingQty} / {po.totalOrderedQty}
                              </span>
                            </div>
                          </td>
                          <td>
                            {po.expectedDeliveryDate ? (
                              <span className={isOverdue ? "text-danger fw-semibold" : ""}>
                                {new Date(po.expectedDeliveryDate).toLocaleDateString()}
                                {isOverdue && " ⚠ overdue"}
                              </span>
                            ) : "—"}
                          </td>
                          <td>
                            {canReceive ? (
                              <Link href={receiveHref} className="btn btn-primary btn-sm">
                                Receive PO
                              </Link>
                            ) : (
                              <span className="btn btn-outline-secondary btn-sm disabled" title="Requires Receive stock">
                                Receive PO
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="mb-24" />

          <Card
            title="Incoming dispatches (enterprise)"
            subtitle="StockDispatch from warehouse. Receive is enabled only when status is IN_TRANSIT (after warehouse Send dispatch). CREATED / PACKED rows show until the shipment is sent."
          >
            {dispatchesError && (
              <div className="alert alert-danger d-flex align-items-center justify-content-between">
                <span>{dispatchesError}</span>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDispatchesError("")}>Dismiss</button>
              </div>
            )}
            {dispatchesLoading ? (
              <p className="text-secondary-light">Loading…</p>
            ) : enterpriseRows.length === 0 ? (
              <div className="text-center py-3">
                <p className="text-secondary-light mb-1">No enterprise dispatches for this branch.</p>
                <p className="small text-muted mb-0">
                  If warehouse already handed off a pick list, the dispatch should list here with status CREATED or PACKED until the warehouse sends it (then IN_TRANSIT).
                  If nothing appears, confirm the dispatch <strong>toLocation</strong> matches this branch and check API logs.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Request</th>
                      <th>Source</th>
                      <th>Destination</th>
                      <th>Status</th>
                      <th>Next</th>
                      <th>Items</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {enterpriseRows.map((row) => {
                      const itemCount = (row.items ?? []).length;
                      const totalQty = (row.items ?? []).reduce((s, i) => {
                        const q = i.quantity ?? i.quantityDispatched ?? 0;
                        return s + (typeof q === "number" ? q : 0);
                      }, 0);
                      const key = `DISPATCH-${row.id}`;
                      const openEnterpriseReceive = () => {
                        router.push(staffDispatchReceiveWorkspacePath(branchId, row.id));
                      };
                      return (
                        <tr key={key}>
                          <td>
                            <span className="badge bg-primary me-1">Dispatch</span>#{row.id}
                          </td>
                          <td className="small">{row.requestRef ?? "—"}</td>
                          <td className="small">{row.sourceLabel ?? row.fromLocation?.name ?? "—"}</td>
                          <td className="small">
                            <div>{row.destinationBranchName ?? "—"}</div>
                            <div className="text-muted">{row.toLocation?.name ?? ""}</div>
                          </td>
                          <td>
                            <span className={`badge ${dispatchStatusBadgeClass(row.status)}`}>{row.status}</span>
                          </td>
                          <td className="small text-muted">{row.nextActionHint ?? "—"}</td>
                          <td>{itemCount} line(s), {totalQty} unit(s)</td>
                          <td>
                            <Link
                              href={staffDispatchReceiveWorkspacePath(branchId, row.id)}
                              className="btn btn-outline-primary btn-sm me-1"
                            >
                              View
                            </Link>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={!canReceive || !row.receivable}
                              title={
                                !canReceive
                                  ? "Read-only: open View for dispatch workspace"
                                  : !row.receivable
                                    ? (row.nextActionHint || "Not receivable yet")
                                    : "Open dispatch receive session"
                              }
                              onClick={openEnterpriseReceive}
                            >
                              Receive
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <details className="mb-24 border rounded p-3 bg-light bg-opacity-25">
            <summary className="fw-semibold text-secondary cursor-pointer" style={{ listStyle: "none" }}>
              Legacy transfers (StockTransfer — not the primary enterprise flow)
            </summary>
            <p className="small text-muted mt-2 mb-3">
              Older fulfillment path. New warehouse → branch inbound should use StockDispatch only (section above).
            </p>
            {dispatchesLoading ? (
              <p className="text-secondary-light">Loading…</p>
            ) : legacyRows.length === 0 ? (
              <p className="text-secondary-light mb-0 small">No legacy transfers in queue.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Request</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Status</th>
                      <th>Next</th>
                      <th>Items</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {legacyRows.map((row) => {
                      const itemCount = (row.items ?? []).length;
                      const totalQty = (row.items ?? []).reduce((s, i) => {
                        const q = i.quantity ?? i.quantityDispatched ?? 0;
                        return s + (typeof q === "number" ? q : 0);
                      }, 0);
                      const key = `TRANSFER-${row.id}`;
                      const openDrawer = () => {
                        setDrawerTransferId(row.id);
                      };
                      const openLegacyReceive = () => {
                        router.push(staffReceiveCenterWithTransferPath(branchId, row.id));
                      };
                      return (
                        <tr key={key}>
                          <td>
                            <span className="badge bg-secondary me-1">Transfer</span>#{row.id}
                          </td>
                          <td className="small">{row.requestRef ?? "—"}</td>
                          <td className="small">{row.sourceLabel ?? row.fromLocation?.name ?? "—"}</td>
                          <td className="small">
                            <div>{row.destinationBranchName ?? "—"}</div>
                            <div className="text-muted">{row.toLocation?.name ?? ""}</div>
                          </td>
                          <td>
                            <span className={`badge ${dispatchStatusBadgeClass(row.status)}`}>{row.status}</span>
                          </td>
                          <td className="small text-muted">{row.nextActionHint ?? "—"}</td>
                          <td>{itemCount} line(s), {totalQty} unit(s)</td>
                          <td>
                            <button type="button" className="btn btn-outline-primary btn-sm me-1" onClick={openDrawer}>
                              View
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={!canReceive || !row.receivable}
                              title={
                                !canReceive
                                  ? "Read-only: use View to inspect transfer"
                                  : !row.receivable
                                    ? (row.nextActionHint || "Not receivable yet")
                                    : "Open legacy receive"
                              }
                              onClick={openLegacyReceive}
                            >
                              Receive
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </details>
        </Tab.Pane>

        <Tab.Pane eventKey="opening">
          <div className="alert alert-info small mb-3">
            Opening stock is for initial setup. For warehouse inbound, use <strong>Incoming shipments</strong>.
          </div>
          {success && <div className="alert alert-success">Received successfully. Redirecting...</div>}
          {error && <div className="alert alert-danger">{error}</div>}
          <Card title="Opening stock" subtitle="Record initial stock at this location">
            {loading ? (
              <p className="text-secondary-light">Loading locations...</p>
            ) : locations.length === 0 ? (
              <p className="text-secondary-light mb-0">No inventory locations found for this branch.</p>
            ) : (
              <form onSubmit={handleOpeningSubmit} aria-disabled={!canReceive}>
                <div className="row g-16 mb-16">
                  <div className="col-md-4">
                    <LkFormGroup label="Location" className="text-sm">
                      <LkSelect
                        size="sm"
                        className="radius-12"
                        value={form.locationId}
                        onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))}
                        required
                      >
                        <option value="">Select</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>{loc.name ?? `Location ${loc.id}`}</option>
                        ))}
                      </LkSelect>
                    </LkFormGroup>
                  </div>
                  <div className="col-md-4">
                    <LkFormGroup label="Reference / Invoice no" className="text-sm">
                      <LkInput
                        type="text"
                        size="sm"
                        className="radius-12"
                        value={form.reference}
                        onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                        placeholder="Optional"
                      />
                    </LkFormGroup>
                  </div>
                  <div className="col-md-4">
                    <LkFormGroup label="Receive date" className="text-sm">
                      <LkInput
                        type="date"
                        size="sm"
                        className="radius-12"
                        value={form.receiveDate}
                        onChange={(e) => setForm((f) => ({ ...f, receiveDate: e.target.value }))}
                      />
                    </LkFormGroup>
                  </div>
                </div>
                <div className="mb-16">
                  <div className="d-flex align-items-center justify-content-between mb-8">
                    <span className="form-label text-sm mb-0">Items</span>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={addLine}>Add line</button>
                  </div>
                  {form.items.map((line, idx) => (
                    <div key={idx} className="row g-8 mb-8 align-items-end">
                      <div className="col-md-6">
                        <LkFormGroup label="Variant / Product" className="text-sm">
                          <LkSelect
                            size="sm"
                            className="radius-12"
                            value={line.variantId}
                            onChange={(e) => setLine(idx, "variantId", e.target.value)}
                          >
                            <option value="">Select</option>
                            {variantOptions.map((v) => (
                              <option key={`variant-${v.id}`} value={v.id}>{v.sku ?? v.title ?? v.id}</option>
                            ))}
                          </LkSelect>
                        </LkFormGroup>
                      </div>
                      <div className="col-md-3">
                        <LkFormGroup label="Quantity" className="text-sm">
                          <LkInput
                            type="number"
                            min={1}
                            size="sm"
                            className="radius-12"
                            value={line.quantity}
                            onChange={(e) => setLine(idx, "quantity", e.target.value)}
                          />
                        </LkFormGroup>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Record receive"}
                </button>
              </form>
            )}
          </Card>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      <TransferReceiveDrawer
        show={drawerTransferId != null}
        onHide={() => setDrawerTransferId(null)}
        transferId={drawerTransferId ?? 0}
        branchId={branchId}
        onSuccess={loadInbound}
        allowReceiveSubmit={canReceive}
      />
    </div>
  );
}

export default function StaffBranchInventoryReceivePage() {
  return (
    <Suspense
      fallback={
        <div className="container py-40 text-center">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-16 text-secondary-light">Loading...</p>
        </div>
      }
    >
      <StaffBranchInventoryReceivePageInner />
    </Suspense>
  );
}
