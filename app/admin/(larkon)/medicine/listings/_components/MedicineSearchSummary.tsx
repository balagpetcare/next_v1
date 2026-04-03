"use client";

import type { MedicineListingsFilterState } from "../_lib/medicineListingsFilterState";
import { DEFAULT_MEDICINE_LISTINGS_FILTER_STATE } from "../_lib/medicineListingsFilterState";

type Country = { id: number; code: string; name: string };

function isDefaultRelated(r: MedicineListingsFilterState["related"]) {
  return (
    !r.genericFamily &&
    !r.brandVariants &&
    !r.dosageSiblings &&
    !r.indicationFamily
  );
}

function summarize(state: MedicineListingsFilterState, countries: Country[], debouncedQ: string): string {
  const parts: string[] = [];
  const c = state.countryId ? countries.find((x) => String(x.id) === state.countryId) : null;
  if (c) parts.push(`Country: ${c.code}`);
  const q = debouncedQ.trim();
  if (q) parts.push(`Search “${q.length > 40 ? `${q.slice(0, 40)}…` : q}”`);
  if (state.listingStatus !== "all") parts.push(`Status: ${state.listingStatus}`);
  if (state.prescriptionState !== "all") parts.push(state.prescriptionState === "yes" ? "Has Rx" : "No Rx");
  if (state.includeArchived) parts.push("Including archived");
  if (state.genericPick) parts.push(`Generic: ${state.genericPick.label}`);
  if (state.brandPick) parts.push(`Brand: ${state.brandPick.label}`);
  if (state.dosageFormPick) parts.push(`Form: ${state.dosageFormPick.label}`);
  if (state.manufacturerPick) parts.push(`Mfr: ${state.manufacturerPick.label}`);
  if (state.strengthContains.trim()) parts.push(`Strength ∋ ${state.strengthContains.trim()}`);
  if (state.packageContains.trim()) parts.push(`Package ∋ ${state.packageContains.trim()}`);
  if (state.sourceType === "imported") parts.push("Source: Imported");
  if (state.sourceType === "manual") parts.push("Source: Manual");
  if (state.brandContains.trim()) parts.push(`Brand ∋ ${state.brandContains.trim()}`);
  if (state.genericContains.trim()) parts.push(`Generic ∋ ${state.genericContains.trim()}`);
  if (state.dosageFormContains.trim()) parts.push(`Form ∋ ${state.dosageFormContains.trim()}`);
  if (state.manufacturerContains.trim()) parts.push(`Mfr ∋ ${state.manufacturerContains.trim()}`);
  if (state.importBatchId.trim()) parts.push(`Batch #${state.importBatchId}`);
  if (state.importedByUserId.trim()) parts.push(`Importer user #${state.importedByUserId}`);
  if (state.importDateFrom || state.importDateTo) parts.push("Import date range");
  if (state.createdFrom || state.createdTo) parts.push("Created date range");
  if (state.updatedFrom || state.updatedTo) parts.push("Updated date range");
  if (!isDefaultRelated(state.related)) {
    const r: string[] = [];
    if (state.related.genericFamily) r.push("generic family");
    if (state.related.brandVariants) r.push("brand variants");
    if (state.related.dosageSiblings) r.push("dosage siblings");
    if (r.length) parts.push(`Related: ${r.join(", ")}`);
  }

  if (parts.length === 0) return "No filters — full catalog scope (respecting defaults).";
  return parts.join(" · ");
}

type Props = {
  state: MedicineListingsFilterState;
  countries: Country[];
  debouncedQ: string;
  resultCount: number;
  loading: boolean;
};

export default function MedicineSearchSummary({ state, countries, debouncedQ, resultCount, loading }: Props) {
  const isPristine =
    JSON.stringify({ ...state, q: debouncedQ }) ===
    JSON.stringify({ ...DEFAULT_MEDICINE_LISTINGS_FILTER_STATE, q: debouncedQ });

  return (
    <div className="border rounded-3 px-3 py-2 bg-body-secondary bg-opacity-25">
      <div className="d-flex flex-wrap align-items-baseline justify-content-between gap-2">
        <span className="small fw-semibold text-muted text-uppercase" style={{ fontSize: "0.65rem", letterSpacing: "0.06em" }}>
          Summary
        </span>
        <span className="small">
          {loading ? (
            <span className="text-muted">Loading…</span>
          ) : (
            <>
              Showing <strong>{resultCount.toLocaleString()}</strong> medicine{resultCount === 1 ? "" : "s"}
            </>
          )}
        </span>
      </div>
      <p className="small mb-0 mt-1 text-body-secondary">{summarize(state, countries, debouncedQ)}</p>
      {isPristine && !debouncedQ.trim() ? (
        <p className="small text-muted mb-0 mt-1">Tip: pick a country for faster catalogs; use exact masters for family-wide slices.</p>
      ) : null}
    </div>
  );
}
