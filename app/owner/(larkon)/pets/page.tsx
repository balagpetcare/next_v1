"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ownerMyPets } from "@/app/owner/_lib/ownerApi";

export default function OwnerMyPetsPage() {
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await ownerMyPets();
      setPets(Array.isArray(data?.pets) ? data.pets : []);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load pets");
      setPets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="container py-3 bpa-page">
      <header className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="mb-1">My Pets</h2>
          <div className="text-secondary">Pets linked to your account. Same list is used at the clinic.</div>
        </div>
        <Link className="btn btn-primary" href="/owner/pets/new">
          <i className="solar:add-circle-outline me-1" />
          Add pet
        </Link>
      </header>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-5 text-secondary">
          <div className="spinner-border" role="status" />
          <p className="mt-2 mb-0">Loading...</p>
        </div>
      ) : pets.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <p className="text-muted mb-3">No pets registered yet.</p>
            <Link className="btn btn-primary" href="/owner/pets/new">
              Add your first pet
            </Link>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Species</th>
                    <th>Breed</th>
                    <th>Sex</th>
                    <th>Microchip</th>
                    <th aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {pets.map((pet) => (
                    <tr key={pet.id}>
                      <td>
                        <strong>{pet.name ?? "—"}</strong>
                      </td>
                      <td>{pet.animalType?.name ?? "—"}</td>
                      <td>{pet.breed?.name ?? "—"}</td>
                      <td>{pet.sex === "MALE" ? "Male" : pet.sex === "FEMALE" ? "Female" : "—"}</td>
                      <td>{pet.microchipNumber ? String(pet.microchipNumber) : "—"}</td>
                      <td className="text-end">
                        <Link
                          className="btn btn-sm btn-outline-secondary"
                          href={`/owner/pets/${pet.id}`}
                          aria-label={`View ${pet.name}`}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3">
        <Link href="/owner" className="btn btn-outline-secondary btn-sm">
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
