"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  staffClinicQuickAppointmentCreate,
  staffClinicOwnerLookup,
  staffClinicPatientsList,
  staffClinicSlots,
  staffClinicServices,
  staffClinicDoctorsWithFees,
  staffClinicCheckDuplicate,
  staffClinicPackagesList,
} from "@/lib/api";
import { toast } from "react-toastify";

const OWNER_LOOKUP_DEBOUNCE_MS = 600;

function todayYMD() {
  return new Date().toISOString().split("T")[0];
}
function maxDateYMD() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

export default function QuickAppointmentDrawer({ open, onClose }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const branchIdFromParams = params?.branchId;
  const branchIdFromQuery = searchParams?.get("branchId");
  const branchId = branchIdFromParams || branchIdFromQuery || "";

  const [owner, setOwner] = useState(null);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [ownerLookupDone, setOwnerLookupDone] = useState(false);
  const [patients, setPatients] = useState([]);
  const [doctorsWithFees, setDoctorsWithFees] = useState([]);
  const [doctorsWithFeesLoading, setDoctorsWithFeesLoading] = useState(false);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [services, setServices] = useState([]);
  const ownerLookupDebounceRef = useRef(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [forceSaveAfterDuplicate, setForceSaveAfterDuplicate] = useState(false);

  const getInitialForm = useCallback(() => ({
    ownerName: "",
    mobileSnapshot: "",
    petId: "",
    petNameSnapshot: "",
    petTypeSnapshot: "",
    doctorId: "",
    serviceId: "",
    packageId: "",
    date: todayYMD(),
    slotStart: "",
    slotEnd: "",
    notes: "",
    priority: "NORMAL",
    status: "PRE_BOOKED",
  }), []);

  const [form, setForm] = useState(getInitialForm);

  useEffect(() => {
    if (!open) {
      if (ownerLookupDebounceRef.current) clearTimeout(ownerLookupDebounceRef.current);
      setOwner(null);
      setOwnerLookupDone(false);
      setPatients([]);
      setForm(getInitialForm());
      setDuplicateWarning(null);
      setForceSaveAfterDuplicate(false);
    }
  }, [open, getInitialForm]);

  useEffect(() => {
    if (!open || !branchId) return;
    setOptionsLoading(true);
    staffClinicServices(branchId)
      .then((s) => setServices(Array.isArray(s) ? s : []))
      .catch(() => toast.error("Could not load services"))
      .finally(() => setOptionsLoading(false));
  }, [open, branchId]);

  useEffect(() => {
    if (!open || !branchId || !form.serviceId) {
      setDoctorsWithFees([]);
      return;
    }
    setDoctorsWithFeesLoading(true);
    staffClinicDoctorsWithFees(branchId, Number(form.serviceId))
      .then((r) => setDoctorsWithFees(r?.doctors ?? []))
      .catch(() => setDoctorsWithFees([]))
      .finally(() => setDoctorsWithFeesLoading(false));
  }, [open, branchId, form.serviceId]);

  // Load all branch packages when drawer opens; dropdown filters by selected service
  const [branchPackages, setBranchPackages] = useState([]);
  useEffect(() => {
    if (!open || !branchId) {
      setBranchPackages([]);
      return;
    }
    setPackagesLoading(true);
    staffClinicPackagesList(branchId)
      .then((list) => setBranchPackages(Array.isArray(list) ? list : []))
      .catch(() => {
        setBranchPackages([]);
        toast.error("Could not load packages.");
      })
      .finally(() => setPackagesLoading(false));
  }, [open, branchId]);

  // Surgery package dropdown: show ACTIVE packages for the selected service (from branch list)
  const packages = useMemo(() => {
    if (!form.serviceId) return [];
    const sid = Number(form.serviceId);
    return branchPackages
      .filter((p) => p.serviceId === sid && (p.status === "ACTIVE" || !p.status))
      .map((p) => ({
        id: p.id,
        name: p.packageName || `Package #${p.id}`,
        basePrice: p.baseSellingPrice,
        packageType: p.packageType,
      }));
  }, [branchPackages, form.serviceId]);

  useEffect(() => {
    if (!open || !branchId) return;
    const trimmed = (form.mobileSnapshot || "").trim();
    const shouldTrigger = trimmed.length >= 10 || trimmed.includes("@");
    if (!shouldTrigger) {
      if (ownerLookupDebounceRef.current) clearTimeout(ownerLookupDebounceRef.current);
      return;
    }
    if (ownerLookupDebounceRef.current) clearTimeout(ownerLookupDebounceRef.current);
    ownerLookupDebounceRef.current = setTimeout(() => {
      ownerLookupDebounceRef.current = null;
      setOwnerSearching(true);
      staffClinicOwnerLookup(branchId, trimmed)
        .then((o) => {
          setOwner(o || null);
          if (o?.id) {
            setForm((f) => ({ ...f, ownerName: o.profile?.displayName ?? "" }));
            return staffClinicPatientsList(branchId, { ownerId: o.id, limit: 50 }).then((res) => {
              setPatients(Array.isArray(res?.patients) ? res.patients : []);
            });
          }
          setPatients([]);
        })
        .catch(() => {
          setOwner(null);
          setPatients([]);
        })
        .finally(() => {
          setOwnerSearching(false);
          setOwnerLookupDone(true);
        });
    }, OWNER_LOOKUP_DEBOUNCE_MS);
    return () => {
      if (ownerLookupDebounceRef.current) clearTimeout(ownerLookupDebounceRef.current);
    };
  }, [open, branchId, form.mobileSnapshot]);

  useEffect(() => {
    if (!branchId || !form.date) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    staffClinicSlots(branchId, {
      date: form.date,
      doctorId: form.doctorId ? Number(form.doctorId) : undefined,
      serviceId: form.serviceId ? Number(form.serviceId) : undefined,
    })
      .then((s) => setSlots(Array.isArray(s) ? s : []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [branchId, form.date, form.doctorId, form.serviceId]);

  const checkDuplicate = useCallback(async () => {
    const mobile = (form.mobileSnapshot || owner?.auth?.phone || "").trim();
    if (!mobile || !form.date) return null;
    const result = await staffClinicCheckDuplicate(branchId, {
      mobile,
      petName: form.petNameSnapshot || (form.petId && patients.find((p) => p.id === Number(form.petId))?.name),
      date: form.date,
    });
    return result;
  }, [branchId, form.mobileSnapshot, form.date, form.petNameSnapshot, form.petId, patients, owner]);

  const handleSaveDraft = useCallback(async () => {
    if (!branchId) return;
    const mobile = (form.mobileSnapshot || owner?.auth?.phone || "").trim();
    const ownerName = (form.ownerName || owner?.profile?.displayName || "").trim();
    if (!mobile) {
      toast.error("Mobile number is required.");
      return;
    }
    if (ownerName.length > 0 && ownerName.length < 2) {
      toast.error("Owner name must be at least 2 characters.");
      return;
    }
    if (!form.serviceId || !form.date || !form.slotStart || !form.slotEnd) {
      toast.error("Please fill service, date and time slot.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        patientId: owner?.id ?? null,
        petId: form.petId && form.petId !== "" ? Number(form.petId) : null,
        doctorId: form.doctorId ? Number(form.doctorId) : null,
        serviceId: Number(form.serviceId),
        surgeryPackageId: form.packageId && form.packageId !== "" ? Number(form.packageId) : null,
        scheduledStartAt: form.slotStart,
        scheduledEndAt: form.slotEnd,
        status: "DRAFT",
        ownerNameSnapshot: ownerName || null,
        mobileSnapshot: mobile,
        petNameSnapshot: (form.petNameSnapshot || (form.petId && patients.find((p) => p.id === Number(form.petId))?.name))?.trim() || null,
        petTypeSnapshot: form.petTypeSnapshot?.trim() || null,
        priority: form.priority,
        notes: form.notes?.trim() || null,
      };
      await staffClinicQuickAppointmentCreate(branchId, payload);
      toast.success("Draft saved.");
      onClose();
    } catch (e) {
      toast.error(e?.message || "Failed to save draft.");
    } finally {
      setSubmitting(false);
    }
  }, [branchId, form, owner, patients, onClose]);

  const handleSaveAndBook = useCallback(async () => {
    if (!branchId) return;
    const mobile = (form.mobileSnapshot || owner?.auth?.phone || "").trim();
    const ownerName = (form.ownerName || owner?.profile?.displayName || "").trim();
    if (!mobile) {
      toast.error("Mobile number is required.");
      return;
    }
    if (ownerName.length > 0 && ownerName.length < 2) {
      toast.error("Owner name must be at least 2 characters.");
      return;
    }
    if (!form.serviceId || !form.date || !form.slotStart || !form.slotEnd) {
      toast.error("Please fill service, date and time slot.");
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
    setDuplicateWarning(null);
    setForceSaveAfterDuplicate(false);
    try {
      const payload = {
        patientId: owner?.id ?? null,
        petId: form.petId && form.petId !== "" ? Number(form.petId) : null,
        doctorId: form.doctorId ? Number(form.doctorId) : null,
        serviceId: Number(form.serviceId),
        surgeryPackageId: form.packageId && form.packageId !== "" ? Number(form.packageId) : null,
        scheduledStartAt: form.slotStart,
        scheduledEndAt: form.slotEnd,
        status: "PRE_BOOKED",
        ownerNameSnapshot: ownerName || null,
        mobileSnapshot: mobile,
        petNameSnapshot: (form.petNameSnapshot || (form.petId && patients.find((p) => p.id === Number(form.petId))?.name))?.trim() || null,
        petTypeSnapshot: form.petTypeSnapshot?.trim() || null,
        priority: form.priority,
        notes: form.notes?.trim() || null,
      };
      const created = await staffClinicQuickAppointmentCreate(branchId, payload);
      toast.success(`Quick appointment #${created?.id ?? "saved"} created.`);
      onClose();
    } catch (e) {
      toast.error(e?.message || "Failed to create appointment.");
    } finally {
      setSubmitting(false);
    }
  }, [branchId, form, owner, patients, checkDuplicate, forceSaveAfterDuplicate, onClose]);

  const isToday = form.date === todayYMD();
  const now = new Date();
  const slotsFiltered = isToday ? slots.filter((s) => s.end && new Date(s.end) > now) : slots;

  if (!open) return null;

  const noBranch = !branchId;
  const slotValue = form.slotStart && slotsFiltered.some((s) => s.start && new Date(s.start).toISOString() === form.slotStart) ? form.slotStart : "";

  return (
    <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1} onClick={onClose} aria-hidden="true">
      <div className="modal-dialog modal-dialog-scrollable modal-xl modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content shadow">
          <div className="modal-header border-bottom bg-light py-3">
            <h5 className="modal-title fw-semibold me-2">Quick Appointment</h5>
            <span className="  small badge bg-success me-3">Phone booking</span>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body py-4">
            {noBranch ? (
              <p className="text-muted mb-0">Select a branch (e.g. Staff → Branch → Clinic) to use Quick Appointment.</p>
            ) : (
              <>
                {duplicateWarning?.possibleDuplicate && (
                  <div className="alert alert-warning py-2 small mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <span>Possible duplicate: same mobile and date.</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-warning"
                      onClick={() => {
                        setDuplicateWarning(null);
                        setForceSaveAfterDuplicate(true);
                        setTimeout(() => handleSaveAndBook(), 0);
                      }}
                    >
                      Save anyway
                    </button>
                  </div>
                )}

                <div className="card border-0 bg-light mb-3">
                  <div className="card-header bg-transparent border-0 py-2 px-3 fw-semibold small text-uppercase text-muted">
                    Caller information
                  </div>
                  <div className="card-body py-3 px-3">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-medium mb-1">Mobile or email *</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Enter phone number or email"
                          value={form.mobileSnapshot}
                          onChange={(e) => setForm((f) => ({ ...f, mobileSnapshot: e.target.value }))}
                        />
                        {ownerSearching && <small className="text-muted d-block mt-1">Looking up…</small>}
                        {ownerLookupDone && (
                          <div className="mt-2 p-2 rounded border bg-white small">
                            {owner ? (
                              <>
                                <div className="fw-medium text-success">Existing owner found</div>
                                <div>Owner name: {owner.profile?.displayName ?? "—"}</div>
                                <div>Owner ID: #{owner.id}</div>
                                <div>Mobile: {owner.auth?.phone ?? owner.auth?.email ?? "—"}</div>
                              </>
                            ) : (
                              <>
                                <div className="fw-medium text-secondary">No existing owner found</div>
                                <div className="text-muted">You can continue as a new caller.</div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-medium mb-1">Caller / Owner name</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Full name or caller name"
                          value={form.ownerName}
                          onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card border-0 bg-light mb-3">
                  <div className="card-header bg-transparent border-0 py-2 px-3 fw-semibold small text-uppercase text-muted">
                    Pet information (optional)
                  </div>
                  <div className="card-body py-3 px-3">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-medium mb-1">Select pet</label>
                        <select
                          className="form-select form-select-sm"
                          value={form.petId}
                          onChange={(e) => {
                            const v = e.target.value;
                            const p = patients.find((x) => x.id === Number(v));
                            setForm((f) => ({
                              ...f,
                              petId: v,
                              petNameSnapshot: p?.name ?? f.petNameSnapshot,
                              petTypeSnapshot: p?.animalType?.name ?? f.petTypeSnapshot,
                            }));
                          }}
                          disabled={!owner}
                        >
                          <option value="">— Select pet —</option>
                          {patients.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} — {p.animalType?.name ?? ""}</option>
                          ))}
                        </select>
                        {owner && patients.length === 0 && (
                          <small className="text-muted d-block mt-1">
                            No registered pets found for this owner. You can enter new pet information below.
                          </small>
                        )}
                      </div>
                      <div className="col-md-3">
                        <label className="form-label small fw-medium mb-1">Pet name (if new)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Pet name"
                          value={form.petNameSnapshot}
                          onChange={(e) => setForm((f) => ({ ...f, petNameSnapshot: e.target.value }))}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label small fw-medium mb-1">Species / Type</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. Dog, Cat"
                          value={form.petTypeSnapshot}
                          onChange={(e) => setForm((f) => ({ ...f, petTypeSnapshot: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card border-0 bg-light mb-0">
                  <div className="card-header bg-transparent border-0 py-2 px-3 fw-semibold small text-uppercase text-muted">
                    Visit details
                  </div>
                  <div className="card-body py-3 px-3">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-medium mb-1">Service *</label>
                        <select
                          className="form-select form-select-sm"
                          value={form.serviceId}
                          onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value, packageId: "", doctorId: "", slotStart: "", slotEnd: "" }))}
                          disabled={optionsLoading}
                        >
                          <option value="">{optionsLoading ? "Loading…" : "Select service"}</option>
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-medium mb-1">Surgery package (optional)</label>
                        <select
                          className="form-select form-select-sm"
                          value={form.packageId}
                          onChange={(e) => setForm((f) => ({ ...f, packageId: e.target.value }))}
                          disabled={!form.serviceId || packagesLoading}
                        >
                          <option value="">
                            {packagesLoading
                              ? "Loading packages…"
                              : !form.serviceId
                                ? "Select service first"
                                : "— None —"}
                          </option>
                          {packages.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name || `Package #${p.id}`}
                              {p.basePrice != null ? ` — ${Number(p.basePrice)}` : ""}
                              {p.packageType ? ` (${p.packageType})` : ""}
                            </option>
                          ))}
                        </select>
                        {!packagesLoading && form.serviceId && packages.length === 0 && (
                          <small className="text-muted d-block mt-1">No active packages available for this service.</small>
                        )}
                        {!form.serviceId && (
                          <small className="text-muted d-block mt-1">Select a service to see linked packages.</small>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-medium mb-1">Preferred doctor</label>
                        <select
                          className="form-select form-select-sm"
                          value={form.doctorId}
                          onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value, slotStart: "", slotEnd: "" }))}
                          disabled={optionsLoading || !form.serviceId || doctorsWithFeesLoading}
                        >
                          <option value="">
                            {!form.serviceId
                              ? "Select service first"
                              : doctorsWithFeesLoading
                                ? "Loading…"
                                : "Any available doctor — Fee varies by assigned doctor"}
                          </option>
                          {doctorsWithFees.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.displayName} — {d.feeLabel ?? "—"}
                            </option>
                          ))}
                        </select>
                        {form.serviceId && (
                          <small className="text-muted d-block mt-1">
                            Doctor-specific pricing for selected service. Final charge may vary.
                          </small>
                        )}
                        {!form.serviceId && (
                          <small className="text-muted d-block mt-1">Select a service to see doctor availability and fees.</small>
                        )}
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-medium mb-1">Appointment date *</label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={form.date}
                          min={todayYMD()}
                          max={maxDateYMD()}
                          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value, slotStart: "", slotEnd: "" }))}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-medium mb-1">Time slot *</label>
                        <select
                          className="form-select form-select-sm"
                          value={slotValue}
                          onChange={(e) => {
                            const iso = e.target.value;
                            const s = slotsFiltered.find((x) => x.start && new Date(x.start).toISOString() === iso);
                            if (s?.start != null && s?.end != null) {
                              setForm((f) => ({ ...f, slotStart: new Date(s.start).toISOString(), slotEnd: new Date(s.end).toISOString() }));
                            }
                          }}
                          disabled={slotsLoading}
                        >
                          <option value="">{slotsLoading ? "Loading…" : "Select time"}</option>
                          {slotsFiltered.map((s, i) => {
                            const iso = s.start ? new Date(s.start).toISOString() : "";
                            return (
                              <option key={`slot-${i}-${iso}`} value={iso}>
                                {s.start && new Date(s.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-medium mb-1">Urgency</label>
                        <select
                          className="form-select form-select-sm"
                          value={form.priority}
                          onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                        >
                          <option value="NORMAL">Normal</option>
                          <option value="EMERGENCY">Emergency</option>
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-medium mb-1">Note / Chief complaint</label>
                        <textarea
                          className="form-control form-control-sm"
                          rows={2}
                          placeholder="Short note or complaint"
                          value={form.notes}
                          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {form.serviceId && (
                  <div className="card border-0 bg-light mb-3">
                    <div className="card-header bg-transparent border-0 py-2 px-3 fw-semibold small text-uppercase text-muted">
                      Appointment summary
                    </div>
                    <div className="card-body py-3 px-3 small">
                      <div>Service: {services.find((s) => s.id === Number(form.serviceId))?.name ?? "—"}</div>
                      <div>
                        Preferred doctor: {form.doctorId
                          ? (doctorsWithFees.find((d) => d.id === Number(form.doctorId))?.displayName ?? "—")
                          : "Any"}
                      </div>
                      <div>
                        Visit fee: {form.doctorId
                          ? (doctorsWithFees.find((d) => d.id === Number(form.doctorId))?.feeLabel ?? "—")
                          : "Varies by assigned doctor"}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          {!noBranch && (
            <div className="modal-footer border-top bg-light py-3">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn btn-outline-primary" onClick={handleSaveDraft} disabled={submitting}>
                Save draft
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveAndBook} disabled={submitting}>
                {submitting ? "Saving…" : "Save & book"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
