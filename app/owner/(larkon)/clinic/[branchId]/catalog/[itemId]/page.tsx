"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ownerClinicItemById,
  ownerClinicItemUpdate,
  ownerClinicItemVariantCreate,
  ownerClinicItemVariantUpdate,
  ownerClinicItemMediaUpload,
  ownerClinicItemMediaDelete,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

const ClinicCatalogNewPage = dynamic(() => import("../new/page"), { ssr: false });

type VariantRow = {
  id: number;
  variantName: string;
  sku?: string | null;
  barcode?: string | null;
  unitLabel?: string | null;
  packSize?: string | null;
  strengthOrSpec?: string | null;
  defaultCost?: number | null;
  defaultSalePrice?: number | null;
  isActive?: boolean;
};

type MedicineProfile = {
  id?: number;
  genericName?: string | null;
  dosageForm?: string | null;
  strength?: string | null;
  route?: string | null;
  pharmacologyClass?: string | null;
  requiresPrescription?: boolean;
  controlledSubstance?: boolean;
  dispenseUnit?: string | null;
  batchMandatory?: boolean;
  expiryMandatory?: boolean;
};
type ConsumableProfile = {
  id?: number;
  consumableType?: string;
  sterileRequired?: boolean;
  singleUseOnly?: boolean;
  procedureLinked?: boolean;
  wastageTrackRequired?: boolean;
  issueUnit?: string | null;
  usageNoteTemplate?: string | null;
};
type InstrumentProfile = {
  id?: number;
  instrumentType?: string;
  sterilizationRequired?: boolean;
  maintenanceRequired?: boolean;
  assetTrackingRequired?: boolean;
  issueReturnRequired?: boolean;
  serviceCycleDays?: number | null;
  serialTracking?: boolean;
};

type ItemDetail = {
  id: number;
  itemCode: string;
  name: string;
  slug?: string;
  domainType: string;
  categoryId?: number | null;
  baseUnit?: string | null;
  description?: string | null;
  brandName?: string | null;
  manufacturerName?: string | null;
  isActive?: boolean;
  isPackageEligible?: boolean;
  defaultCost?: number | null;
  defaultSalePrice?: number | null;
  category?: { id: number; name: string };
  variants?: VariantRow[];
  medicineProfile?: MedicineProfile | null;
  consumableProfile?: ConsumableProfile | null;
  instrumentProfile?: InstrumentProfile | null;
  media?: Array<{ id: number; mediaUrl: string; sortOrder: number }>;
};

const CONSUMABLE_TYPE_OPTIONS = ["SUTURE", "BLADE", "GAUZE", "SYRINGE", "GLOVE", "IV_SET", "DRESSING", "OT_DISPOSABLE", "OTHER"];
const INSTRUMENT_TYPE_OPTIONS = ["SCISSORS", "FORCEPS", "CLAMP", "HOLDER", "RETRACTOR", "SCALPEL", "OTHER"];

