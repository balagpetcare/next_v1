"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { medicineSearch } from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";

export const REQUISITION_UNITS = [
  "pcs",
  "strip",
  "box",
  "bottle",
  "vial",
  "ampoule",
  "sachet",
  "tube",
  "pack",
  "ml",
] as const;

export type RequisitionUnit = (typeof REQUISITION_UNITS)[number];

export type MedicineSearchHit = {
  id: number;
  packageMarkDisplay?: string;
  genericName?: string;
  brandName?: string;
  strengthDisplay?: string;
  dosageForm?: string;
  manufacturerName?: string;
  suggestedUnit?: string;
};

type Props = {
  show: boolean;
  branchId: string;
  onClose: () => void;
  /** Batch add from current selection (parent dedupes against requisition + reports toasts). */
  onAddMany: (meds: MedicineSearchHit[]) => void;
  existingListingIds: Set<number>;
};

const DEBOUNCE_MS = 350;
const MIN_QUERY_LEN = 2;
const SEARCH_LIMIT = 100;

function isAllowedUnit(u: string | undefined): u is RequisitionUnit {
  return !!u && (REQUISITION_UNITS as readonly string[]).includes(u);
}

export function formatMedicineSummaryLine(m: MedicineSearchHit): string {
  const brand = m.brandName?.trim() || "—";
  const generic = m.genericName?.trim() || "—";
  const strength = m.strengthDisplay?.trim() || "—";
  const form = m.dosageForm?.trim() || "—";
  const pack = m.packageMarkDisplay?.trim();
  const tail = [strength, form, pack].filter((x) => x && x !== "—").join(" — ");
  return `${brand} — ${generic}${tail ? ` — ${tail}` : ""}`;
}

/** When new search results arrive, refresh stored row data for IDs that stay selected. */
function refreshSelectedFromResults(
  prev: Map<number, MedicineSearchHit>,
  results: MedicineSearchHit[]
): Map<number, MedicineSearchHit> {
  const next = new Map(prev);
  for (const r of results) {
    if (next.has(r.id)) next.set(r.id, r);
  }
  return next;
}

