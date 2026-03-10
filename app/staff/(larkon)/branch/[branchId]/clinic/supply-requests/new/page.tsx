"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  staffClinicSupplyRequestLowStockSuggestions,
  staffClinicSupplyRequestCreate,
  staffClinicItemSearch,
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
  variants?: Array<{ id: number; variantName: string; sku?: string }>;
};

type DraftItem = {
  clinicalItemId: number;
  variantId: number;
  requestedQty: number;
  note?: string;
  itemName?: string;
  variantName?: string;
  currentQty?: number;
  reorderLevel?: number;
  source: "low_stock" | "manual";
};

const PRIORITIES = [
  { value: "ROUTINE", label: "Routine" },
  { value: "URGENT", label: "Urgent" },
  { value: "EMERGENCY", label: "Emergency" },
] as const;

export default function NewSupplyRequestPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params?.branchId as string | undefined;
  const [priority, setPriority] = useState<string>("ROUTINE");
  const [note, setNote] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);

  // Catalog search
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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
    if (!branchId || searchQ.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const list = await staffClinicItemSearch(branchId, { q: searchQ.trim(), limit: 15 });
        if (!cancelled && Array.isArray(list)) setSearchResults(list as SearchItem[]);
        else if (!cancelled) setSearchResults([]);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [branchId, searchQ]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addLowStockItem = useCallback((s: Suggestion, qty?: number) => {
    const requestedQty = qty ?? s.requestedQty;
    if (requestedQty <= 0) return;
    setDraftItems((prev) => {
      const existing = prev.find(
        (i) => i.clinicalItemId === s.clinicalItemId && i.variantId === s.variantId
      );
      if (existing) {
        return prev.map((i) =>
          i.clinicalItemId === s.clinicalItemId && i.variantId === s.variantId
            ? { ...i, requestedQty: i.requestedQty + requestedQty }
            : i
        );
      }
      return [
        ...prev,
        {
          clinicalItemId: s.clinicalItemId,
          variantId: s.variantId,
          requestedQty,
          itemName: s.item?.name,
          variantName: s.variant?.variantName,
          currentQty: s.currentQty,
          reorderLevel: s.reorderLevel,
          source: "low_stock" as const,
        },
      ];
    });
  }, []);

  const addAllLowStock = useCallback(() => {
    suggestions.forEach((s) => addLowStockItem(s));
  }, [suggestions, addLowStockItem]);

  const addManualItem = useCallback((item: SearchItem, variantId: number, variantName: string) => {
    setDraftItems((prev) => {
      const existing = prev.find((i) => i.clinicalItemId === item.id && i.variantId === variantId);
      if (existing) {
        return prev.map((i) =>
          i.clinicalItemId === item.id && i.variantId === variantId
            ? { ...i, requestedQty: i.requestedQty + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          clinicalItemId: item.id,
          variantId,
          requestedQty: 1,
          itemName: item.name,
          variantName,
          source: "manual" as const,
        },
      ];
    });
    setSearchQ("");
    setSearchResults([]);
  }, []);

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

  const handleCreate = async () => {
    if (!branchId) return;
    const items = draftItems.filter((i) => i.requestedQty > 0);
    if (items.length === 0) {
      setError("Add at least one item with quantity > 0.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await staffClinicSupplyRequestCreate(branchId, {
        items: items.map((i) => ({
          clinicalItemId: i.clinicalItemId,
          variantId: i.variantId === 0 ? undefined : i.variantId,
          requestedQty: i.requestedQty,
          note: i.note || undefined,
        })),
        priority,
        note: note.trim() || undefined,
      });
      router.push(`/staff/branch/${branchId}/clinic/supply-requests?created=1`);
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

  const hasLowStock = suggestions.length > 0;
  const hasDraftItems = draftItems.some((i) => i.requestedQty > 0);

  return (
    <div className="dashboard-main-body">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h5 mb-0">New supply request</h1>
        <Link
          href={`/staff/branch/${branchId}/clinic/supply-requests`}
          className="btn btn-outline-secondary btn-sm radius-8"
        >
          Back
        </Link>
      </div>

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}

      {/* Request header: Priority + Note */}
      <div className="card radius-12 mb-4">
        <div className="card-body p-24">
          <h6 className="fw-semibold mb-3">Request details</h6>
          <div className="row g-3">
            <div className="col-md-4">
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
            <div className="col-md-8">
              <label className="form-label small">Note (optional)</label>
              <textarea
                className="form-control form-control-sm radius-8"
                rows={2}
                placeholder="Internal note for this request"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add items: Low-stock + Search */}
      <div className="card radius-12 mb-4">
        <div className="card-body p-24">
          <h6 className="fw-semibold mb-3">Add items</h6>

          {/* Manual catalog search */}
          <div className="mb-3 position-relative" ref={searchRef}>
            <label className="form-label small">Search product catalog</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control form-control-sm radius-8"
                placeholder="Type product name or code (min 2 characters)"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
              {searching && (
                <span className="input-group-text bg-transparent border-0">
                  <span className="spinner-border spinner-border-sm text-primary" />
                </span>
              )}
            </div>
            {searchResults.length > 0 && (
              <ul className="list-group list-group-flush mt-1 radius-8 border shadow-sm position-absolute z-1" style={{ maxHeight: 240, overflowY: "auto" }}>
                {searchResults.map((item) => (
                  <li key={item.id} className="list-group-item list-group-item-action py-2">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <span className="fw-medium">{item.name}</span>
                        {item.itemCode && (
                          <span className="text-muted small ms-2">{item.itemCode}</span>
                        )}
                      </div>
                    </div>
                    {(item.variants?.length ?? 0) > 0 ? (
                      <div className="mt-1 ms-2">
                        {item.variants!.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            className="btn btn-sm btn-outline-primary me-1 mb-1 radius-8"
                            onClick={() => addManualItem(item, v.id, v.variantName)}
                          >
                            {v.variantName}
                            {v.sku ? ` (${v.sku})` : ""}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary mt-1 radius-8"
                        onClick={() => addManualItem(item, 0, "Default")}
                      >
                        Add (no variant)
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Low-stock suggestions (collapsible) */}
          {hasLowStock && (
            <div className="border rounded radius-8 p-3 bg-light">
              <button
                type="button"
                className="btn btn-link btn-sm p-0 text-decoration-none d-flex align-items-center"
                onClick={() => setSuggestionsOpen(!suggestionsOpen)}
                aria-expanded={suggestionsOpen}
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
                          <th>Suggested qty</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suggestions.map((s, idx) => (
                          <tr key={idx}>
                            <td>{s.item?.name ?? s.clinicalItemId}</td>
                            <td>{s.variant?.variantName ?? s.variantId}</td>
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
                  <button
                    type="button"
                    className="btn btn-sm btn-primary radius-8 mt-2"
                    onClick={addAllLowStock}
                  >
                    Add all to request
                  </button>
                </div>
              )}
            </div>
          )}

          {!hasLowStock && (
            <div className="rounded radius-8 p-4 bg-light border">
              <p className="text-muted mb-2">No low-stock suggestions for this branch.</p>
              <p className="small text-muted mb-3">
                You can add items manually using the search above, or set reorder levels on clinic
                items to get suggestions.
              </p>
              <div className="d-flex flex-wrap gap-2">
                <a
                  href="#search-catalog"
                  className="btn btn-sm btn-primary radius-8"
                  onClick={(e) => {
                    e.preventDefault();
                    document.querySelector<HTMLInputElement>('input[placeholder*="Type product"]')?.focus();
                  }}
                >
                  Search products
                </a>
                <Link
                  href={`/staff/branch/${branchId}/clinic/items`}
                  className="btn btn-sm btn-outline-secondary radius-8"
                >
                  Configure reorder levels
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Draft items table */}
      <div className="card radius-12 mb-4">
        <div className="card-header bg-transparent p-24 d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-semibold">Request items</h6>
          {draftItems.length > 0 && (
            <span className="badge bg-secondary">{draftItems.length} line(s)</span>
          )}
        </div>
        <div className="card-body p-24">
          {draftItems.length === 0 ? (
            <p className="text-muted mb-0">
              No items yet. Use low-stock suggestions or search the catalog above to add items.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Item</th>
                    <th>Variant</th>
                    <th>Current</th>
                    <th>Requested qty</th>
                    <th>Note</th>
                    <th className="text-end">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {draftItems.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.itemName ?? row.clinicalItemId}</td>
                      <td>{row.variantName ?? row.variantId}</td>
                      <td>{row.currentQty ?? "—"}</td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          className="form-control form-control-sm"
                          style={{ width: 80 }}
                          value={row.requestedQty}
                          onChange={(e) =>
                            updateDraftQty(idx, parseInt(e.target.value, 10) || 0)
                          }
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

      <div className="d-flex gap-2">
        <button
          type="button"
          className="btn btn-primary radius-8"
          onClick={handleCreate}
          disabled={saving || !hasDraftItems}
        >
          {saving ? "Creating…" : "Create request"}
        </button>
        <Link
          href={`/staff/branch/${branchId}/clinic/supply-requests`}
          className="btn btn-outline-secondary radius-8"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
