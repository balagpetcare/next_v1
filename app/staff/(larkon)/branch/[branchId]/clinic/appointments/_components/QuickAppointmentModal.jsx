"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  staffClinicQuickAppointmentCreate,
  staffClinicDoctors,
  staffClinicServices,
  getAnimalTypes,
  staffClinicCheckDuplicate,
  staffClinicOwnerLookup,
  staffClinicPatientsList,
} from "@/lib/api";
import { branchLocalToUTCISO } from "@/lib/clinicScheduleTime";

const OWNER_LOOKUP_DEBOUNCE_MS = 450;
const MIN_PHONE_LENGTH_FOR_LOOKUP = 10;

/** Fallback when service has no duration; must match backend DEFAULT_SLOT_MINUTES for consistency. */
const FALLBACK_DURATION_MINUTES = 15;
const MIN_DURATION_MINUTES = 5;

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function defaultTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Lightweight quick-entry modal for clinic staff. Creates a normal Appointment via
 * canonical quick-create API (PRE_BOOKED). source/channel default to PHONE (backend);
 * API accepts optional source/channel for reporting (e.g. WALKIN, STAFF). branchId from staff context.
 */
export default function QuickAppointmentModal({ branchId, onClose, onSuccess }) {
  const [appointmentDate, setAppointmentDate] = useState(todayYMD);
  const [appointmentTime, setAppointmentTime] = useState(defaultTime);
  const [phone, setPhone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [petName, setPetName] = useState("");
  const [animalTypeId, setAnimalTypeId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [notes, setNotes] = useState("");

  const [services, setServices] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [animalTypes, setAnimalTypes] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const forceSaveRef = useRef(false);

  const [ownerSuggestions, setOwnerSuggestions] = useState(null);
  const [ownerLookupLoading, setOwnerLookupLoading] = useState(false);
  const ownerLookupDebounceRef = useRef(null);
  const [linkedOwner, setLinkedOwner] = useState(null);
  const [linkedPetId, setLinkedPetId] = useState("");
  const [linkedPetName, setLinkedPetName] = useState("");

  useEffect(() => {
    if (!branchId) return;
    setOptionsLoading(true);
    Promise.all([
      staffClinicServices(branchId),
      staffClinicDoctors(branchId),
      getAnimalTypes(),
    ])
      .then(([svc, doc, types]) => {
        const svcList = Array.isArray(svc) ? svc : [];
        setServices(svcList);
        setDoctors(Array.isArray(doc) ? doc : []);
        setAnimalTypes(Array.isArray(types) ? types : []);
        if (svcList.length > 0) {
          setServiceId((prev) => (prev ? prev : String(svcList[0].id)));
        }
      })
      .catch(() => {
        setServices([]);
        setDoctors([]);
        setAnimalTypes([]);
      })
      .finally(() => setOptionsLoading(false));
  }, [branchId]);

  useEffect(() => {
    const trimmed = (phone || "").trim();
    const trigger = trimmed.length >= MIN_PHONE_LENGTH_FOR_LOOKUP || trimmed.includes("@");
    if (!trigger || !branchId) {
      if (ownerLookupDebounceRef.current) clearTimeout(ownerLookupDebounceRef.current);
      setOwnerSuggestions(null);
      return;
    }
    if (ownerLookupDebounceRef.current) clearTimeout(ownerLookupDebounceRef.current);
    ownerLookupDebounceRef.current = setTimeout(() => {
      ownerLookupDebounceRef.current = null;
      setOwnerLookupLoading(true);
      staffClinicOwnerLookup(branchId, trimmed)
        .then((owner) => {
          if (!owner?.id) {
            setOwnerSuggestions(null);
            return;
          }
          return staffClinicPatientsList(branchId, { ownerId: owner.id, limit: 20 }).then((res) => {
            const patients = Array.isArray(res?.patients) ? res.patients : [];
            setOwnerSuggestions({ owner, patients });
          });
        })
        .catch(() => setOwnerSuggestions(null))
        .finally(() => setOwnerLookupLoading(false));
    }, OWNER_LOOKUP_DEBOUNCE_MS);
    return () => {
      if (ownerLookupDebounceRef.current) clearTimeout(ownerLookupDebounceRef.current);
    };
  }, [branchId, phone]);

  const clearLinkedCustomer = useCallback(() => {
    setLinkedOwner(null);
    setLinkedPetId("");
    setLinkedPetName("");
  }, []);

  const selectOwnerOnly = useCallback((owner) => {
    setLinkedOwner(owner);
    setLinkedPetId("");
    setLinkedPetName("");
    setOwnerName(owner?.profile?.displayName ?? owner?.auth?.phone ?? "");
    setOwnerSuggestions(null);
  }, []);

  const selectOwnerAndPet = useCallback((owner, pet) => {
    setLinkedOwner(owner);
    setLinkedPetId(pet?.id ? String(pet.id) : "");
    setLinkedPetName(pet?.name ?? "");
    setOwnerName(owner?.profile?.displayName ?? owner?.auth?.phone ?? "");
    setPetName(pet?.name ?? "");
    setOwnerSuggestions(null);
  }, []);

  const selectedService = services.find((s) => s.id === Number(serviceId));

  /** Canonical duration: selected service duration → fallback (matches backend slot default). */
  const durationMinutes = Math.max(
    MIN_DURATION_MINUTES,
    selectedService?.duration != null && Number.isFinite(Number(selectedService.duration))
      ? Number(selectedService.duration)
      : FALLBACK_DURATION_MINUTES
  );

  const validate = useCallback(() => {
    const date = (appointmentDate || "").trim();
    const time = (appointmentTime || "").trim();
    const ph = (phone || "").trim();
    const name = (ownerName || "").trim();
    if (!date) return "Appointment date is required.";
    if (!time) return "Appointment time is required.";
    if (!ph) return "Phone is required.";
    if (!name) return "Owner name is required.";
    if (name.length < 2) return "Owner name must be at least 2 characters.";
    const serviceNum = serviceId ? Number(serviceId) : NaN;
    if (!Number.isFinite(serviceNum) || services.find((s) => s.id === serviceNum) == null) {
      return "Service is required. Please select a service.";
    }
    return null;
  }, [appointmentDate, appointmentTime, phone, ownerName, serviceId, services]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setFormError("");
      setDuplicateWarning(null);
      const err = validate();
      if (err) {
        setFormError(err);
        return;
      }
      if (submitting) return;

      const ph = (phone || "").trim();
      const dateStr = (appointmentDate || "").trim();
      if (!forceSaveRef.current && ph && dateStr) {
        try {
          const dup = await staffClinicCheckDuplicate(branchId, {
            mobile: ph,
            petName: (petName || "").trim() || undefined,
            date: dateStr,
          });
          if (dup?.possibleDuplicate && dup?.existing?.length > 0) {
            setDuplicateWarning(dup);
            return;
          }
        } catch (_) {
          // proceed without duplicate check
        }
      }
      forceSaveRef.current = false;

      setSubmitting(true);
      try {
        const startISO = branchLocalToUTCISO(appointmentDate, appointmentTime);
        const startMs = new Date(startISO).getTime();
        if (Number.isNaN(startMs)) {
          setFormError("Invalid date or time.");
          setSubmitting(false);
          return;
        }
        const endISO = new Date(startMs + durationMinutes * 60 * 1000).toISOString();
        const payload = {
          patientId: linkedOwner?.id ?? null,
          petId: linkedPetId ? Number(linkedPetId) : null,
          doctorId: doctorId ? Number(doctorId) : null,
          serviceId: Number(serviceId),
          scheduledStartAt: startISO,
          scheduledEndAt: endISO,
          status: "PRE_BOOKED",
          ownerNameSnapshot: ownerName.trim() || null,
          mobileSnapshot: ph,
          petNameSnapshot: (petName || "").trim() || null,
          petTypeSnapshot: animalTypeId
            ? (animalTypes.find((t) => t.id === Number(animalTypeId))?.name ?? null)
            : null,
          notes: (notes || "").trim() || null,
        };
        await staffClinicQuickAppointmentCreate(branchId, payload);
        onSuccess?.();
        onClose?.();
      } catch (e) {
        setFormError(e?.message || "Failed to create appointment.");
      } finally {
        setSubmitting(false);
      }
    },
    [
      validate,
      submitting,
      appointmentDate,
      appointmentTime,
      ownerName,
      phone,
      petName,
      animalTypeId,
      animalTypes,
      serviceId,
      doctorId,
      notes,
      branchId,
      onSuccess,
      onClose,
      durationMinutes,
      linkedOwner,
      linkedPetId,
    ]
  );

  const handleCancel = useCallback(() => {
    if (!submitting) onClose?.();
  }, [submitting, onClose]);

  if (!branchId) return null;

  return (
    <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1} role="dialog" aria-labelledby="quickAppointmentTitle">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header py-2">
            <h5 className="modal-title" id="quickAppointmentTitle">Quick Appointment</h5>
            <button type="button" className="btn-close" onClick={handleCancel} aria-label="Close" disabled={submitting} />
          </div>
          <form id="quick-appointment-form" onSubmit={handleSubmit}>
            <div className="modal-body py-3">
              {formError && (
                <div className="alert alert-danger py-2 mb-3" role="alert">
                  {formError}
                </div>
              )}
              {duplicateWarning?.possibleDuplicate && duplicateWarning?.existing?.length > 0 && (
                <div className="alert alert-warning py-2 mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2" role="alert">
                  <span className="small">
                    Possible duplicate: same phone/date already has appointment(s) in this branch.
                  </span>
                  <div className="d-flex gap-1">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => { setDuplicateWarning(null); }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-warning btn-sm"
                      onClick={() => {
                        forceSaveRef.current = true;
                        setDuplicateWarning(null);
                        document.getElementById("quick-appointment-form")?.requestSubmit();
                      }}
                    >
                      Save anyway
                    </button>
                  </div>
                </div>
              )}
              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label small mb-0">Date <span className="text-danger">*</span></label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    min={todayYMD()}
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small mb-0">Time <span className="text-danger">*</span></label>
                  <input
                    type="time"
                    className="form-control form-control-sm"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="mt-2">
                <label className="form-label small mb-0">Phone <span className="text-danger">*</span></label>
                <input
                  type="tel"
                  className="form-control form-control-sm"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                {ownerLookupLoading && (
                  <p className="small text-muted mb-0 mt-1">Searching existing customers…</p>
                )}
                {ownerSuggestions?.owner && !linkedOwner && (
                  <div className="border rounded p-2 mt-2 bg-light small">
                    <span className="fw-medium">Existing customer: {ownerSuggestions.owner.profile?.displayName ?? ownerSuggestions.owner.id}</span>
                    {ownerSuggestions.patients?.length > 0 && (
                      <span className="text-muted ms-1">({ownerSuggestions.patients.length} pet(s))</span>
                    )}
                    <div className="d-flex flex-wrap gap-1 mt-2">
                      <button
                        type="button"
                        className="btn btn-outline-success btn-sm"
                        onClick={() => selectOwnerOnly(ownerSuggestions.owner)}
                      >
                        Use this customer
                      </button>
                      {ownerSuggestions.patients?.slice(0, 5).map((pet) => (
                        <button
                          key={pet.id}
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => selectOwnerAndPet(ownerSuggestions.owner, pet)}
                        >
                          {pet.name}
                        </button>
                      ))}
                      <button type="button" className="btn btn-link btn-sm text-muted p-0" onClick={() => setOwnerSuggestions(null)}>
                        Skip
                      </button>
                    </div>
                  </div>
                )}
                {linkedOwner && (
                  <div className="d-flex align-items-center gap-2 mt-1 small flex-wrap">
                    <span className="badge bg-success">Linked: {linkedOwner.profile?.displayName ?? linkedOwner.id}</span>
                    {linkedPetId && linkedPetName && (
                      <span className="badge bg-info">Pet: {linkedPetName}</span>
                    )}
                    <button type="button" className="btn btn-link btn-sm p-0 text-muted" onClick={clearLinkedCustomer}>
                      Change
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-2">
                <label className="form-label small mb-0">Owner name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Owner full name"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  minLength={2}
                  required
                />
              </div>
              <div className="mt-2">
                <label className="form-label small mb-0">Pet name <span className="text-muted">(optional)</span></label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Pet name"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                />
              </div>
              <div className="mt-2">
                <label className="form-label small mb-0">Species <span className="text-muted">(optional)</span></label>
                <select
                  className="form-select form-select-sm"
                  value={animalTypeId}
                  onChange={(e) => setAnimalTypeId(e.target.value)}
                >
                  <option value="">—</option>
                  {animalTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="mt-2">
                <label className="form-label small mb-0">Service <span className="text-danger">*</span></label>
                <select
                  className="form-select form-select-sm"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  required
                  aria-required="true"
                >
                  <option value="">Select service (required)</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{s.duration != null ? ` (${s.duration} min)` : ""}</option>
                  ))}
                </select>
                {services.length === 0 && !optionsLoading && (
                  <p className="small text-danger mb-0 mt-1">No services available. Add a service for this branch first.</p>
                )}
              </div>
              <div className="mt-2">
                <label className="form-label small mb-0">Doctor <span className="text-muted">(optional)</span></label>
                <select
                  className="form-select form-select-sm"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                >
                  <option value="">Any</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.displayName ?? d.name}</option>
                  ))}
                </select>
              </div>
              <div className="mt-2">
                <label className="form-label small mb-0">Notes <span className="text-muted">(optional)</span></label>
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  placeholder="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              {optionsLoading && (
                <p className="small text-muted mb-0 mt-2">Loading services…</p>
              )}
            </div>
            <div className="modal-footer py-2">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleCancel} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || optionsLoading || services.length === 0}>
                {submitting ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
