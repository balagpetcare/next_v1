"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicPatientsList,
  staffClinicOwnerLookup,
  staffClinicPatientRegister,
  getAnimalTypes,
  getBreedsByAnimalType,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const PATIENTS_PERMS = ["clinic.patients.read", "clinic.patients.manage"];
const PAGE_SIZE = 25;

export default function StaffBranchClinicPatientsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = PATIENTS_PERMS.some((p) => permissions.includes(p));
  const hasManage = permissions.includes("clinic.patients.manage");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    const offset = (page - 1) * PAGE_SIZE;
    staffClinicPatientsList(branchId, { search: search || undefined, limit: PAGE_SIZE, offset })
      .then((data) => {
        if (!cancelled) {
          setPatients(data?.patients ?? []);
          setTotal(data?.total ?? 0);
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setPatients([]);
          setTotal(0);
          setError(e?.message || "Failed to load patients.");
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, search, page]);

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
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
      <div className="d-flex align-items-center gap-12 mb-24">
        <Link href={`/staff/branch/${branchId}/clinic`} className="btn btn-outline-secondary btn-sm">
          ← Clinic
        </Link>
        <h5 className="mb-0">Patients</h5>
      </div>

      <Card title="Patients" subtitle="Clinic patients (pets) for this branch.">
        <div className="mb-16 d-flex align-items-center gap-2 flex-wrap">
          {hasManage && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setShowRegisterModal(true)}
            >
              Add patient
            </button>
          )}
          <input
            type="text"
            className="form-control form-control-sm"
            style={{ maxWidth: 240 }}
            placeholder="Search name, Pet ID, owner..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {total > 0 && (
            <span className="text-muted small">
              Showing {from}–{to} of {total}
            </span>
          )}
        </div>
        {error && (
          <div className="alert alert-danger py-2 mb-16" role="alert">
            {error}
          </div>
        )}
        {loading ? (
          <div className="py-24 text-center text-secondary-light">Loading...</div>
        ) : patients.length === 0 ? (
          <div className="py-24 text-center text-secondary-light">
            No patients found. Register a patient or they will appear here after an appointment at this branch.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Pet ID</th>
                  <th>Name</th>
                  <th>Owner</th>
                  <th>Type</th>
                  <th>Breed</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id ?? p.petId ?? Math.random()}>
                    <td><code className="small">{p.uniquePetId ?? "—"}</code></td>
                    <td>{p.name ?? p.petName ?? "—"}</td>
                    <td>{p.owner?.displayName ?? p.owner?.phone ?? p.owner?.email ?? "—"}</td>
                    <td>{p.animalType?.name ?? "—"}</td>
                    <td>{p.breed?.name ?? "—"}</td>
                    <td className="text-end">
                      <Link
                        href={`/staff/branch/${branchId}/clinic/patients/${p.id}`}
                        className="btn btn-sm btn-outline-primary"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && total > PAGE_SIZE && (
          <div className="d-flex align-items-center justify-content-between mt-16 flex-wrap gap-2">
            <span className="text-muted small">
              Page {page} of {totalPages}
            </span>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {showRegisterModal && (
        <RegisterPatientModal
          branchId={branchId}
          onClose={() => setShowRegisterModal(false)}
          onSuccess={(patient) => {
            setShowRegisterModal(false);
            router.push(`/staff/branch/${branchId}/clinic/patients/${patient?.id}`);
          }}
        />
      )}
    </div>
  );
}

function RegisterPatientModal({ branchId, onClose, onSuccess }) {
  const [ownerQuery, setOwnerQuery] = useState("");
  const [owner, setOwner] = useState(null);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [animalTypes, setAnimalTypes] = useState([]);
  const [breeds, setBreeds] = useState([]);
  const [breedsLoading, setBreedsLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    animalTypeId: "",
    breedId: "",
    sex: "",
    dateOfBirth: "",
    microchipNumber: "",
    allergies: "",
    bloodType: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [typesLoading, setTypesLoading] = useState(true);

  useEffect(() => {
    getAnimalTypes()
      .then((t) => setAnimalTypes(Array.isArray(t) ? t : []))
      .catch(() => setAnimalTypes([]))
      .finally(() => setTypesLoading(false));
  }, []);

  useEffect(() => {
    const id = form.animalTypeId ? Number(form.animalTypeId) : null;
    if (!id) {
      setBreeds([]);
      setForm((f) => ({ ...f, breedId: "" }));
      return;
    }
    setBreedsLoading(true);
    getBreedsByAnimalType(id)
      .then((b) => setBreeds(Array.isArray(b) ? b : []))
      .catch(() => setBreeds([]))
      .finally(() => {
        setBreedsLoading(false);
        setForm((f) => ({ ...f, breedId: "" }));
      });
  }, [form.animalTypeId]);

  async function searchOwner() {
    if (!ownerQuery.trim()) return;
    setOwnerSearching(true);
    setFormError("");
    try {
      const o = await staffClinicOwnerLookup(branchId, ownerQuery.trim());
      setOwner(o || null);
    } catch {
      setOwner(null);
      setFormError("Owner not found. Try phone or email.");
    } finally {
      setOwnerSearching(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!owner?.id) {
      setFormError("Find and select owner first (phone or email).");
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
      sex: form.sex || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      microchipNumber: form.microchipNumber?.trim() || undefined,
      bloodType: form.bloodType?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    };
    if (form.allergies?.trim()) {
      payload.allergies = form.allergies.split(",").map((s) => s.trim()).filter(Boolean);
    }
    staffClinicPatientRegister(branchId, payload)
      .then((patient) => onSuccess(patient))
      .catch((err) => {
        setFormError(err?.message || "Registration failed.");
        setSubmitting(false);
      });
  }

  const ownerDisplay = owner
    ? `${owner.profile?.displayName ?? "Owner"} ${owner.auth?.phone ?? ""} ${owner.auth?.email ?? ""}`.trim()
    : "";

  return (
    <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1}>
      <div className="modal-dialog modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Register patient</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {formError && <div className="alert alert-danger py-2">{formError}</div>}
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
                    }}
                  />
                  <button type="button" className="btn btn-outline-primary" onClick={searchOwner} disabled={ownerSearching}>
                    {ownerSearching ? "…" : "Find"}
                  </button>
                </div>
                {ownerDisplay && <small className="text-success d-block mt-1">{ownerDisplay}</small>}
              </div>
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
                  onChange={(e) => setForm((f) => ({ ...f, animalTypeId: e.target.value }))}
                  required
                  disabled={typesLoading}
                >
                  <option value="">{typesLoading ? "Loading…" : "Select species"}</option>
                  {animalTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Breed</label>
                <select
                  className="form-select"
                  value={form.breedId}
                  onChange={(e) => setForm((f) => ({ ...f, breedId: e.target.value }))}
                  disabled={breedsLoading || !form.animalTypeId}
                >
                  <option value="">—</option>
                  {breeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
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
              <div className="mb-3">
                <label className="form-label">Date of birth</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                />
              </div>
              <div className="mb-3">
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
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting || !owner?.id}>
                {submitting ? "Registering…" : "Register patient"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
