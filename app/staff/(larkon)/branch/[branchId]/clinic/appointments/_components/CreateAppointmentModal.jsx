"use client";

import { useEffect, useState, useCallback } from "react";
import {
  staffClinicDoctors,
  staffClinicServices,
  staffClinicSlots,
  staffClinicOwnerLookup,
  staffClinicPatientsList,
  staffClinicPatientRegister,
  staffClinicCheckDuplicate,
  staffClinicAppointmentCreateV2,
} from "@/lib/api";
import { useAnimalTypes, useBreedsByAnimalType } from "@/lib/usePetTaxonomy";
import { formatPetTaxonomyLine } from "@/lib/formatPetTaxonomy";

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function maxDateYMD() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const CHANNEL_MODES = [
  { id: "phone", label: "Phone", desc: "Quick booking by phone" },
  { id: "walkin", label: "Walk-in", desc: "Patient at counter" },
  { id: "full", label: "Online / Scheduled", desc: "Full details, referral or online" },
];

function formatPetLabel(p) {
  const taxonomy = formatPetTaxonomyLine(p);
  const sex = p.sex ?? "";
  const ownerName = p.owner?.displayName ?? "";
  const parts = [p.name, taxonomy, sex].filter(Boolean);
  const label = parts.join(" — ");
  return ownerName ? `${label} — Owner: ${ownerName}` : label;
}

const PET_ID_NEW = "__new__";

