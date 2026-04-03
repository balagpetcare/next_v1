"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ownerRegisterPet } from "@/app/owner/_lib/ownerApi";
import { useAnimalTypes, useBreedsByAnimalType } from "@/lib/usePetTaxonomy";
import SubBreedSelect from "@/src/components/clinic/SubBreedSelect";
import AnimalColorSelect from "@/src/components/clinic/AnimalColorSelect";
import CoatPatternSelect from "@/src/components/clinic/CoatPatternSelect";
import AnimalSizeSelect from "@/src/components/clinic/AnimalSizeSelect";

export default function OwnerAddPetPage() {
  const router = useRouter();
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
    sex: "" as "" | "MALE" | "FEMALE",
    dateOfBirth: "",
    microchipNumber: "",
    notes: "",
  });
  const { types: animalTypes, loading } = useAnimalTypes();
  const { breeds } = useBreedsByAnimalType(form.animalTypeId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.animalTypeId || !form.sex) {
      setError("Name, species and sex are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await ownerRegisterPet({
        name: form.name.trim(),
        animalTypeId: Number(form.animalTypeId),
        breedId: form.breedId ? Number(form.breedId) : null,
        subBreedId: form.subBreedId ? Number(form.subBreedId) : null,
        colorId: form.colorId ? Number(form.colorId) : null,
        coatPatternId: form.coatPatternId ? Number(form.coatPatternId) : null,
        sizeId: form.sizeId ? Number(form.sizeId) : null,
        customBreedText: form.customBreedText?.trim() || null,
        customColorText: form.customColorText?.trim() || null,
        dateOfBirth: form.dateOfBirth.trim() || null,
        sex: form.sex as "MALE" | "FEMALE",
        microchipNumber: form.microchipNumber.trim() || null,
        notes: form.notes.trim() || null,
      });
      router.push("/owner/pets");
    } catch (err: any) {
      const code = err?.code;
      const msg = err?.message || "Registration failed.";
      if (code === "DUPLICATE_PET" || (err?.status === 409 && (msg.toLowerCase().includes("microchip") || msg.toLowerCase().includes("duplicate")))) {
        setError("This microchip number is already registered. Use a different number or leave microchip blank.");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="container py-3">
        <div className="text-center py-5 text-secondary">
          <div className="spinner-border" role="status" />
          <p className="mt-2 mb-0">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-3 bpa-page">
      <header className="mb-4">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-2">
            <li className="breadcrumb-item">
              <Link href="/owner">Dashboard</Link>
            </li>
            <li className="breadcrumb-item">
              <Link href="/owner/pets">My Pets</Link>
            </li>
            <li className="breadcrumb-item active">Add pet</li>
          </ol>
        </nav>
        <h2 className="mb-1">Add pet</h2>
        <div className="text-secondary">Register a pet to your account. Same record is used at the clinic.</div>
      </header>

      <div className="card">
        <div className="card-body">
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Pet name *</label>
              <input
                type="text"
                className="form-control"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Max"
                required
              />
            </div>

            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label">Species *</label>
                <select
                  className="form-select"
                  value={form.animalTypeId}
                  onChange={(e) => setForm((f) => ({ ...f, animalTypeId: e.target.value, breedId: "", subBreedId: "" }))}
                  required
                >
                  <option value="">Select species</option>
                  {animalTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Breed</label>
                <select
                  className="form-select"
                  value={form.breedId}
                  onChange={(e) => setForm((f) => ({ ...f, breedId: e.target.value, subBreedId: "" }))}
                  disabled={!form.animalTypeId}
                >
                  <option value="">—</option>
                  {breeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Sub-breed / Variety</label>
              <SubBreedSelect breedId={form.breedId} value={form.subBreedId} onChange={(v) => setForm((f) => ({ ...f, subBreedId: v }))} placeholder="—" />
            </div>
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label">Color</label>
                <AnimalColorSelect value={form.colorId} onChange={(v) => setForm((f) => ({ ...f, colorId: v }))} placeholder="—" />
              </div>
              <div className="col-md-6">
                <label className="form-label">Coat pattern</label>
                <CoatPatternSelect value={form.coatPatternId} onChange={(v) => setForm((f) => ({ ...f, coatPatternId: v }))} placeholder="—" />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Size</label>
              <AnimalSizeSelect value={form.sizeId} onChange={(v) => setForm((f) => ({ ...f, sizeId: v }))} placeholder="—" />
            </div>

            <div className="row g-2 mt-2">
              <div className="col-md-6">
                <label className="form-label">Sex *</label>
                <select
                  className="form-select"
                  value={form.sex}
                  onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value as "MALE" | "FEMALE" }))}
                  required
                >
                  <option value="">Select</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
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
                value={form.microchipNumber}
                onChange={(e) => setForm((f) => ({ ...f, microchipNumber: e.target.value }))}
                placeholder="Optional; must be unique if provided"
              />
              <div className="form-text">Leave blank if unknown. If entered, it must be unique in the system.</div>
            </div>

            <div className="mb-4">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional"
              />
            </div>

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Saving…" : "Register pet"}
              </button>
              <Link className="btn btn-outline-secondary" href="/owner/pets">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
