"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cloneFilterState,
  createPresetId,
  localStorageMedicineFilterPresets,
  type SavedMedicineFilterPreset,
} from "../_lib/medicineFilterPresets";
import {
  DEFAULT_MEDICINE_LISTINGS_FILTER_STATE,
  normalizeMedicineListingsFiltersForApply,
  type MedicineListingsFilterState,
} from "../_lib/medicineListingsFilterState";
import styles from "../medicine-search-console.module.css";
import MedicineActiveFilterChips from "./MedicineActiveFilterChips";
import MedicineAdvancedFilters from "./MedicineAdvancedFilters";
import MedicineCoreFilters from "./MedicineCoreFilters";
import MedicineFilterActionBar from "./MedicineFilterActionBar";
import MedicineQuickSearchBar from "./MedicineQuickSearchBar";
import MedicineRelatedSearchOptions from "./MedicineRelatedSearchOptions";
import MedicineSearchSummary from "./MedicineSearchSummary";

const LS_ADV = "bpa.admin.medicineListings.console.advancedOpen.v1";

type Country = { id: number; code: string; name: string };

type Props = {
  countries: Country[];
  draft: MedicineListingsFilterState;
  setDraft: React.Dispatch<React.SetStateAction<MedicineListingsFilterState>>;
  debouncedQ: string;
  onCommitToUrl: (next: MedicineListingsFilterState) => void;
  resultCount: number;
  loading: boolean;
  onExport: () => void;
  exportBusy: boolean;
};

