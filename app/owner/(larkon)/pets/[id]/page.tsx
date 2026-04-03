"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ownerMyPetGet } from "@/app/owner/_lib/ownerApi";
import { formatPetTaxonomyLine } from "@/lib/formatPetTaxonomy";

export default function OwnerPetDetailPage() {
  const params = useParams();
  const id = params?.id != null ? String(params.id) : "";
  const [pet, setPet] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    ownerMyPetGet(id)
      .then(setPet)
      .catch((e) => {
        setError((e as Error)?.message ?? "Failed to load pet");
        setPet(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

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

  if (error || !pet) {
    return (
      <div className="container py-3">
        <div className="alert alert-danger" role="alert">
          {error || "Pet not found."}
        </div>
        <Link href="/owner/pets" className="btn btn-outline-secondary">
          ← Back to My Pets
        </Link>
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
            <li className="breadcrumb-item active">{pet.name ?? "Pet"}</li>
          </ol>
        </nav>
        <h2 className="mb-1">{pet.name ?? "Pet"}</h2>
        <div className="text-secondary">
          {(formatPetTaxonomyLine(pet) || pet.animalType?.name) ?? "—"}
        </div>
      </header>

      <div className="card">
        <div className="card-body">
          <dl className="row mb-0">
            <dt className="col-sm-3">Name</dt>
            <dd className="col-sm-9">{pet.name ?? "—"}</dd>
            <dt className="col-sm-3">Species</dt>
            <dd className="col-sm-9">{pet.animalType?.name ?? "—"}</dd>
            <dt className="col-sm-3">Breed</dt>
            <dd className="col-sm-9">{pet.breedNameSnapshot ?? pet.breed?.name ?? "—"}</dd>
            {(pet.subBreedNameSnapshot ?? pet.subBreed?.name) && (
              <>
                <dt className="col-sm-3">Sub-breed</dt>
                <dd className="col-sm-9">{pet.subBreedNameSnapshot ?? pet.subBreed?.name}</dd>
              </>
            )}
            {(pet.colorNameSnapshot ?? pet.color?.name) && (
              <>
                <dt className="col-sm-3">Color</dt>
                <dd className="col-sm-9">{pet.colorNameSnapshot ?? pet.color?.name}</dd>
              </>
            )}
            {(pet.sizeNameSnapshot ?? pet.size?.name) && (
              <>
                <dt className="col-sm-3">Size</dt>
                <dd className="col-sm-9">{pet.sizeNameSnapshot ?? pet.size?.name}</dd>
              </>
            )}
            <dt className="col-sm-3">Sex</dt>
            <dd className="col-sm-9">{pet.sex === "MALE" ? "Male" : pet.sex === "FEMALE" ? "Female" : "—"}</dd>
            <dt className="col-sm-3">Date of birth</dt>
            <dd className="col-sm-9">{pet.dateOfBirth ? new Date(pet.dateOfBirth).toLocaleDateString() : "—"}</dd>
            <dt className="col-sm-3">Microchip</dt>
            <dd className="col-sm-9">{pet.microchipNumber ? String(pet.microchipNumber) : "—"}</dd>
            {pet.notes && (
              <>
                <dt className="col-sm-3">Notes</dt>
                <dd className="col-sm-9">{pet.notes}</dd>
              </>
            )}
          </dl>
        </div>
      </div>

      <div className="mt-3">
        <Link href="/owner/pets" className="btn btn-outline-secondary">
          ← Back to My Pets
        </Link>
      </div>
    </div>
  );
}
