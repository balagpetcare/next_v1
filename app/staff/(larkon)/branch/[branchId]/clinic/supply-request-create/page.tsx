"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  staffClinicSupplyRequestLowStockSuggestions,
  staffClinicSupplyRequestCreate,
  staffClinicSupplyRequestItemSearch,
  staffClinicSupplyRequestSubmit,
} from "@/lib/api";

type Suggestion = {
  clinicalItemId: number;
  variantId: number;
  requestedQty: number;
  currentQty?: number;
  reorderLevel?: number;
  item?: { name: string };
  variant?: { variantName: string };
};

type SearchItem = {
  id: number;
  name: string;
  itemCode?: string;
  variants?: Array<{ id: number; variantName: string; sku?: string; currentStock?: number; reorderLevel?: number }>;
};

type DraftItem =
  | {
      source: "low_stock" | "manual";
      clinicalItemId: number;
      variantId: number;
      requestedQty: number;
      note?: string;
      itemName?: string;
      variantName?: string;
      currentQty?: number;
      reorderLevel?: number;
      estimatedUnitCost?: number;
    }
  | {
      source: "custom";
      clinicalItemId: number;
      variantId: number;
      requestedQty: number;
      note?: string;
      itemName: string;
      variantName: string;
      unitSnapshot: string;
      estimatedUnitCost?: number;
    };

const PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "ROUTINE", label: "Routine" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
  { value: "EMERGENCY", label: "Emergency" },
] as const;

const REQUEST_TYPES = [
  { value: "MANUAL", label: "Manual" },
  { value: "LOW_STOCK", label: "Low stock" },
  { value: "PROCEDURE_PREP", label: "Procedure prep" },
  { value: "EMERGENCY", label: "Emergency" },
  { value: "REPLACEMENT", label: "Replacement" },
  { value: "TRANSFER_NEED", label: "Transfer need" },
] as const;

const TABS = [
  { key: "low_stock", label: "Low stock" },
  { key: "manual", label: "Manual add" },
  { key: "procedure", label: "Procedure prep" },
  { key: "custom", label: "Custom" },
] as const;

function isCustomDraft(item: DraftItem): item is Extract<DraftItem, { source: "custom" }> {
  return item.source === "custom";
}

function searchSelectionKey(itemId: number, variantId: number): string {
  return `${itemId}:${variantId}`;
}

