"use client";

import type { MedicineListingsFilterState } from "../_lib/medicineListingsFilterState";

type Props = {
  draft: MedicineListingsFilterState;
  onPatch: (patch: Partial<MedicineListingsFilterState>) => void;
};

export default function MedicineAdvancedFilters({ draft, onPatch }: Props) {
  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <div className="d-flex align-items-center gap-2 mb-2">
          <span className="text-uppercase fw-semibold small text-muted" style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>
            Text contains (substring AND)
          </span>
          <span className="badge bg-secondary-subtle text-secondary border">Contains</span>
        </div>
        <p className="small text-muted mb-2">
          Narrow by display-name substrings. Cleared when you pick the same dimension as an exact master above.
        </p>
        <div className="row g-3">
          <div className="col-md-6 col-lg-3">
            <label className="form-label small">Brand contains</label>
            <input
              className="form-control form-control-sm"
              value={draft.brandContains}
              onChange={(e) => onPatch({ brandContains: e.target.value, brandPick: null })}
            />
          </div>
          <div className="col-md-6 col-lg-3">
            <label className="form-label small">Generic contains</label>
            <input
              className="form-control form-control-sm"
              value={draft.genericContains}
              onChange={(e) => onPatch({ genericContains: e.target.value, genericPick: null })}
            />
          </div>
          <div className="col-md-6 col-lg-3">
            <label className="form-label small">Dosage form contains</label>
            <input
              className="form-control form-control-sm"
              value={draft.dosageFormContains}
              onChange={(e) => onPatch({ dosageFormContains: e.target.value, dosageFormPick: null })}
            />
          </div>
          <div className="col-md-6 col-lg-3">
            <label className="form-label small">Manufacturer contains</label>
            <input
              className="form-control form-control-sm"
              value={draft.manufacturerContains}
              onChange={(e) => onPatch({ manufacturerContains: e.target.value, manufacturerPick: null })}
            />
          </div>
        </div>
      </div>

      <div>
        <div className="text-uppercase fw-semibold small text-muted mb-2" style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>
          Import &amp; listing audit
        </div>
        <p className="small text-muted mb-3">
          Import filters use the <strong>first import batch</strong> linked to each SKU. Listing dates use <code className="small">createdAt</code> /{" "}
          <code className="small">updatedAt</code> on the catalog row.
        </p>
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label small">Import batch ref.</label>
            <input
              className="form-control form-control-sm"
              inputMode="numeric"
              placeholder="e.g. 42"
              value={draft.importBatchId}
              onChange={(e) => onPatch({ importBatchId: e.target.value.replace(/\D/g, "") })}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small">First batch uploaded by (user id)</label>
            <input
              className="form-control form-control-sm"
              inputMode="numeric"
              placeholder="Numeric user id"
              value={draft.importedByUserId}
              onChange={(e) => onPatch({ importedByUserId: e.target.value.replace(/\D/g, "") })}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small">Import batch created (from)</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={draft.importDateFrom}
              onChange={(e) => onPatch({ importDateFrom: e.target.value })}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small">Import batch created (to)</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={draft.importDateTo}
              onChange={(e) => onPatch({ importDateTo: e.target.value })}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small">Listing created (from)</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={draft.createdFrom}
              onChange={(e) => onPatch({ createdFrom: e.target.value })}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small">Listing created (to)</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={draft.createdTo}
              onChange={(e) => onPatch({ createdTo: e.target.value })}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small">Listing updated (from)</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={draft.updatedFrom}
              onChange={(e) => onPatch({ updatedFrom: e.target.value })}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small">Listing updated (to)</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={draft.updatedTo}
              onChange={(e) => onPatch({ updatedTo: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="border rounded-3 p-3 bg-light bg-opacity-50">
        <div className="text-uppercase fw-semibold small text-muted mb-2" style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>
          Clinical / classification
        </div>
        <p className="small text-muted mb-2">
          <strong>Not in schema:</strong> indications, therapeutic class, drug class, and route are not modeled on{" "}
          <code className="small">MedicinePresentation</code> / <code className="small">CountryMedicineBrand</code>. UI reserved for a future master-data
          phase.
        </p>
        <div className="row g-2 opacity-50">
          <div className="col-md-3">
            <label className="form-label small">Indication</label>
            <input className="form-control form-control-sm" disabled placeholder="—" />
          </div>
          <div className="col-md-3">
            <label className="form-label small">Therapeutic class</label>
            <input className="form-control form-control-sm" disabled placeholder="—" />
          </div>
          <div className="col-md-3">
            <label className="form-label small">Drug class</label>
            <input className="form-control form-control-sm" disabled placeholder="—" />
          </div>
          <div className="col-md-3">
            <label className="form-label small">Route</label>
            <input className="form-control form-control-sm" disabled placeholder="—" />
          </div>
        </div>
      </div>

      <div className="border rounded-3 p-3 bg-light bg-opacity-50">
        <div className="text-uppercase fw-semibold small text-muted mb-2" style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>
          Governance / quality
        </div>
        <p className="small text-muted mb-0">
          <strong>Not on listing row:</strong> review state and metadata state are not persisted on <code className="small">CountryMedicineBrand</code>. Use the
          import review queue for staging rows.
        </p>
      </div>
    </div>
  );
}
