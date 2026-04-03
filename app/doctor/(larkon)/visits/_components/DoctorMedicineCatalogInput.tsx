"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { doctorMedicineCatalogSearch, type MedicineCatalogSearchItem } from "@/lib/api";

type Props = {
  branchId: number;
  medicineName: string;
  countryMedicineBrandId: number | null | undefined;
  disabled?: boolean;
  /** Fired when user types; parent should clear `countryMedicineBrandId` when text changes manually. */
  onMedicineNameChange: (name: string) => void;
  onCatalogSelect: (item: MedicineCatalogSearchItem) => void;
};

/**
 * Autocomplete against country-scoped imported catalog (branch org → country).
 * Org inventory picker remains separate (`medicine-search`).
 */
export function DoctorMedicineCatalogInput({
  branchId,
  medicineName,
  countryMedicineBrandId,
  disabled,
  onMedicineNameChange,
  onCatalogSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MedicineCatalogSearchItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [catalogCountry, setCatalogCountry] = useState<{ code: string | null; name: string | null } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [lastSearchEmpty, setLastSearchEmpty] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(
    async (q: string) => {
      const t = q.trim();
      if (t.length < 2) {
        setResults([]);
        setNotice(null);
        setCatalogCountry(null);
        setSearchError(null);
        setLastSearchEmpty(false);
        return;
      }
      setLoading(true);
      setSearchError(null);
      try {
        const data = await doctorMedicineCatalogSearch(branchId, { q: t, limit: 12 });
        setResults(data.items ?? []);
        setNotice(data.notice ?? null);
        setCatalogCountry(data.catalogCountry ?? null);
        const n = (data.items ?? []).length;
        setLastSearchEmpty(n === 0 && !(data.notice && String(data.notice).trim()));
      } catch (e: unknown) {
        setResults([]);
        setNotice(null);
        setCatalogCountry(null);
        setLastSearchEmpty(false);
        setSearchError((e as Error)?.message || "Catalog search failed");
      } finally {
        setLoading(false);
      }
    },
    [branchId]
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const scheduleSearch = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void runSearch(v);
    }, 280);
  };

  const showPanel =
    open &&
    (loading || !!searchError || results.length > 0 || (!loading && lastSearchEmpty && medicineName.trim().length >= 2 && !notice));

  return (
    <div ref={wrapRef} className="position-relative">
      <input
        type="text"
        className="form-control form-control-sm"
        placeholder="Medicine (type 2+ chars — national catalog)"
        disabled={disabled}
        value={medicineName}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          const v = e.target.value;
          onMedicineNameChange(v);
          scheduleSearch(v);
          setOpen(true);
        }}
      />
      <div className="d-flex flex-wrap align-items-center gap-1 mt-1">
        {countryMedicineBrandId ? (
          <span className="badge bg-info-subtle text-dark">Imported catalog</span>
        ) : null}
        {catalogCountry?.code || catalogCountry?.name ? (
          <span className="small text-muted" title="National catalog scope for this clinic">
            {catalogCountry.code ? `${catalogCountry.code}` : ""}
            {catalogCountry.name ? ` · ${catalogCountry.name}` : ""}
          </span>
        ) : null}
      </div>
      {notice ? <div className="small text-warning mt-1">{notice}</div> : null}
      {searchError ? <div className="small text-danger mt-1">{searchError}</div> : null}
      {showPanel ? (
        <div
          className="dropdown-menu show w-100 shadow-sm border radius-8 mt-1"
          style={{ maxHeight: 240, overflowY: "auto", zIndex: 20, position: "absolute" }}
        >
          {loading ? (
            <div className="dropdown-item-text small text-muted">Searching national catalog…</div>
          ) : searchError ? (
            <div className="dropdown-item-text small text-danger">{searchError}</div>
          ) : results.length === 0 ? (
            <div className="dropdown-item-text small text-muted">No matches in the national catalog for this search.</div>
          ) : (
            results.map((r) => (
              <button
                key={r.countryMedicineBrandId}
                type="button"
                className="dropdown-item text-start small py-2"
                onClick={() => {
                  onCatalogSelect(r);
                  setOpen(false);
                  setResults([]);
                }}
              >
                <div className="fw-medium">{r.brandName}</div>
                <div className="text-muted">
                  {r.genericName}
                  {r.strengthDisplay ? ` · ${r.strengthDisplay}` : ""}
                  {r.dosageForm ? ` · ${r.dosageForm}` : ""}
                </div>
                <div className="text-muted small">{r.manufacturerName}</div>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
