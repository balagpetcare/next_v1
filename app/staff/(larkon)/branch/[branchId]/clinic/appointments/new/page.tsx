"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicOwnerLookup,
  staffClinicEnsureOwner,
  staffClinicPatientsList,
  staffClinicServices,
  staffBookingEligibleDoctors,
  staffBookingAvailableSlots,
  staffClinicAppointmentCreateV2,
  staffClinicCheckDuplicate,
  staffClinicPackagesList,
  staffBookingPricePreview,
} from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import {
  SlotPicker,
  ServiceSelector,
  PackageSelector,
  DoctorSelector,
  PriceSummaryCard,
} from "@/src/components/booking";
import type { DoctorSlotGroup, PricePreview } from "@/src/types/appointment";
import type { ServiceItem } from "@/src/components/booking/ServiceSelector";
import { staffClinicPatientRegisterPath } from "@/lib/staffClinicPatientRoutes";
import type { PackageItem } from "@/src/components/booking/PackageSelector";

const APPOINTMENTS_PERMS = ["clinic.appointments.read", "clinic.appointments.manage"];
const OWNER_LOOKUP_DEBOUNCE_MS = 500;

function todayYMD() {
  return new Date().toISOString().split("T")[0];
}
function maxDateYMD() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

type OwnerOption = {
  id: number;
  displayName: string;
  mobile?: string;
};
type PetOption = { id: number; name: string; animalType?: string };

