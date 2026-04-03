"use client";

import type { MedicineListingsFilterState } from "../_lib/medicineListingsFilterState";
import MedicineWorkspaceAsyncSelect from "./MedicineWorkspaceAsyncSelect";

type Props = {
  draft: MedicineListingsFilterState;
  onPatch: (patch: Partial<MedicineListingsFilterState>) => void;
};

export default function MedicineCoreFilters({ draft, onPatch }: Props) {
  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-2">
        <span className="text-uppercase fw-semibold small text-muted" style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>
          Core · exact masters
        </span>
        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">Exact match</span>
      </div>
      <p className="small text-muted mb-3">
        Picks resolve to master records (internal references). In the selected country, you get every SKU tied to that generic, brand, dosage
        form, or manufacturer.
      </p>
      <div className="row g-3">
        <div className="col-md-6 col-xl-3">
          <MedicineWorkspaceAsyncSelect
            label="Generic"
            placeholder="Any generic"
            kind="generic"
            value={draft.genericPick}
            onChange={(v) => onPatch({ genericPick: v, genericContains: v ? "" : draft.genericContains })}
          />
        </div>
        <div className="col-md-6 col-xl-3">
          <MedicineWorkspaceAsyncSelect
            label="Brand"
            placeholder="Any brand"
            kind="brand"
            value={draft.brandPick}
            onChange={(v) => onPatch({ brandPick: v, brandContains: v ? "" : draft.brandContains })}
          />
        </div>
        <div className="col-md-6 col-xl-3">
          <MedicineWorkspaceAsyncSelect
            label="Dosage form"
            placeholder="Any form"
            kind="dosageForm"
            value={draft.dosageFormPick}
            onChange={(v) => onPatch({ dosageFormPick: v, dosageFormContains: v ? "" : draft.dosageFormContains })}
          />
        </div>
        <div className="col-md-6 col-xl-3">
          <MedicineWorkspaceAsyncSelect
            label="Manufacturer"
            placeholder="Any manufacturer"
            kind="manufacturer"
            value={draft.manufacturerPick}
            onChange={(v) => onPatch({ manufacturerPick: v, manufacturerContains: v ? "" : draft.manufacturerContains })}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label small">Strength contains</label>
          <input
            className="form-control form-control-sm"
            value={draft.strengthContains}
            onChange={(e) => onPatch({ strengthContains: e.target.value })}
            placeholder="Substring on presentation strength"
          />
        </div>
        <div className="col-md-4">
          <label className="form-label small">Package contains</label>
          <input
            className="form-control form-control-sm"
            value={draft.packageContains}
            onChange={(e) => onPatch({ packageContains: e.target.value })}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label small">Source</label>
          <select
            className="form-select form-select-sm"
            value={draft.sourceType}
            onChange={(e) => onPatch({ sourceType: e.target.value as MedicineListingsFilterState["sourceType"] })}
          >
            <option value="">Any</option>
            <option value="imported">Imported lineage</option>
            <option value="manual">Manual (no first batch)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
