"use client";

import type { MedicineListingsFilterState } from "../_lib/medicineListingsFilterState";
import { DEFAULT_MEDICINE_LISTINGS_FILTER_STATE } from "../_lib/medicineListingsFilterState";

type Country = { id: number; code: string; name: string };

type Chip = { id: string; label: string; apply: (s: MedicineListingsFilterState) => MedicineListingsFilterState };

function buildChips(state: MedicineListingsFilterState, countries: Country[], debouncedQ: string): Chip[] {
  const chips: Chip[] = [];
  if (state.countryId) {
    const c = countries.find((x) => String(x.id) === state.countryId);
    chips.push({
      id: "country",
      label: c ? `Country: ${c.code}` : `Country #${state.countryId}`,
      apply: (s) => ({ ...s, countryId: "" }),
    });
  }
  if (debouncedQ.trim()) {
    chips.push({
      id: "q",
      label: `Search: ${debouncedQ.trim().slice(0, 28)}${debouncedQ.trim().length > 28 ? "…" : ""}`,
      apply: (s) => ({ ...s, q: "" }),
    });
  }
  if (state.listingStatus !== "all") {
    chips.push({
      id: "st",
      label: `Status: ${state.listingStatus}`,
      apply: (s) => ({ ...s, listingStatus: "all" }),
    });
  }
  if (state.prescriptionState !== "all") {
    chips.push({
      id: "rx",
      label: state.prescriptionState === "yes" ? "Has Rx" : "No Rx",
      apply: (s) => ({ ...s, prescriptionState: "all" }),
    });
  }
  if (state.includeArchived) {
    chips.push({
      id: "arch",
      label: "Archived included",
      apply: (s) => ({ ...s, includeArchived: false }),
    });
  }
  const textFields: (keyof Pick<
    MedicineListingsFilterState,
    "brandContains" | "genericContains" | "dosageFormContains" | "manufacturerContains" | "strengthContains" | "packageContains"
  >)[] = [
    "brandContains",
    "genericContains",
    "dosageFormContains",
    "manufacturerContains",
    "strengthContains",
    "packageContains",
  ];
  textFields.forEach((k) => {
    const v = state[k].trim();
    if (v) {
      chips.push({
        id: k,
        label: `${k.replace("Contains", "")}: ${v.slice(0, 14)}${v.length > 14 ? "…" : ""}`,
        apply: (s) => ({ ...s, [k]: "" }),
      });
    }
  });
  if (state.sourceType) {
    chips.push({
      id: "src",
      label: `Source: ${state.sourceType}`,
      apply: (s) => ({ ...s, sourceType: "" }),
    });
  }
  if (state.importBatchId.trim()) {
    chips.push({
      id: "batch",
      label: `Import batch ref. ${state.importBatchId}`,
      apply: (s) => ({ ...s, importBatchId: "" }),
    });
  }
  if (state.importedByUserId.trim()) {
    chips.push({
      id: "impBy",
      label: `Importer #${state.importedByUserId}`,
      apply: (s) => ({ ...s, importedByUserId: "" }),
    });
  }
  ["importDateFrom", "importDateTo", "createdFrom", "createdTo", "updatedFrom", "updatedTo"].forEach((k) => {
    const key = k as keyof MedicineListingsFilterState;
    const v = String(state[key] ?? "").trim();
    if (v) {
      chips.push({
        id: k,
        label: `${k}: ${v}`,
        apply: (s) => ({ ...s, [key]: "" }),
      });
    }
  });
  if (state.genericPick) {
    chips.push({
      id: "gp",
      label: `Generic: ${state.genericPick.label}`,
      apply: (s) => ({ ...s, genericPick: null }),
    });
  }
  if (state.brandPick) {
    chips.push({
      id: "bp",
      label: `Brand: ${state.brandPick.label}`,
      apply: (s) => ({ ...s, brandPick: null }),
    });
  }
  if (state.dosageFormPick) {
    chips.push({
      id: "df",
      label: `Form: ${state.dosageFormPick.label}`,
      apply: (s) => ({ ...s, dosageFormPick: null }),
    });
  }
  if (state.manufacturerPick) {
    chips.push({
      id: "mp",
      label: `Mfr: ${state.manufacturerPick.label}`,
      apply: (s) => ({ ...s, manufacturerPick: null }),
    });
  }
  const rel = state.related;
  if (rel.genericFamily) {
    chips.push({
      id: "relg",
      label: "Related: generic family",
      apply: (s) => ({ ...s, related: { ...s.related, genericFamily: false } }),
    });
  }
  if (rel.brandVariants) {
    chips.push({
      id: "relb",
      label: "Related: brand variants",
      apply: (s) => ({ ...s, related: { ...s.related, brandVariants: false } }),
    });
  }
  if (rel.dosageSiblings) {
    chips.push({
      id: "reld",
      label: "Related: dosage siblings",
      apply: (s) => ({ ...s, related: { ...s.related, dosageSiblings: false } }),
    });
  }
  return chips;
}

type Props = {
  state: MedicineListingsFilterState;
  countries: Country[];
  debouncedQ: string;
  onCommit: (next: MedicineListingsFilterState) => void;
};

export default function MedicineActiveFilterChips({ state, countries, debouncedQ, onCommit }: Props) {
  const chips = buildChips(state, countries, debouncedQ);
  if (chips.length === 0) return null;

  return (
    <div className="d-flex flex-wrap align-items-center gap-2 py-2">
      <span className="small text-muted me-1">Active filters:</span>
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          className="btn btn-sm btn-light border rounded-pill"
          onClick={() => onCommit({ ...c.apply(state), page: 1 })}
        >
          {c.label}
          <i className="ri-close-line ms-1" aria-hidden />
        </button>
      ))}
      <button
        type="button"
        className="btn btn-sm btn-link text-decoration-none text-muted p-0 ms-2"
        onClick={() => onCommit({ ...DEFAULT_MEDICINE_LISTINGS_FILTER_STATE, page: 1 })}
      >
        Clear all
      </button>
    </div>
  );
}
