"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Nav, Tab, TabContainer, TabContent, TabPane } from "react-bootstrap";
import LkFormGroup from "@larkon-ui/components/LkFormGroup";
import LkInput from "@larkon-ui/components/LkInput";
import LkSelect from "@larkon-ui/components/LkSelect";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffInventoryLocations,
  staffCreateOpeningStock,
  staffInventoryList,
  staffGetIncomingInboundUnified,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import DispatchReceiveDrawer from "./_components/DispatchReceiveDrawer";
import TransferReceiveDrawer from "./_components/TransferReceiveDrawer";

const REQUIRED_PERM = "inventory.receive";

function statusBadge(status) {
  const map = {
    IN_TRANSIT: "bg-info",
    SENT: "bg-info",
    DELIVERED: "bg-success",
    CREATED: "bg-secondary",
    PACKED: "bg-warning text-dark",
  };
  return map[status] ?? "bg-secondary";
}

export default function StaffBranchInventoryReceivePage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);

  const [tab, setTab] = useState("incoming");
  const [inboundRows, setInboundRows] = useState([]);
  const [dispatchesLoading, setDispatchesLoading] = useState(true);
  const [dispatchesError, setDispatchesError] = useState("");
  const [drawerDispatchId, setDrawerDispatchId] = useState(null);
  const [drawerTransferId, setDrawerTransferId] = useState(null);

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
  const canReceive = permissions.includes(REQUIRED_PERM);

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

  useEffect(() => {
    if (branchId && canReceive) loadInbound();
  }, [branchId, canReceive]);

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
        const seen = new Set();
        const list = items
          .filter((i) => i.variant && !seen.has(i.variant.id))
          .map((i) => { seen.add(i.variant.id); return { id: i.variant.id, sku: i.variant.sku, title: i.variant.title, product: i.variant.product }; });
        setVariants(list);
        if (branchLocs.length && !form.locationId) setForm((f) => ({ ...f, locationId: String(branchLocs[0].id) }));
      })
      .catch((e) => !cancelled && setError(e?.message ?? "Failed to load"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [branchId, canReceive]);

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
      setTimeout(() => router.push(`/staff/branch/${branchId}/inventory`), 1500);
    } catch (err) {
      setError(err?.message ?? "Failed to record receive");
    } finally {
      setSubmitting(false);
    }
  };

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

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }
  if (errorCode === "forbidden" || !hasViewPermission || !canReceive) {
    return (
      <AccessDenied missingPerm={REQUIRED_PERM} onBack={() => router.push(`/staff/branch/${branchId}`)} />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-24">
        <div className="d-flex align-items-center gap-12">
          <Link href={`/staff/branch/${branchId}/inventory`} className="btn btn-outline-secondary btn-sm">
            ← Back to Inventory
          </Link>
          <h5 className="mb-0">Receive Center</h5>
        </div>
        {tab === "incoming" && pendingCount > 0 && (
          <span className="badge bg-info">
            {pendingCount} pending · {pendingQty} unit(s)
          </span>
        )}
      </div>

      <Tab.Container activeKey={tab} onSelect={(k) => setTab(k ?? "incoming")}>
        <Nav variant="tabs" className="mb-24" role="tablist" aria-label="Receive Center tabs">
          <Nav.Item>
            <Nav.Link eventKey="incoming" role="tab" aria-selected={tab === "incoming"}>Incoming shipments</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="opening" role="tab" aria-selected={tab === "opening"}>Opening stock</Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="incoming">
          <Card
            title="Incoming shipments"
            subtitle="Warehouse dispatches (challan) and stock-request transfers in transit or packed. Receive when status is in transit (or SENT for transfers). If you also manage transfers elsewhere, use Inventory → Transfers."
          >
            {dispatchesError && (
              <div className="alert alert-danger d-flex align-items-center justify-content-between">
                <span>{dispatchesError}</span>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDispatchesError("")}>Dismiss</button>
              </div>
            )}
            {dispatchesLoading ? (
              <p className="text-secondary-light">Loading…</p>
            ) : inboundRows.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-secondary-light mb-2">No incoming shipments.</p>
                <p className="small text-muted mb-0">
                  Owner fulfillment from central warehouse usually creates an <strong>in-transit transfer</strong> (shown here).
                  Dispatch challans appear after pick handoff or direct dispatch and are marked in transit when sent.{" "}
                  <Link href={`/staff/branch/${branchId}/inventory/stock-requests`}>Stock Requests</Link>
                  {" · "}
                  <Link href={`/staff/branch/${branchId}/inventory/transfers`}>Transfers</Link>
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>ID</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Status</th>
                      <th>Items</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {inboundRows.map((row) => {
                      const fromName = row.fromLocation?.name ?? "—";
                      const toName = row.toLocation?.name ?? "—";
                      const itemCount = (row.items ?? []).length;
                      const totalQty = (row.items ?? []).reduce((s, i) => {
                        const q = i.quantity ?? i.quantityDispatched ?? 0;
                        return s + (typeof q === "number" ? q : 0);
                      }, 0);
                      const isDispatch = row.kind === "DISPATCH";
                      const key = `${row.kind}-${row.id}`;
                      const openDrawer = () => {
                        if (isDispatch) {
                          setDrawerTransferId(null);
                          setDrawerDispatchId(row.id);
                        } else {
                          setDrawerDispatchId(null);
                          setDrawerTransferId(row.id);
                        }
                      };
                      return (
                        <tr key={key}>
                          <td>
                            <span className="badge bg-light text-dark">{isDispatch ? "Dispatch" : "Transfer"}</span>
                          </td>
                          <td>#{row.id}</td>
                          <td>{fromName}</td>
                          <td>{toName}</td>
                          <td>
                            <span className={`badge ${statusBadge(row.status)}`}>{row.status}</span>
                            {!row.receivable && (
                              <span className="small text-muted ms-1 d-block">Not receivable yet</span>
                            )}
                          </td>
                          <td>{itemCount} line(s), {totalQty} unit(s)</td>
                          <td>
                            <button type="button" className="btn btn-outline-primary btn-sm me-1" onClick={openDrawer}>
                              View
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={!row.receivable}
                              title={!row.receivable ? "Wait until dispatch is in transit (or transfer is sent)" : ""}
                              onClick={openDrawer}
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
              <form onSubmit={handleOpeningSubmit}>
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
                            {variants.map((v) => (
                              <option key={v.id} value={v.id}>{v.sku ?? v.title ?? v.id}</option>
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

      <DispatchReceiveDrawer
        show={drawerDispatchId != null}
        onHide={() => setDrawerDispatchId(null)}
        dispatchId={drawerDispatchId ?? 0}
        branchId={branchId}
        onSuccess={loadInbound}
      />
      <TransferReceiveDrawer
        show={drawerTransferId != null}
        onHide={() => setDrawerTransferId(null)}
        transferId={drawerTransferId ?? 0}
        branchId={branchId}
        onSuccess={loadInbound}
      />
    </div>
  );
}
