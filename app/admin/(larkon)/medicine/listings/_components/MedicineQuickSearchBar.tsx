"use client";

import type { ListingStatus, MedicineListingsFilterState, PrescriptionState } from "../_lib/medicineListingsFilterState";

type Country = { id: number; code: string; name: string };

type Props = {
  countries: Country[];
  draft: MedicineListingsFilterState;
  onPatch: (patch: Partial<MedicineListingsFilterState>) => void;
};

export default function MedicineQuickSearchBar({ countries, draft, onPatch }: Props) {
  return (
    <div className="row g-3 pb-3 align-items-end">
      <div className="col-lg-4 col-md-6">
        <label className="form-label small fw-medium mb-1">Global search</label>
        <div className="input-group input-group-sm">
          <span className="input-group-text bg-light border-end-0">
            <i className="ri-search-line text-muted" aria-hidden />
          </span>
          <input
            className="form-control border-start-0"
            placeholder="Brand, generic, strength, package, fingerprint, form, manufacturer…"
            value={draft.q}
            onChange={(e) => onPatch({ q: e.target.value })}
            aria-describedby="ml-q-help"
          />
        </div>
        {/* <div id="ml-q-help" className="form-text small">
          Debounced; matches any of the fields above (OR). Combine with structured filters using AND.
        </div> */}
      </div>
      <div className="col-lg-2 col-md-6">
        <label className="form-label small fw-medium mb-1">Country</label>
        <select
          className="form-select form-select-sm"
          value={draft.countryId}
          onChange={(e) => onPatch({ countryId: e.target.value })}
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="col-lg-2 col-md-4">
        <label className="form-label small fw-medium mb-1">Listing status</label>
        <select
          className="form-select form-select-sm"
          value={draft.listingStatus}
          onChange={(e) => onPatch({ listingStatus: e.target.value as ListingStatus })}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div className="col-lg-2 col-md-4">
        <label className="form-label small fw-medium mb-1">Prescriptions</label>
        <select
          className="form-select form-select-sm"
          value={draft.prescriptionState}
          onChange={(e) => onPatch({ prescriptionState: e.target.value as PrescriptionState })}
        >
          <option value="all">Any</option>
          <option value="yes">Has Rx lines</option>
          <option value="no">No Rx lines</option>
        </select>
      </div>
      <div className="col-lg-2 col-md-4">
        <div className="form-check mt-2 pt-1">
          <input
            className="form-check-input"
            type="checkbox"
            id="ml-inc-arch"
            checked={draft.includeArchived}
            onChange={(e) => onPatch({ includeArchived: e.target.checked })}
          />
          <label className="form-check-label small" htmlFor="ml-inc-arch">
            Include archived
          </label>
        </div>
      </div>
    </div>
  );
}