export default function ClinicCatalogItemPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const itemId = params?.itemId as string | undefined;

  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", baseUnit: "", description: "", brandName: "", manufacturerName: "" });
  const [medicineProfile, setMedicineProfile] = useState<MedicineProfile>({});
  const [consumableProfile, setConsumableProfile] = useState<ConsumableProfile>({});
  const [instrumentProfile, setInstrumentProfile] = useState<InstrumentProfile>({});
  const [variantModal, setVariantModal] = useState<{ mode: "create" | "edit"; variant: VariantRow | null } | null>(null);

  const load = async () => {
    if (!branchId || !itemId || itemId === "new") return;
    try {
      setLoading(true);
      setError("");
      const data = await ownerClinicItemById(branchId, itemId);
      setItem((data ?? null) as ItemDetail | null);
      if (data) {
        const d = data as ItemDetail;
        setForm({
          name: d.name ?? "",
          baseUnit: d.baseUnit ?? "",
          description: d.description ?? "",
          brandName: d.brandName ?? "",
          manufacturerName: d.manufacturerName ?? "",
        });
        if (d.medicineProfile) setMedicineProfile(d.medicineProfile);
        else setMedicineProfile({});
        if (d.consumableProfile) setConsumableProfile(d.consumableProfile);
        else setConsumableProfile({});
        if (d.instrumentProfile) setInstrumentProfile(d.instrumentProfile);
        else setInstrumentProfile({});
      }
    } catch (e) {
      setError((e as Error)?.message || "Failed to load item");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [branchId, itemId]);

  if (itemId === "new") return <ClinicCatalogNewPage />;

  const handleSave = async () => {
    if (!branchId || !itemId || !item) return;
    try {
      setError("");
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        baseUnit: form.baseUnit.trim() || null,
        description: form.description.trim() || null,
        brandName: form.brandName.trim() || null,
        manufacturerName: form.manufacturerName.trim() || null,
      };
      if (item.domainType === "MEDICINE") {
        payload.medicineProfile = {
          genericName: medicineProfile.genericName ?? undefined,
          dosageForm: medicineProfile.dosageForm ?? undefined,
          strength: medicineProfile.strength ?? undefined,
          route: medicineProfile.route ?? undefined,
          pharmacologyClass: medicineProfile.pharmacologyClass ?? undefined,
          requiresPrescription: medicineProfile.requiresPrescription ?? false,
          controlledSubstance: medicineProfile.controlledSubstance ?? false,
          dispenseUnit: medicineProfile.dispenseUnit ?? undefined,
          batchMandatory: medicineProfile.batchMandatory !== false,
          expiryMandatory: medicineProfile.expiryMandatory !== false,
        };
      }
      if (["SURGICAL_CONSUMABLE", "DRESSING_SUPPLY", "CLINIC_SUPPLY"].includes(item.domainType)) {
        payload.consumableProfile = {
          consumableType: consumableProfile.consumableType ?? "OTHER",
          sterileRequired: consumableProfile.sterileRequired ?? false,
          singleUseOnly: consumableProfile.singleUseOnly !== false,
          procedureLinked: consumableProfile.procedureLinked ?? false,
          wastageTrackRequired: consumableProfile.wastageTrackRequired ?? false,
          issueUnit: consumableProfile.issueUnit ?? undefined,
          usageNoteTemplate: consumableProfile.usageNoteTemplate ?? undefined,
        };
      }
      if (item.domainType === "INSTRUMENT") {
        payload.instrumentProfile = {
          instrumentType: instrumentProfile.instrumentType ?? "OTHER",
          sterilizationRequired: instrumentProfile.sterilizationRequired !== false,
          maintenanceRequired: instrumentProfile.maintenanceRequired ?? false,
          assetTrackingRequired: instrumentProfile.assetTrackingRequired ?? false,
          issueReturnRequired: instrumentProfile.issueReturnRequired !== false,
          serviceCycleDays: instrumentProfile.serviceCycleDays ?? undefined,
          serialTracking: instrumentProfile.serialTracking ?? false,
        };
      }
      await ownerClinicItemUpdate(branchId, itemId, payload);
      setSuccess("Saved.");
      setEditing(false);
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to update");
    }
  };

  if (!branchId || !itemId) {
    return <div className="dashboard-main-body"><div className="alert alert-warning radius-12">Invalid branch or item.</div></div>;
  }
  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12"><div className="card-body text-center py-5"><div className="spinner-border text-primary" /><p className="text-muted mt-2 mb-0">Loading…</p></div></div>
      </div>
    );
  }
  if (!item) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Item not found.</div>
        <Link href={`/owner/clinic/${branchId}/catalog`} className="btn btn-outline-primary radius-12 mt-2">Back to catalog</Link>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={item.name}
        subtitle={item.itemCode}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Catalog", href: `/owner/clinic/${branchId}/catalog` },
          { label: item.name, href: `/owner/clinic/${branchId}/catalog/${itemId}` },
        ]}
        actions={[
          <Link key="back" href={`/owner/clinic/${branchId}/catalog`} className="btn btn-outline-secondary radius-12">Back to catalog</Link>,
        ]}
      />
  
      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      {success && <div className="alert alert-success radius-12 mb-3">{success}</div>}

      <div className="card radius-12">
        <div className="card-body p-24">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0 fw-semibold">Item details</h6>
            {!editing ? (
              <button type="button" className="btn btn-sm btn-outline-primary radius-8" onClick={() => setEditing(true)}>Edit</button>
            ) : (
              <div className="d-flex gap-1">
                <button type="button" className="btn btn-sm btn-primary radius-8" onClick={handleSave}>Save</button>
                <button type="button" className="btn btn-sm btn-outline-secondary radius-8" onClick={() => { setEditing(false); setForm({ name: item.name ?? "", baseUnit: item.baseUnit ?? "", description: item.description ?? "", brandName: item.brandName ?? "", manufacturerName: item.manufacturerName ?? "" }); if (item.medicineProfile) setMedicineProfile(item.medicineProfile); else setMedicineProfile({}); if (item.consumableProfile) setConsumableProfile(item.consumableProfile); else setConsumableProfile({}); if (item.instrumentProfile) setInstrumentProfile(item.instrumentProfile); else setInstrumentProfile({}); }}>Cancel</button>
              </div>
            )}
          </div>
          {!editing ? (
            <>
              <dl className="row mb-0 small">
                <dt className="col-sm-3">Code</dt><dd className="col-sm-9"><code>{item.itemCode}</code></dd>
                <dt className="col-sm-3">Name</dt><dd className="col-sm-9">{item.name}</dd>
                <dt className="col-sm-3">Type</dt><dd className="col-sm-9">{item.domainType}</dd>
                <dt className="col-sm-3">Category</dt><dd className="col-sm-9">{item.category?.name ?? "—"}</dd>
                <dt className="col-sm-3">Base unit</dt><dd className="col-sm-9">{item.baseUnit ?? "—"}</dd>
                <dt className="col-sm-3">Description</dt><dd className="col-sm-9">{item.description ?? "—"}</dd>
                <dt className="col-sm-3">Status</dt><dd className="col-sm-9"><span className={`badge ${item.isActive ? "bg-success" : "bg-secondary"}`}>{item.isActive ? "Active" : "Inactive"}</span></dd>
              </dl>
              {item.domainType === "MEDICINE" && item.medicineProfile && (
                <div className="mt-3 pt-3 border-top small">
                  <h6 className="fw-semibold">Medicine profile</h6>
                  <p className="mb-0 text-muted">
                    {[item.medicineProfile.genericName, item.medicineProfile.dosageForm, item.medicineProfile.strength, item.medicineProfile.route].filter(Boolean).join(" · ") || "—"}
                    {item.medicineProfile.requiresPrescription && " · Rx required"}
                  </p>
                </div>
              )}
              {["SURGICAL_CONSUMABLE", "DRESSING_SUPPLY", "CLINIC_SUPPLY"].includes(item.domainType) && item.consumableProfile && (
                <div className="mt-3 pt-3 border-top small">
                  <h6 className="fw-semibold">Consumable profile</h6>
                  <p className="mb-0 text-muted">Type: {item.consumableProfile.consumableType ?? "—"} {item.consumableProfile.sterileRequired && "· Sterile required"}</p>
                </div>
              )}
              {item.domainType === "INSTRUMENT" && item.instrumentProfile && (
                <div className="mt-3 pt-3 border-top small">
                  <h6 className="fw-semibold">Instrument profile</h6>
                  <p className="mb-0 text-muted">Type: {item.instrumentProfile.instrumentType ?? "—"} {item.instrumentProfile.sterilizationRequired !== false && "· Sterilization required"}</p>
                </div>
              )}
            </>
          ) : (
            <div className="small">
              <div className="mb-2"><label className="form-label mb-0">Name</label><input type="text" className="form-control form-control-sm radius-8" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div className="mb-2"><label className="form-label mb-0">Base unit</label><input type="text" className="form-control form-control-sm radius-8" value={form.baseUnit} onChange={(e) => setForm((f) => ({ ...f, baseUnit: e.target.value }))} /></div>
              <div className="mb-2"><label className="form-label mb-0">Description</label><textarea className="form-control form-control-sm radius-8" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
              <div className="mb-2"><label className="form-label mb-0">Brand</label><input type="text" className="form-control form-control-sm radius-8" value={form.brandName} onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))} /></div>
              <div className="mb-2"><label className="form-label mb-0">Manufacturer</label><input type="text" className="form-control form-control-sm radius-8" value={form.manufacturerName} onChange={(e) => setForm((f) => ({ ...f, manufacturerName: e.target.value }))} /></div>
              {item.domainType === "MEDICINE" && (
                <div className="card radius-8 mt-3 p-3 bg-light">
                  <h6 className="small fw-semibold mb-2">Medicine profile</h6>
                  <div className="row g-2 small">
                    <div className="col-6"><label className="form-label mb-0">Generic name</label><input type="text" className="form-control form-control-sm" value={medicineProfile.genericName ?? ""} onChange={(e) => setMedicineProfile((p) => ({ ...p, genericName: e.target.value }))} /></div>
                    <div className="col-6"><label className="form-label mb-0">Dosage form</label><input type="text" className="form-control form-control-sm" value={medicineProfile.dosageForm ?? ""} onChange={(e) => setMedicineProfile((p) => ({ ...p, dosageForm: e.target.value }))} /></div>
                    <div className="col-6"><label className="form-label mb-0">Strength</label><input type="text" className="form-control form-control-sm" value={medicineProfile.strength ?? ""} onChange={(e) => setMedicineProfile((p) => ({ ...p, strength: e.target.value }))} /></div>
                    <div className="col-6"><label className="form-label mb-0">Route</label><input type="text" className="form-control form-control-sm" value={medicineProfile.route ?? ""} onChange={(e) => setMedicineProfile((p) => ({ ...p, route: e.target.value }))} /></div>
                    <div className="col-12 d-flex gap-2 flex-wrap">
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={medicineProfile.requiresPrescription ?? false} onChange={(e) => setMedicineProfile((p) => ({ ...p, requiresPrescription: e.target.checked }))} /><label className="form-check-label">Rx</label></div>
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={medicineProfile.batchMandatory !== false} onChange={(e) => setMedicineProfile((p) => ({ ...p, batchMandatory: e.target.checked }))} /><label className="form-check-label">Batch mandatory</label></div>
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={medicineProfile.expiryMandatory !== false} onChange={(e) => setMedicineProfile((p) => ({ ...p, expiryMandatory: e.target.checked }))} /><label className="form-check-label">Expiry mandatory</label></div>
                    </div>
                  </div>
                </div>
              )}
              {["SURGICAL_CONSUMABLE", "DRESSING_SUPPLY", "CLINIC_SUPPLY"].includes(item.domainType) && (
                <div className="card radius-8 mt-3 p-3 bg-light">
                  <h6 className="small fw-semibold mb-2">Consumable profile</h6>
                  <div className="row g-2 small">
                    <div className="col-6"><label className="form-label mb-0">Type</label><select className="form-select form-select-sm" value={consumableProfile.consumableType ?? "OTHER"} onChange={(e) => setConsumableProfile((p) => ({ ...p, consumableType: e.target.value }))}>{CONSUMABLE_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
                    <div className="col-12 d-flex gap-2 flex-wrap">
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={consumableProfile.sterileRequired ?? false} onChange={(e) => setConsumableProfile((p) => ({ ...p, sterileRequired: e.target.checked }))} /><label className="form-check-label">Sterile required</label></div>
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={consumableProfile.singleUseOnly !== false} onChange={(e) => setConsumableProfile((p) => ({ ...p, singleUseOnly: e.target.checked }))} /><label className="form-check-label">Single use only</label></div>
                    </div>
                  </div>
                </div>
              )}
              {item.domainType === "INSTRUMENT" && (
                <div className="card radius-8 mt-3 p-3 bg-light">
                  <h6 className="small fw-semibold mb-2">Instrument profile</h6>
                  <div className="row g-2 small">
                    <div className="col-6"><label className="form-label mb-0">Type</label><select className="form-select form-select-sm" value={instrumentProfile.instrumentType ?? "OTHER"} onChange={(e) => setInstrumentProfile((p) => ({ ...p, instrumentType: e.target.value }))}>{INSTRUMENT_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
                    <div className="col-12 d-flex gap-2 flex-wrap">
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={instrumentProfile.sterilizationRequired !== false} onChange={(e) => setInstrumentProfile((p) => ({ ...p, sterilizationRequired: e.target.checked }))} /><label className="form-check-label">Sterilization required</label></div>
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={instrumentProfile.maintenanceRequired ?? false} onChange={(e) => setInstrumentProfile((p) => ({ ...p, maintenanceRequired: e.target.checked }))} /><label className="form-check-label">Maintenance required</label></div>
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={instrumentProfile.issueReturnRequired !== false} onChange={(e) => setInstrumentProfile((p) => ({ ...p, issueReturnRequired: e.target.checked }))} /><label className="form-check-label">Issue/return required</label></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {item.media && item.media.length > 0 && (
        <div className="card radius-12 mt-4">
          <div className="card-header bg-transparent p-24 d-flex justify-content-between align-items-center">
            <h6 className="mb-0 fw-semibold">Media</h6>
            <label className="btn btn-sm btn-outline-primary radius-8 mb-0">
              <i className="ri-upload-line me-1" /> Upload
              <input
                type="file"
                className="d-none"
                accept="image/*,.pdf"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !branchId || !itemId) return;
                  e.target.value = "";
                  try {
                    await ownerClinicItemMediaUpload(branchId, itemId, file);
                    await load();
                  } catch (err) {
                    setError((err as Error)?.message ?? "Upload failed");
                  }
                }}
              />
            </label>
          </div>
          <div className="card-body p-24 pt-0">
            <div className="d-flex flex-wrap gap-3">
              {item.media.map((m) => (
                <div key={m.id} className="position-relative border radius-8 overflow-hidden" style={{ width: 120, height: 120 }}>
                  {m.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={m.mediaUrl} alt="" className="w-100 h-100 object-fit-cover" />
                  ) : (
                    <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className="d-flex align-items-center justify-content-center w-100 h-100 bg-light text-dark">
                      <i className="ri-file-line fs-2" />
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 radius-8"
                    title="Remove"
                    onClick={async () => {
                      if (!branchId || !itemId) return;
                      try {
                        await ownerClinicItemMediaDelete(branchId, itemId, m.id);
                        await load();
                      } catch (err) {
                        setError((err as Error)?.message ?? "Delete failed");
                      }
                    }}
                  >
                    <i className="ri-close-line" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(!item.media || item.media.length === 0) && (
        <div className="card radius-12 mt-4">
          <div className="card-body p-24">
            <h6 className="fw-semibold mb-2">Media</h6>
            <p className="text-muted small mb-2">Add images or documents for this item.</p>
            <label className="btn btn-sm btn-outline-primary radius-8">
              <i className="ri-upload-line me-1" /> Upload file
              <input
                type="file"
                className="d-none"
                accept="image/*,.pdf"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !branchId || !itemId) return;
                  e.target.value = "";
                  try {
                    await ownerClinicItemMediaUpload(branchId, itemId, file);
                    await load();
                  } catch (err) {
                    setError((err as Error)?.message ?? "Upload failed");
                  }
                }}
              />
            </label>
          </div>
        </div>
      )}

      <div className="card radius-12 mt-4">
        <div className="card-header bg-transparent p-24 d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-semibold">Variants</h6>
          <button
            type="button"
            className="btn btn-sm btn-primary radius-8"
            onClick={() => setVariantModal({ mode: "create", variant: null })}
          >
            <i className="ri-add-line me-1" /> New variant
          </button>
        </div>
        <div className="card-body p-24 pt-0">
          {item.variants && item.variants.length > 0 ? (
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Variant name</th>
                  <th>SKU</th>
                  <th>Pack / strength</th>
                  <th>Cost</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {item.variants.map((v) => (
                  <tr key={v.id}>
                    <td>{v.variantName}</td>
                    <td><code className="small">{v.sku ?? "—"}</code></td>
                    <td>{[v.packSize, v.strengthOrSpec].filter(Boolean).join(" · ") || "—"}</td>
                    <td>{v.defaultCost != null ? `৳${Number(v.defaultCost).toLocaleString()}` : "—"}</td>
                    <td>{v.defaultSalePrice != null ? `৳${Number(v.defaultSalePrice).toLocaleString()}` : "—"}</td>
                    <td><span className={`badge radius-8 ${v.isActive !== false ? "bg-success" : "bg-secondary"}`}>{v.isActive !== false ? "Active" : "Inactive"}</span></td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary radius-8"
                        onClick={() => setVariantModal({ mode: "edit", variant: v })}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted mb-0">No variants. Add one to set pack sizes, strength, cost and price.</p>
          )}
        </div>
      </div>

      {variantModal && (
        <VariantModal
          key={`${variantModal.mode}-${variantModal.variant?.id ?? "new"}`}
          branchId={branchId}
          itemId={itemId}
          mode={variantModal.mode}
          variant={variantModal.variant}
          onClose={() => setVariantModal(null)}
          onSaved={() => {
            setVariantModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}

type VariantForm = {
  variantName: string;
  sku: string;
  barcode: string;
  unitLabel: string;
  packSize: string;
  strengthOrSpec: string;
  defaultCost: string;
  defaultSalePrice: string;
  isActive: boolean;
};

function VariantModal({
  branchId,
  itemId,
  mode,
  variant,
  onClose,
  onSaved,
}: {
  branchId: string;
  itemId: string;
  mode: "create" | "edit";
  variant: VariantRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<VariantForm>({
    variantName: variant?.variantName ?? "",
    sku: variant?.sku ?? "",
    barcode: variant?.barcode ?? "",
    unitLabel: variant?.unitLabel ?? "",
    packSize: variant?.packSize ?? "",
    strengthOrSpec: variant?.strengthOrSpec ?? "",
    defaultCost: variant?.defaultCost != null ? String(variant.defaultCost) : "",
    defaultSalePrice: variant?.defaultSalePrice != null ? String(variant.defaultSalePrice) : "",
    isActive: variant?.isActive !== false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const num = (s: string) => (s.trim() === "" ? undefined : parseFloat(s));
      if (mode === "create") {
        await ownerClinicItemVariantCreate(branchId, itemId, {
          variantName: form.variantName.trim(),
          sku: form.sku.trim() || undefined,
          barcode: form.barcode.trim() || undefined,
          unitLabel: form.unitLabel.trim() || undefined,
          packSize: form.packSize.trim() || undefined,
          strengthOrSpec: form.strengthOrSpec.trim() || undefined,
          defaultCost: num(form.defaultCost) ?? undefined,
          defaultSalePrice: num(form.defaultSalePrice) ?? undefined,
        });
      } else if (variant) {
        await ownerClinicItemVariantUpdate(branchId, itemId, String(variant.id), {
          variantName: form.variantName.trim(),
          sku: form.sku.trim() || undefined,
          barcode: form.barcode.trim() || undefined,
          unitLabel: form.unitLabel.trim() || undefined,
          packSize: form.packSize.trim() || undefined,
          strengthOrSpec: form.strengthOrSpec.trim() || undefined,
          defaultCost: num(form.defaultCost) ?? undefined,
          defaultSalePrice: num(form.defaultSalePrice) ?? undefined,
          isActive: form.isActive,
        });
      }
      onSaved();
    } catch (e) {
      setError((e as Error)?.message ?? "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content radius-12">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">{mode === "create" ? "New variant" : "Edit variant"}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger radius-8">{error}</div>}
              <div className="mb-3">
                <label className="form-label">Variant name</label>
                <input
                  type="text"
                  className="form-control radius-8"
                  value={form.variantName}
                  onChange={(e) => setForm((f) => ({ ...f, variantName: e.target.value }))}
                  required
                />
              </div>
              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label">SKU</label>
                  <input
                    type="text"
                    className="form-control radius-8"
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label">Barcode</label>
                  <input
                    type="text"
                    className="form-control radius-8"
                    value={form.barcode}
                    onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                  />
                </div>
              </div>
              <div className="row g-2 mt-1">
                <div className="col-6">
                  <label className="form-label">Pack size</label>
                  <input
                    type="text"
                    className="form-control radius-8"
                    placeholder="e.g. 10ml, 100 tablets"
                    value={form.packSize}
                    onChange={(e) => setForm((f) => ({ ...f, packSize: e.target.value }))}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label">Strength / spec</label>
                  <input
                    type="text"
                    className="form-control radius-8"
                    placeholder="e.g. 500mg, 0.5%"
                    value={form.strengthOrSpec}
                    onChange={(e) => setForm((f) => ({ ...f, strengthOrSpec: e.target.value }))}
                  />
                </div>
              </div>
              <div className="row g-2 mt-1">
                <div className="col-6">
                  <label className="form-label">Unit label</label>
                  <input
                    type="text"
                    className="form-control radius-8"
                    placeholder="e.g. vial, box"
                    value={form.unitLabel}
                    onChange={(e) => setForm((f) => ({ ...f, unitLabel: e.target.value }))}
                  />
                </div>
              </div>
              <div className="row g-2 mt-1">
                <div className="col-6">
                  <label className="form-label">Default cost (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control radius-8"
                    value={form.defaultCost}
                    onChange={(e) => setForm((f) => ({ ...f, defaultCost: e.target.value }))}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label">Default sale price (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control radius-8"
                    value={form.defaultSalePrice}
                    onChange={(e) => setForm((f) => ({ ...f, defaultSalePrice: e.target.value }))}
                  />
                </div>
              </div>
              {mode === "edit" && (
                <div className="form-check mt-3">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="variant-active"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="variant-active">Active</label>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary radius-8" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary radius-8" disabled={submitting || !form.variantName.trim()}>
                {submitting ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
