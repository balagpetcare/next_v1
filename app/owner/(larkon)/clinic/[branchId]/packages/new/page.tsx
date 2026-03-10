"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ownerClinicPackageCreate, ownerClinicServices } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

const PACKAGE_TYPES = ["STANDARD", "PREMIUM", "WELFARE", "EMERGENCY", "PROMOTIONAL", "DOCTOR_SPECIFIC", "BRANCH_SPECIFIC"] as const;

export default function NewClinicPackagePage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params?.branchId as string | undefined;
  const [packageCode, setPackageCode] = useState("");
  const [packageName, setPackageName] = useState("");
  const [serviceId, setServiceId] = useState<number | "">("");
  const [baseSellingPrice, setBaseSellingPrice] = useState("");
  const [packageType, setPackageType] = useState<string>(PACKAGE_TYPES[0]);
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [doctorFeeAmount, setDoctorFeeAmount] = useState("");
  const [clinicFeeAmount, setClinicFeeAmount] = useState("");
  const [consumableBlockAmount, setConsumableBlockAmount] = useState("");
  const [medicationBlockAmount, setMedicationBlockAmount] = useState("");
  const [supportFeeAmount, setSupportFeeAmount] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [addOnAllowed, setAddOnAllowed] = useState(true);
  const [discountable, setDiscountable] = useState(true);
  const [speciesCondition, setSpeciesCondition] = useState("");
  const [services, setServices] = useState<Array<{ id: number; name: string; category?: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!branchId) return;
    ownerClinicServices(branchId).then((res) => {
      const items = (res as { items?: Array<{ id: number; name: string; category?: string }> })?.items ?? [];
      setServices(items);
      if (items.length > 0 && serviceId === "") setServiceId(items[0].id);
    }).catch(() => {});
  }, [branchId]);

  const parseNum = (s: string): number | undefined => {
    if (s.trim() === "") return undefined;
    const n = parseFloat(s);
    return Number.isNaN(n) ? undefined : n;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !packageCode.trim() || !packageName.trim()) return;
    const priceNum = parseFloat(baseSellingPrice);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError("Enter a valid base selling price");
      return;
    }
    if (!serviceId || typeof serviceId !== "number") {
      setError("Select a service");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const body: Record<string, unknown> = {
        packageCode: packageCode.trim(),
        packageName: packageName.trim(),
        serviceId,
        baseSellingPrice: priceNum,
        packageType,
        status: "ACTIVE",
        addOnAllowed,
        discountable,
      };
      if (validFrom.trim()) body.validFrom = validFrom.trim();
      if (validTo.trim()) body.validTo = validTo.trim();
      const docFee = parseNum(doctorFeeAmount);
      if (docFee != null && docFee >= 0) body.doctorFeeAmount = docFee;
      const clinicFee = parseNum(clinicFeeAmount);
      if (clinicFee != null && clinicFee >= 0) body.clinicFeeAmount = clinicFee;
      const consumable = parseNum(consumableBlockAmount);
      if (consumable != null && consumable >= 0) body.consumableBlockAmount = consumable;
      const medication = parseNum(medicationBlockAmount);
      if (medication != null && medication >= 0) body.medicationBlockAmount = medication;
      const support = parseNum(supportFeeAmount);
      if (support != null && support >= 0) body.supportFeeAmount = support;
      const est = parseNum(estimatedCost);
      if (est != null && est >= 0) body.estimatedCost = est;
      const species = speciesCondition.trim().split(",").map((x) => x.trim()).filter(Boolean);
      if (species.length > 0) body.speciesCondition = species;

      body.status = "DRAFT";
      const created = await ownerClinicPackageCreate(branchId, body) as { id?: number };
      if (created?.id) {
        router.push(`/owner/clinic/${branchId}/packages/${created.id}/edit`);
      } else {
        router.push(`/owner/clinic/${branchId}/packages`);
      }
    } catch (e) {
      setError((e as Error)?.message || "Failed to create package");
    } finally {
      setSaving(false);
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
        title="New surgery package"
        subtitle={`Branch #${branchId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Packages", href: `/owner/clinic/${branchId}/packages` },
          { label: "New", href: `/owner/clinic/${branchId}/packages/new` },
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-3">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      <div className="card radius-12">
        <div className="card-body p-24">
          <form onSubmit={handleSubmit}>
            <div className="row g-4">
              <div className="col-12 col-lg-6">
                <h6 className="mb-3 fw-semibold">Core details</h6>
                <div className="mb-3">
                  <label className="form-label">Package code *</label>
                  <input
                    type="text"
                    className="form-control radius-12"
                    value={packageCode}
                    onChange={(e) => setPackageCode(e.target.value)}
                    placeholder="e.g. SPC-001"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Package name *</label>
                  <input
                    type="text"
                    className="form-control radius-12"
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    placeholder="e.g. Standard Spay Package"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Service *</label>
                  <select
                    className="form-select radius-12"
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value === "" ? "" : Number(e.target.value))}
                    required
                  >
                    <option value="">Select service</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} {s.category ? `(${s.category})` : ""}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Base selling price *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control radius-12"
                    value={baseSellingPrice}
                    onChange={(e) => setBaseSellingPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Package type</label>
                  <select
                    className="form-select radius-12"
                    value={packageType}
                    onChange={(e) => setPackageType(e.target.value)}
                  >
                    {PACKAGE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label">Valid from</label>
                    <input
                      type="date"
                      className="form-control radius-12"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Valid to</label>
                    <input
                      type="date"
                      className="form-control radius-12"
                      value={validTo}
                      onChange={(e) => setValidTo(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Species (comma-separated)</label>
                  <input
                    type="text"
                    className="form-control radius-12"
                    value={speciesCondition}
                    onChange={(e) => setSpeciesCondition(e.target.value)}
                    placeholder="e.g. Dog, Cat"
                  />
                </div>
                <div className="d-flex gap-3 mb-0">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="addOnAllowed"
                      checked={addOnAllowed}
                      onChange={(e) => setAddOnAllowed(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="addOnAllowed">Add-on allowed</label>
                  </div>
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="discountable"
                      checked={discountable}
                      onChange={(e) => setDiscountable(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="discountable">Discountable</label>
                  </div>
                </div>
              </div>
              <div className="col-12 col-lg-6">
                <h6 className="mb-3 fw-semibold">Fee breakdown</h6>
                <div className="mb-3">
                  <label className="form-label">Doctor fee amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control radius-12"
                    value={doctorFeeAmount}
                    onChange={(e) => setDoctorFeeAmount(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Clinic fee amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control radius-12"
                    value={clinicFeeAmount}
                    onChange={(e) => setClinicFeeAmount(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Consumable block amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control radius-12"
                    value={consumableBlockAmount}
                    onChange={(e) => setConsumableBlockAmount(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Medication block amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control radius-12"
                    value={medicationBlockAmount}
                    onChange={(e) => setMedicationBlockAmount(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Support fee amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control radius-12"
                    value={supportFeeAmount}
                    onChange={(e) => setSupportFeeAmount(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="mb-0">
                  <label className="form-label">Estimated cost</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control radius-12"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
            <hr className="my-4" />
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary radius-12" disabled={saving}>
                {saving ? "Creating…" : "Create package"}
              </button>
              <Link href={`/owner/clinic/${branchId}/packages`} className="btn btn-outline-secondary radius-12">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
