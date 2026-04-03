"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  staffClinicDoctors,
  staffClinicPatientsList,
  staffClinicOwnerLookup,
  staffClinicEnsureOwner,
  staffClinicPatientRegister,
  staffClinicAppointmentPromote,
} from "@/lib/api";
import { useAnimalTypes, useBreedsByAnimalType } from "@/lib/usePetTaxonomy";
import { formatPetTaxonomyLine } from "@/lib/formatPetTaxonomy";
import { staffClinicPatientRegisterPath } from "@/lib/staffClinicPatientRoutes";

function formatPetLabel(p) {
  const taxonomy = formatPetTaxonomyLine(p);
  const sex = p.sex ?? "";
  const ownerName = p.owner?.displayName ?? "";
  const parts = [p.name, taxonomy, sex].filter(Boolean);
  const label = parts.join(" — ");
  return ownerName ? `${label} — Owner: ${ownerName}` : label;
}

export default function CompleteIntakeModal({ branchId, appointment, onClose, onSuccess, onCheckIn }) {
  const [step, setStep] = useState(0);
  const [ownerQuery, setOwnerQuery] = useState(appointment?.mobileSnapshot ?? "");
  const [linkedOwner, setLinkedOwner] = useState(appointment?.patient ?? null);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [creatingOwner, setCreatingOwner] = useState(false);
  const [createOwnerName, setCreateOwnerName] = useState(appointment?.ownerNameSnapshot ?? "");
  const [patients, setPatients] = useState([]);
  const [petId, setPetId] = useState(appointment?.petId ? String(appointment.petId) : "");
  const [doctorId, setDoctorId] = useState(appointment?.doctorId ? String(appointment.doctorId) : "");
  const [doctors, setDoctors] = useState([]);
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const autoSearchDoneRef = useRef(false);
  const [showRegisterPet, setShowRegisterPet] = useState(false);
  const [registerPetForm, setRegisterPetForm] = useState({
    name: appointment?.petNameSnapshot ?? "",
    animalTypeId: "",
    breedId: "",
    subBreedId: "",
    colorId: "",
    coatPatternId: "",
    sizeId: "",
    customBreedText: "",
    customColorText: "",
  });
  const [registerPetSubmitting, setRegisterPetSubmitting] = useState(false);
  const { types: animalTypes } = useAnimalTypes();
  const { breeds, loading: breedsLoading } = useBreedsByAnimalType(registerPetForm.animalTypeId);

  useEffect(() => {
    if (!branchId) return;
    staffClinicDoctors(branchId).then((d) => setDoctors(Array.isArray(d) ? d : []));
  }, [branchId]);

  useEffect(() => {
    if (!linkedOwner?.id || !branchId) { setPatients([]); return; }
    staffClinicPatientsList(branchId, { ownerId: linkedOwner.id, limit: 50 }).then((res) =>
      setPatients(Array.isArray(res?.patients) ? res.patients : [])
    );
  }, [branchId, linkedOwner?.id]);

  async function searchOwner() {
    if (!ownerQuery.trim() || !branchId) return;
    setOwnerSearching(true);
    setError("");
    try {
      const o = await staffClinicOwnerLookup(branchId, ownerQuery.trim());
      setLinkedOwner(o || null);
      if (o?.id) {
        const res = await staffClinicPatientsList(branchId, { ownerId: o.id, limit: 50 });
        setPatients(Array.isArray(res?.patients) ? res.patients : []);
      } else setPatients([]);
    } catch {
      setLinkedOwner(null);
      setPatients([]);
      setError("Owner not found. Try another format or create owner below.");
    } finally {
      setOwnerSearching(false);
    }
  }

  async function handleCreateOwner() {
    if (!ownerQuery.trim() || !branchId) return;
    setCreatingOwner(true);
    setError("");
    try {
      const o = await staffClinicEnsureOwner(branchId, {
        phone: ownerQuery.trim(),
        displayName: (createOwnerName || appointment?.ownerNameSnapshot || "Pet Owner").trim() || "Pet Owner",
      });
      setLinkedOwner(o || null);
      if (o?.id) {
        const res = await staffClinicPatientsList(branchId, { ownerId: o.id, limit: 50 });
        setPatients(Array.isArray(res?.patients) ? res.patients : []);
      } else setPatients([]);
    } catch (e) {
      setError(e?.message || "Could not create owner.");
    } finally {
      setCreatingOwner(false);
    }
  }

  async function handleRegisterPet() {
    if (!linkedOwner?.id || !branchId || !registerPetForm.name?.trim() || !registerPetForm.animalTypeId) {
      setError("Pet name and species are required.");
      return;
    }
    setRegisterPetSubmitting(true);
    setError("");
    try {
      const patient = await staffClinicPatientRegister(branchId, {
        userId: linkedOwner.id,
        name: registerPetForm.name.trim(),
        animalTypeId: Number(registerPetForm.animalTypeId),
        breedId: registerPetForm.breedId ? Number(registerPetForm.breedId) : undefined,
        subBreedId: registerPetForm.subBreedId ? Number(registerPetForm.subBreedId) : undefined,
        colorId: registerPetForm.colorId ? Number(registerPetForm.colorId) : undefined,
        coatPatternId: registerPetForm.coatPatternId ? Number(registerPetForm.coatPatternId) : undefined,
        sizeId: registerPetForm.sizeId ? Number(registerPetForm.sizeId) : undefined,
        customBreedText: registerPetForm.customBreedText?.trim() || undefined,
        customColorText: registerPetForm.customColorText?.trim() || undefined,
      });
      const res = await staffClinicPatientsList(branchId, { ownerId: linkedOwner.id, limit: 50 });
      setPatients(Array.isArray(res?.patients) ? res.patients : []);
      if (patient?.id) setPetId(String(patient.id));
      setShowRegisterPet(false);
      setRegisterPetForm({ name: "", animalTypeId: "", breedId: "", subBreedId: "", colorId: "", coatPatternId: "", sizeId: "", customBreedText: "", customColorText: "" });
    } catch (e) {
      const msg = e?.message || "Failed to register pet.";
      const isDuplicate = msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("microchip");
      setError(isDuplicate ? "This pet is already registered (duplicate microchip). Select the existing pet from the list or use a different microchip." : msg);
    } finally {
      setRegisterPetSubmitting(false);
    }
  }

  useEffect(() => {
    if (!branchId || !appointment?.id || autoSearchDoneRef.current) return;
    const hasSnapshotMobile = (appointment?.mobileSnapshot ?? "").trim().length > 0;
    const hasNoLinkedOwner = !appointment?.patient?.id;
    const q = (ownerQuery ?? "").trim();
    if (hasSnapshotMobile && hasNoLinkedOwner && q) {
      autoSearchDoneRef.current = true;
      setOwnerSearching(true);
      setError("");
      staffClinicOwnerLookup(branchId, q)
        .then((o) => {
          setLinkedOwner(o || null);
          if (o?.id) {
            return staffClinicPatientsList(branchId, { ownerId: o.id, limit: 50 }).then((res) =>
              setPatients(Array.isArray(res?.patients) ? res.patients : [])
            );
          }
          setPatients([]);
        })
        .catch(() => {
          setLinkedOwner(null);
          setPatients([]);
          setError("Owner not found. Try another format (e.g. 01777888993) or register the owner in Patients.");
        })
        .finally(() => setOwnerSearching(false));
    }
  }, [branchId, appointment?.id, appointment?.mobileSnapshot, appointment?.patient?.id, ownerQuery]);

  async function handlePromote() {
    if (!linkedOwner?.id) { setError("Link owner first (Step 1)."); return; }
    setSubmitting(true);
    setError("");
    try {
      await staffClinicAppointmentPromote(branchId, appointment.id, {
        patientId: linkedOwner.id,
        petId: petId ? Number(petId) : null,
        doctorId: doctorId ? Number(doctorId) : undefined,
        notes: notes || undefined,
      });
      onSuccess();
      onClose();
    } catch (e) {
      const msg = e?.message || "Promote failed";
      const isOwnerMismatch = msg.includes("does not belong") || msg.includes("owner");
      setError(isOwnerMismatch ? "The selected pet does not belong to the selected owner. Pick a pet that belongs to this owner or register a new pet." : msg);
    } finally {
      setSubmitting(false);
    }
  }

  const a = appointment;
  const displayOwner = a?.ownerNameSnapshot ?? a?.patient?.profile?.displayName ?? "—";
  const displayPet = a?.petNameSnapshot ?? a?.pet?.name ?? "—";
  const displayMobile = a?.mobileSnapshot ?? "—";

  return (
    <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1}>
      <div className="modal-dialog modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Complete intake — #{a?.id}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger py-2 small">
                {error}
                {error.includes("Owner not found") && (
                  <div className="mt-2">
                    <Link
                      href={(() => {
                        const intakeUrl = `/staff/branch/${branchId}/clinic/intake/${a?.id}`;
                        const q = new URLSearchParams();
                        q.set("returnTo", intakeUrl);
                        if (a?.id != null) q.set("appointmentId", String(a.id));
                        if (ownerQuery?.trim()) q.set("phone", ownerQuery.trim());
                        if (createOwnerName?.trim()) q.set("displayName", createOwnerName.trim());
                        if (displayPet && displayPet !== "—") q.set("petName", displayPet);
                        return staffClinicPatientRegisterPath(branchId, q.toString());
                      })()}
                      className="small me-2"
                    >
                      Register owner & pet, then return to intake
                    </Link>
                  </div>
                )}
              </div>
            )}
            <p className="small text-muted">Snapshot: {displayOwner} | {displayMobile} | Pet: {displayPet}</p>

            {step === 0 && (
              <div>
                <label className="form-label">Mobile (find owner)</label>
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="form-control"
                    value={ownerQuery}
                    onChange={(e) => setOwnerQuery(e.target.value)}
                    placeholder="Phone or email"
                  />
                  <button type="button" className="btn btn-outline-primary" onClick={searchOwner} disabled={ownerSearching}>
                    {ownerSearching ? "…" : "Find"}
                  </button>
                </div>
                {linkedOwner && <span className="badge bg-success mt-2">Owner: {linkedOwner.profile?.displayName ?? linkedOwner.id}</span>}
                {!linkedOwner && ownerQuery.trim() && (
                  <div className="mt-3 p-3 border rounded bg-light">
                    <label className="form-label small mb-1">Owner not in system? Create owner</label>
                    <input
                      type="text"
                      className="form-control form-control-sm mb-2"
                      placeholder="Display name (from snapshot)"
                      value={createOwnerName}
                      onChange={(e) => setCreateOwnerName(e.target.value)}
                    />
                    <button type="button" className="btn btn-sm btn-primary" onClick={handleCreateOwner} disabled={creatingOwner}>
                      {creatingOwner ? "…" : "Create owner"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div>
                <label className="form-label">Pet</label>
                <select className="form-select" value={petId} onChange={(e) => setPetId(e.target.value)}>
                  <option value="">—</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{formatPetLabel(p)}</option>
                  ))}
                </select>
                {patients.length === 0 && linkedOwner && !showRegisterPet && (
                  <small className="text-muted d-block mt-1">No pets. You can promote without pet or register one below.</small>
                )}
                {linkedOwner && (showRegisterPet || patients.length === 0) && (
                  <div className="mt-3 p-3 border rounded bg-light">
                    <label className="form-label small mb-1">Register new pet</label>
                    <input
                      type="text"
                      className="form-control form-control-sm mb-2"
                      placeholder="Pet name"
                      value={registerPetForm.name}
                      onChange={(e) => setRegisterPetForm((f) => ({ ...f, name: e.target.value }))}
                    />
                    <select
                      className="form-select form-select-sm mb-2"
                      value={registerPetForm.animalTypeId}
                      onChange={(e) => setRegisterPetForm((f) => ({ ...f, animalTypeId: e.target.value, breedId: "" }))}
                    >
                      <option value="">Species *</option>
                      {animalTypes.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <select
                      className="form-select form-select-sm mb-2"
                      value={registerPetForm.breedId}
                      onChange={(e) => setRegisterPetForm((f) => ({ ...f, breedId: e.target.value }))}
                      disabled={breedsLoading || !registerPetForm.animalTypeId}
                    >
                      <option value="">Breed</option>
                      {breeds.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    <div className="d-flex gap-2">
                      <button type="button" className="btn btn-sm btn-primary" onClick={handleRegisterPet} disabled={registerPetSubmitting || !registerPetForm.name?.trim() || !registerPetForm.animalTypeId}>
                        {registerPetSubmitting ? "…" : "Register pet"}
                      </button>
                      {patients.length > 0 && (
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowRegisterPet(false)}>Cancel</button>
                      )}
                    </div>
                  </div>
                )}
                {linkedOwner && patients.length > 0 && !showRegisterPet && (
                  <button type="button" className="btn btn-sm btn-outline-secondary mt-2" onClick={() => setShowRegisterPet(true)}>+ Register another pet</button>
                )}
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="mb-2">
                  <label className="form-label">Doctor (optional)</label>
                  <select className="form-select" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                    <option value="">Any</option>
                    {doctors.map((d) => <option key={d.id} value={d.id}>{d.displayName}</option>)}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label">Notes</label>
                  <textarea className="form-control" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <button type="button" className="btn btn-primary w-100" onClick={handlePromote} disabled={submitting}>
                  {submitting ? "…" : "Promote to Booked"}
                </button>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
            {step > 0 && <button type="button" className="btn btn-outline-primary" onClick={() => setStep((s) => s - 1)}>Back</button>}
            {step < 2 && (
              <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !linkedOwner}>
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