function PetSelectWithQuickCreate({ owner, patients, setPatients, form, setForm, branchId, animalTypes, setFormError }) {
  const [quickPet, setQuickPet] = useState({ name: "", animalTypeId: "", breedId: "", sex: "" });
  const { breeds = [] } = useBreedsByAnimalType(quickPet.animalTypeId || null);
  const [creating, setCreating] = useState(false);

  const refetchPatients = useCallback(() => {
    if (!owner?.id || !branchId) return;
    staffClinicPatientsList(branchId, { ownerId: owner.id, limit: 50 }).then((res) =>
      setPatients(Array.isArray(res?.patients) ? res.patients : [])
    );
  }, [owner?.id, branchId, setPatients]);

  const handleAddQuickPet = useCallback(() => {
    const name = (quickPet.name || "").trim();
    const animalTypeId = quickPet.animalTypeId ? Number(quickPet.animalTypeId) : null;
    if (!name) {
      setFormError("Pet name is required.");
      return;
    }
    if (!animalTypeId) {
      setFormError("Pet type is required.");
      return;
    }
    if (!owner?.id) return;
    setCreating(true);
    setFormError("");
    staffClinicPatientRegister(branchId, {
      userId: owner.id,
      name,
      animalTypeId,
      breedId: quickPet.breedId ? Number(quickPet.breedId) : undefined,
      sex: quickPet.sex || undefined,
    })
      .then((newPet) => {
        if (newPet?.id) {
          refetchPatients();
          setForm((f) => ({ ...f, petId: String(newPet.id) }));
          setQuickPet({ name: "", animalTypeId: "", breedId: "", sex: "" });
        }
      })
      .catch((e) => setFormError(e?.message || "Failed to add pet"))
      .finally(() => setCreating(false));
  }, [branchId, owner?.id, quickPet, refetchPatients, setForm, setFormError]);

  const showQuickCreate = form.petId === PET_ID_NEW;
  const ownerFound = !!owner;

  return (
    <div className="mb-3">
      <label className="form-label">Pet (optional)</label>
      <select
        className="form-select"
        value={form.petId}
        onChange={(e) => setForm((f) => ({ ...f, petId: e.target.value }))}
        disabled={!ownerFound}
      >
        <option value="">—</option>
        {!ownerFound ? null : patients.length === 0 ? (
          <option disabled>No pets found for this owner</option>
        ) : (
          patients.map((p) => (
            <option key={p.id} value={p.id}>
              {formatPetLabel(p)}
            </option>
          ))
        )}
        {ownerFound && <option value={PET_ID_NEW}>+ Create Quick Pet</option>}
      </select>
      {showQuickCreate && ownerFound && (
        <div className="border rounded p-2 mt-2 bg-light">
          <div className="small fw-medium mb-2 d-flex justify-content-between align-items-center flex-wrap gap-1">
            <span>Add new pet</span>
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-muted"
              onClick={() => setForm((f) => ({ ...f, petId: "" }))}
            >
              No pet / choose existing
            </button>
          </div>
          <input
            type="text"
            className="form-control form-control-sm mb-2"
            placeholder="Pet name"
            value={quickPet.name}
            onChange={(e) => setQuickPet((q) => ({ ...q, name: e.target.value }))}
          />
          <select
            className="form-select form-select-sm mb-2"
            value={quickPet.animalTypeId}
            onChange={(e) => setQuickPet((q) => ({ ...q, animalTypeId: e.target.value, breedId: "" }))}
          >
            <option value="">Pet type</option>
            {(animalTypes || []).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            className="form-select form-select-sm mb-2"
            value={quickPet.breedId}
            onChange={(e) => setQuickPet((q) => ({ ...q, breedId: e.target.value }))}
          >
            <option value="">Breed (optional)</option>
            {breeds.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            className="form-select form-select-sm mb-2"
            value={quickPet.sex}
            onChange={(e) => setQuickPet((q) => ({ ...q, sex: e.target.value }))}
          >
            <option value="">Sex (optional)</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
          <button type="button" className="btn btn-sm btn-primary" onClick={handleAddQuickPet} disabled={creating}>
            {creating ? "…" : "Add Pet"}
          </button>
        </div>
      )}
    </div>
  );
}

function CreateAppointmentModal({ branchId, onClose, onSuccess, initialChannel }) {
  const initialMode =
    initialChannel === "PHONE" ? "phone" : initialChannel === "ONLINE" ? "full" : "walkin";
  const [channelMode, setChannelMode] = useState(initialMode);
  const [step, setStep] = useState(0);
  const [ownerQuery, setOwnerQuery] = useState("");
  const [owner, setOwner] = useState(null);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const { types: animalTypes = [], loading: animalTypesLoading = false } = useAnimalTypes();
  const optionsOrTypesLoading = optionsLoading || animalTypesLoading;
  const [form, setForm] = useState({
    visitType: "WALK_IN",
    channel: "COUNTER",
    priority: "NORMAL",
    patientId: "",
    petId: "",
    doctorId: "",
    serviceId: "",
    date: todayYMD(),
    slotStart: "",
    slotEnd: "",
    notes: "",
    payNow: false,
    paymentMethod: "CASH",
    amount: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!branchId) {
      setOptionsLoading(false);
      return;
    }
    setOptionsLoading(true);
    setOptionsError("");
    Promise.all([staffClinicDoctors(branchId), staffClinicServices(branchId)])
      .then(([d, s]) => {
        setDoctors(Array.isArray(d) ? d : []);
        setServices(Array.isArray(s) ? s : []);
      })
      .catch(() => {
        setOptionsError("Could not load doctors/services. Check branch clinic setup.");
      })
      .finally(() => setOptionsLoading(false));
  }, [branchId]);

  useEffect(() => {
    if (!form.date || !branchId) {
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

  const isToday = form.date === todayYMD();
  const now = new Date();
  const slotsFiltered = isToday
    ? slots.filter((s) => s.end && new Date(s.end) > now)
    : slots;

  async function searchOwner() {
    if (!ownerQuery.trim()) return;
    setOwnerSearching(true);
    setFormError("");
    try {
      const o = await staffClinicOwnerLookup(branchId, ownerQuery.trim());
      setOwner(o || null);
      if (o?.id) {
        setForm((f) => ({ ...f, patientId: String(o.id) }));
        const res = await staffClinicPatientsList(branchId, { ownerId: o.id, limit: 50 });
        setPatients(Array.isArray(res?.patients) ? res.patients : []);
      } else {
        setPatients([]);
      }
    } catch {
      setOwner(null);
      setPatients([]);
      setFormError("Owner not found. Try phone or email.");
    } finally {
      setOwnerSearching(false);
    }
  }

  function buildPayload(source, channel, visitType, isInstant, isAnyDoctor, paymentStatus, paymentMethod, paidAmount) {
    const rawDoctorId = form.doctorId ? Number(form.doctorId) : null;
    const isAnyDoctorVal = !form.doctorId || form.doctorId === "any" || rawDoctorId === 0 || Number.isNaN(rawDoctorId);
    const effectiveDoctorId = isAnyDoctorVal ? null : rawDoctorId;
    return {
      patientId: Number(form.patientId),
      petId: form.petId ? Number(form.petId) : undefined,
      doctorId: effectiveDoctorId,
      serviceId: Number(form.serviceId),
      scheduledStartAt: form.slotStart,
      scheduledEndAt: form.slotEnd,
      source: source || "STAFF",
      notes: form.notes || undefined,
      visitType: visitType || form.visitType,
      isInstant: !!isInstant,
      isAnyDoctor: effectiveDoctorId == null,
      channel: channel || form.channel,
      paymentStatus: paymentStatus ?? (form.payNow ? "PAID" : "UNPAID"),
      paymentMethod: form.payNow ? form.paymentMethod : undefined,
      paidAmount: form.payNow && form.amount ? Number(form.amount) : undefined,
      priority: form.priority,
    };
  }

  function doCreate(payload) {
    setSubmitting(true);
    staffClinicAppointmentCreateV2(branchId, payload)
      .then(() => onSuccess())
      .catch((err) => setFormError(err?.message || "Create failed"))
      .finally(() => setSubmitting(false));
  }

  const selectedService = services.find((s) => s.id === Number(form.serviceId));
  const suggestedAmount = selectedService?.price != null ? Number(selectedService.price) : "";

  function SlotSelect({ value, onChange, filteredSlots }) {
    const slotValue = value && filteredSlots.some((s) => s.start && new Date(s.start).toISOString() === value) ? value : "";
    return (
      <select
        className="form-select"
        value={slotValue}
        onChange={(e) => {
          const iso = e.target.value;
          const s = filteredSlots.find((x) => x.start && new Date(x.start).toISOString() === iso);
          if (s?.start != null && s?.end != null) onChange(new Date(s.start).toISOString(), new Date(s.end).toISOString());
        }}
      >
        <option value="">Select</option>
        {filteredSlots.map((s) => {
          const iso = s.start ? new Date(s.start).toISOString() : "";
          return (
            <option key={iso || Math.random()} value={iso}>
              {s.start && new Date(s.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {" ÔÇô "}
              {s.end && new Date(s.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </option>
          );
        })}
      </select>
    );
  }

  return (
    <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1}>
      <div className="modal-dialog modal-dialog-scrollable modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">New appointment</h5>
            <div className="d-flex align-items-center gap-2 small">
              {CHANNEL_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`btn btn-sm ${channelMode === m.id ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => setChannelMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body">
            {formError && <div className="alert alert-danger py-2">{formError}</div>}
            {optionsError && <div className="alert alert-warning py-2 small">{optionsError}</div>}

            {channelMode === "phone" && (
              <PhoneQuickForm
                branchId={branchId}
                form={form}
                setForm={setForm}
                ownerQuery={ownerQuery}
                setOwnerQuery={setOwnerQuery}
                owner={owner}
                setOwner={setOwner}
                patients={patients}
                setPatients={setPatients}
                doctors={doctors}
                services={services}
                slots={slotsFiltered}
                slotsLoading={slotsLoading}
                optionsLoading={optionsOrTypesLoading}
                searchOwner={searchOwner}
                ownerSearching={ownerSearching}
                buildPayload={buildPayload}
                doCreate={doCreate}
                submitting={submitting}
                setFormError={setFormError}
                SlotSelect={SlotSelect}
                todayYMD={todayYMD}
                maxDateYMD={maxDateYMD}
                onClose={onClose}
                animalTypes={animalTypes}
              />
            )}

            {channelMode === "walkin" && (
              <WalkInForm
                branchId={branchId}
                form={form}
                setForm={setForm}
                step={step}
                setStep={setStep}
                ownerQuery={ownerQuery}
                setOwnerQuery={setOwnerQuery}
                owner={owner}
                setOwner={setOwner}
                patients={patients}
                setPatients={setPatients}
                doctors={doctors}
                services={services}
                slots={slotsFiltered}
                slotsLoading={slotsLoading}
                optionsLoading={optionsOrTypesLoading}
                searchOwner={searchOwner}
                ownerSearching={ownerSearching}
                buildPayload={buildPayload}
                doCreate={doCreate}
                submitting={submitting}
                setFormError={setFormError}
                selectedService={selectedService}
                suggestedAmount={suggestedAmount}
                SlotSelect={SlotSelect}
                todayYMD={todayYMD}
                maxDateYMD={maxDateYMD}
                onClose={onClose}
                animalTypes={animalTypes}
              />
            )}

            {channelMode === "full" && (
              <FullBookingForm
                branchId={branchId}
                form={form}
                setForm={setForm}
                step={step}
                setStep={setStep}
                ownerQuery={ownerQuery}
                setOwnerQuery={setOwnerQuery}
                owner={owner}
                setOwner={setOwner}
                patients={patients}
                setPatients={setPatients}
                doctors={doctors}
                services={services}
                slots={slotsFiltered}
                slotsLoading={slotsLoading}
                optionsLoading={optionsOrTypesLoading}
                searchOwner={searchOwner}
                ownerSearching={ownerSearching}
                buildPayload={buildPayload}
                doCreate={doCreate}
                submitting={submitting}
                setFormError={setFormError}
                selectedService={selectedService}
                suggestedAmount={suggestedAmount}
                SlotSelect={SlotSelect}
                todayYMD={todayYMD}
                maxDateYMD={maxDateYMD}
                onClose={onClose}
                animalTypes={animalTypes}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneQuickForm({
  branchId,
  form,
  setForm,
  ownerQuery,
  setOwnerQuery,
  owner,
  setOwner,
  patients,
  setPatients,
  doctors,
  services,
  slots,
  slotsLoading,
  optionsLoading,
  searchOwner,
  ownerSearching,
  buildPayload,
  doCreate,
  submitting,
  setFormError,
  SlotSelect,
  todayYMD,
  maxDateYMD,
  onClose,
  animalTypes,
}) {
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [forceCreate, setForceCreate] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!form.patientId) {
      setFormError("Find owner by phone/email first.");
      return;
    }
    if (form.petId === PET_ID_NEW) {
      setFormError('Complete quick pet creation (name + type + Add Pet) or use "No pet / choose existing" in the Pet section.');
      return;
    }
    if (!form.serviceId || !form.date || !form.slotStart || !form.slotEnd) {
      setFormError("Please fill service, date and time slot.");
      return;
    }
    const mobile = ownerQuery?.trim() || owner?.auth?.phone || "";
    const petName = form.petId && form.petId !== PET_ID_NEW ? (patients.find((p) => p.id === Number(form.petId))?.name ?? "") : "";
    if (!forceCreate && mobile && branchId) {
      const dup = await staffClinicCheckDuplicate(branchId, { mobile, petName: petName || undefined, date: form.date });
      if (dup?.possibleDuplicate && dup?.existing?.length) {
        setDuplicateWarning(dup);
        setFormError("Possible duplicate appointment (same mobile + date). Click Create again to save anyway.");
        return;
      }
    }
    setDuplicateWarning(null);
    setForceCreate(false);
    const payload = buildPayload("PHONE", "PHONE", "SCHEDULED", false, true, "UNPAID");
    doCreate(payload);
  }
  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label className="form-label">Owner (phone or email) *</label>
        <div className="d-flex gap-2">
          <input
            type="text"
            className="form-control"
            placeholder="Phone or email"
            value={ownerQuery}
            onChange={(e) => {
              setOwnerQuery(e.target.value);
              setOwner(null);
              setForm((f) => ({ ...f, patientId: "" }));
            }}
          />
          <button type="button" className="btn btn-outline-primary" onClick={searchOwner} disabled={ownerSearching}>
            {ownerSearching ? "…" : "Find"}
          </button>
        </div>
        {owner && <small className="text-success">{owner.profile?.displayName ?? "Owner #" + owner.id}</small>}
      </div>
      {duplicateWarning?.possibleDuplicate && (
        <div className="alert alert-warning py-2 small mb-2">
          Possible duplicate appointment found. <button type="button" className="btn btn-link p-0 small" onClick={() => { setForceCreate(true); setFormError(""); }}>Create anyway</button>
        </div>
      )}
      <PetSelectWithQuickCreate
        owner={owner}
        patients={patients}
        setPatients={setPatients}
        form={form}
        setForm={setForm}
        branchId={branchId}
        animalTypes={animalTypes}
        setFormError={setFormError}
      />
      <div className="mb-3">
        <label className="form-label">Service *</label>
        <select className="form-select" value={form.serviceId} onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))} required disabled={optionsLoading}>
          <option value="">{optionsLoading ? "Loading…" : "Select service"}</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label className="form-label">Doctor</label>
        <select className="form-select" value={form.doctorId} onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value, slotStart: "", slotEnd: "" }))} disabled={optionsLoading}>
          <option value="">Any Available Doctor</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>{d.displayName}</option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label className="form-label">Date *</label>
        <input
          type="date"
          className="form-control"
          value={form.date}
          min={todayYMD()}
          max={maxDateYMD()}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value, slotStart: "", slotEnd: "" }))}
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Time slot *</label>
        {slotsLoading ? (
          <p className="text-muted small">Loading slots…</p>
        ) : (
          <SlotSelect
            value={form.slotStart}
            onChange={(start, end) => setForm((f) => ({ ...f, slotStart: start, slotEnd: end }))}
            filteredSlots={slots}
          />
        )}
      </div>
      <div className="mb-3">
        <label className="form-label">Notes</label>
        <textarea className="form-control" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      </div>
      <div className="modal-footer d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "…" : "Create"}</button>
      </div>
    </form>
  );
}

function WalkInForm({
  branchId,
  form,
  setForm,
  step,
  setStep,
  ownerQuery,
  setOwnerQuery,
  owner,
  setOwner,
  patients,
  setPatients,
  doctors,
  services,
  slots,
  slotsLoading,
  optionsLoading,
  searchOwner,
  ownerSearching,
  buildPayload,
  doCreate,
  submitting,
  setFormError,
  selectedService,
  suggestedAmount,
  SlotSelect,
  todayYMD,
  maxDateYMD,
  onClose,
  animalTypes,
}) {
  const WALKIN_STEPS = ["Patient & priority", "Service & slot", "Confirm"];
  function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!form.patientId) {
      setFormError("Select patient (owner phone/email + Find) first.");
      return;
    }
    if (form.petId === PET_ID_NEW) {
      setFormError('Complete quick pet creation (name + type + Add Pet) or use "No pet / choose existing" in the Pet section.');
      return;
    }
    if (!form.serviceId || !form.date || !form.slotStart || !form.slotEnd) {
      setFormError("Please fill service, date and time slot.");
      return;
    }
    const payload = buildPayload("STAFF", "COUNTER", "WALK_IN", true);
    doCreate(payload);
  }
  return (
    <form onSubmit={handleSubmit}>
      {step === 0 && (
        <div>
          <p className="text-muted small mb-2">Owner phone or email, then Find. Select pet if present.</p>
          <div className="mb-3">
            <label className="form-label">Owner (phone or email) *</label>
            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control"
                placeholder="Phone or email"
                value={ownerQuery}
                onChange={(e) => {
                  setOwnerQuery(e.target.value);
                  setOwner(null);
                  setForm((f) => ({ ...f, patientId: "" }));
                }}
              />
              <button type="button" className="btn btn-outline-primary" onClick={searchOwner} disabled={ownerSearching}>
                {ownerSearching ? "…" : "Find"}
              </button>
            </div>
            {owner && <small className="text-success">{owner.profile?.displayName ?? "Owner #" + owner.id}</small>}
          </div>
          <PetSelectWithQuickCreate
            owner={owner}
            patients={patients}
            setPatients={setPatients}
            form={form}
            setForm={setForm}
            branchId={branchId}
            animalTypes={animalTypes}
            setFormError={setFormError}
          />
          <div className="mb-3">
            <label className="form-label">Priority</label>
            <select className="form-select" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              <option value="NORMAL">Normal</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
        </div>
      )}
      {step === 1 && (
        <div>
          <div className="mb-3">
            <label className="form-label">Service *</label>
            <select className="form-select" value={form.serviceId} onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))} required disabled={optionsLoading}>
              <option value="">{optionsLoading ? "Loading…" : "Select service"}</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Doctor</label>
            <select className="form-select" value={form.doctorId} onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value, slotStart: "", slotEnd: "" }))} disabled={optionsLoading}>
              <option value="">Any Available Doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.displayName}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Date *</label>
            <input
              type="date"
              className="form-control"
              value={form.date}
              min={todayYMD()}
              max={maxDateYMD()}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value, slotStart: "", slotEnd: "" }))}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Time slot *</label>
            {slotsLoading ? (
              <p className="text-muted small">Loading slots…</p>
            ) : (
              <SlotSelect
                value={form.slotStart}
                onChange={(start, end) => setForm((f) => ({ ...f, slotStart: start, slotEnd: end }))}
                filteredSlots={slots}
              />
            )}
          </div>
          <div className="mb-3">
            <label className="form-label">Notes</label>
            <textarea className="form-control" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="small">
          <p><strong>Patient:</strong> {owner?.profile?.displayName ?? "—"} | Pet: {form.petId && form.petId !== PET_ID_NEW ? (patients.find((p) => p.id === Number(form.petId))?.name ?? "—") : "—"}</p>
          <p><strong>Service:</strong> {selectedService?.name ?? "—"} | Doctor: {form.doctorId ? doctors.find((d) => d.id === Number(form.doctorId))?.displayName : "Any"}</p>
          <p><strong>Date:</strong> {form.date} | Time: {form.slotStart ? new Date(form.slotStart).toLocaleTimeString() : "—"}</p>
          <div className="mb-3 mt-2">
            <div className="form-check">
              <input type="radio" className="form-check-input" id="walkinPayLater" checked={!form.payNow} onChange={() => setForm((f) => ({ ...f, payNow: false }))} />
              <label className="form-check-label" htmlFor="walkinPayLater">Pay later</label>
            </div>
            <div className="form-check">
              <input type="radio" className="form-check-input" id="walkinPayNow" checked={form.payNow} onChange={() => setForm((f) => ({ ...f, payNow: true, amount: suggestedAmount || form.amount }))} />
              <label className="form-check-label" htmlFor="walkinPayNow">Pay now</label>
            </div>
            {form.payNow && (
              <>
                <select className="form-select form-select-sm mt-2" value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="DIGITAL">Digital</option>
                </select>
                <input type="number" className="form-control form-control-sm mt-2" step="0.01" min="0" placeholder={suggestedAmount} value={form.amount || suggestedAmount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </>
            )}
          </div>
        </div>
      )}
      <div className="modal-footer d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
        {step > 0 && <button type="button" className="btn btn-outline-primary" onClick={() => setStep((s) => s - 1)}>Back</button>}
        {step < 2 ? (
          <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !form.patientId}>
            Next
          </button>
        ) : (
          <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "…" : "Create"}</button>
        )}
      </div>
    </form>
  );
}

const FULL_STEPS = ["Visit type", "Patient", "Doctor & time", "Billing", "Confirm"];

function FullBookingForm({
  branchId,
  form,
  setForm,
  step,
  setStep,
  ownerQuery,
  setOwnerQuery,
  owner,
  setOwner,
  patients,
  setPatients,
  doctors,
  services,
  slots,
  slotsLoading,
  optionsLoading,
  searchOwner,
  ownerSearching,
  buildPayload,
  doCreate,
  submitting,
  setFormError,
  selectedService,
  suggestedAmount,
  SlotSelect,
  todayYMD,
  maxDateYMD,
  onClose,
  animalTypes,
}) {
  function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    const isAnyDoctor = !form.doctorId || form.doctorId === "any";
    if (!form.patientId) {
      setFormError("Please select a patient (Step 2: owner phone/email + Find).");
      return;
    }
    if (form.petId === PET_ID_NEW) {
      setFormError('Complete quick pet creation (name + type + Add Pet) or use "No pet / choose existing" in the Pet section.');
      return;
    }
    if (!form.serviceId || (!isAnyDoctor && !form.doctorId) || !form.date || !form.slotStart || !form.slotEnd) {
      setFormError("Please fill service, doctor (or Any), date and time slot.");
      return;
    }
    const slot = slots.find(
      (s) =>
        s.start &&
        new Date(s.start).toISOString() === form.slotStart &&
        s.end &&
        new Date(s.end).toISOString() === form.slotEnd
    );
    if (!slot) {
      setFormError("Please select a time slot from the list.");
      return;
    }
    const payload = buildPayload("STAFF", form.channel, form.visitType, form.visitType === "WALK_IN");
    doCreate(payload);
  }
  return (
    <form onSubmit={handleSubmit}>
      {step === 0 && (
        <div>
          <div className="mb-3">
            <label className="form-label">Visit type</label>
            <select className="form-select" value={form.visitType} onChange={(e) => setForm((f) => ({ ...f, visitType: e.target.value }))}>
              <option value="WALK_IN">Walk-in</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Channel</label>
            <select className="form-select" value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}>
              <option value="COUNTER">Counter</option>
              <option value="PHONE">Phone</option>
              <option value="ONLINE">Online</option>
              <option value="REFERRAL">Referral</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Priority</label>
            <select className="form-select" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              <option value="NORMAL">Normal</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
        </div>
      )}
      {step === 1 && (
        <div>
          <p className="text-muted small mb-2">Search by owner phone or email and click Find.</p>
          <div className="mb-3">
            <label className="form-label">Owner (phone or email) *</label>
            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control"
                placeholder="Phone or email"
                value={ownerQuery}
                onChange={(e) => {
                  setOwnerQuery(e.target.value);
                  setOwner(null);
                  setForm((f) => ({ ...f, patientId: "" }));
                }}
              />
              <button type="button" className="btn btn-outline-primary" onClick={searchOwner} disabled={ownerSearching}>
                {ownerSearching ? "…" : "Find"}
              </button>
            </div>
            {owner && <small className="text-success">{owner.profile?.displayName ?? "Owner #" + owner.id}</small>}
          </div>
          <PetSelectWithQuickCreate
            owner={owner}
            patients={patients}
            setPatients={setPatients}
            form={form}
            setForm={setForm}
            branchId={branchId}
            animalTypes={animalTypes}
            setFormError={setFormError}
          />
        </div>
      )}
      {step === 2 && (
        <div>
          <div className="mb-3">
            <label className="form-label">Service *</label>
            <select className="form-select" value={form.serviceId} onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))} required disabled={optionsLoading}>
              <option value="">{optionsLoading ? "Loading…" : "Select service"}</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Doctor</label>
            <select className="form-select" value={form.doctorId} onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value, slotStart: "", slotEnd: "" }))} disabled={optionsLoading}>
              <option value="">Any Available Doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.displayName}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Date *</label>
            <input
              type="date"
              className="form-control"
              value={form.date}
              min={todayYMD()}
              max={maxDateYMD()}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value, slotStart: "", slotEnd: "" }))}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Time slot *</label>
            {slotsLoading ? (
              <p className="text-muted small">Loading slots…</p>
            ) : (
              <SlotSelect
                value={form.slotStart}
                onChange={(start, end) => setForm((f) => ({ ...f, slotStart: start, slotEnd: end }))}
                filteredSlots={slots}
              />
            )}
          </div>
          <div className="mb-3">
            <label className="form-label">Notes</label>
            <textarea className="form-control" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      )}
      {step === 3 && (
        <div>
          <div className="mb-3">
            <div className="form-check">
              <input type="radio" className="form-check-input" id="fullPayLater" checked={!form.payNow} onChange={() => setForm((f) => ({ ...f, payNow: false }))} />
              <label className="form-check-label" htmlFor="fullPayLater">Pay later</label>
            </div>
            <div className="form-check">
              <input type="radio" className="form-check-input" id="fullPayNow" checked={form.payNow} onChange={() => setForm((f) => ({ ...f, payNow: true, amount: suggestedAmount || form.amount }))} />
              <label className="form-check-label" htmlFor="fullPayNow">Pay now</label>
            </div>
            {form.payNow && (
              <>
                <div className="mb-3 mt-2">
                  <label className="form-label">Payment method</label>
                  <select className="form-select" value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="DIGITAL">Digital</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Amount</label>
                  <input type="number" className="form-control" step="0.01" min="0" value={form.amount || suggestedAmount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder={suggestedAmount} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {step === 4 && (
        <div className="small">
          <p><strong>Visit:</strong> {form.visitType} / {form.channel} / {form.priority}</p>
          <p><strong>Patient:</strong> {owner?.profile?.displayName ?? "—"} | Pet: {form.petId && form.petId !== PET_ID_NEW ? (patients.find((p) => p.id === Number(form.petId))?.name ?? "—") : "—"}</p>
          <p><strong>Service:</strong> {selectedService?.name ?? "—"} | Doctor: {form.doctorId ? doctors.find((d) => d.id === Number(form.doctorId))?.displayName : "Any"}</p>
          <p><strong>Date:</strong> {form.date} | Time: {form.slotStart ? new Date(form.slotStart).toLocaleTimeString() : "—"}</p>
          <p><strong>Payment:</strong> {form.payNow ? `Pay now (${form.paymentMethod}) ${form.amount || suggestedAmount}` : "Pay later"}</p>
        </div>
      )}
      <div className="modal-footer d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
        {step > 0 && step < 4 && <button type="button" className="btn btn-outline-primary" onClick={() => setStep((s) => s - 1)}>Back</button>}
        {step < 4 ? (
          <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !form.patientId}>
            Next
          </button>
        ) : (
          <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "…" : "Create"}</button>
        )}
      </div>
    </form>
  );
}


export default CreateAppointmentModal;
