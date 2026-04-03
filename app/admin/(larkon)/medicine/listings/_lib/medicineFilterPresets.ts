/**
 * Saved filter presets for medicine listings (local persistence until backend exists).
 * Swap `storage` for an API-backed implementation without changing callers.
 */

import type { MedicineListingsFilterState } from "./medicineListingsFilterState";
import { DEFAULT_MEDICINE_LISTINGS_FILTER_STATE } from "./medicineListingsFilterState";

const STORAGE_KEY = "bpa.admin.medicineListings.filterPresets.v1";
const DEFAULT_ID_KEY = "bpa.admin.medicineListings.defaultPresetId.v1";

export type SavedMedicineFilterPreset = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  state: MedicineListingsFilterState;
};

export type MedicineFilterPresetStorage = {
  list(): SavedMedicineFilterPreset[];
  save(preset: SavedMedicineFilterPreset): void;
  remove(id: string): void;
  getDefaultId(): string | null;
  setDefaultId(id: string | null): void;
};

function safeParse(json: string | null): SavedMedicineFilterPreset[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((x) => x && typeof x === "object" && typeof (x as SavedMedicineFilterPreset).id === "string") as SavedMedicineFilterPreset[];
  } catch {
    return [];
  }
}

function writeAll(items: SavedMedicineFilterPreset[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const localStorageMedicineFilterPresets: MedicineFilterPresetStorage = {
  list() {
    if (typeof window === "undefined") return [];
    return safeParse(window.localStorage.getItem(STORAGE_KEY));
  },
  save(preset) {
    const all = this.list().filter((p) => p.id !== preset.id);
    all.push(preset);
    all.sort((a, b) => a.name.localeCompare(b.name));
    writeAll(all);
  },
  remove(id) {
    const all = this.list().filter((p) => p.id !== id);
    writeAll(all);
    if (this.getDefaultId() === id) this.setDefaultId(null);
  },
  getDefaultId() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(DEFAULT_ID_KEY);
  },
  setDefaultId(id) {
    if (typeof window === "undefined") return;
    if (id) window.localStorage.setItem(DEFAULT_ID_KEY, id);
    else window.localStorage.removeItem(DEFAULT_ID_KEY);
  },
};

export function createPresetId(): string {
  return `mp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Deep clone filter state for preset payload (avoid shared refs). */
export function cloneFilterState(s: MedicineListingsFilterState): MedicineListingsFilterState {
  return {
    ...s,
    genericPick: s.genericPick ? { ...s.genericPick } : null,
    brandPick: s.brandPick ? { ...s.brandPick } : null,
    dosageFormPick: s.dosageFormPick ? { ...s.dosageFormPick } : null,
    manufacturerPick: s.manufacturerPick ? { ...s.manufacturerPick } : null,
    related: { ...s.related },
  };
}

export function mergeWithDefaults(partial: Partial<MedicineListingsFilterState>): MedicineListingsFilterState {
  return {
    ...DEFAULT_MEDICINE_LISTINGS_FILTER_STATE,
    ...partial,
    related: { ...DEFAULT_MEDICINE_LISTINGS_FILTER_STATE.related, ...(partial.related || {}) },
  };
}
