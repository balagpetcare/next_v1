"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  SlotPicker,
  ServiceSelector,
  PackageSelector,
  DoctorSelector,
  PriceSummaryCard,
  PatientPetSelector,
  AppointmentTypeTabs,
} from "@/src/components/booking";
import type { BookingWizardState, AppointmentType, DoctorSlotGroup, PricePreview } from "@/src/types/appointment";
import type { ServiceItem } from "@/src/components/booking/ServiceSelector";
import type { PackageItem } from "@/src/components/booking/PackageSelector";
import {
  staffBookingAvailableSlots,
  staffBookingEligibleDoctors,
  staffBookingPricePreview,
  staffBookingCompatibleRooms,
  staffClinicAppointmentCreateV2,
  staffClinicServices,
  staffClinicOwnerLookup,
  staffClinicPackagesList,
  staffClinicPatientsList,
} from "@/lib/api";

const STEP_1_LABEL = "Caller / Patient / Visit basics";
const STEP_2_LABEL = "Service / Package / Doctor / Slot / Review";

function normalizeOwnerToSearchResult(u: any): { id: number; displayName: string; mobile?: string; pets?: { id: number; name: string; animalType?: string }[] } {
  return {
    id: Number(u.id),
    displayName: u.profile?.displayName ?? u.displayName ?? `User #${u.id}`,
    mobile: u.auth?.phone ?? u.mobile ?? u.phone,
    pets: (u.pets ?? []).map((p: any) => ({ id: p.id, name: p.name, animalType: p.animalType?.name ?? p.animalType })),
  };
}