/** New supply request form. Route: /staff/branch/[branchId]/clinic/supply-request-create */
export default function CreateSupplyRequestPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = params?.branchId as string | undefined;
  const [activeTab, setActiveTab] = useState<string>("low_stock");
  const [department, setDepartment] = useState("");
  const [requestType, setRequestType] = useState<string>("MANUAL");
  const [priority, setPriority] = useState<string>("NORMAL");
  const [neededBy, setNeededBy] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedSearchItems, setSelectedSearchItems] = useState<Set<string>>(new Set());
  const [expandedSearchItems, setExpandedSearchItems] = useState<Set<number>>(new Set());
  const [customName, setCustomName] = useState("");
  const [customUnit, setCustomUnit] = useState("");
  const [customQty, setCustomQty] = useState(1);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && TABS.some((t) => t.key === tab)) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    staffClinicSupplyRequestLowStockSuggestions(branchId)
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setSuggestions(data as Suggestion[]);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  useEffect(() => {
    if (!pickerOpen || !branchId || searchQ.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const list = await staffClinicSupplyRequestItemSearch(branchId, { q: searchQ.trim(), limit: 15 });
        if (Array.isArray(list)) setSearchResults(list as SearchItem[]);
        else setSearchResults([]);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
      searchTimeoutRef.current = null;
    }, 250);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [branchId, searchQ, pickerOpen]);

  const addLowStockItem = useCallback((s: Suggestion, qty?: number) => {
    const requestedQty = qty ?? s.requestedQty;
    if (requestedQty <= 0) return;
    setDraftItems((prev) => {
      const existing = prev.find(
        (i) => !isCustomDraft(i) && i.clinicalItemId === s.clinicalItemId && i.variantId === s.variantId
      );
      if (existing && !isCustomDraft(existing)) {
        return prev.map((i) =>
          !isCustomDraft(i) && i.clinicalItemId === s.clinicalItemId && i.variantId === s.variantId
            ? { ...i, requestedQty: i.requestedQty + requestedQty }
            : i
        );
      }
      return [
        ...prev,
        {
          source: "low_stock" as const,
          clinicalItemId: s.clinicalItemId,
          variantId: s.variantId,
          requestedQty,
          itemName: s.item?.name,
          variantName: s.variant?.variantName,
          currentQty: s.currentQty,
          reorderLevel: s.reorderLevel,
        },
      ];
    });
  }, []);

  const addAllLowStock = useCallback(() => {
    suggestions.forEach((s) => addLowStockItem(s));
  }, [suggestions, addLowStockItem]);

  const addManualItem = useCallback((item: SearchItem, variantId: number, variantName: string) => {
    setDraftItems((prev) => {
      const existing = prev.find((i) => !isCustomDraft(i) && i.clinicalItemId === item.id && i.variantId === variantId);
      if (existing && !isCustomDraft(existing)) {
        return prev.map((i) =>
          !isCustomDraft(i) && i.clinicalItemId === item.id && i.variantId === variantId
            ? { ...i, requestedQty: i.requestedQty + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          source: "manual" as const,
          clinicalItemId: item.id,
          variantId,
          requestedQty: 1,
          itemName: item.name,
          variantName,
        },
      ];
    });
  }, []);

  const addSelectedItems = useCallback(() => {
    const toAdd: { item: SearchItem; variantId: number; variantName: string }[] = [];
    for (const item of searchResults) {
      const variants = item.variants?.length ? item.variants : [{ id: 0, variantName: "Default", sku: undefined, currentStock: undefined, reorderLevel: undefined }];
      for (const v of variants) {
        const key = searchSelectionKey(item.id, v.id);
        if (selectedSearchItems.has(key)) {
          toAdd.push({ item, variantId: v.id, variantName: v.variantName });
        }
      }
    }
    setDraftItems((prev) => {
      let next = [...prev];
      for (const { item, variantId, variantName } of toAdd) {
        const existing = next.find((i) => !isCustomDraft(i) && i.clinicalItemId === item.id && i.variantId === variantId);
        if (existing && !isCustomDraft(existing)) {
          next = next.map((i) =>
            !isCustomDraft(i) && i.clinicalItemId === item.id && i.variantId === variantId
              ? { ...i, requestedQty: i.requestedQty + 1 }
              : i
          );
        } else {
          next.push({
            source: "manual" as const,
            clinicalItemId: item.id,
            variantId,
            requestedQty: 1,
            itemName: item.name,
            variantName,
          });
        }
      }
      return next;
    });
    setSelectedSearchItems(new Set());
  }, [searchResults, selectedSearchItems]);

  const addCustomItem = useCallback(() => {
    const name = customName.trim();
    const unit = customUnit.trim();
    if (!name || !unit) {
      setError("Custom item requires name and unit.");
      return;
    }
    if (customQty <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }
    setDraftItems((prev) => [
      ...prev,
      {
        source: "custom",
        clinicalItemId: 0,
        variantId: 0,
        requestedQty: customQty,
        itemName: name,
        variantName: unit,
        unitSnapshot: unit,
      },
    ]);
    setCustomName("");
    setCustomUnit("");
    setCustomQty(1);
    setError("");
  }, [customName, customUnit, customQty]);

  const updateDraftQty = useCallback((index: number, qty: number) => {
    setDraftItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, requestedQty: Math.max(0, qty) } : item))
    );
  }, []);

  const updateDraftNote = useCallback((index: number, note: string) => {
    setDraftItems((prev) => prev.map((item, i) => (i === index ? { ...item, note } : item)));
  }, []);

  const removeDraftItem = useCallback((index: number) => {
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const validItems = draftItems.filter((i) => i.requestedQty > 0);
  const hasDraftItems = validItems.length > 0;
  const estimatedTotal =
    validItems.reduce((sum, i) => sum + (i.estimatedUnitCost ?? 0) * i.requestedQty, 0) || null;
  const neededByDate = neededBy ? new Date(neededBy) : null;
  const neededByInPast = neededByDate && neededByDate.getTime() < Date.now();

  const handleCreate = async (submit: boolean) => {
    if (!branchId) return;
    if (!hasDraftItems) {
      setError("Add at least one item with quantity > 0.");
      return;
    }
    if (neededByInPast) {
      setError("Needed by date cannot be in the past.");
      return;
    }
    const customInvalid = validItems.some(
      (i) => isCustomDraft(i) && (!i.itemName?.trim() || !i.unitSnapshot?.trim())
    );
    if (customInvalid) {
      setError("Custom items require name and unit.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const items = validItems.map((i) => {
        if (isCustomDraft(i)) {
          return {
            sourceType: "CUSTOM" as const,
            itemNameSnapshot: i.itemName,
            unitSnapshot: i.unitSnapshot,
            requestedQty: i.requestedQty,
            lineNote: i.note || undefined,
          };
        }
        return {
          clinicalItemId: i.clinicalItemId,
          variantId: i.variantId === 0 ? undefined : i.variantId,
          requestedQty: i.requestedQty,
          note: i.note || undefined,
        };
      });
      const created = await staffClinicSupplyRequestCreate(branchId, {
        items,
        priority,
        note: note.trim() || undefined,
        department: department.trim() || undefined,
        requestType,
        neededBy: neededBy || undefined,
        reason: reason.trim() || undefined,
      }) as { id?: number };
      if (submit && created?.id) {
        await staffClinicSupplyRequestSubmit(branchId, created.id);
        router.push(`/staff/branch/${branchId}/clinic/supply-requests?created=1`);
      } else {
        router.push(`/staff/branch/${branchId}/clinic/supply-requests`);
      }
    } catch (e) {
      setError((e as Error)?.message || "Create failed");
    } finally {
      setSaving(false);
    }
  };

  if (!branchId) {
    return (
      <div className="p-4">
        <div className="alert alert-warning">Invalid branch.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h5 mb-0">New supply request</h1>
        <Link href={`/staff/branch/${branchId}/clinic/supply-requests`} className="btn btn-outline-secondary btn-sm radius-8">
          Back
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger radius-12 mb-3" role="alert">
          {error}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card radius-12 mb-4">
            <div className="card-body p-24">
              <h6 className="fw-semibold mb-3">Request details</h6>
              <div className="row g-3">
                <div className="col-md-6 col-lg-3">
                  <label className="form-label small">Department</label>
                  <input
                    type="text"
                    className="form-control form-control-sm radius-8"
                    placeholder="e.g. Pharmacy, OT"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
                <div className="col-md-6 col-lg-3">
                  <label className="form-label small">Request type</label>
                  <select
                    className="form-select form-select-sm radius-8"
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                  >
                    {REQUEST_TYPES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6 col-lg-2">
                  <label className="form-label small">Priority</label>
                  <select
                    className="form-select form-select-sm radius-8"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6 col-lg-2">
                  <label className="form-label small">Needed by</label>
                  <input
                    type="date"
                    className={`form-control form-control-sm radius-8 ${neededByInPast ? "is-invalid" : ""}`}
                    value={neededBy}
                    onChange={(e) => setNeededBy(e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small">Reason / Note</label>
                  <textarea
                    className="form-control form-control-sm radius-8"
                    rows={2}
                    placeholder="Reason or internal note"
                    value={reason || note}
                    onChange={(e) => {
                      setReason(e.target.value);
                      setNote(e.target.value);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card radius-12 mb-4">
            <div className="card-body p-24">
              <h6 className="fw-semibold mb-3">Add items</h6>
              <ul className="nav nav-tabs nav-tabs-custom mb-3">
                {TABS.map((t) => (
                  <li key={t.key} className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${activeTab === t.key ? "active" : ""}`}
                      onClick={() => setActiveTab(t.key)}
                    >
                      {t.label}
                    </button>
                  </li>
                ))}
              </ul>

              {activeTab === "low_stock" && (
                <>
                  {suggestions.length > 0 ? (
                    <>
                      <div className="border rounded radius-8 p-3 bg-light mb-2">
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-decoration-none"
                          onClick={() => setSuggestionsOpen(!suggestionsOpen)}
                        >
                          <i className={`ri-${suggestionsOpen ? "arrow-down" : "arrow-right"}-s-line me-1`} />
                          Low-stock suggestions ({suggestions.length})
                        </button>
                        {suggestionsOpen && (
                          <div className="mt-2">
                            <div className="table-responsive">
                              <table className="table table-sm table-hover mb-0">
                                <thead className="table-light">
                                  <tr>
                                    <th>Item</th>
                                    <th>Variant</th>
                                    <th>Current</th>
                                    <th>Reorder</th>
                                    <th>Suggested</th>
                                    <th className="text-end">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {suggestions.map((s, idx) => (
                                    <tr key={idx}>
                                      <td>{s.item?.name ?? s.clinicalItemId}</td>
                                      <td>{s.variant?.variantName ?? "—"}</td>
                                      <td>{s.currentQty ?? "—"}</td>
                                      <td>{s.reorderLevel ?? "—"}</td>
                                      <td>{s.requestedQty}</td>
                                      <td className="text-end">
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-primary radius-8"
                                          onClick={() => addLowStockItem(s)}
                                        >
                                          Add
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <button type="button" className="btn btn-sm btn-primary radius-8 mt-2" onClick={addAllLowStock}>
                              Add all to request
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="rounded radius-8 p-4 bg-light border">
                      <p className="text-muted mb-2">No low-stock suggestions for this branch.</p>
                      <p className="small text-muted mb-3">
                        Add items from the Manual add or Custom tab, or set reorder levels on clinic items.
                      </p>
                      <div className="d-flex flex-wrap gap-2">
                        <button type="button" className="btn btn-sm btn-outline-primary radius-8" onClick={() => setActiveTab("manual")}>
                          Search catalog
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-secondary radius-8" onClick={() => setActiveTab("custom")}>
                          Add custom item
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === "manual" && (
                <div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm radius-8 mb-2"
                    onClick={() => setPickerOpen(true)}
                  >
                    <i className="ri-search-line me-1" /> Search and add items
                  </button>
                  <p className="text-muted small mb-0">Open the search to find items from the clinic catalog and add them to the request.</p>
                </div>
              )}

              {activeTab === "procedure" && (
                <div className="rounded radius-8 p-4 bg-light border">
                  <p className="text-muted mb-0">Procedure-based suggestions will be available in a future update.</p>
                </div>
              )}

              {activeTab === "custom" && (
                <div className="border rounded radius-8 p-3 bg-light">
                  <div className="row g-2 align-items-end">
                    <div className="col-md-4">
                      <label className="form-label small">Item name</label>
                      <input
                        type="text"
                        className="form-control form-control-sm radius-8"
                        placeholder="e.g. Custom consumable"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small">Unit</label>
                      <input
                        type="text"
                        className="form-control form-control-sm radius-8"
                        placeholder="e.g. pcs, box"
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value)}
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small">Qty</label>
                      <input
                        type="number"
                        min={1}
                        className="form-control form-control-sm radius-8"
                        value={customQty}
                        onChange={(e) => setCustomQty(parseInt(e.target.value, 10) || 1)}
                      />
                    </div>
                    <div className="col-md-2">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm radius-8 w-100"
                        onClick={addCustomItem}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card radius-12 mb-4">
            <div className="card-header bg-transparent p-24 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-semibold">Request items</h6>
              {draftItems.length > 0 && <span className="badge bg-secondary">{draftItems.length} line(s)</span>}
            </div>
            <div className="card-body p-24">
              {draftItems.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted mb-3">No items yet.</p>
                  <div className="d-flex flex-wrap justify-content-center gap-2">
                    <button type="button" className="btn btn-primary radius-8" onClick={() => setActiveTab("low_stock")}>
                      Add from low stock
                    </button>
                    <button type="button" className="btn btn-outline-primary radius-8" onClick={() => setPickerOpen(true)}>
                      Search catalog
                    </button>
                    <button type="button" className="btn btn-outline-secondary radius-8" onClick={() => setActiveTab("custom")}>
                      Add custom item
                    </button>
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Item</th>
                        <th>Variant / Unit</th>
                        <th>Current</th>
                        <th>Requested qty</th>
                        <th>Note</th>
                        <th className="text-end">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftItems.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.itemName ?? (row as any).clinicalItemId}</td>
                          <td>{row.variantName ?? ((row as any).variantId || (isCustomDraft(row) ? row.unitSnapshot : "—"))}</td>
                          <td>{!isCustomDraft(row) ? (row.currentQty ?? "—") : "—"}</td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              className="form-control form-control-sm"
                              style={{ width: 80 }}
                              value={row.requestedQty}
                              onChange={(e) => updateDraftQty(idx, parseInt(e.target.value, 10) || 0)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Optional"
                              value={row.note ?? ""}
                              onChange={(e) => updateDraftNote(idx, e.target.value)}
                            />
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger radius-8"
                              onClick={() => removeDraftItem(idx)}
                              aria-label="Remove"
                            >
                              <i className="ri-delete-bin-line" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card radius-12 sticky-top" style={{ top: 24 }}>
            <div className="card-body p-24">
              <h6 className="fw-semibold mb-3">Summary</h6>
              <dl className="mb-0 small">
                <dt className="text-muted">Total lines</dt>
                <dd>{validItems.length}</dd>
                <dt className="text-muted">Estimated cost</dt>
                <dd>{estimatedTotal != null && estimatedTotal > 0 ? `—` : "—"}</dd>
                <dt className="text-muted">Priority</dt>
                <dd>{PRIORITIES.find((p) => p.value === priority)?.label ?? priority}</dd>
                <dt className="text-muted">Needed by</dt>
                <dd>{neededBy ? new Date(neededBy).toLocaleDateString() : "—"}</dd>
                <dt className="text-muted">Approval route</dt>
                <dd>Branch manager → Owner review</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex gap-2 mt-3 flex-wrap">
        <button
          type="button"
          className="btn btn-primary radius-8"
          onClick={() => handleCreate(true)}
          disabled={saving || !hasDraftItems || !!neededByInPast}
        >
          {saving ? "Creating…" : "Create and submit"}
        </button>
        <button
          type="button"
          className="btn btn-outline-primary radius-8"
          onClick={() => handleCreate(false)}
          disabled={saving || !hasDraftItems || !!neededByInPast}
        >
          {saving ? "Saving…" : "Save as draft"}
        </button>
        <Link href={`/staff/branch/${branchId}/clinic/supply-requests`} className="btn btn-outline-secondary radius-8">
          Cancel
        </Link>
      </div>

      {pickerOpen && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} role="dialog">
          <div className="modal-dialog modal-dialog-scrollable modal-lg">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h6 className="modal-title">Search catalog</h6>
                <button type="button" className="btn-close" onClick={() => setPickerOpen(false)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  className="form-control form-control-sm radius-8 mb-3"
                  placeholder="Type product name or code (min 2 characters)"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  autoFocus
                />
                {searchResults.length > 0 && (
                  <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm radius-8"
                      onClick={() => {
                        const keys = new Set<string>();
                        searchResults.forEach((item) => {
                          const variants = item.variants?.length ? item.variants : [{ id: 0, variantName: "Default" }];
                          variants.forEach((v) => keys.add(searchSelectionKey(item.id, v.id)));
                        });
                        setSelectedSearchItems(keys);
                      }}
                    >
                      Select all visible
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm radius-8"
                      onClick={() => setSelectedSearchItems(new Set())}
                    >
                      Clear selection
                    </button>
                    {selectedSearchItems.size > 0 && (
                      <span className="badge bg-primary">{selectedSearchItems.size} item(s) selected</span>
                    )}
                  </div>
                )}
                {searching && (
                  <p className="text-muted small mb-2">
                    <span className="spinner-border spinner-border-sm me-1" /> Searching…
                  </p>
                )}
                {searchResults.length > 0 && (
                  <div className="border rounded radius-8 overflow-auto mb-2" style={{ maxHeight: 360 }}>
                    <ul className="list-group list-group-flush">
                      {searchResults.map((item) => {
                        const variants = item.variants?.length ? item.variants : [{ id: 0, variantName: "Default", sku: undefined, currentStock: undefined, reorderLevel: undefined }];
                        const hasMultiple = (item.variants?.length ?? 0) > 1;
                        const expanded = expandedSearchItems.has(item.id);
                        return (
                          <li key={item.id} className="list-group-item py-2 px-3">
                            {hasMultiple ? (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm p-0 text-start d-flex align-items-center w-100 text-dark text-decoration-none"
                                  onClick={() =>
                                    setExpandedSearchItems((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(item.id)) next.delete(item.id);
                                      else next.add(item.id);
                                      return next;
                                    })
                                  }
                                  aria-expanded={expanded}
                                >
                                  <i className={`ri-${expanded ? "arrow-down" : "arrow-right"}-s-line me-1`} />
                                  <span className="fw-medium">{item.name}</span>
                                  {item.itemCode && <span className="text-muted small ms-1">({item.itemCode})</span>}
                                  <span className="text-muted small ms-1">({variants.length})</span>
                                </button>
                                {expanded && (
                                  <ul className="list-unstyled ms-4 mt-1">
                                    {variants.map((v) => {
                                      const key = searchSelectionKey(item.id, v.id);
                                      const checked = selectedSearchItems.has(key);
                                      return (
                                        <li key={v.id} className="py-1">
                                          <label className="d-flex align-items-center gap-2 small cursor-pointer mb-0" style={{ cursor: "pointer" }}>
                                            <input
                                              type="checkbox"
                                              className="form-check-input"
                                              checked={checked}
                                              onChange={() => {
                                                setSelectedSearchItems((prev) => {
                                                  const next = new Set(prev);
                                                  if (next.has(key)) next.delete(key);
                                                  else next.add(key);
                                                  return next;
                                                });
                                              }}
                                              aria-label={`Select ${item.name} - ${v.variantName}`}
                                            />
                                            <span>
                                              {v.variantName}
                                              {(v.currentStock != null || v.reorderLevel != null) && (
                                                <span className="text-muted ms-1">(stock: {v.currentStock ?? "—"})</span>
                                              )}
                                            </span>
                                          </label>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </>
                            ) : (
                              <label className="d-flex align-items-center gap-2 mb-0 cursor-pointer" style={{ cursor: "pointer" }}>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={selectedSearchItems.has(searchSelectionKey(item.id, variants[0].id))}
                                  onChange={() => {
                                    const key = searchSelectionKey(item.id, variants[0].id);
                                    setSelectedSearchItems((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(key)) next.delete(key);
                                      else next.add(key);
                                      return next;
                                    });
                                  }}
                                  aria-label={`Select ${item.name}`}
                                />
                                <span className="fw-medium">{item.name}</span>
                                {item.itemCode && <span className="text-muted small">({item.itemCode})</span>}
                                {variants[0].currentStock != null && (
                                  <span className="text-muted small">— stock: {variants[0].currentStock}</span>
                                )}
                              </label>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {!searching && searchQ.trim().length >= 2 && searchResults.length === 0 && (
                  <p className="text-muted small mb-0">No items found. Try a different search.</p>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary radius-8"
                  onClick={() => addSelectedItems()}
                  disabled={selectedSearchItems.size === 0}
                >
                  Add selected ({selectedSearchItems.size})
                </button>
                <button type="button" className="btn btn-outline-secondary radius-8" onClick={() => setPickerOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
