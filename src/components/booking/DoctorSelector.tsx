"use client";

import type { EligibleDoctor } from "@/src/types/appointment";
import LoadingState from "@/src/components/dashboard/LoadingState";
import EmptyState from "@/src/components/dashboard/EmptyState";

function formatCurrency(amount: number | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "BDT", minimumFractionDigits: 0 }).format(
    amount
  );
}

export interface DoctorSelectorProps {
  doctors: EligibleDoctor[];
  selectedId?: number | "auto" | null;
  onSelect: (doctor: EligibleDoctor | "auto") => void;
  loading?: boolean;
  error?: string | null;
  showAutoAssign?: boolean;
}

export default function DoctorSelector({
  doctors,
  selectedId,
  onSelect,
  loading,
  error,
  showAutoAssign = true,
}: DoctorSelectorProps) {
  if (loading) return <LoadingState message="Loading doctors…" />;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!doctors?.length && !showAutoAssign)
    return <EmptyState title="No doctors" description="No eligible doctors for this service or package." />;

  return (
    <div className="doctor-selector d-flex flex-column gap-2">
      {showAutoAssign && (
        <button
          type="button"
          className={`card text-start ${selectedId === "auto" ? "border-primary border-2" : ""}`}
          onClick={() => onSelect("auto")}
        >
          <div className="card-body py-2 px-3">
            <span className="fw-semibold">Any available doctor</span>
          </div>
        </button>
      )}
      {doctors.map((doc) => (
        <button
          key={doc.doctorId}
          type="button"
          className={`card text-start ${selectedId === doc.doctorId ? "border-primary border-2" : ""}`}
          onClick={() => onSelect(doc)}
        >
          <div className="card-body py-2 px-3 d-flex justify-content-between align-items-center">
            <div>
              <span className="fw-semibold">{doc.doctorName}</span>
              {doc.specializationTags?.length ? (
                <span className="badge bg-light text-dark ms-2">
                  {doc.specializationTags.slice(0, 2).join(", ")}
                </span>
              ) : null}
            </div>
            <span className="text-muted small">
              {doc.serviceFee != null ? formatCurrency(doc.serviceFee) : doc.defaultConsultationFee != null ? formatCurrency(doc.defaultConsultationFee) : "—"}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
