"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ownerPetVaccinationCardGet,
  type OwnerVaccinationCardItem,
  type OwnerVaccinationCardPayload,
} from "@/lib/api";
import { formatPetTaxonomyLine } from "@/lib/formatPetTaxonomy";

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function dueBadgeClass(dueStatus: OwnerVaccinationCardItem["dueStatus"]): string {
  if (dueStatus === "OVERDUE") return "bg-danger-subtle text-danger";
  if (dueStatus === "UPCOMING") return "bg-warning-subtle text-warning";
  return "bg-secondary-subtle text-secondary";
}

function statusBadgeClass(status: string | null | undefined): string {
  if (status === "ACTIVE") return "bg-success-subtle text-success";
  if (status === "CORRECTED") return "bg-info-subtle text-info";
  return "bg-secondary-subtle text-secondary";
}

/** formatPetTaxonomyLine expects relation { name?: string }; API uses string | null. */
function toTaxonomyPetInput(pet: OwnerVaccinationCardPayload["pet"]) {
  const rel = (row: { name: string | null } | null | undefined) =>
    row == null ? null : { name: row.name ?? undefined };
  return {
    animalTypeNameSnapshot: pet.animalTypeNameSnapshot,
    breedNameSnapshot: pet.breedNameSnapshot,
    subBreedNameSnapshot: pet.subBreedNameSnapshot,
    colorNameSnapshot: pet.colorNameSnapshot,
    sizeNameSnapshot: pet.sizeNameSnapshot,
    animalType: rel(pet.animalType),
    breed: rel(pet.breed),
    subBreed: rel(pet.subBreed),
    color: rel(pet.color),
    size: rel(pet.size),
  };
}

export default function OwnerPetVaccinationCardPage() {
  const params = useParams();
  const id = params?.id != null ? String(params.id) : "";
  const [payload, setPayload] = useState<OwnerVaccinationCardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    ownerPetVaccinationCardGet(id)
      .then((data) => setPayload(data))
      .catch((e) => {
        setError((e as Error)?.message ?? "Failed to load vaccination card");
        setPayload(null);
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

  if (error || !payload) {
    return (
      <div className="container py-3">
        <div className="alert alert-danger" role="alert">
          {error || "Vaccination card not found."}
        </div>
        <Link href={id ? `/owner/pets/${id}` : "/owner/pets"} className="btn btn-outline-secondary">
          Back to pet
        </Link>
      </div>
    );
  }

  const { pet, card } = payload;
  const taxonomyLine = formatPetTaxonomyLine(toTaxonomyPetInput(pet)) || pet.animalType?.name || "";

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
            <li className="breadcrumb-item">
              <Link href={`/owner/pets/${pet.id}`}>{pet.name ?? "Pet"}</Link>
            </li>
            <li className="breadcrumb-item active">Vaccination Card</li>
          </ol>
        </nav>
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
          <div>
            <h2 className="mb-1">Vaccination Card</h2>
            <div className="text-secondary">
              <strong>{pet.name ?? "Pet"}</strong>
              {taxonomyLine ? ` - ${taxonomyLine}` : ""}
            </div>
          </div>
          <div className="text-secondary small">
            <div>Overdue: {card.overdueCount}</div>
            <div>Upcoming: {card.upcomingCount}</div>
          </div>
        </div>
      </header>

      <section className="row g-3 mb-4">
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-secondary small mb-1">Upcoming</div>
              <div className="fs-4 fw-semibold">{card.upcomingCount}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-secondary small mb-1">Overdue</div>
              <div className="fs-4 fw-semibold">{card.overdueCount}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-secondary small mb-1">Vaccination records</div>
              <div className="fs-4 fw-semibold">{card.vaccinations.length}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-secondary small mb-1">Print and QR</div>
              <div className="fw-semibold">Coming soon</div>
            </div>
          </div>
        </div>
      </section>

      <section className="card mb-4">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
            <h5 className="mb-0">Next Due</h5>
            <span className="text-secondary small">Read-only owner view</span>
          </div>

          {card.nextDue.length === 0 ? (
            <div className="text-secondary">No upcoming or overdue vaccination due dates found.</div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Vaccine</th>
                    <th>Last given</th>
                    <th>Next due</th>
                    <th>Status</th>
                    <th>Clinic</th>
                  </tr>
                </thead>
                <tbody>
                  {card.nextDue.map((item) => (
                    <tr key={`due-${item.vaccinationId}`}>
                      <td>{item.vaccineName ?? "-"}</td>
                      <td>{formatDate(item.administeredAt)}</td>
                      <td>{formatDate(item.nextDueDate)}</td>
                      <td>
                        <span className={`badge rounded-pill ${dueBadgeClass(item.dueStatus)}`}>
                          {item.dueStatus ?? "N/A"}
                        </span>
                      </td>
                      <td>{item.branchName ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
            <h5 className="mb-0">Vaccination History</h5>
            <span className="text-secondary small">Internal billing, stock, and private notes are hidden</span>
          </div>

          {card.vaccinations.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-secondary mb-0">No vaccination records available for this pet yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Vaccine</th>
                    <th>Administered</th>
                    <th>Next due</th>
                    <th>Manufacturer</th>
                    <th>Batch</th>
                    <th>Clinic</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {card.vaccinations.map((item) => (
                    <tr key={item.vaccinationId}>
                      <td>{item.vaccineName ?? "-"}</td>
                      <td>{formatDate(item.administeredAt)}</td>
                      <td>
                        <div>{formatDate(item.nextDueDate)}</div>
                        {item.dueStatus ? (
                          <span className={`badge rounded-pill mt-1 ${dueBadgeClass(item.dueStatus)}`}>
                            {item.dueStatus}
                          </span>
                        ) : null}
                      </td>
                      <td>{item.manufacturer ?? "-"}</td>
                      <td>{item.batchNumber ?? "-"}</td>
                      <td>{item.branchName ?? "-"}</td>
                      <td>
                        <span className={`badge rounded-pill ${statusBadgeClass(item.status)}`}>
                          {item.status ?? "UNKNOWN"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <div className="mt-3">
        <Link href={`/owner/pets/${pet.id}`} className="btn btn-outline-secondary me-2">
          Back to pet
        </Link>
        <Link href="/owner/pets" className="btn btn-link">
          Back to My Pets
        </Link>
      </div>
    </div>
  );
}