export default function MedicineRequisitionPickerModal({
  show,
  branchId,
  onClose,
  onAddMany,
  existingListingIds,
}: Props) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<MedicineSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  /** Stable selection: id → latest known row (kept across query changes). */
  const [selectedById, setSelectedById] = useState<Map<number, MedicineSearchHit>>(() => new Map());
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const runSearch = useCallback(
    async (q: string) => {
      if (!q || q.length < MIN_QUERY_LEN) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const raw = await medicineSearch({ q, branchId, limit: SEARCH_LIMIT });
        const list = (Array.isArray(raw) ? raw : []) as MedicineSearchHit[];
        setResults(list);
        setSelectedById((prev) => refreshSelectedFromResults(prev, list));
      } catch (e: unknown) {
        setResults([]);
        toast.error(e instanceof Error ? e.message : "Search failed. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [branchId, toast]
  );

  useEffect(() => {
    if (!show) return;
    runSearch(debounced);
  }, [show, debounced, runSearch]);

  useEffect(() => {
    if (show) {
      setQuery("");
      setDebounced("");
      setResults([]);
      setSelectedById(new Map());
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [show]);

  useEffect(() => {
    if (!show) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  const selectableResults = results.filter((r) => !existingListingIds.has(r.id));
  const visibleSelectableIds = new Set(selectableResults.map((r) => r.id));
  const selectedCount = selectedById.size;
  const selectedVisibleCount = [...selectedById.keys()].filter((id) => visibleSelectableIds.has(id)).length;

  function toggleId(med: MedicineSearchHit) {
    if (existingListingIds.has(med.id)) return;
    setSelectedById((prev) => {
      const next = new Map(prev);
      if (next.has(med.id)) next.delete(med.id);
      else next.set(med.id, med);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedById((prev) => {
      const next = new Map(prev);
      for (const r of selectableResults) {
        next.set(r.id, r);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedById(new Map());
  }

  function handleAddSelected() {
    if (selectedById.size === 0) return;
    const meds = [...selectedById.values()];
    onAddMany(meds);
    clearSelection();
  }

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  if (!show) return null;

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="medicine-picker-title"
      aria-describedby="medicine-picker-desc"
      onMouseDown={handleBackdrop}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: 720 }}>
        <div
          className="modal-content radius-12 d-flex flex-column"
          style={{ maxHeight: "min(90vh, 720px)" }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="modal-header border-0 pb-0 flex-shrink-0">
            <div>
              <h5 className="modal-title mb-0" id="medicine-picker-title">
                Add medicine
              </h5>
              <p className="small text-muted mb-0 mt-1" id="medicine-picker-desc">
                Select multiple items, then <strong>Add selected</strong>. Selection is kept if you change the search.
              </p>
            </div>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>

          <div className="modal-body pt-2 pb-0 px-3 d-flex flex-column gap-2 min-h-0 flex-grow-1">
            <div className="flex-shrink-0">
              <label className="form-label small text-secondary mb-1">Search by brand, generic, strength, form, or pack mark</label>
              <input
                ref={inputRef}
                type="search"
                className="form-control form-control-sm radius-12"
                placeholder="e.g. ceftriaxone, napa, cefixime 100…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
                aria-label="Search medicines"
              />
            </div>

            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 flex-shrink-0 py-1 border-bottom">
              <span className="small fw-semibold text-dark" aria-live="polite">
                {selectedCount === 0 ? "0 selected" : `${selectedCount} selected`}
                {results.length > 0 && selectedVisibleCount > 0 && selectedVisibleCount < selectedCount ? (
                  <span className="text-muted fw-normal"> ({selectedVisibleCount} in current list)</span>
                ) : null}
              </span>
              <div className="d-flex flex-wrap gap-1">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm radius-12"
                  disabled={!selectableResults.length}
                  onClick={selectAllVisible}
                >
                  Select all visible
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm radius-12" disabled={!selectedCount} onClick={clearSelection}>
                  Clear selection
                </button>
              </div>
            </div>

            <div
              className="border rounded radius-12 flex-grow-1 min-h-0 overflow-y-auto"
              style={{ maxHeight: "min(48vh, 420px)" }}
              role="listbox"
              aria-label="Search results"
              aria-multiselectable="true"
            >
              {loading && (
                <div className="d-flex align-items-center justify-content-center py-5 text-muted small">
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                  Searching…
                </div>
              )}
              {!loading && debounced.length < MIN_QUERY_LEN && (
                <div className="p-4 text-center text-muted small">Type at least {MIN_QUERY_LEN} characters to search.</div>
              )}
              {!loading && debounced.length >= MIN_QUERY_LEN && results.length === 0 && (
                <div className="p-4 text-center text-muted small">No matches. Try different keywords.</div>
              )}
              {!loading && results.length > 0 && (
                <ul className="list-group list-group-flush">
                  {results.map((med) => {
                    const onReq = existingListingIds.has(med.id);
                    const checked = !onReq && selectedById.has(med.id);
                    const unitHint = isAllowedUnit(med.suggestedUnit) ? med.suggestedUnit : null;
                    const strengthForm = [med.strengthDisplay, med.dosageForm].filter(Boolean).join(" — ");
                    return (
                      <li
                        key={med.id}
                        className={`list-group-item py-2 px-2 ${onReq ? "bg-light" : ""}`}
                        role="option"
                        aria-selected={checked}
                      >
                        <div className="d-flex gap-2 align-items-start">
                          <div className="form-check mt-1 flex-shrink-0">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`med-pick-${med.id}`}
                              checked={checked}
                              disabled={onReq}
                              onChange={() => toggleId(med)}
                              aria-label={`Select ${med.brandName ?? "medicine"}`}
                            />
                          </div>
                          <label
                            className={`flex-grow-1 min-w-0 mb-0 ${onReq ? "text-muted" : "cursor-pointer"}`}
                            htmlFor={`med-pick-${med.id}`}
                          >
                            <div className="small">
                              <strong className="text-dark">{med.brandName?.trim() || "—"}</strong>
                              <span className="text-muted"> — </span>
                              <span>{med.genericName?.trim() || "—"}</span>
                            </div>
                            {strengthForm ? (
                              <div className="text-dark small mt-1" style={{ fontSize: "0.82rem" }}>
                                {strengthForm}
                                {med.packageMarkDisplay ? ` — ${med.packageMarkDisplay}` : ""}
                              </div>
                            ) : med.packageMarkDisplay ? (
                              <div className="text-dark small mt-1" style={{ fontSize: "0.82rem" }}>
                                {med.packageMarkDisplay}
                              </div>
                            ) : null}
                            {(med.manufacturerName || unitHint) && (
                              <div className="text-secondary mt-1" style={{ fontSize: "0.75rem" }}>
                                {med.manufacturerName ? <span>{med.manufacturerName}</span> : null}
                                {med.manufacturerName && unitHint ? " · " : null}
                                {unitHint ? <span>Suggested unit: {unitHint}</span> : null}
                              </div>
                            )}
                            {onReq && <div className="text-warning small mt-1">Already on requisition</div>}
                          </label>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="modal-footer border-top flex-shrink-0 gap-2 flex-wrap">
            <span className="small text-muted me-auto">{selectedCount ? `${selectedCount} selected` : "None selected"}</span>
            <button type="button" className="btn btn-outline-secondary btn-sm radius-12" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm radius-12"
              disabled={!selectedCount}
              onClick={handleAddSelected}
            >
              Add selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function defaultUnitForMedicine(med: MedicineSearchHit): RequisitionUnit {
  if (isAllowedUnit(med.suggestedUnit)) return med.suggestedUnit;
  return "pcs";
}
