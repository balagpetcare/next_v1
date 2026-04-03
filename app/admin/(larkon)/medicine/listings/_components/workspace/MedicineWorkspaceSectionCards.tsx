"use client";

import type { MedicineWorkspaceProfile } from "../../_lib/medicineWorkspaceProfile.types";
import RelationSearchPicker, { type RelationOption } from "./RelationSearchPicker";
import PresentationRelationPicker, { type PresentationOption } from "./PresentationRelationPicker";

type Country = { id: number; code: string; name: string };

type Pf = {
  profile: MedicineWorkspaceProfile;
  onField: (k: keyof MedicineWorkspaceProfile, v: string) => void;
};

export function MedicineCoreSection({
  countries,
  countryId,
  setCountryId,
  generic,
  setGeneric,
  dosageForm,
  setDosageForm,
  manufacturer,
  setManufacturer,
  brand,
  setBrand,
  presentation,
  setPresentation,
  packageMark,
  setPackageMark,
  readonlyIdentity,
  profile,
  onField,
  onOpenCreate,
}: {
  countries: Country[];
  countryId: number | "";
  setCountryId: (v: number | "") => void;
  generic: RelationOption | null;
  setGeneric: (v: RelationOption | null) => void;
  dosageForm: RelationOption | null;
  setDosageForm: (v: RelationOption | null) => void;
  manufacturer: RelationOption | null;
  setManufacturer: (v: RelationOption | null) => void;
  brand: RelationOption | null;
  setBrand: (v: RelationOption | null) => void;
  presentation: PresentationOption | null;
  setPresentation: (v: PresentationOption | null) => void;
  packageMark: string;
  setPackageMark: (v: string) => void;
  readonlyIdentity: boolean;
  profile: MedicineWorkspaceProfile;
  onField: Pf["onField"];
  onOpenCreate: (k: "generic" | "dosageForm" | "manufacturer" | "brand" | "presentation") => void;
}) {
  return (
    <div className="card radius-12 mb-3">
      <div className="card-header py-2">
        <h6 className="mb-0 small fw-semibold">Core identity</h6>
      </div>
      <div className="card-body">
        <div className="row g-2">
          <div className="col-md-6">
            <label className="form-label small">Country</label>
            <select
              className="form-select form-select-sm"
              disabled={readonlyIdentity}
              value={countryId === "" ? "" : String(countryId)}
              onChange={(e) => setCountryId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Select…</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label small">Package mark</label>
            <input className="form-control form-control-sm" value={packageMark} onChange={(e) => setPackageMark(e.target.value)} />
          </div>
          <div className="col-md-6">
            <RelationSearchPicker
              label="Generic (INN)"
              kind="generic"
              value={generic}
              onChange={setGeneric}
              disabled={readonlyIdentity}
            />
            {!readonlyIdentity ? (
              <button type="button" className="btn btn-link btn-sm p-0 mt-1" onClick={() => onOpenCreate("generic")}>
                + New generic
              </button>
            ) : null}
          </div>
          <div className="col-md-6">
            <RelationSearchPicker
              label="Dosage form"
              kind="dosageForm"
              value={dosageForm}
              onChange={setDosageForm}
              disabled={readonlyIdentity}
            />
            {!readonlyIdentity ? (
              <button type="button" className="btn btn-link btn-sm p-0 mt-1" onClick={() => onOpenCreate("dosageForm")}>
                + New dosage form
              </button>
            ) : null}
          </div>
          <div className="col-md-6">
            <RelationSearchPicker
              label="Manufacturer (for new brand)"
              kind="manufacturer"
              value={manufacturer}
              onChange={setManufacturer}
              disabled={readonlyIdentity}
            />
            {!readonlyIdentity ? (
              <button type="button" className="btn btn-link btn-sm p-0 mt-1" onClick={() => onOpenCreate("manufacturer")}>
                + New manufacturer
              </button>
            ) : null}
          </div>
          <div className="col-md-6">
            <RelationSearchPicker label="Brand" kind="brand" value={brand} onChange={setBrand} disabled={readonlyIdentity} />
            {!readonlyIdentity ? (
              <button type="button" className="btn btn-link btn-sm p-0 mt-1" onClick={() => onOpenCreate("brand")}>
                + New brand
              </button>
            ) : null}
          </div>
          <div className="col-12">
            <PresentationRelationPicker
              label="Strength / presentation"
              genericId={generic?.id ?? null}
              dosageFormId={dosageForm?.id ?? null}
              value={presentation}
              onChange={setPresentation}
              disabled={readonlyIdentity}
            />
            {!readonlyIdentity ? (
              <button type="button" className="btn btn-link btn-sm p-0 mt-1" onClick={() => onOpenCreate("presentation")}>
                + New presentation (strength)
              </button>
            ) : null}
          </div>
          <div className="col-md-4">
            <label className="form-label small">Medicine / product type</label>
            <input
              className="form-control form-control-sm"
              value={profile.medicineProductType ?? ""}
              onChange={(e) => onField("medicineProductType", e.target.value)}
              placeholder="e.g. antibiotic, vaccine"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small">Veterinary / human</label>
            <select
              className="form-select form-select-sm"
              value={profile.veterinaryHumanFlag ?? ""}
              onChange={(e) => onField("veterinaryHumanFlag", e.target.value)}
            >
              <option value="">—</option>
              <option value="VETERINARY">Veterinary</option>
              <option value="HUMAN">Human</option>
              <option value="BOTH">Both</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label small">Prescription category</label>
            <select
              className="form-select form-select-sm"
              value={profile.prescriptionCategory ?? ""}
              onChange={(e) => onField("prescriptionCategory", e.target.value)}
            >
              <option value="">—</option>
              <option value="RX">Prescription (Rx)</option>
              <option value="OTC">Over the counter</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>
          <div className="col-12">
            <label className="form-label small">Listing notes (internal)</label>
            <textarea
              className="form-control form-control-sm"
              rows={2}
              value={profile.listingStatusNote ?? ""}
              onChange={(e) => onField("listingStatusNote", e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MedicineCompositionSection({ profile, onField }: Pf) {
  return (
    <div className="card radius-12 mb-3">
      <div className="card-header py-2">
        <h6 className="mb-0 small fw-semibold">Composition</h6>
      </div>
      <div className="card-body row g-2">
        <div className="col-12">
          <label className="form-label small">Additional generics / salts (free text)</label>
          <textarea
            className="form-control form-control-sm"
            rows={2}
            value={profile.secondaryGenericsNote ?? ""}
            onChange={(e) => onField("secondaryGenericsNote", e.target.value)}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label small">Strength notes</label>
          <input
            className="form-control form-control-sm"
            value={profile.strengthOverrideNote ?? ""}
            onChange={(e) => onField("strengthOverrideNote", e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label small">Unit</label>
          <input className="form-control form-control-sm" value={profile.unit ?? ""} onChange={(e) => onField("unit", e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label small">Route</label>
          <input className="form-control form-control-sm" value={profile.route ?? ""} onChange={(e) => onField("route", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

export function MedicineBrandManufacturerSection({ profile, onField }: Pf) {
  return (
    <div className="card radius-12 mb-3">
      <div className="card-header py-2">
        <h6 className="mb-0 small fw-semibold">Brand & manufacturer (overrides)</h6>
      </div>
      <div className="card-body row g-2">
        <div className="col-md-6">
          <label className="form-label small">Manufacturer display override</label>
          <input
            className="form-control form-control-sm"
            value={profile.manufacturerDisplayOverride ?? ""}
            onChange={(e) => onField("manufacturerDisplayOverride", e.target.value)}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label small">Importer / distributor</label>
          <input
            className="form-control form-control-sm"
            value={profile.importerDistributor ?? ""}
            onChange={(e) => onField("importerDistributor", e.target.value)}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label small">Origin country (code)</label>
          <input
            className="form-control form-control-sm"
            value={profile.originCountryCode ?? ""}
            onChange={(e) => onField("originCountryCode", e.target.value)}
            placeholder="e.g. BD"
          />
        </div>
      </div>
    </div>
  );
}

export function MedicinePackagingSection({ profile, onField }: Pf) {
  return (
    <div className="card radius-12 mb-3">
      <div className="card-header py-2">
        <h6 className="mb-0 small fw-semibold">Packaging</h6>
      </div>
      <div className="card-body row g-2">
        <div className="col-md-4">
          <label className="form-label small">Pack size</label>
          <input className="form-control form-control-sm" value={profile.packSize ?? ""} onChange={(e) => onField("packSize", e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small">Pack unit</label>
          <input className="form-control form-control-sm" value={profile.packUnit ?? ""} onChange={(e) => onField("packUnit", e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small">Container type</label>
          <input
            className="form-control form-control-sm"
            value={profile.containerType ?? ""}
            onChange={(e) => onField("containerType", e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label small">Barcode</label>
          <input className="form-control form-control-sm" value={profile.barcode ?? ""} onChange={(e) => onField("barcode", e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small">SKU</label>
          <input className="form-control form-control-sm" value={profile.sku ?? ""} onChange={(e) => onField("sku", e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small">Internal code</label>
          <input
            className="form-control form-control-sm"
            value={profile.internalCode ?? ""}
            onChange={(e) => onField("internalCode", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export function MedicineRegulatorySection({ profile, onField }: Pf) {
  return (
    <div className="card radius-12 mb-3">
      <div className="card-header py-2">
        <h6 className="mb-0 small fw-semibold">Regulatory / catalog</h6>
      </div>
      <div className="card-body row g-2">
        <div className="col-md-6">
          <label className="form-label small">Registration number</label>
          <input
            className="form-control form-control-sm"
            value={profile.registrationNumber ?? ""}
            onChange={(e) => onField("registrationNumber", e.target.value)}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label small">Approval status</label>
          <input
            className="form-control form-control-sm"
            value={profile.approvalStatus ?? ""}
            onChange={(e) => onField("approvalStatus", e.target.value)}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label small">Approval date</label>
          <input type="date" className="form-control form-control-sm" value={profile.approvalDate ?? ""} onChange={(e) => onField("approvalDate", e.target.value)} />
        </div>
        <div className="col-md-6">
          <label className="form-label small">Expiry date</label>
          <input type="date" className="form-control form-control-sm" value={profile.expiryDate ?? ""} onChange={(e) => onField("expiryDate", e.target.value)} />
        </div>
        <div className="col-12">
          <label className="form-label small">Source / catalog metadata</label>
          <textarea
            className="form-control form-control-sm"
            rows={2}
            value={profile.catalogSourceNote ?? ""}
            onChange={(e) => onField("catalogSourceNote", e.target.value)}
          />
        </div>
        <div className="col-12">
          <label className="form-label small">Review / conflict flags</label>
          <textarea
            className="form-control form-control-sm"
            rows={2}
            value={profile.conflictFlagsNote ?? ""}
            onChange={(e) => onField("conflictFlagsNote", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export function MedicineClinicalSection({ profile, onField }: Pf) {
  return (
    <div className="card radius-12 mb-3">
      <div className="card-header py-2">
        <h6 className="mb-0 small fw-semibold">Clinical / use</h6>
      </div>
      <div className="card-body row g-2">
        {(["indications", "contraindications", "sideEffects", "warnings", "storage", "doseNotes"] as const).map((k) => (
          <div className="col-12" key={k}>
            <label className="form-label small text-capitalize">{k.replace(/([A-Z])/g, " $1")}</label>
            <textarea className="form-control form-control-sm" rows={2} value={profile[k] ?? ""} onChange={(e) => onField(k, e.target.value)} />
          </div>
        ))}
        <div className="col-12">
          <label className="form-label small">Species applicability</label>
          <textarea
            className="form-control form-control-sm"
            rows={2}
            value={profile.speciesApplicability ?? ""}
            onChange={(e) => onField("speciesApplicability", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export function MedicineCommercialSection({ profile, onField }: Pf) {
  return (
    <div className="card radius-12 mb-3">
      <div className="card-header py-2">
        <h6 className="mb-0 small fw-semibold">Commercial</h6>
      </div>
      <div className="card-body row g-2">
        <div className="col-md-4">
          <label className="form-label small">MRP</label>
          <input className="form-control form-control-sm" value={profile.mrp ?? ""} onChange={(e) => onField("mrp", e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small">Trade price</label>
          <input
            className="form-control form-control-sm"
            value={profile.tradePrice ?? ""}
            onChange={(e) => onField("tradePrice", e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label small">Purchase price</label>
          <input
            className="form-control form-control-sm"
            value={profile.purchasePrice ?? ""}
            onChange={(e) => onField("purchasePrice", e.target.value)}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label small">Tax / VAT note</label>
          <input className="form-control form-control-sm" value={profile.taxVat ?? ""} onChange={(e) => onField("taxVat", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

export function MedicineFilesSection({ profile, onField }: Pf) {
  return (
    <div className="card radius-12 mb-3">
      <div className="card-header py-2">
        <h6 className="mb-0 small fw-semibold">Files & attachments</h6>
      </div>
      <div className="card-body">
        <label className="form-label small">URLs (images, leaflet, PDFs — one per line)</label>
        <textarea
          className="form-control form-control-sm font-monospace"
          rows={4}
          value={profile.attachmentUrls ?? ""}
          onChange={(e) => onField("attachmentUrls", e.target.value)}
          placeholder="https://..."
        />
      </div>
    </div>
  );
}

export function MedicineGovernanceSection({ profile, onField }: Pf) {
  return (
    <div className="card radius-12 mb-3">
      <div className="card-header py-2">
        <h6 className="mb-0 small fw-semibold">Governance</h6>
      </div>
      <div className="card-body row g-2">
        <div className="col-12">
          <label className="form-label small">Reviewer notes</label>
          <textarea
            className="form-control form-control-sm"
            rows={2}
            value={profile.reviewerNotes ?? ""}
            onChange={(e) => onField("reviewerNotes", e.target.value)}
          />
        </div>
        <div className="col-12">
          <label className="form-label small">Change / audit reason</label>
          <textarea
            className="form-control form-control-sm"
            rows={2}
            value={profile.changeReason ?? ""}
            onChange={(e) => onField("changeReason", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
