"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicOwnerLookup,
  staffClinicEnsureOwner,
  staffClinicPatientRegister,
} from "@/lib/api";
import { useAnimalTypes, useBreedsByAnimalType } from "@/lib/usePetTaxonomy";
import SubBreedSelect from "@/src/components/clinic/SubBreedSelect";
import AnimalColorSelect from "@/src/components/clinic/AnimalColorSelect";
import CoatPatternSelect from "@/src/components/clinic/CoatPatternSelect";
import AnimalSizeSelect from "@/src/components/clinic/AnimalSizeSelect";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { staffClinicPatientsPath, staffClinicPatientDetailPath } from "@/lib/staffClinicPatientRoutes";

const PATIENTS_PERMS = ["clinic.patients.read", "clinic.patients.manage"];
const OWNER_MODE_EXISTING = "existing";
const OWNER_MODE_NEW = "new";

export default function StaffBranchClinicRegisterPatientPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const [ownerMode, setOwnerMode] = useState(OWNER_MODE_EXISTING);
  const [ownerQuery, setOwnerQuery] = useState("");
  const [newOwnerPhone, setNewOwnerPhone] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newOwnerDisplayName, setNewOwnerDisplayName] = useState("");
  const [owner, setOwner] = useState(null);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [creatingOwner, setCreatingOwner] = useState(false);
  const [ownerError, setOwnerError] = useState("");

  const [form, setForm] = useState({
    name: "",
    animalTypeId: "",
    breedId: "",
    subBreedId: "",
    colorId: "",
    coatPatternId: "",
    sizeId: "",
    customBreedText: "",
    customColorText: "",
    sex: "",
    dateOfBirth: "",
    microchipNumber: "",
    allergies: "",
    bloodType: "",
    notes: "",
  });
  const { types: animalTypes, loading: typesLoading } = useAnimalTypes();
  const { breeds, loading: breedsLoading, error: breedsError } = useBreedsByAnimalType(form.animalTypeId);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = PATIENTS_PERMS.some((p) => permissions.includes(p));
  const hasManage = permissions.includes("clinic.patients.manage");

  const phoneFromQuery = useMemo(() => searchParams?.get("phone") ?? "", [searchParams]);
  const displayNameFromQuery = useMemo(() => searchParams?.get("displayName") ?? "", [searchParams]);
  const returnToFromQuery = useMemo(() => {
    const raw = searchParams?.get("returnTo");
    if (!raw || typeof raw !== "string") return "";
    try {
      const decoded = decodeURIComponent(raw);
      if (!decoded.startsWith("/") || decoded.includes("//") || /^javascript:/i.test(decoded)) return "";
      if (!branchId || !decoded.startsWith(`/staff/branch/${branchId}/clinic`)) return "";
      return decoded;
    } catch {
      return "";
    }
  }, [searchParams, branchId]);
  const appointmentIdFromQuery = useMemo(() => {
    const p = searchParams?.get("appointmentId");
    if (p == null) return null;
    const n = parseInt(p, 10);
    return Number.isFinite(n) ? n : null;
  }, [searchParams]);
  const petNameFromQuery = useMemo(() => searchParams?.get("petName") ?? "", [searchParams]);

  useEffect(() => {
    if (phoneFromQuery) {
      setNewOwnerPhone(phoneFromQuery);
      setOwnerQuery(phoneFromQuery);
      if (displayNameFromQuery) setNewOwnerDisplayName(displayNameFromQuery);
    }
  }, [phoneFromQuery, displayNameFromQuery]);

  useEffect(() => {
    if (petNameFromQuery.trim()) {
      setForm((f) => (f.name ? f : { ...f, name: petNameFromQuery.trim() }));
    }
  }, [petNameFromQuery]);

  const searchOwner = useCallback(async () => {
    if (!ownerQuery.trim() || !branchId) return;
    setOwnerSearching(true);
    setOwnerError("");
    setOwner(null);
    try {
      const o = await staffClinicOwnerLookup(branchId, ownerQuery.trim());
      setOwner(o || null);
      if (!o) setOwnerError("Owner not found. Try phone or email, or create a new owner below.");
    } catch {
      setOwner(null);
      setOwnerError("Owner not found. Try phone or email, or create a new owner below.");
    } finally {
      setOwnerSearching(false);
    }
  }, [branchId, ownerQuery]);

  const createOwner = useCallback(async () => {
    const phone = newOwnerPhone.trim();
    const email = newOwnerEmail.trim();
    
    if (!phone && !email) {
      setOwnerError("Phone or email is required.");
      return;
    }
    
    if (!branchId) return;
    
    setCreatingOwner(true);
    setOwnerError("");
    setOwner(null);
    try {
      const o = await staffClinicEnsureOwner(branchId, {
        phone: phone || undefined,
        email: email || undefined,
        displayName: (newOwnerDisplayName || "Pet Owner").trim() || "Pet Owner",
      });
      setOwner(o || null);
    } catch (e) {
      setOwner(null);
      setOwnerError(e?.message || "Could not create owner.");
    } finally {
      setCreatingOwner(false);
    }
  }, [branchId, newOwnerPhone, newOwnerEmail, newOwnerDisplayName]);

  function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!owner?.id) {
      setFormError("Select or create an owner first.");
      return;
    }
    if (!form.name?.trim()) {
      setFormError("Pet name is required.");
      return;
    }
    const animalTypeId = Number(form.animalTypeId);
    if (!animalTypeId) {
      setFormError("Species (animal type) is required.");
      return;
    }
    setSubmitting(true);
    const payload = {
      userId: owner.id,
      name: form.name.trim(),
      animalTypeId,
      breedId: form.breedId ? Number(form.breedId) : undefined,
      subBreedId: form.subBreedId ? Number(form.subBreedId) : undefined,
      colorId: form.colorId ? Number(form.colorId) : undefined,
      coatPatternId: form.coatPatternId ? Number(form.coatPatternId) : undefined,
      sizeId: form.sizeId ? Number(form.sizeId) : undefined,
      customBreedText: form.customBreedText?.trim() || undefined,
      customColorText: form.customColorText?.trim() || undefined,
      sex: form.sex || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      microchipNumber: form.microchipNumber?.trim() || undefined,
      bloodType: form.bloodType?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    };
    if (form.allergies?.trim()) {
      payload.allergies = form.allergies.split(",").map((s) => s.trim()).filter(Boolean);
    }
    const missingIdMessage =
      "Registration appeared to succeed but the server did not return a patient id. Check the Network tab for POST …/patients or contact support.";
    staffClinicPatientRegister(branchId, payload)
      .then((patient) => {
        if (!patient?.id) {
          setFormError(missingIdMessage);
          setSubmitting(false);
          return;
        }
        // Redirect contract: when returnTo is set (e.g. from intake), return there with ids when available.
        if (returnToFromQuery) {
          const sep = returnToFromQuery.includes("?") ? "&" : "?";
          const params = new URLSearchParams();
          params.set("registered", "1");
          if (owner?.id) params.set("ownerId", String(owner.id));
          params.set("petId", String(patient.id));
          const aptId = appointmentIdFromQuery ?? (() => {
            const m = returnToFromQuery.match(/\/intake\/(\d+)(?:\?|$)/);
            return m ? parseInt(m[1], 10) : null;
          })();
          if (aptId != null) params.set("appointmentId", String(aptId));
          setSubmitting(false);
          router.push(`${returnToFromQuery}${sep}${params.toString()}`);
          return;
        }
        setSubmitting(false);
        router.push(staffClinicPatientDetailPath(branchId, patient.id));
      })
      .catch((err) => {
        const msg = err?.message || "Registration failed.";
        const isDuplicate = msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("microchip");
        setFormError(isDuplicate ? "This pet is already registered (duplicate microchip). Use a different microchip or select the existing pet elsewhere." : msg);
        setSubmitting(false);
      });
  }

  const ownerDisplay = owner
    ? `${owner.profile?.displayName ?? "Owner"} ${owner.auth?.phone ?? ""} ${owner.auth?.email ?? ""}`.trim()
    : "";

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" aria-label="Loading" />
        <p className="mt-16 text-secondary-light">Loading branch…</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.patients.read"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic`)}
      />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}/clinic`} className="btn btn-outline-secondary btn-sm">
          ← Clinic
        </Link>
        <Link href={staffClinicPatientsPath(branchId)} className="btn btn-outline-secondary btn-sm">
          Patients
        </Link>
        <h5 className="mb-0">Register patient</h5>
      </div>

      <Card
        title="Register patient"
        subtitle={returnToFromQuery ? "Register here, then you'll return to intake to continue." : "Existing owner + new patient, or new owner + new patient."}
      >
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="form-label fw-semibold">1. Owner</label>
            <div className="d-flex gap-3 mb-2">
              <div className="form-check">
                <input
                  type="radio"
                  className="form-check-input"
                  name="ownerMode"
                  id="ownerExisting"
                  checked={ownerMode === OWNER_MODE_EXISTING}
                  onChange={() => { setOwnerMode(OWNER_MODE_EXISTING); setOwner(null); setOwnerError(""); }}
                />
                <label className="form-check-label" htmlFor="ownerExisting">Existing owner</label>
              </div>
              <div className="form-check">
                <input
                  type="radio"
                  className="form-check-input"
                  name="ownerMode"
                  id="ownerNew"
                  checked={ownerMode === OWNER_MODE_NEW}
                  onChange={() => { setOwnerMode(OWNER_MODE_NEW); setOwner(null); setOwnerError(""); }}
                />
                <label className="form-check-label" htmlFor="ownerNew">New owner</label>
              </div>
            </div>

            {ownerMode === OWNER_MODE_EXISTING && (
              <div className="d-flex gap-2 align-items-start">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Phone or email"
                  value={ownerQuery}
                  onChange={(e) => { setOwnerQuery(e.target.value); setOwner(null); }}
                />
                <button type="button" className="btn btn-outline-primary" onClick={searchOwner} disabled={ownerSearching}>
                  {ownerSearching ? "…" : "Find"}
                </button>
              </div>
            )}

            {ownerMode === OWNER_MODE_NEW && (
              <div className="border rounded p-3 bg-light">
                <div className="mb-2">
                  <label className="form-label small mb-1">Phone</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. 01777888993"
                    value={newOwnerPhone}
                    onChange={(e) => setNewOwnerPhone(e.target.value)}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small mb-1">Email</label>
                  <input
                    type="email"
                    className="form-control form-control-sm"
                    placeholder="e.g. owner@example.com"
                    value={newOwnerEmail}
                    onChange={(e) => setNewOwnerEmail(e.target.value)}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small mb-1">Display name</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Pet Owner"
                    value={newOwnerDisplayName}
                    onChange={(e) => setNewOwnerDisplayName(e.target.value)}
                  />
                </div>
                <small className="text-muted d-block mb-2">At least one of phone or email is required</small>
                <button type="button" className="btn btn-sm btn-primary" onClick={createOwner} disabled={creatingOwner || (!newOwnerPhone.trim() && !newOwnerEmail.trim())}>
                  {creatingOwner ? "…" : "Create owner"}
                </button>
              </div>
            )}

            {ownerError && <div className="alert alert-warning py-2 mt-2 small mb-0">{ownerError}</div>}
            {ownerDisplay && <small className="text-success d-block mt-2">{ownerDisplay}</small>}
          </div>

          <hr />

          <div className="mb-4">
            <label className="form-label fw-semibold">2. Patient (pet)</label>
            <p className="small text-muted mb-2">Complete after an owner is selected or created.</p>

            <div className="mb-3">
              <label className="form-label">Pet name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Pet name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Species *</label>
              <select
                className="form-select"
                value={form.animalTypeId}
                onChange={(e) => setForm((f) => ({ ...f, animalTypeId: e.target.value, breedId: "", subBreedId: "" }))}
                required
                disabled={typesLoading}
              >
                <option value="">{typesLoading ? "Loading…" : "Select species"}</option>
                {animalTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Breed</label>
              <select
                className="form-select"
                value={form.breedId}
                onChange={(e) => setForm((f) => ({ ...f, breedId: e.target.value, subBreedId: "" }))}
                disabled={breedsLoading || !form.animalTypeId}
              >
                <option value="">{breedsLoading ? "Loading…" : "—"}</option>
                {breeds.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {breedsError && <div className="form-text text-warning">{breedsError}</div>}
              {!breedsLoading && form.animalTypeId && breeds.length === 0 && !breedsError && (
                <div className="form-text text-muted">No breeds in catalog for this species (optional).</div>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label">Sub-breed / Variety</label>
              <SubBreedSelect
                breedId={form.breedId}
                value={form.subBreedId}
                onChange={(v) => setForm((f) => ({ ...f, subBreedId: v }))}
                placeholder="—"
              />
            </div>
            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <label className="form-label">Color</label>
                <AnimalColorSelect
                  value={form.colorId}
                  onChange={(v) => setForm((f) => ({ ...f, colorId: v }))}
                  placeholder="—"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Coat pattern</label>
                <CoatPatternSelect
                  value={form.coatPatternId}
                  onChange={(v) => setForm((f) => ({ ...f, coatPatternId: v }))}
                  placeholder="—"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Size</label>
              <AnimalSizeSelect
                value={form.sizeId}
                onChange={(v) => setForm((f) => ({ ...f, sizeId: v }))}
                placeholder="—"
              />
            </div>
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label">Sex</label>
                <select
                  className="form-select"
                  value={form.sex}
                  onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}
                >
                  <option value="">—</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="UNKNOWN">Unknown</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Date of birth</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                />
              </div>
            </div>
            <div className="mb-3 mt-2">
              <label className="form-label">Microchip number</label>
              <input
                type="text"
                className="form-control"
                placeholder="Microchip"
                value={form.microchipNumber}
                onChange={(e) => setForm((f) => ({ ...f, microchipNumber: e.target.value }))}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Allergies (comma-separated)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Chicken, Pollen"
                value={form.allergies}
                onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Blood type</label>
              <input
                type="text"
                className="form-control"
                placeholder="Blood type"
                value={form.bloodType}
                onChange={(e) => setForm((f) => ({ ...f, bloodType: e.target.value }))}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          {formError && <div className="alert alert-danger py-2">{formError}</div>}

          <div className="d-flex gap-2">
            {returnToFromQuery ? (
              <Link href={returnToFromQuery} className="btn btn-outline-secondary">
                Back to intake
              </Link>
            ) : (
              <Link href={staffClinicPatientsPath(branchId)} className="btn btn-outline-secondary">
                Cancel
              </Link>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !owner?.id || !hasManage}
            >
              {submitting ? "Registering…" : "Register patient"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