export default function NewAppointmentPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [ownerLookupDone, setOwnerLookupDone] = useState(false);
  const [ownerNotFound, setOwnerNotFound] = useState(false);
  const [owner, setOwner] = useState<OwnerOption | null>(null);
  const [pets, setPets] = useState<PetOption[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const ownerLookupDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showCreateOwner, setShowCreateOwner] = useState(false);
  const [createOwnerName, setCreateOwnerName] = useState("");
  const [createOwnerPhone, setCreateOwnerPhone] = useState("");
  const [creatingOwner, setCreatingOwner] = useState(false);
  const [createOwnerError, setCreateOwnerError] = useState("");

  const [petId, setPetId] = useState<string>("");
  const [appointmentType, setAppointmentType] = useState<"CONSULTATION" | "SERVICE" | "PACKAGE" | "SURGERY">("CONSULTATION");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [packages, setPackages] = useState<(PackageItem & { serviceId?: number })[]>([]);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [packageId, setPackageId] = useState<number | null>(null);
  const [doctors, setDoctors] = useState<{ doctorId: number; doctorName: string; specializationTags?: string[]; defaultConsultationFee?: number; serviceFee?: number; durationMin?: number }[]>([]);
  const [doctorId, setDoctorId] = useState<number | "auto" | null>(null);
  const [date, setDate] = useState(todayYMD());
  const [slotGroups, setSlotGroups] = useState<DoctorSlotGroup[]>([]);
  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [slotEnd, setSlotEnd] = useState<string | null>(null);
  const [pricePreview, setPricePreview] = useState<PricePreview | null>(null);
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<"NORMAL" | "EMERGENCY" | "VIP">("NORMAL");

  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{ possibleDuplicate: boolean; existing: any[] } | null>(null);
  const [forceSaveAfterDuplicate, setForceSaveAfterDuplicate] = useState(false);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = APPOINTMENTS_PERMS.some((p) => permissions.includes(p));
  const canManage = permissions.includes("clinic.appointments.manage");

  const effectiveServiceId = serviceId ?? (packageId ? packages.find((p) => p.id === packageId)?.serviceId : undefined) ?? 0;

  // Owner search with debounce; handle 404 as "not found"
  useEffect(() => {
    if (!branchId) return;
    const trimmed = (ownerQuery || "").trim();
    const shouldTrigger = trimmed.length >= 10 || trimmed.includes("@");
    if (!shouldTrigger) {
      if (ownerLookupDebounceRef.current) clearTimeout(ownerLookupDebounceRef.current);
      setOwnerLookupDone(false);
      setOwnerNotFound(false);
      return;
    }
    if (ownerLookupDebounceRef.current) clearTimeout(ownerLookupDebounceRef.current);
    ownerLookupDebounceRef.current = setTimeout(() => {
      ownerLookupDebounceRef.current = null;
      setOwnerSearching(true);
      setOwnerNotFound(false);
      setOwnerLookupDone(false);
      staffClinicOwnerLookup(branchId, trimmed)
        .then((data: any) => {
          const raw = data?.data ?? data;
          if (raw && typeof raw === "object" && "id" in raw) {
            const o: OwnerOption = {
              id: Number(raw.id),
              displayName: raw.profile?.displayName ?? raw.displayName ?? `User #${raw.id}`,
              mobile: raw.auth?.phone ?? raw.auth?.email ?? raw.phone,
            };
            setOwner(o);
            setOwnerNotFound(false);
            return staffClinicPatientsList(branchId, { ownerId: o.id, limit: 50 }).then((res: any) => {
              setPets(Array.isArray(res?.patients) ? res.patients.map((p: any) => ({ id: p.id, name: p.name ?? "", animalType: p.animalType?.name ?? p.animalType })) : []);
            });
          }
          setOwner(null);
          setPets([]);
        })
        .catch((e: Error & { status?: number }) => {
          setOwner(null);
          setPets([]);
          if (e?.status === 404) {
            setOwnerNotFound(true);
            setShowCreateOwner(true);
            setCreateOwnerPhone(trimmed);
          }
        })
        .finally(() => {
          setOwnerSearching(false);
          setOwnerLookupDone(true);
        });
    }, OWNER_LOOKUP_DEBOUNCE_MS);
    return () => {
      if (ownerLookupDebounceRef.current) clearTimeout(ownerLookupDebounceRef.current);
    };
  }, [branchId, ownerQuery]);

  const loadPets = useCallback(() => {
    if (!branchId || !owner?.id) return;
    setPetsLoading(true);
    staffClinicPatientsList(branchId, { ownerId: owner.id, limit: 50 })
      .then((res: any) => setPets(Array.isArray(res?.patients) ? res.patients.map((p: any) => ({ id: p.id, name: p.name ?? "", animalType: p.animalType?.name ?? p.animalType })) : []))
      .catch(() => setPets([]))
      .finally(() => setPetsLoading(false));
  }, [branchId, owner?.id]);

  const handleCreateOwner = useCallback(async () => {
    const phone = (createOwnerPhone || "").trim();
    const name = (createOwnerName || "").trim();
    if (!phone) {
      setCreateOwnerError("Phone is required.");
      return;
    }
    if (name.length > 0 && name.length < 2) {
      setCreateOwnerError("Name must be at least 2 characters.");
      return;
    }
    setCreatingOwner(true);
    setCreateOwnerError("");
    try {
      const created = await staffClinicEnsureOwner(branchId, { phone, displayName: name || undefined });
      const o: OwnerOption = {
        id: Number(created.id),
        displayName: created.profile?.displayName ?? name ?? `User #${created.id}`,
        mobile: created.auth?.phone ?? created.auth?.email ?? phone,
      };
      setOwner(o);
      setOwnerNotFound(false);
      setShowCreateOwner(false);
      setCreateOwnerName("");
      setCreateOwnerPhone("");
      setOwnerQuery(phone);
      toast.success("Owner created.");
      staffClinicPatientsList(branchId, { ownerId: o.id, limit: 50 })
        .then((res: any) => setPets(Array.isArray(res?.patients) ? res.patients.map((p: any) => ({ id: p.id, name: p.name ?? "", animalType: p.animalType?.name ?? p.animalType })) : []))
        .catch(() => setPets([]));
    } catch (e: any) {
      setCreateOwnerError(e?.message ?? "Failed to create owner.");
    } finally {
      setCreatingOwner(false);
    }
  }, [branchId, createOwnerName, createOwnerPhone, loadPets]);

  useEffect(() => {
    if (owner?.id) loadPets();
    else setPets([]);
  }, [owner?.id, loadPets]);

  // Services
  useEffect(() => {
    if (!branchId) return;
    setLoadingServices(true);
    staffClinicServices(branchId)
      .then((data: any) => {
        const list = Array.isArray(data) ? data : (data?.items ?? data?.services ?? []);
        setServices(list.map((s: any) => ({ id: s.id, name: s.name, category: s.category, price: Number(s.price ?? 0), duration: s.duration, status: s.status })));
      })
      .catch(() => setServices([]))
      .finally(() => setLoadingServices(false));
  }, [branchId]);

  useEffect(() => {
    if (!branchId) return;
    staffClinicPackagesList(branchId)
      .then((list) => setPackages(Array.isArray(list) ? list.map((p: any) => ({ ...p, baseSellingPrice: p.baseSellingPrice })) : []))
      .catch(() => setPackages([]));
  }, [branchId]);

  const packagesForService = useMemo(() => {
    if (!serviceId) return [];
    return packages.filter((p) => (p as { serviceId?: number }).serviceId === serviceId);
  }, [packages, serviceId]);

  // Doctors when service or package selected
  useEffect(() => {
    if (!branchId || (!serviceId && !packageId)) {
      setDoctors([]);
      return;
    }
    setLoadingDoctors(true);
    staffBookingEligibleDoctors(branchId, { serviceId: serviceId ?? undefined, packageId: packageId ?? undefined })
      .then(setDoctors)
      .catch(() => setDoctors([]))
      .finally(() => setLoadingDoctors(false));
  }, [branchId, serviceId, packageId]);

  // Slots when date + (service or package)
  useEffect(() => {
    if (!branchId || !date || (!serviceId && !packageId)) {
      setSlotGroups([]);
      setSlotStart(null);
      setSlotEnd(null);
      return;
    }
    setLoadingSlots(true);
    const docId = doctorId === "auto" || doctorId == null ? undefined : doctorId;
    staffBookingAvailableSlots(branchId, {
      date,
      serviceId: serviceId ?? undefined,
      packageId: packageId ?? undefined,
      doctorId: docId,
    })
      .then(setSlotGroups)
      .catch(() => setSlotGroups([]))
      .finally(() => setLoadingSlots(false));
  }, [branchId, date, serviceId, packageId, doctorId]);

  // Price preview
  useEffect(() => {
    if (!branchId || (!serviceId && !packageId)) {
      setPricePreview(null);
      return;
    }
    setLoadingPrice(true);
    staffBookingPricePreview(branchId, {
      serviceId: serviceId ?? undefined,
      packageId: packageId ?? undefined,
      doctorId: typeof doctorId === "number" ? doctorId : undefined,
    })
      .then(setPricePreview)
      .catch(() => setPricePreview(null))
      .finally(() => setLoadingPrice(false));
  }, [branchId, serviceId, packageId, doctorId]);

  const checkDuplicate = useCallback(async () => {
    const mobile = (owner?.mobile ?? ownerQuery).trim();
    if (!mobile || !date) return null;
    return staffClinicCheckDuplicate(branchId, {
      mobile,
      petName: petId ? pets.find((p) => p.id === Number(petId))?.name : undefined,
      date,
    });
  }, [branchId, owner, ownerQuery, petId, pets, date]);

  const handleSubmit = useCallback(async () => {
    if (!branchId || !owner?.id) {
      setSubmitError("Please select or create an owner.");
      return;
    }
    if (!effectiveServiceId) {
      setSubmitError("Please select a service or package.");
      return;
    }
    if (!date || !slotStart || !slotEnd) {
      setSubmitError("Please select date and time slot.");
      return;
    }
    if (!forceSaveAfterDuplicate) {
      const dup = await checkDuplicate();
      if (dup?.possibleDuplicate && dup?.existing?.length) {
        setDuplicateWarning(dup);
        return;
      }
    }
    setSubmitting(true);
    setSubmitError(null);
    setDuplicateWarning(null);
    setForceSaveAfterDuplicate(false);
    try {
      const scheduledStartAt = new Date(slotStart).toISOString();
      const scheduledEndAt = new Date(slotEnd).toISOString();
      const effectiveDoctorId = doctorId === "auto" || doctorId == null ? null : doctorId;
      await staffClinicAppointmentCreateV2(branchId, {
        patientId: owner.id,
        petId: petId ? Number(petId) : undefined,
        serviceId: effectiveServiceId,
        surgeryPackageId: packageId ?? undefined,
        scheduledStartAt,
        scheduledEndAt,
        doctorId: effectiveDoctorId,
        source: "STAFF",
        channel: "COUNTER",
        visitType: "SCHEDULED",
        isAnyDoctor: effectiveDoctorId == null,
        priority,
        notes: notes.trim() || undefined,
        appointmentType,
      });
      toast.success("Appointment created.");
      router.push(`/staff/branch/${branchId}/clinic/appointments`);
    } catch (e: any) {
      setSubmitError(e?.message ?? "Failed to create appointment.");
    } finally {
      setSubmitting(false);
    }
  }, [branchId, owner, effectiveServiceId, date, slotStart, slotEnd, petId, doctorId, notes, priority, appointmentType, packageId, checkDuplicate, forceSaveAfterDuplicate, router]);

  const registerPetHref = useMemo(() => {
    if (!branchId || !owner?.id) return "#";
    const q = new URLSearchParams();
    q.set("phone", owner.mobile ?? ownerQuery);
    q.set("displayName", owner.displayName);
    q.set("returnTo", `/staff/branch/${branchId}/clinic/appointments/new`);
    return staffClinicPatientRegisterPath(branchId, q.toString());
  }, [branchId, owner, ownerQuery]);

  // For consultation services: ensure UI shows only doctor/consultation fee (no service price line).
  // Normalize preview so displayed summary and total match business rule even if API returned legacy shape.
  const displayPreview = useMemo(() => {
    if (!pricePreview) return null;
    const selectedService = serviceId ? services.find((s) => s.id === serviceId) : null;
    const isConsultation =
      selectedService?.category != null && String(selectedService.category).toUpperCase() === "CONSULTATION";
    if (!isConsultation) return pricePreview;
    const doctorFeeAmount =
      pricePreview.doctorFee ??
      pricePreview.breakdown?.find((b) => b.label === "Consultation fee" || b.label === "Doctor fee")?.amount ??
      0;
    const feeOnlyBreakdown =
      pricePreview.breakdown?.filter(
        (b) => b.label === "Consultation fee" || b.label === "Doctor fee"
      ).length > 0
        ? pricePreview.breakdown!.filter((b) => b.label === "Consultation fee" || b.label === "Doctor fee")
        : [{ label: "Consultation fee" as const, amount: doctorFeeAmount }];
    return {
      ...pricePreview,
      basePrice: 0,
      doctorFee: doctorFeeAmount,
      totalPrice: doctorFeeAmount - (pricePreview.discountAmount ?? 0),
      breakdown: feeOnlyBreakdown,
    };
  }, [pricePreview, serviceId, services]);

  if (ctxLoading) {
    return (
      <div className="py-40 px-3 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary">Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-24">
        <AccessDenied title="No access" message="You don't have permission to manage appointments." onBack={() => router.push(`/staff/branch/${branchId}/clinic`)} />
      </div>
    );
  }

  return (
    <div className="p-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <div className="d-flex align-items-center gap-2 mb-24">
        <Link href={`/staff/branch/${branchId}/clinic/appointments`} className="btn btn-outline-secondary btn-sm">
          Back to appointments
        </Link>
        <h4 className="mb-0 fw-semibold">New appointment</h4>
      </div>

      {duplicateWarning?.possibleDuplicate && duplicateWarning.existing?.length > 0 && (
        <div className="alert alert-warning py-2 small mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <span>Possible duplicate: same mobile and date.</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-warning"
            onClick={() => {
              setDuplicateWarning(null);
              setForceSaveAfterDuplicate(true);
              setTimeout(() => handleSubmit(), 0);
            }}
          >
            Save anyway
          </button>
        </div>
      )}

      {submitError && (
        <div className="alert alert-danger small mb-3" role="alert">
          {submitError}
        </div>
      )}

      {/* Section 1: Owner */}
      <div className="card border-0 bg-light mb-24">
        <div className="card-header bg-transparent border-0 py-2 px-3 fw-semibold small text-uppercase text-muted">
          1. Owner
        </div>
        <div className="card-body py-3 px-3">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-medium mb-1">Search by phone or email</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Enter phone number or email"
                value={ownerQuery}
                onChange={(e) => setOwnerQuery(e.target.value)}
              />
              {ownerSearching && <small className="text-muted d-block mt-1">Looking up…</small>}
              {ownerLookupDone && !ownerSearching && (
                <div className="mt-2 p-2 rounded border bg-white small">
                  {owner ? (
                    <div className="fw-medium text-success">Owner found</div>
                  ) : ownerNotFound ? (
                    <div className="fw-medium text-secondary">Owner not found. Create new owner below.</div>
                  ) : (
                    <div className="text-muted">Enter at least 10 digits or an email to search.</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {owner && (
            <div className="mt-3 p-3 rounded border bg-white">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-semibold">{owner.displayName}</div>
                  <div className="small text-muted">ID #{owner.id} · {owner.mobile ?? "—"}</div>
                </div>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setOwner(null); setOwnerQuery(""); setPetId(""); setShowCreateOwner(false); setOwnerNotFound(false); }}>
                  Change
                </button>
              </div>
            </div>
          )}

          {showCreateOwner && (ownerNotFound || !owner) && (
            <div className="mt-3 p-3 rounded border border-primary bg-white">
              <div className="fw-semibold small mb-2">Create new owner</div>
              <div className="row g-2">
                <div className="col-md-4">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Full name *"
                    value={createOwnerName}
                    onChange={(e) => setCreateOwnerName(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Phone *"
                    value={createOwnerPhone}
                    onChange={(e) => setCreateOwnerPhone(e.target.value)}
                  />
                </div>
                <div className="col-md-4 d-flex align-items-center gap-2">
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleCreateOwner} disabled={creatingOwner}>
                    {creatingOwner ? "Creating…" : "Create owner"}
                  </button>
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setShowCreateOwner(false); setCreateOwnerError(""); }}>
                    Cancel
                  </button>
                </div>
              </div>
              {createOwnerError && <div className="small text-danger mt-1">{createOwnerError}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Pet */}
      <div className="card border-0 bg-light mb-24">
        <div className="card-header bg-transparent border-0 py-2 px-3 fw-semibold small text-uppercase text-muted">
          2. Pet (optional)
        </div>
        <div className="card-body py-3 px-3">
          {!owner ? (
            <p className="small text-muted mb-0">Select or create an owner first.</p>
          ) : (
            <>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-medium mb-1">Select pet</label>
                  <select
                    className="form-select form-select-sm"
                    value={petId}
                    onChange={(e) => setPetId(e.target.value)}
                    disabled={petsLoading}
                  >
                    <option value="">— No pet / New pet —</option>
                    {pets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.animalType ? `(${p.animalType})` : ""}
                      </option>
                    ))}
                  </select>
                  {petsLoading && <small className="text-muted d-block mt-1">Loading pets…</small>}
                  {owner && !petsLoading && pets.length === 0 && (
                    <small className="text-muted d-block mt-1">No pets registered. You can add one below or continue without a pet.</small>
                  )}
                </div>
                <div className="col-md-6 d-flex align-items-end">
                  <Link href={registerPetHref} className="btn btn-outline-primary btn-sm">
                    Add pet
                  </Link>
                </div>
              </div>
              {petId && pets.find((p) => p.id === Number(petId)) && (
                <div className="mt-2 p-2 rounded border bg-white small">
                  Selected: {pets.find((p) => p.id === Number(petId))?.name} ({pets.find((p) => p.id === Number(petId))?.animalType ?? "—"})
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Section 3: Appointment details */}
      <div className="card border-0 bg-light mb-24">
        <div className="card-header bg-transparent border-0 py-2 px-3 fw-semibold small text-uppercase text-muted">
          3. Appointment details
        </div>
        <div className="card-body py-3 px-3">
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label small fw-medium mb-1">Appointment type</label>
              <div className="d-flex gap-2 flex-wrap">
                {(["CONSULTATION", "SERVICE", "PACKAGE", "SURGERY"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`btn btn-sm ${appointmentType === t ? "btn-primary" : "btn-outline-secondary"}`}
                    onClick={() => { setAppointmentType(t); setServiceId(null); setPackageId(null); }}
                  >
                    {t === "CONSULTATION" ? "Consultation" : t === "SERVICE" ? "Service" : t === "PACKAGE" ? "Package" : "Surgery"}
                  </button>
                ))}
              </div>
            </div>

            {(appointmentType === "CONSULTATION" || appointmentType === "SERVICE") && (
              <div className="col-md-6">
                <label className="form-label small fw-medium mb-1">Service *</label>
                <ServiceSelector
                  services={services}
                  selectedId={serviceId}
                  onSelect={(s) => { setServiceId(s.id); setPackageId(null); }}
                  loading={loadingServices}
                />
              </div>
            )}
            {(appointmentType === "PACKAGE" || appointmentType === "SURGERY") && (
              <div className="col-md-6">
                <label className="form-label small fw-medium mb-1">Package *</label>
                <select
                  className="form-select form-select-sm"
                  value={packageId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    const p = packagesForService.find((x) => x.id === Number(v));
                    setPackageId(v ? Number(v) : null);
                    if (p) setServiceId((p as { serviceId?: number }).serviceId ?? null);
                  }}
                  disabled={loadingServices}
                >
                  <option value="">Select package</option>
                  {packagesForService.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.packageName ?? `#${p.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="col-md-6">
              <label className="form-label small fw-medium mb-1">Doctor</label>
              <DoctorSelector
                doctors={doctors}
                selectedId={doctorId}
                onSelect={(d) => setDoctorId(d === "auto" ? "auto" : d.doctorId)}
                loading={loadingDoctors}
                showAutoAssign
              />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-medium mb-1">Date *</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={date}
                min={todayYMD()}
                max={maxDateYMD()}
                onChange={(e) => { setDate(e.target.value); setSlotStart(null); setSlotEnd(null); }}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-medium mb-1">Urgency</label>
              <select className="form-select form-select-sm" value={priority} onChange={(e) => setPriority(e.target.value as "NORMAL" | "EMERGENCY" | "VIP")}>
                <option value="NORMAL">Normal</option>
                <option value="EMERGENCY">Emergency</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
            <div className="col-12">
              <label className="form-label small fw-medium mb-1">Time slot *</label>
              {date && (serviceId || packageId) ? (
                <SlotPicker
                  slotGroups={slotGroups}
                  selectedSlot={slotStart && slotEnd ? { start: slotStart, end: slotEnd, doctorId: typeof doctorId === "number" ? doctorId : 0 } : undefined}
                  onSelectSlot={(slot) => { setSlotStart(slot.start); setSlotEnd(slot.end); if (slot.doctorId) setDoctorId(slot.doctorId); }}
                  loading={loadingSlots}
                />
              ) : (
                <p className="small text-muted mb-0">Select date and service or package first.</p>
              )}
            </div>
            <div className="col-12">
              <PriceSummaryCard preview={displayPreview} loading={loadingPrice} />
            </div>
            <div className="col-12">
              <label className="form-label small fw-medium mb-1">Notes (optional)</label>
              <textarea className="form-control form-control-sm" rows={2} placeholder="Short note or complaint" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex gap-2 align-items-center">
        <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !owner?.id || !effectiveServiceId || !slotStart || !slotEnd}>
          {submitting ? "Saving…" : "Create appointment"}
        </button>
        <Link href={`/staff/branch/${branchId}/clinic/appointments`} className="btn btn-outline-secondary">
          Cancel
        </Link>
      </div>
    </div>
  );
}
