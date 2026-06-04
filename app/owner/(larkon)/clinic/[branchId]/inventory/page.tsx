"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicBranchItemStock,
  ownerClinicLowStockAlerts,
  ownerClinicItemStockLedger,
  ownerClinicItemStockConsumption,
  ownerClinicItemStockAdjust,
  ownerClinicItemStockReceive,
  ownerClinicItemSearch,
  ownerClinicInstrumentIssueLogsList,
  ownerClinicInstrumentIssueLogCreate,
  ownerClinicInstrumentIssueLogReturn,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import ClinicConsoleTabs from "@/app/owner/_components/clinic/ClinicConsoleTabs";
import { clinicalItemLooksLikeVaccine } from "@/app/_lib/vaccineInventoryUi";

type StockRow = {
  id: number;
  itemId: number;
  variantId: number;
  currentQty?: number;
  availableQty?: number;
  reorderLevel?: number;
  item?: {
    name: string;
    itemCode?: string;
    domainType?: string;
    category?: { name?: string };
  };
  variant?: { variantName: string; sku?: string };
};

export default function OwnerClinicInventoryPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [stock, setStock] = useState<StockRow[]>([]);
  const [alerts, setAlerts] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeModal, setActiveModal] = useState<"receive" | "adjust" | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: number; name: string; variants?: Array<{ id: number; variantName: string }> }>>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [receiveQty, setReceiveQty] = useState("");
  const [receiveBatchNo, setReceiveBatchNo] = useState("");
  const [receiveExpiry, setReceiveExpiry] = useState("");
  const [receiveCost, setReceiveCost] = useState("");
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [instrumentLogs, setInstrumentLogs] = useState<Array<Record<string, unknown>>>([]);
  const [instrumentFilter, setInstrumentFilter] = useState<"open" | "returned" | "">("");
  const [instrumentModal, setInstrumentModal] = useState<"issue" | "return" | null>(null);
  const [returnLogId, setReturnLogId] = useState<number | null>(null);
  const [issueQty, setIssueQty] = useState("");
  const [returnQty, setReturnQty] = useState("");
  const [sterilizationStatus, setSterilizationStatus] = useState("");
  const [conditionNote, setConditionNote] = useState("");
  const [activeTab, setActiveTab] = useState<"stock" | "ledger" | "consumption">("stock");
  const [ledgerData, setLedgerData] = useState<{ items: unknown[]; total: number }>({ items: [], total: 0 });
  const [consumptionData, setConsumptionData] = useState<{ items: unknown[]; total: number }>({ items: [], total: 0 });
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [consumptionLoading, setConsumptionLoading] = useState(false);
  const [vaccineStockFilter, setVaccineStockFilter] = useState<"all" | "vaccine">("all");

  const displayedStock = useMemo(() => {
    if (vaccineStockFilter !== "vaccine") return stock;
    return stock.filter((r) => clinicalItemLooksLikeVaccine(r.item ?? null));
  }, [stock, vaccineStockFilter]);
  const loadLedger = useCallback(async () => {
    if (!branchId) return;
    try {
      setLedgerLoading(true);
      const data = await ownerClinicItemStockLedger(branchId, { limit: 100 });
      setLedgerData(data);
    } catch {
      setLedgerData({ items: [], total: 0 });
    } finally {
      setLedgerLoading(false);
    }
  }, [branchId]);

  const loadConsumption = useCallback(async () => {
    if (!branchId) return;
    try {
      setConsumptionLoading(true);
      const data = await ownerClinicItemStockConsumption(branchId, { limit: 50 });
      setConsumptionData(data);
    } catch {
      setConsumptionData({ items: [], total: 0 });
    } finally {
      setConsumptionLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    if (activeTab === "ledger") loadLedger();
  }, [activeTab, loadLedger]);
  useEffect(() => {
    if (activeTab === "consumption") loadConsumption();
  }, [activeTab, loadConsumption]);

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const [stockRes, alertsRes, instrumentRes] = await Promise.all([
        ownerClinicBranchItemStock(branchId),
        ownerClinicLowStockAlerts(branchId),
        ownerClinicInstrumentIssueLogsList(branchId),
      ]);
      setStock((stockRes ?? []) as StockRow[]);
      setAlerts((alertsRes ?? []) as StockRow[]);
      setInstrumentLogs((instrumentRes ?? []) as Array<Record<string, unknown>>);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(t);
  }, [success]);

  useEffect(() => {
    if (!branchId || searchQ.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const list = await ownerClinicItemSearch(branchId, { q: searchQ.trim(), limit: 15 });
        if (!cancelled && Array.isArray(list)) setSearchResults(list as Array<{ id: number; name: string; variants?: Array<{ id: number; variantName: string }> }>);
        else if (!cancelled) setSearchResults([]);
      } catch {
        if (!cancelled) setSearchResults([]);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [branchId, searchQ]);

  const openReceive = () => {
    setActiveModal("receive");
    setReceiveQty("");
    setReceiveBatchNo("");
    setReceiveExpiry("");
    setReceiveCost("");
    setSearchQ("");
    setSearchResults([]);
    setSelectedItemId(null);
    setSelectedVariantId(null);
  };
  const openAdjust = () => {
    setActiveModal("adjust");
    setAdjustDelta("");
    setAdjustReason("");
    setSearchQ("");
    setSearchResults([]);
    setSelectedItemId(null);
    setSelectedVariantId(null);
  };
  const closeModal = () => {
    setActiveModal(null);
    setSelectedItemId(null);
    setSelectedVariantId(null);
  };

  const handleReceive = async () => {
    if (!branchId || selectedItemId == null || selectedVariantId == null) return;
    const qty = parseFloat(receiveQty);
    if (Number.isNaN(qty) || qty <= 0) {
      setError("Enter a positive quantity.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await ownerClinicItemStockReceive(branchId, {
        itemId: selectedItemId,
        variantId: selectedVariantId,
        quantity: qty,
        batchNo: receiveBatchNo.trim() || undefined,
        expiryDate: receiveExpiry.trim() || undefined,
        purchaseCost: receiveCost.trim() ? parseFloat(receiveCost) : undefined,
      });
      setSuccess("Stock received.");
      closeModal();
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Receive failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAdjust = async () => {
    if (!branchId || selectedItemId == null || selectedVariantId == null) return;
    const delta = parseFloat(adjustDelta);
    if (Number.isNaN(delta) || delta === 0) {
      setError("Enter a non-zero delta (positive to add, negative to deduct).");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await ownerClinicItemStockAdjust(branchId, {
        itemId: selectedItemId,
        variantId: selectedVariantId,
        deltaQty: delta,
        reason: adjustReason.trim() || undefined,
      });
      setSuccess("Stock adjusted.");
      closeModal();
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Adjust failed");
    } finally {
      setSaving(false);
    }
  };

  const openIssueInstrument = () => {
    setInstrumentModal("issue");
    setSearchQ("");
    setSearchResults([]);
    setSelectedItemId(null);
    setSelectedVariantId(null);
    setIssueQty("");
  };
  const openReturnInstrument = (logId: number) => {
    setReturnLogId(logId);
    setInstrumentModal("return");
    setReturnQty("");
    setSterilizationStatus("");
    setConditionNote("");
  };
  const closeInstrumentModal = () => {
    setInstrumentModal(null);
    setReturnLogId(null);
  };

  const handleIssueInstrument = async () => {
    if (!branchId || selectedItemId == null || selectedVariantId == null) return;
    const qty = parseFloat(issueQty);
    if (Number.isNaN(qty) || qty <= 0) {
      setError("Enter a positive quantity.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await ownerClinicInstrumentIssueLogCreate(branchId, {
        itemId: selectedItemId,
        variantId: selectedVariantId,
        issuedQty: qty,
      });
      setSuccess("Instrument issued.");
      closeInstrumentModal();
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Issue failed");
    } finally {
      setSaving(false);
    }
  };

  const handleReturnInstrument = async () => {
    if (!branchId || returnLogId == null) return;
    const qty = parseFloat(returnQty);
    if (Number.isNaN(qty) || qty < 0) {
      setError("Enter returned quantity (≥ 0).");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await ownerClinicInstrumentIssueLogReturn(branchId, returnLogId, {
        returnedQty: qty,
        sterilizationStatus: sterilizationStatus.trim() || undefined,
        conditionNote: conditionNote.trim() || undefined,
      });
      setSuccess("Instrument returned.");
      closeInstrumentModal();
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Return failed");
    } finally {
      setSaving(false);
    }
  };

  const openInstrumentLogs = instrumentLogs.filter((l) => !l.returnedAt);
  const returnedInstrumentLogs = instrumentLogs.filter((l) => l.returnedAt);
  const displayInstrumentLogs =
    instrumentFilter === "returned" ? returnedInstrumentLogs : instrumentFilter === "open" ? openInstrumentLogs : instrumentLogs;

  if (!branchId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Inventory"
        subtitle="View branch clinical stock, vaccine availability, batches, and reorder status."
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Inventory", href: `/owner/clinic/${branchId}/inventory` },
        ]}
        actions={[
          <button key="receive" type="button" className="btn btn-primary radius-12" onClick={openReceive}>
            <i className="ri-add-line me-1" />
            Receive
          </button>,
          <button key="adjust" type="button" className="btn btn-outline-primary radius-12" onClick={openAdjust}>
            <i className="ri-edit-line me-1" />
            Adjust
          </button>,
        ]}
      />
      <ClinicConsoleTabs branchId={branchId} />

      <div className="alert alert-light border small mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
        <span>
          Vaccine distribution uses the same retail lots as product inventory. Map clinical items under{" "}
          <strong>Vaccine mapping</strong> after stock arrives at the branch.
        </span>
        <div className="d-flex flex-wrap gap-2">
          <Link href="/owner/inventory/batches" className="btn btn-sm btn-outline-secondary radius-8">
            Batches / expiry
          </Link>
          <Link href="/owner/inventory/stock-requests" className="btn btn-sm btn-outline-secondary radius-8">
            Stock requests
          </Link>
          <Link href={`/owner/clinic/${branchId}/catalog/vaccine-mappings`} className="btn btn-sm btn-outline-info radius-8">
            Vaccine mapping
          </Link>
        </div>
      </div>
      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      {success && <div className="alert alert-success radius-12 mb-3">{success}</div>}

      <div className="d-flex gap-2 mb-3">
        <button
          type="button"
          className={`btn radius-8 ${activeTab === "stock" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setActiveTab("stock")}
        >
          Stock
        </button>
        <button
          type="button"
          className={`btn radius-8 ${activeTab === "ledger" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setActiveTab("ledger")}
        >
          Ledger
        </button>
        <button
          type="button"
          className={`btn radius-8 ${activeTab === "consumption" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setActiveTab("consumption")}
        >
          Consumption
        </button>
      </div>

      {activeTab === "ledger" && (
        <div className="card radius-12 mb-4">
          <div className="card-header bg-transparent p-24">
            <h6 className="mb-0 fw-semibold">Clinical stock ledger</h6>
          </div>
          <div className="card-body p-24">
            {ledgerLoading ? (
              <div className="text-center py-4"><div className="spinner-border text-primary" /><p className="text-muted mt-2 mb-0">Loading…</p></div>
            ) : (ledgerData.items as Array<Record<string, unknown>>).length === 0 ? (
              <p className="text-muted mb-0">No ledger entries yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Item</th>
                      <th>Variant</th>
                      <th>Type</th>
                      <th>Delta</th>
                      <th>Balance after</th>
                      <th>Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ledgerData.items as Array<Record<string, unknown>>).map((row) => (
                      <tr key={Number(row.id)}>
                        <td>{row.createdAt ? new Date(String(row.createdAt)).toLocaleString() : "—"}</td>
                        <td>{(row.clinicalItem as { name?: string })?.name ?? String(row.clinicalItemId ?? "—")}</td>
                        <td>{(row.variant as { variantName?: string })?.variantName ?? String(row.variantId ?? "—")}</td>
                        <td>{String(row.txnType ?? "—")}</td>
                        <td>{Number(row.quantityDelta)}</td>
                        <td>{Number(row.balanceAfter)}</td>
                        <td>{row.refType ? `${String(row.refType)} ${row.refId ?? ""}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "consumption" && (
        <div className="card radius-12 mb-4">
          <div className="card-header bg-transparent p-24">
            <h6 className="mb-0 fw-semibold">Package-linked consumption</h6>
          </div>
          <div className="card-body p-24">
            {consumptionLoading ? (
              <div className="text-center py-4"><div className="spinner-border text-primary" /><p className="text-muted mt-2 mb-0">Loading…</p></div>
            ) : (consumptionData.items as Array<Record<string, unknown>>).length === 0 ? (
              <p className="text-muted mb-0">No consumption records for this branch.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Mode</th>
                      <th>Case</th>
                      <th>Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(consumptionData.items as Array<Record<string, unknown>>).map((c) => {
                      const items = (c.items as Array<Record<string, unknown>>) ?? [];
                      const itemLabels = items.map((i) => {
                        const name = (i.clinicalItem as { name?: string })?.name ?? (i.product as { name?: string })?.name ?? i.variantId ?? i.clinicalItemVariantId;
                        const qty = i.quantityActual ?? i.quantityPlanned;
                        return `${name} × ${qty ?? "?"}`;
                      });
                      return (
                        <tr key={Number(c.id)}>
                          <td>{String(c.mode ?? "—")}</td>
                          <td>{c.clinicalCaseId ? `Case #${c.clinicalCaseId}` : "—"}</td>
                          <td>{itemLabels.join(", ") || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "stock" && (
        <>
      {alerts.length > 0 && (
        <div className="card radius-12 border-warning mb-4">
          <div className="card-body p-24">
            <h6 className="fw-semibold text-warning mb-2">
              <i className="ri-alert-line me-1" /> Low stock alerts
            </h6>
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Item</th>
                    <th>Variant</th>
                    <th>Available</th>
                    <th>Reorder level</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((r) => {
                    const vax = clinicalItemLooksLikeVaccine(r.item ?? null);
                    return (
                    <tr key={r.id}>
                      <td>
                        {r.item?.name ?? r.itemId}
                        {vax ? (
                          <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle small ms-1">Vaccine</span>
                        ) : null}
                      </td>
                      <td>{r.variant?.variantName ?? r.variantId}</td>
                      <td>{Number(r.availableQty ?? r.currentQty ?? 0)}</td>
                      <td>{r.reorderLevel != null ? Number(r.reorderLevel) : "—"}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="card radius-12">
        <div className="card-header bg-transparent p-24 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <h6 className="mb-0 fw-semibold">Branch item stock</h6>
          <div className="d-flex align-items-center gap-2">
            <label className="small text-muted mb-0 me-1">Show</label>
            <select
              className="form-select form-select-sm radius-8"
              style={{ width: "auto" }}
              value={vaccineStockFilter}
              onChange={(e) => setVaccineStockFilter(e.target.value as "all" | "vaccine")}
            >
              <option value="all">All clinical items</option>
              <option value="vaccine">Vaccine-like only</option>
            </select>
          </div>
        </div>
        <div className="card-body p-24">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" />
              <p className="text-muted mt-2 mb-0">Loading…</p>
            </div>
          ) : stock.length === 0 ? (
            <p className="text-muted mb-0">No clinical item stock recorded for this branch. Use Receive to add stock.</p>
          ) : displayedStock.length === 0 ? (
            <p className="text-muted mb-0">No rows match the vaccine filter. Switch back to all items or confirm warehouse→branch receive posted.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Item</th>
                    <th>Variant</th>
                    <th>Current</th>
                    <th>Available</th>
                    <th>Reorder</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedStock.map((r) => {
                    const vax = clinicalItemLooksLikeVaccine(r.item ?? null);
                    return (
                    <tr key={r.id}>
                      <td>
                        {r.item?.name ?? r.itemId}
                        {vax ? (
                          <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle small ms-1">Vaccine</span>
                        ) : null}
                      </td>
                      <td>{r.variant?.variantName ?? r.variantId}</td>
                      <td>{Number(r.currentQty ?? 0)}</td>
                      <td>{Number(r.availableQty ?? 0)}</td>
                      <td>{r.reorderLevel != null ? Number(r.reorderLevel) : "—"}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card radius-12 mt-4">
        <div className="card-header bg-transparent p-24 d-flex justify-content-between align-items-center flex-wrap">
          <h6 className="mb-0 fw-semibold">Instrument issue / return</h6>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-sm btn-outline-primary radius-8" onClick={() => setInstrumentFilter("")}>All</button>
            <button type="button" className="btn btn-sm btn-outline-primary radius-8" onClick={() => setInstrumentFilter("open")}>Open</button>
            <button type="button" className="btn btn-sm btn-outline-primary radius-8" onClick={() => setInstrumentFilter("returned")}>Returned</button>
            <button type="button" className="btn btn-sm btn-primary radius-8" onClick={openIssueInstrument}>
              <i className="ri-add-line me-1" /> Issue
            </button>
          </div>
        </div>
        <div className="card-body p-24">
          {displayInstrumentLogs.length === 0 ? (
            <p className="text-muted mb-0">No instrument issue logs. Use Issue to record an instrument issued to a procedure or user.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Item</th>
                    <th>Variant</th>
                    <th>Issued qty</th>
                    <th>Issued at</th>
                    <th>Returned</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayInstrumentLogs.map((l) => (
                    <tr key={Number(l.id)}>
                      <td>{(l.item as { name?: string })?.name ?? String(l.itemId ?? "—")}</td>
                      <td>{(l.variant as { variantName?: string })?.variantName ?? String(l.variantId ?? "—")}</td>
                      <td>{Number(l.issuedQty ?? 0)}</td>
                      <td>{l.issuedAt ? new Date(String(l.issuedAt)).toLocaleString() : "—"}</td>
                      <td>{l.returnedAt ? `${Number(l.returnedQty ?? 0)} at ${new Date(String(l.returnedAt)).toLocaleString()}` : "—"}</td>
                      <td className="text-end">
                        {!l.returnedAt && (
                          <button type="button" className="btn btn-sm btn-outline-primary radius-8" onClick={() => openReturnInstrument(Number(l.id))}>
                            Return
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
        </>
      )}

      {activeModal === "receive" && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h5 className="modal-title">Receive stock</h5>
                <button type="button" className="btn-close" onClick={closeModal} aria-label="Close" />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Search and select item</label>
                  <input
                    type="text"
                    className="form-control radius-8"
                    placeholder="Type item name…"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                  />
                  {searchResults.length > 0 && (
                    <ul className="list-group list-group-flush mt-1 small">
                      {searchResults.map((it) => (
                        <li key={it.id} className="list-group-item list-group-item-action py-1">
                          {it.name}
                          {(it.variants?.length ?? 0) > 0
                            ? it.variants!.map((v) => (
                                <div key={v.id}>
                                  <button
                                    type="button"
                                    className="btn btn-link btn-sm p-0"
                                    onClick={() => {
                                      setSelectedItemId(it.id);
                                      setSelectedVariantId(v.id);
                                      setSearchQ(`${it.name} — ${v.variantName}`);
                                      setSearchResults([]);
                                    }}
                                  >
                                    {v.variantName}
                                  </button>
                                </div>
                              ))
                            : (
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm p-0"
                                  onClick={() => {
                                    setSelectedItemId(it.id);
                                    setSelectedVariantId(it.id);
                                    setSearchQ(it.name);
                                    setSearchResults([]);
                                  }}
                                >
                                  Use item
                                </button>
                              )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {selectedItemId != null && selectedVariantId != null && (
                    <p className="small text-success mt-1">Selected: item {selectedItemId}, variant {selectedVariantId}</p>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label">Quantity</label>
                  <input type="number" step="any" min="0.01" className="form-control radius-8" value={receiveQty} onChange={(e) => setReceiveQty(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Batch no (optional)</label>
                  <input type="text" className="form-control radius-8" value={receiveBatchNo} onChange={(e) => setReceiveBatchNo(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Expiry date (optional)</label>
                  <input type="date" className="form-control radius-8" value={receiveExpiry} onChange={(e) => setReceiveExpiry(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Purchase cost (optional)</label>
                  <input type="number" step="0.01" className="form-control radius-8" value={receiveCost} onChange={(e) => setReceiveCost(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary radius-8" onClick={closeModal}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary radius-8" onClick={handleReceive} disabled={saving || selectedItemId == null || selectedVariantId == null}>
                  {saving ? "Saving…" : "Receive"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === "adjust" && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h5 className="modal-title">Adjust stock</h5>
                <button type="button" className="btn-close" onClick={closeModal} aria-label="Close" />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Search and select item</label>
                  <input
                    type="text"
                    className="form-control radius-8"
                    placeholder="Type item name…"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                  />
                  {searchResults.length > 0 && (
                    <ul className="list-group list-group-flush mt-1 small">
                      {searchResults.map((it) => (
                        <li key={it.id} className="list-group-item list-group-item-action py-1">
                          {it.name}
                          {(it.variants?.length ?? 0) > 0
                            ? it.variants!.map((v) => (
                                <div key={v.id}>
                                  <button
                                    type="button"
                                    className="btn btn-link btn-sm p-0"
                                    onClick={() => {
                                      setSelectedItemId(it.id);
                                      setSelectedVariantId(v.id);
                                      setSearchQ(`${it.name} — ${v.variantName}`);
                                      setSearchResults([]);
                                    }}
                                  >
                                    {v.variantName}
                                  </button>
                                </div>
                              ))
                            : (
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm p-0"
                                  onClick={() => {
                                    setSelectedItemId(it.id);
                                    setSelectedVariantId(it.id);
                                    setSearchQ(it.name);
                                    setSearchResults([]);
                                  }}
                                >
                                  Use item
                                </button>
                              )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label">Delta (positive = add, negative = deduct)</label>
                  <input type="number" step="any" className="form-control radius-8" value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} placeholder="e.g. -5 or 10" />
                </div>
                <div className="mb-3">
                  <label className="form-label">Reason (optional)</label>
                  <input type="text" className="form-control radius-8" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary radius-8" onClick={closeModal}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary radius-8" onClick={handleAdjust} disabled={saving || selectedItemId == null || selectedVariantId == null}>
                  {saving ? "Saving…" : "Adjust"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {instrumentModal === "issue" && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h5 className="modal-title">Issue instrument</h5>
                <button type="button" className="btn-close" onClick={closeInstrumentModal} aria-label="Close" />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Search and select item</label>
                  <input type="text" className="form-control radius-8" placeholder="Type item name…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
                  {searchResults.length > 0 && (
                    <ul className="list-group list-group-flush mt-1 small">
                      {searchResults.map((it) => (
                        <li key={it.id} className="list-group-item list-group-item-action py-1">
                          {it.name}
                          {(it.variants?.length ?? 0) > 0
                            ? it.variants!.map((v) => (
                                <div key={v.id}>
                                  <button type="button" className="btn btn-link btn-sm p-0" onClick={() => { setSelectedItemId(it.id); setSelectedVariantId(v.id); setSearchQ(`${it.name} — ${v.variantName}`); setSearchResults([]); }}>
                                    {v.variantName}
                                  </button>
                                </div>
                              ))
                            : (
                                <button type="button" className="btn btn-link btn-sm p-0" onClick={() => { setSelectedItemId(it.id); setSelectedVariantId(it.id); setSearchQ(it.name); setSearchResults([]); }}>
                                  Use item
                                </button>
                              )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label">Quantity issued</label>
                  <input type="number" step="any" min="0.01" className="form-control radius-8" value={issueQty} onChange={(e) => setIssueQty(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary radius-8" onClick={closeInstrumentModal}>Cancel</button>
                <button type="button" className="btn btn-primary radius-8" onClick={handleIssueInstrument} disabled={saving || selectedItemId == null || selectedVariantId == null}>
                  {saving ? "Saving…" : "Issue"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {instrumentModal === "return" && returnLogId != null && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h5 className="modal-title">Return instrument</h5>
                <button type="button" className="btn-close" onClick={closeInstrumentModal} aria-label="Close" />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Returned quantity</label>
                  <input type="number" step="any" min="0" className="form-control radius-8" value={returnQty} onChange={(e) => setReturnQty(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Sterilization status (optional)</label>
                  <input type="text" className="form-control radius-8" value={sterilizationStatus} onChange={(e) => setSterilizationStatus(e.target.value)} placeholder="e.g. PENDING, DONE" />
                </div>
                <div className="mb-3">
                  <label className="form-label">Condition note (optional)</label>
                  <input type="text" className="form-control radius-8" value={conditionNote} onChange={(e) => setConditionNote(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary radius-8" onClick={closeInstrumentModal}>Cancel</button>
                <button type="button" className="btn btn-primary radius-8" onClick={handleReturnInstrument} disabled={saving}>
                  {saving ? "Saving…" : "Return"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
