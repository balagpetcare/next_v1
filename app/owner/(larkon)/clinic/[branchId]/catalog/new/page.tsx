"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ownerClinicItemCreate, ownerClinicItemCategoriesList } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

const DOMAIN_OPTIONS = [
  { value: "MEDICINE", label: "Medicine" },
  { value: "SURGICAL_CONSUMABLE", label: "Surgical consumable" },
  { value: "DRESSING_SUPPLY", label: "Dressing supply" },
  { value: "CLINIC_SUPPLY", label: "Clinic supply" },
  { value: "INSTRUMENT", label: "Instrument" },
  { value: "IMPLANT", label: "Implant" },
  { value: "SERVICE_SUPPORT", label: "Service support" },
  { value: "PACKAGE_ONLY", label: "Package only" },
];

const CONSUMABLE_TYPE_OPTIONS = [
  "SUTURE", "BLADE", "GAUZE", "SYRINGE", "GLOVE", "IV_SET", "DRESSING", "OT_DISPOSABLE", "OTHER",
];
const INSTRUMENT_TYPE_OPTIONS = [
  "SCISSORS", "FORCEPS", "CLAMP", "HOLDER", "RETRACTOR", "SCALPEL", "OTHER",
];

export default function ClinicCatalogNewPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params?.branchId as string | undefined;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [form, setForm] = useState({
    name: "",
    domainType: "SURGICAL_CONSUMABLE",
    categoryId: "" as string | number,
    baseUnit: "",
    description: "",
  });
  const [medicineProfile, setMedicineProfile] = useState({
    genericName: "", dosageForm: "", strength: "", route: "", pharmacologyClass: "",
    requiresPrescription: false, controlledSubstance: false, dispenseUnit: "",
    batchMandatory: true, expiryMandatory: true,
  });
  const [consumableProfile, setConsumableProfile] = useState({
    consumableType: "OTHER", sterileRequired: false, singleUseOnly: true,
    procedureLinked: false, wastageTrackRequired: false, issueUnit: "", usageNoteTemplate: "",
  });
  const [instrumentProfile, setInstrumentProfile] = useState({
    instrumentType: "OTHER", sterilizationRequired: true, maintenanceRequired: false,
    assetTrackingRequired: false, issueReturnRequired: true, serviceCycleDays: "" as string | number,
    serialTracking: false,
  });

  useEffect(() => {
    if (!branchId) return;
    ownerClinicItemCategoriesList(branchId).then((list) =>
      setCategories((list as Array<{ id: number; name: string }>) ?? [])
    );
  }, [branchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !form.name.trim()) return;
    try {
      setLoading(true);
      setError("");
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        domainType: form.domainType,
      };
      if (form.categoryId) payload.categoryId = typeof form.categoryId === "string" ? parseInt(form.categoryId, 10) : form.categoryId;
      if (form.baseUnit.trim()) payload.baseUnit = form.baseUnit.trim();
      if (form.description.trim()) payload.description = form.description.trim();
      if (form.domainType === "MEDICINE") {
        payload.medicineProfile = {
          genericName: medicineProfile.genericName.trim() || undefined,
          dosageForm: medicineProfile.dosageForm.trim() || undefined,
          strength: medicineProfile.strength.trim() || undefined,
          route: medicineProfile.route.trim() || undefined,
          pharmacologyClass: medicineProfile.pharmacologyClass.trim() || undefined,
          requiresPrescription: medicineProfile.requiresPrescription,
          controlledSubstance: medicineProfile.controlledSubstance,
          dispenseUnit: medicineProfile.dispenseUnit.trim() || undefined,
          batchMandatory: medicineProfile.batchMandatory,
          expiryMandatory: medicineProfile.expiryMandatory,
        };
      }
      if (["SURGICAL_CONSUMABLE", "DRESSING_SUPPLY", "CLINIC_SUPPLY"].includes(form.domainType)) {
        payload.consumableProfile = {
          consumableType: consumableProfile.consumableType,
          sterileRequired: consumableProfile.sterileRequired,
          singleUseOnly: consumableProfile.singleUseOnly,
          procedureLinked: consumableProfile.procedureLinked,
          wastageTrackRequired: consumableProfile.wastageTrackRequired,
          issueUnit: consumableProfile.issueUnit.trim() || undefined,
          usageNoteTemplate: consumableProfile.usageNoteTemplate.trim() || undefined,
        };
      }
      if (form.domainType === "INSTRUMENT") {
        payload.instrumentProfile = {
          instrumentType: instrumentProfile.instrumentType,
          sterilizationRequired: instrumentProfile.sterilizationRequired,
          maintenanceRequired: instrumentProfile.maintenanceRequired,
          assetTrackingRequired: instrumentProfile.assetTrackingRequired,
          issueReturnRequired: instrumentProfile.issueReturnRequired,
          serviceCycleDays: instrumentProfile.serviceCycleDays === "" ? undefined : Number(instrumentProfile.serviceCycleDays),
          serialTracking: instrumentProfile.serialTracking,
        };
      }
      const created = await ownerClinicItemCreate(branchId, payload);
      const id = (created as { id?: number })?.id;
      if (id) router.push(`/owner/clinic/${branchId}/catalog/${id}`);
      else router.push(`/owner/clinic/${branchId}/catalog`);
    } catch (e) {
      setError((e as Error)?.message || "Failed to create item");
    } finally {
      setLoading(false);
    }
  };

  if (!branchId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="New clinical item"
        subtitle="Add an item to the catalog"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Catalog", href: `/owner/clinic/${branchId}/catalog` },
          { label: "New", href: `/owner/clinic/${branchId}/catalog/new` },
        ]}
        actions={[
          <Link key="back" href={`/owner/clinic/${branchId}/catalog`} className="btn btn-outline-secondary radius-12">Back to catalog</Link>,
        ]}
      />
  
      <div className="card radius-12">
        <div className="card-body p-24">
          {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Name *</label>
              <input type="text" className="form-control radius-8" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Catgut suture" />
            </div>
            <div className="mb-3">
              <label className="form-label">Domain type *</label>
              <select className="form-select radius-8" value={form.domainType} onChange={(e) => setForm((f) => ({ ...f, domainType: e.target.value }))}>
                {DOMAIN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Category</label>
              <select className="form-select radius-8" value={String(form.categoryId)} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
                <option value="">—</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Base unit</label>
              <input type="text" className="form-control radius-8" value={form.baseUnit} onChange={(e) => setForm((f) => ({ ...f, baseUnit: e.target.value }))} placeholder="e.g. pcs, box" />
            </div>
            <div className="mb-4">
              <label className="form-label">Description</label>
              <textarea className="form-control radius-8" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>

            {form.domainType === "MEDICINE" && (
              <div className="card radius-12 mb-4">
                <div className="card-header bg-light"><h6 className="mb-0">Medicine profile</h6></div>
                <div className="card-body">
                  <div className="row g-2">
                    <div className="col-md-6"><label className="form-label">Generic name</label><input type="text" className="form-control radius-8" value={medicineProfile.genericName} onChange={(e) => setMedicineProfile((p) => ({ ...p, genericName: e.target.value }))} /></div>
                    <div className="col-md-6"><label className="form-label">Dosage form</label><input type="text" className="form-control radius-8" value={medicineProfile.dosageForm} onChange={(e) => setMedicineProfile((p) => ({ ...p, dosageForm: e.target.value }))} placeholder="e.g. Tablet, Injection" /></div>
                    <div className="col-md-6"><label className="form-label">Strength</label><input type="text" className="form-control radius-8" value={medicineProfile.strength} onChange={(e) => setMedicineProfile((p) => ({ ...p, strength: e.target.value }))} placeholder="e.g. 500mg" /></div>
                    <div className="col-md-6"><label className="form-label">Route</label><input type="text" className="form-control radius-8" value={medicineProfile.route} onChange={(e) => setMedicineProfile((p) => ({ ...p, route: e.target.value }))} placeholder="e.g. Oral, IV" /></div>
                    <div className="col-12"><label className="form-label">Pharmacology class</label><input type="text" className="form-control radius-8" value={medicineProfile.pharmacologyClass} onChange={(e) => setMedicineProfile((p) => ({ ...p, pharmacologyClass: e.target.value }))} /></div>
                    <div className="col-md-6"><label className="form-label">Dispense unit</label><input type="text" className="form-control radius-8" value={medicineProfile.dispenseUnit} onChange={(e) => setMedicineProfile((p) => ({ ...p, dispenseUnit: e.target.value }))} /></div>
                    <div className="col-12 d-flex gap-3">
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={medicineProfile.requiresPrescription} onChange={(e) => setMedicineProfile((p) => ({ ...p, requiresPrescription: e.target.checked }))} /><label className="form-check-label">Requires prescription</label></div>
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={medicineProfile.controlledSubstance} onChange={(e) => setMedicineProfile((p) => ({ ...p, controlledSubstance: e.target.checked }))} /><label className="form-check-label">Controlled substance</label></div>
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={medicineProfile.batchMandatory} onChange={(e) => setMedicineProfile((p) => ({ ...p, batchMandatory: e.target.checked }))} /><label className="form-check-label">Batch mandatory</label></div>
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={medicineProfile.expiryMandatory} onChange={(e) => setMedicineProfile((p) => ({ ...p, expiryMandatory: e.target.checked }))} /><label className="form-check-label">Expiry mandatory</label></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {["SURGICAL_CONSUMABLE", "DRESSING_SUPPLY", "CLINIC_SUPPLY"].includes(form.domainType) && (
              <div className="card radius-12 mb-4">
                <div className="card-header bg-light"><h6 className="mb-0">Consumable profile</h6></div>
                <div className="card-body">
                  <div className="row g-2">
                    <div className="col-md-6"><label className="form-label">Consumable type</label><select className="form-select radius-8" value={consumableProfile.consumableType} onChange={(e) => setConsumableProfile((p) => ({ ...p, consumableType: e.target.value }))}>{CONSUMABLE_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
                    <div className="col-md-6"><label className="form-label">Issue unit</label><input type="text" className="form-control radius-8" value={consumableProfile.issueUnit} onChange={(e) => setConsumableProfile((p) => ({ ...p, issueUnit: e.target.value }))} /></div>
                    <div className="col-12 d-flex flex-wrap gap-3">
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={consumableProfile.sterileRequired} onChange={(e) => setConsumableProfile((p) => ({ ...p, sterileRequired: e.target.checked }))} /><label className="form-check-label">Sterile required</label></div>
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={consumableProfile.singleUseOnly} onChange={(e) => setConsumableProfile((p) => ({ ...p, singleUseOnly: e.target.checked }))} /><label className="form-check-label">Single use only</label></div>
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={consumableProfile.procedureLinked} onChange={(e) => setConsumableProfile((p) => ({ ...p, procedureLinked: e.target.checked }))} /><label className="form-check-label">Procedure linked</label></div>
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={consumableProfile.wastageTrackRequired} onChange={(e) => setConsumableProfile((p) => ({ ...p, wastageTrackRequired: e.target.checked }))} /><label className="form-check-label">Wastage track required</label></div>
                    </div>
                    <div className="col-12"><label className="form-label">Usage note template</label><input type="text" className="form-control radius-8" value={consumableProfile.usageNoteTemplate} onChange={(e) => setConsumableProfile((p) => ({ ...p, usageNoteTemplate: e.target.value }))} /></div>
                  </div>
                </div>
              </div>
            )}

            {form.domainType === "INSTRUMENT" && (
              <div className="card radius-12 mb-4">
                <div className="card-header bg-light"><h6 className="mb-0">Instrument profile</h6></div>
                <div className="card-body">
                  <div className="row g-2">
                    <div className="col-md-6"><label className="form-label">Instrument type</label><select className="form-select radius-8" value={instrumentProfile.instrumentType} onChange={(e) => setInstrumentProfile((p) => ({ ...p, instrumentType: e.target.value }))}>{INSTRUMENT_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
                    <div className="col-md-6"><label className="form-label">Service cycle (days)</label><input type="number" className="form-control radius-8" value={instrumentProfile.serviceCycleDays} onChange={(e) => setInstrumentProfile((p) => ({ ...p, serviceCycleDays: e.target.value }))} /></div>
                    <div className="col-12 d-flex flex-wrap gap-3">
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={instrumentProfile.sterilizationRequired} onChange={(e) => setInstrumentProfile((p) => ({ ...p, sterilizationRequired: e.target.checked }))} /><label className="form-check-label">Sterilization required</label></div>
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={instrumentProfile.maintenanceRequired} onChange={(e) => setInstrumentProfile((p) => ({ ...p, maintenanceRequired: e.target.checked }))} /><label className="form-check-label">Maintenance required</label></div>
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={instrumentProfile.assetTrackingRequired} onChange={(e) => setInstrumentProfile((p) => ({ ...p, assetTrackingRequired: e.target.checked }))} /><label className="form-check-label">Asset tracking</label></div>
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={instrumentProfile.issueReturnRequired} onChange={(e) => setInstrumentProfile((p) => ({ ...p, issueReturnRequired: e.target.checked }))} /><label className="form-check-label">Issue/return required</label></div>
                      <div className="form-check"><input type="checkbox" className="form-check-input" checked={instrumentProfile.serialTracking} onChange={(e) => setInstrumentProfile((p) => ({ ...p, serialTracking: e.target.checked }))} /><label className="form-check-label">Serial tracking</label></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary radius-8" disabled={loading}>{loading ? "Creating…" : "Create"}</button>
              <Link href={`/owner/clinic/${branchId}/catalog`} className="btn btn-outline-secondary radius-8">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