export default function MedicineSearchConsole({
  countries,
  draft,
  setDraft,
  debouncedQ,
  onCommitToUrl,
  resultCount,
  loading,
  onExport,
  exportBusy,
}: Props) {
  const [presetOpen, setPresetOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<SavedMedicineFilterPreset[]>([]);
  const [dirty, setDirty] = useState(false);

  const refreshPresets = useCallback(() => setPresets(localStorageMedicineFilterPresets.list()), []);

  useEffect(() => {
    refreshPresets();
  }, [refreshPresets, presetOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlHasAdv = new URLSearchParams(window.location.search).has("advancedOpen");
    if (urlHasAdv) return;
    const raw = window.localStorage.getItem(LS_ADV);
    if (raw === "1") setDraft((d) => ({ ...d, advancedOpen: true }));
     
  }, []);

  const setAdvancedOpen = useCallback(
    (open: boolean) => {
      setDirty(true);
      setDraft((d) => ({ ...d, advancedOpen: open }));
      if (typeof window !== "undefined") window.localStorage.setItem(LS_ADV, open ? "1" : "0");
    },
    [setDraft]
  );

  const patch = useCallback(
    (p: Partial<MedicineListingsFilterState>) => {
      setDirty(true);
      setDraft((d) => {
        const resetPageKeys = new Set([
          "countryId",
          "listingStatus",
          "prescriptionState",
          "includeArchived",
          "genericPick",
          "brandPick",
          "dosageFormPick",
          "manufacturerPick",
          "brandContains",
          "genericContains",
          "dosageFormContains",
          "manufacturerContains",
          "strengthContains",
          "packageContains",
          "sourceType",
          "importBatchId",
          "createdFrom",
          "createdTo",
          "updatedFrom",
          "updatedTo",
          "importDateFrom",
          "importDateTo",
          "importedByUserId",
          "related",
        ]);
        const shouldResetPage = Object.keys(p).some((k) => resetPageKeys.has(k));
        return { ...d, ...p, ...(shouldResetPage ? { page: 1 } : {}) };
      });
    },
    [setDraft]
  );

  const handleApply = useCallback(() => {
    const next = normalizeMedicineListingsFiltersForApply(draft);
    setDraft(next);
    onCommitToUrl(next);
    setDirty(false);
  }, [draft, onCommitToUrl, setDraft]);

  const handleClearAll = useCallback(() => {
    const next = { ...DEFAULT_MEDICINE_LISTINGS_FILTER_STATE, advancedOpen: draft.advancedOpen };
    setDraft(next);
    onCommitToUrl(next);
    setDirty(false);
  }, [draft.advancedOpen, onCommitToUrl, setDraft]);

  const commitFromChips = useCallback(
    (next: MedicineListingsFilterState) => {
      setDraft(next);
      onCommitToUrl(next);
      setDirty(false);
    },
    [onCommitToUrl, setDraft]
  );

  const savePreset = useCallback(() => {
    const name = presetName.trim() || `View ${new Date().toLocaleString()}`;
    const now = new Date().toISOString();
    const row: SavedMedicineFilterPreset = {
      id: createPresetId(),
      name,
      createdAt: now,
      updatedAt: now,
      state: cloneFilterState(normalizeMedicineListingsFiltersForApply(draft)),
    };
    localStorageMedicineFilterPresets.save(row);
    refreshPresets();
    setPresetName("");
    setPresetOpen(false);
  }, [draft, presetName, refreshPresets]);

  const loadPreset = useCallback(
    (id: string) => {
      const p = localStorageMedicineFilterPresets.list().find((x) => x.id === id);
      if (!p) return;
      const next = cloneFilterState(p.state);
      setDraft(next);
      onCommitToUrl(next);
      setDirty(false);
    },
    [onCommitToUrl, setDraft]
  );

  const deletePreset = useCallback(
    (id: string) => {
      localStorageMedicineFilterPresets.remove(id);
      refreshPresets();
    },
    [refreshPresets]
  );

  const setDefaultPreset = useCallback(
    (id: string | null) => {
      localStorageMedicineFilterPresets.setDefaultId(id);
      refreshPresets();
    },
    [refreshPresets]
  );

  return (
    <div className={`card radius-12 border-0 shadow-sm mb-4 ${styles.consoleCard}`}>
      <div className="card-body p-20 p-md-24 pb-2">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h2 className="h6 fw-bold mb-1">Medicine search console</h2>
            <p className="text-muted small mb-0">
              Exact masters vs contains filters are visually separated. URL holds the applied view; use <strong>Apply</strong> to commit structural
              changes. Global search debounces to the URL automatically.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            {presets.length > 0 ? (
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Load saved view"
                defaultValue=""
                onChange={(e) => {
                  const v = e.target.value;
                  e.target.value = "";
                  if (v) loadPreset(v);
                }}
              >
                <option value="">Load saved view…</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : null}
            <button type="button" className="btn btn-sm btn-outline-secondary radius-8" onClick={() => setPresetOpen(true)}>
              Save view…
            </button>
          </div>
        </div>

        <MedicineQuickSearchBar countries={countries} draft={draft} onPatch={patch} />

        <MedicineSearchSummary
          state={draft}
          countries={countries}
          debouncedQ={debouncedQ}
          resultCount={resultCount}
          loading={loading}
        />

        <MedicineActiveFilterChips state={draft} countries={countries} debouncedQ={debouncedQ} onCommit={commitFromChips} />

        <hr className="my-3 text-muted opacity-25" />

        <div className={styles.exactZone}>
          <MedicineCoreFilters draft={draft} onPatch={patch} />
        </div>

        <div className="mt-3">
          <button
            type="button"
            className="btn btn-link btn-sm text-decoration-none p-0"
            onClick={() => setAdvancedOpen(!draft.advancedOpen)}
            aria-expanded={draft.advancedOpen}
          >
            <i className={`ri-arrow-${draft.advancedOpen ? "up" : "down"}-s-line me-1`} aria-hidden />
            Advanced intelligence &amp; audit filters
          </button>
        </div>

        {draft.advancedOpen ? (
          <div className="mt-3 pt-2 border-top">
            <div className={`${styles.containsZone} mb-4`}>
              <MedicineAdvancedFilters draft={draft} onPatch={patch} />
            </div>
            <MedicineRelatedSearchOptions draft={draft} onPatch={patch} />
          </div>
        ) : null}
      </div>

      <div className={`${styles.stickyActionBar} px-20 px-md-24 py-0`}>
        <MedicineFilterActionBar
          draft={draft}
          onPatch={patch}
          onApply={handleApply}
          onClearAll={handleClearAll}
          onSaveView={() => setPresetOpen(true)}
          onExport={onExport}
          exportBusy={exportBusy}
          hasPendingChanges={dirty}
        />
      </div>

      {presetOpen ? (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.45)", zIndex: 1060 }} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h5 className="modal-title">Save filter view</h5>
                <button type="button" className="btn-close" onClick={() => setPresetOpen(false)} aria-label="Close" />
              </div>
              <div className="modal-body small">
                <p className="text-muted">Stored in this browser (localStorage). Swap storage in code when a backend preset API exists.</p>
                <label className="form-label">Name</label>
                <input className="form-control form-control-sm" value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="e.g. BD imported analgesics" />
                <hr />
                <div className="fw-semibold mb-2">Saved views</div>
                {presets.length === 0 ? (
                  <p className="text-muted mb-0">None yet.</p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {presets.map((p) => (
                      <li key={p.id} className="list-group-item px-0 d-flex flex-wrap align-items-center gap-2">
                        <span className="flex-grow-1">{p.name}</span>
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => loadPreset(p.id)}>
                          Load
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setDefaultPreset(localStorageMedicineFilterPresets.getDefaultId() === p.id ? null : p.id)}
                        >
                          {localStorageMedicineFilterPresets.getDefaultId() === p.id ? "Unset default" : "Set default"}
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deletePreset(p.id)}>
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-sm btn-secondary radius-8" onClick={() => setPresetOpen(false)}>
                  Close
                </button>
                <button type="button" className="btn btn-sm btn-primary radius-8" onClick={savePreset}>
                  Save current view
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