export default function CreateAppointmentWizard({
  branchId,
  onSuccess,
  onCancel,
}: {
  branchId: string;
  onSuccess: (appointment: unknown) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [state, setState] = useState<BookingWizardState>({
    step: 1,
    branchId: Number(branchId),
    appointmentType: "CONSULTATION",
  });

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [packages, setPackages] = useState<(PackageItem & { serviceId?: number })[]>([]);
  const [doctors, setDoctors] = useState<{ doctorId: number; doctorName: string; specializationTags?: string[]; defaultConsultationFee?: number; serviceFee?: number; durationMin?: number }[]>([]);
  const [slotGroups, setSlotGroups] = useState<DoctorSlotGroup[]>([]);
  const [pricePreview, setPricePreview] = useState<PricePreview | null>(null);
  const [patientSearchResults, setPatientSearchResults] = useState<{ id: number; displayName: string; mobile?: string; pets?: { id: number; name: string; animalType?: string }[] }[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [loadingPets, setLoadingPets] = useState(false);
  const [compatibleRooms, setCompatibleRooms] = useState<{ id: number; name: string; code: string | null; roomType: string }[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateState = useCallback((patch: Partial<BookingWizardState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  // Step 2: load services when appointment type is CONSULTATION or SERVICE
  useEffect(() => {
    if (step === 2 && (state.appointmentType === "SERVICE" || state.appointmentType === "CONSULTATION")) {
      setLoadingServices(true);
      staffClinicServices(branchId)
        .then((data: any) => {
          const list = Array.isArray(data) ? data : (data?.items ?? data?.services ?? []);
          setServices(list.map((s: any) => ({ id: s.id, name: s.name, category: s.category, price: Number(s.price ?? 0), duration: s.duration, status: s.status })));
        })
        .catch(() => setServices([]))
        .finally(() => setLoadingServices(false));
    }
  }, [branchId, step, state.appointmentType]);

  // Step 2: load packages when appointment type is PACKAGE or SURGERY
  useEffect(() => {
    if (step === 2 && (state.appointmentType === "PACKAGE" || state.appointmentType === "SURGERY")) {
      setLoadingServices(true);
      staffClinicPackagesList(branchId)
        .then((list) => setPackages(list.map((p) => ({ ...p, baseSellingPrice: p.baseSellingPrice }))))
        .catch(() => setPackages([]))
        .finally(() => setLoadingServices(false));
    }
  }, [branchId, step, state.appointmentType]);

  // Step 2: load eligible doctors when service or package selected
  useEffect(() => {
    if (step === 2 && (state.serviceId || state.packageId)) {
      setLoadingDoctors(true);
      staffBookingEligibleDoctors(branchId, { serviceId: state.serviceId ?? undefined, packageId: state.packageId ?? undefined })
        .then(setDoctors)
        .catch(() => setDoctors([]))
        .finally(() => setLoadingDoctors(false));
    }
  }, [branchId, step, state.serviceId, state.packageId]);

  // Step 2: load slots when date is set
  useEffect(() => {
    if (step === 2 && state.date && (state.doctorId !== undefined || state.doctorId === "auto")) {
      setLoadingSlots(true);
      const doctorId = state.doctorId === "auto" ? undefined : (typeof state.doctorId === "number" ? state.doctorId : undefined);
      staffBookingAvailableSlots(branchId, {
        date: state.date,
        serviceId: state.serviceId ?? undefined,
        packageId: state.packageId ?? undefined,
        doctorId,
        durationMinutes: state.durationMinutes ?? undefined,
      })
        .then(setSlotGroups)
        .catch(() => setSlotGroups([]))
        .finally(() => setLoadingSlots(false));
    }
  }, [branchId, step, state.date, state.doctorId, state.serviceId, state.packageId, state.durationMinutes]);

  // Step 2: load compatible rooms when slot + service/package are set
  useEffect(() => {
    if (
      step === 2 &&
      state.slotStart &&
      state.slotEnd &&
      (state.serviceId || state.packageId)
    ) {
      setLoadingRooms(true);
      const doctorId = typeof state.doctorId === "number" ? state.doctorId : undefined;
      staffBookingCompatibleRooms(branchId, {
        start: state.slotStart,
        end: state.slotEnd,
        serviceId: state.serviceId ?? undefined,
        surgeryPackageId: state.packageId ?? undefined,
        doctorId,
      })
        .then((data) => {
          const rooms = data?.rooms ?? [];
          setCompatibleRooms(rooms);
        })
        .catch(() => setCompatibleRooms([]))
        .finally(() => setLoadingRooms(false));
    } else {
      setCompatibleRooms([]);
      updateState({ roomId: undefined, roomName: undefined });
    }
  }, [branchId, step, state.slotStart, state.slotEnd, state.serviceId, state.packageId, state.doctorId]);

  // Step 2: price preview when service/package/doctor selected
  useEffect(() => {
    if (step === 2 && (state.serviceId || state.packageId)) {
      setLoadingPrice(true);
      staffBookingPricePreview(branchId, {
        serviceId: state.serviceId ?? undefined,
        packageId: state.packageId ?? undefined,
        doctorId: typeof state.doctorId === "number" ? state.doctorId : undefined,
      })
        .then(setPricePreview)
        .catch(() => setPricePreview(null))
        .finally(() => setLoadingPrice(false));
    }
  }, [branchId, step, state.serviceId, state.packageId, state.doctorId]);

  // For consultation services: ensure UI shows only doctor/consultation fee (no service price line).
  const displayPreview = useMemo(() => {
    if (!pricePreview) return null;
    const selectedService = state.serviceId ? services.find((s) => s.id === state.serviceId) : null;
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
  }, [pricePreview, state.serviceId, services]);

  const handlePatientSearch = useCallback(
    (query: string) => {
      if (!query.trim()) return;
      setSearchingPatient(true);
      setError(null);
      staffClinicOwnerLookup(branchId, query.trim())
        .then((data: any) => {
          const raw = data?.users ?? data?.items;
          const list = Array.isArray(raw)
            ? raw
            : data && typeof data === "object" && "id" in data && !Array.isArray(data)
              ? [data]
              : [];
          setPatientSearchResults(list.map(normalizeOwnerToSearchResult));
        })
        .catch(() => setPatientSearchResults([]))
        .finally(() => setSearchingPatient(false));
    },
    [branchId]
  );

  const loadPetsForOwner = useCallback(
    (ownerId: number) => {
      setLoadingPets(true);
      staffClinicPatientsList(branchId, { ownerId, limit: 50 })
        .then((res: any) => {
          const pets = Array.isArray(res?.patients) ? res.patients : [];
          const patientPets = pets.map((p: any) => ({
            id: p.id,
            name: p.name ?? "",
            animalType: p.animalType?.name ?? p.animalType,
          }));
          updateState({ patientPets });
        })
        .catch(() => updateState({ patientPets: [] }))
        .finally(() => setLoadingPets(false));
    },
    [branchId, updateState]
  );

  const handlePatientSelect = useCallback(
    (p: { id: number; displayName: string; mobile?: string; pets?: { id: number; name: string; animalType?: string }[] } | null) => {
      updateState({
        patientId: p?.id,
        patientName: p?.displayName,
        petId: undefined,
        petName: undefined,
        patientPets: p?.pets ?? [],
      });
      if (p?.id && (!p.pets || p.pets.length === 0)) loadPetsForOwner(p.id);
    },
    [updateState, loadPetsForOwner]
  );

  const handleConfirm = useCallback(() => {
    if (!state.patientId || (!state.serviceId && !state.packageId) || !state.slotStart || !state.slotEnd) {
      setError("Please complete patient, service or package, and time slot.");
      return;
    }
    const serviceIdForApi =
      state.serviceId ??
      (state.packageId ? packages.find((p) => p.id === state.packageId)?.serviceId : undefined) ??
      0;
    if (!serviceIdForApi) {
      setError("Service is required for this booking.");
      return;
    }
    setConfirming(true);
    setError(null);
    const scheduledStartAt = new Date(state.slotStart).toISOString();
    const scheduledEndAt = new Date(state.slotEnd).toISOString();
    const isAnyDoctor = state.doctorId === "auto" || state.doctorId == null || state.doctorId === 0;
    const effectiveDoctorId: number | null =
      isAnyDoctor || typeof state.doctorId !== "number" ? null : state.doctorId;
    const roomIdToSend =
      state.roomId ?? (compatibleRooms.length > 0 ? compatibleRooms[0].id : undefined);
    staffClinicAppointmentCreateV2(branchId, {
      patientId: state.patientId,
      petId: state.petId ?? undefined,
      doctorId: effectiveDoctorId,
      serviceId: serviceIdForApi,
      surgeryPackageId: state.packageId ?? undefined,
      scheduledStartAt,
      scheduledEndAt,
      notes: state.notes ?? undefined,
      specialInstructions: state.specialInstructions ?? undefined,
      appointmentType: state.appointmentType,
      durationMinutes: state.durationMinutes ?? undefined,
      source: "STAFF",
      channel: "COUNTER",
      visitType: "SCHEDULED",
      isAnyDoctor: effectiveDoctorId == null,
      priority: state.priority ?? "NORMAL",
      roomId: roomIdToSend ?? null,
    })
      .then((data: any) => {
        onSuccess(data?.data ?? data);
      })
      .catch((e: Error) => {
        setError(e?.message ?? "Booking failed");
      })
      .finally(() => setConfirming(false));
  }, [branchId, state, compatibleRooms, onSuccess, packages]);

  const canProceedStep1 = !!state.patientId;
  const canProceedStep2 =
    !!(state.serviceId || state.packageId) &&
    state.doctorId !== undefined &&
    !!state.date &&
    !!state.slotStart &&
    !!state.slotEnd;

  return (
    <div className="create-appointment-wizard">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">New appointment</h5>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <div className="small text-muted mb-3">
        Step {step} of 2: {step === 1 ? STEP_1_LABEL : STEP_2_LABEL}
      </div>
      {error && (
        <div className="alert alert-danger small mb-3" role="alert">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="step-1-basics">
          <div className="mb-3">
            <h6 className="text-uppercase text-muted small mb-2">Caller / Patient</h6>
            <PatientPetSelector
              patient={
                state.patientId
                  ? {
                      id: state.patientId,
                      displayName: state.patientName ?? "",
                      pets: state.patientPets ?? [],
                    }
                  : null
              }
              pet={state.petId ? { id: state.petId, name: state.petName ?? "" } : null}
              onPatientSelect={handlePatientSelect}
              onPetSelect={(p) => updateState({ petId: p?.id, petName: p?.name })}
              onSearch={handlePatientSearch}
              searchResults={patientSearchResults}
              searchLoading={searchingPatient || loadingPets}
            />
          </div>
          <div className="mb-3">
            <label className="form-label small">Urgency (optional)</label>
            <select
              className="form-select form-select-sm"
              value={state.priority ?? "NORMAL"}
              onChange={(e) => updateState({ priority: e.target.value as BookingWizardState["priority"] })}
            >
              <option value="NORMAL">Normal</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label small">Complaint / note (optional)</label>
            <textarea
              className="form-control form-control-sm"
              rows={2}
              value={state.notes ?? ""}
              onChange={(e) => updateState({ notes: e.target.value })}
              placeholder="Short complaint or note"
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="step-2-booking">
          <div className="row g-3">
            <div className="col-12">
              <h6 className="text-uppercase text-muted small mb-2">Appointment type</h6>
              <AppointmentTypeTabs
                value={state.appointmentType as AppointmentType}
                onChange={(t) => updateState({ appointmentType: t, serviceId: undefined, packageId: undefined })}
              />
            </div>
            <div className="col-12">
              <h6 className="text-uppercase text-muted small mb-2">
                {state.appointmentType === "PACKAGE" || state.appointmentType === "SURGERY" ? "Package" : "Service"}
              </h6>
              {(state.appointmentType === "CONSULTATION" || state.appointmentType === "SERVICE") && (
                <ServiceSelector
                  services={services}
                  selectedId={state.serviceId ?? null}
                  onSelect={(s) =>
                    updateState({ serviceId: s.id, serviceName: s.name, durationMinutes: s.duration ?? undefined })
                  }
                  loading={loadingServices}
                />
              )}
              {(state.appointmentType === "PACKAGE" || state.appointmentType === "SURGERY") && (
                <PackageSelector
                  packages={packages}
                  selectedId={state.packageId ?? null}
                  onSelect={(p) =>
                    updateState({
                      packageId: p.id,
                      packageName: p.packageName,
                      serviceId: (p as { serviceId?: number }).serviceId,
                    })
                  }
                  loading={loadingServices}
                />
              )}
              {((state.appointmentType === "PACKAGE" || state.appointmentType === "SURGERY") && !packages.length && !loadingServices) && (
                <p className="small text-muted mb-0">No packages available. Add packages in clinic setup or choose Consultation.</p>
              )}
            </div>
            <div className="col-12">
              <h6 className="text-uppercase text-muted small mb-2">Doctor</h6>
              <DoctorSelector
                doctors={doctors}
                selectedId={state.doctorId ?? null}
                onSelect={(d) =>
                  updateState({
                    doctorId: d === "auto" ? "auto" : d.doctorId,
                    doctorName: d === "auto" ? "Any available" : d.doctorName,
                  })
                }
                loading={loadingDoctors}
                showAutoAssign
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small">Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={state.date ?? ""}
                min={new Date().toISOString().split("T")[0]}
                max={
                  (() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 30);
                    return d.toISOString().split("T")[0];
                  })()
                }
                onChange={(e) => updateState({ date: e.target.value, slotStart: undefined, slotEnd: undefined })}
              />
            </div>
            <div className="col-12">
              <label className="form-label small">Time slot</label>
              {state.date ? (
                <SlotPicker
                  slotGroups={slotGroups}
                  selectedSlot={
                    state.slotStart && state.slotEnd && state.doctorId !== "auto" && typeof state.doctorId === "number"
                      ? { start: state.slotStart, end: state.slotEnd, doctorId: state.doctorId }
                      : state.slotStart && state.slotEnd
                        ? { start: state.slotStart, end: state.slotEnd, doctorId: 0 }
                        : undefined
                  }
                  onSelectSlot={(slot) =>
                    updateState({
                      slotStart: slot.start,
                      slotEnd: slot.end,
                      doctorId: slot.doctorId,
                      doctorName: slot.doctorName,
                    })
                  }
                  loading={loadingSlots}
                />
              ) : (
                <p className="small text-muted mb-0">Select a date first.</p>
              )}
            </div>
            <div className="col-12">
              <h6 className="text-uppercase text-muted small mb-2">Room</h6>
              {state.slotStart && state.slotEnd ? (
                loadingRooms ? (
                  <p className="small text-muted mb-0">Loading compatible rooms…</p>
                ) : compatibleRooms.length === 0 ? (
                  <p className="small text-muted mb-0">No compatible rooms available for this slot. You can still save without a room.</p>
                ) : (
                  <select
                    className="form-select form-select-sm"
                    value={
                      state.roomId != null
                        ? String(state.roomId)
                        : compatibleRooms.length > 0
                          ? "auto"
                          : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "auto") {
                        updateState({ roomId: null, roomName: "Auto (first available)" });
                      } else if (v === "") {
                        updateState({ roomId: undefined, roomName: undefined });
                      } else {
                        const id = Number(v);
                        const room = compatibleRooms.find((r) => r.id === id);
                        updateState({ roomId: id, roomName: room?.name });
                      }
                    }}
                  >
                    <option value="auto">Auto (first available)</option>
                    <option value="">No room</option>
                    {compatibleRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                        {r.code ? ` (${r.code})` : ""} — {r.roomType}
                      </option>
                    ))}
                  </select>
                )
              ) : (
                <p className="small text-muted mb-0">Select a time slot first.</p>
              )}
            </div>
            <div className="col-12">
              <PriceSummaryCard preview={displayPreview} loading={loadingPrice} />
            </div>
            <div className="col-12">
              <label className="form-label small">Internal note (optional)</label>
              <textarea
                className="form-control form-control-sm"
                rows={2}
                value={state.notes ?? ""}
                onChange={(e) => updateState({ notes: e.target.value })}
                placeholder="Internal note"
              />
            </div>
            <div className="col-12">
              <label className="form-label small">Special instructions (optional)</label>
              <textarea
                className="form-control form-control-sm"
                rows={2}
                value={state.specialInstructions ?? ""}
                onChange={(e) => updateState({ specialInstructions: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="col-12">
              <div className="card bg-light">
                <div className="card-body py-3">
                  <h6 className="small fw-semibold text-muted mb-2">Summary</h6>
                  <dl className="row mb-0 small">
                    <dt className="col-4 text-muted">Patient</dt>
                    <dd className="col-8 mb-1">{state.patientName ?? `#${state.patientId}`}</dd>
                    <dt className="col-4 text-muted">Pet</dt>
                    <dd className="col-8 mb-1">{state.petName ?? (state.petId ? `#${state.petId}` : "—")}</dd>
                    <dt className="col-4 text-muted">Service / Package</dt>
                    <dd className="col-8 mb-1">{state.serviceName ?? state.packageName ?? "—"}</dd>
                    <dt className="col-4 text-muted">Doctor</dt>
                    <dd className="col-8 mb-1">{state.doctorName ?? (state.doctorId === "auto" ? "Any" : "—")}</dd>
                    <dt className="col-4 text-muted">Date / Time</dt>
                    <dd className="col-8 mb-1">
                      {state.date ?? "—"} {state.slotStart ? new Date(state.slotStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </dd>
                    <dt className="col-4 text-muted">Room</dt>
                    <dd className="col-8 mb-1">{state.roomName ?? (state.roomId ? `#${state.roomId}` : compatibleRooms.length ? "Auto (first)" : "—")}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="col-12">
              <button
                type="button"
                className="btn btn-primary w-100"
                onClick={handleConfirm}
                disabled={confirming || !canProceedStep2}
              >
                {confirming ? "Saving…" : "Confirm & save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => setStep(1)}
          disabled={step === 1}
        >
          Back
        </button>
        {step === 1 ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setStep(2)}
            disabled={!canProceedStep1}
          >
            Next: Booking details
          </button>
        ) : (
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setStep(1)}>
            Back to patient
          </button>
        )}
      </div>
    </div>
  );
}
