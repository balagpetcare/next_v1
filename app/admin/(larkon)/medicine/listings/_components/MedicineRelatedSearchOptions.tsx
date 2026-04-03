"use client";

import type { MedicineListingsFilterState } from "../_lib/medicineListingsFilterState";

type Props = {
  draft: MedicineListingsFilterState;
  onPatch: (patch: Partial<MedicineListingsFilterState>) => void;
};

export default function MedicineRelatedSearchOptions({ draft, onPatch }: Props) {
  const patchRel = (key: keyof MedicineListingsFilterState["related"], v: boolean) =>
    onPatch({ related: { ...draft.related, [key]: v } });

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-2">
        <span className="text-uppercase fw-semibold small text-muted" style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>
          Related result expansion
        </span>
        <span className="badge bg-info-subtle text-info border border-info-subtle">OR siblings</span>
      </div>
      <p className="small text-muted mb-3">
        Requires a <strong>country</strong> and at least one <strong>exact</strong> master pick. Adds sibling rows with OR (still AND with text, dates, Rx, etc.).
        Anchors: generic family needs <strong>brand</strong>; brand variants needs <strong>generic</strong>; dosage siblings needs <strong>generic</strong> or{" "}
        <strong>dosage form</strong>.
      </p>
      <div className="row g-2">
        <div className="col-md-6">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="rel-gen"
              checked={draft.related.genericFamily}
              onChange={(e) => patchRel("genericFamily", e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="rel-gen">
              Same generic family (anchor: <strong>brand</strong>)
            </label>
          </div>
        </div>
        <div className="col-md-6">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="rel-brandv"
              checked={draft.related.brandVariants}
              onChange={(e) => patchRel("brandVariants", e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="rel-brandv">
              Same brand variants / portfolio (anchor: <strong>generic</strong>)
            </label>
          </div>
        </div>
        <div className="col-md-6">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="rel-dos"
              checked={draft.related.dosageSiblings}
              onChange={(e) => patchRel("dosageSiblings", e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="rel-dos">
              Same dosage-form siblings (anchor: <strong>generic</strong> or <strong>dosage form</strong>)
            </label>
          </div>
        </div>
        <div className="col-md-6">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="rel-ind"
              disabled
              checked={draft.related.indicationFamily}
              onChange={(e) => patchRel("indicationFamily", e.target.checked)}
            />
            <label className="form-check-label small text-muted" htmlFor="rel-ind">
              Same indication family (schema not wired — reserved)
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
