"use client";

import type { DoctorServiceAssignmentSummaryDoctor } from "@/src/types/doctorServiceAssignment";

type Props = {
  doctors: DoctorServiceAssignmentSummaryDoctor[];
  selectedId: number | null;
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (memberId: number) => void;
};

export default function DoctorDirectoryPanel({
  doctors,
  selectedId,
  search,
  onSearchChange,
  onSelect,
}: Props) {
  const q = search.trim().toLowerCase();
  const filtered = q.length
    ? doctors.filter((d) => d.displayName.toLowerCase().includes(q) || String(d.memberId).includes(q))
    : doctors;

  return (
    <div className="border rounded-3 overflow-hidden bg-white h-100 d-flex flex-column" style={{ minHeight: 280 }}>
      <div className="p-2 border-bottom bg-light">
        <input
          type="search"
          className="form-control form-control-sm radius-8"
          placeholder="Search doctors…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search doctors"
        />
      </div>
      <div className="flex-grow-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="text-muted small p-3">No doctors match.</div>
        ) : (
          <ul className="list-group list-group-flush">
            {filtered.map((d) => {
              const active = selectedId === d.memberId;
              return (
                <li key={d.memberId} className="list-group-item p-0">
                  <button
                    type="button"
                    className={`btn btn-link w-100 text-start text-decoration-none py-2 px-3 rounded-0 ${
                      active ? "bg-primary-subtle fw-semibold" : ""
                    }`}
                    onClick={() => onSelect(d.memberId)}
                  >
                    <div className="d-flex justify-content-between align-items-center gap-2">
                      <span className="text-body text-truncate">{d.displayName}</span>
                      <span className="text-muted small text-nowrap">{d.assignedServiceCount} svc</span>
                    </div>
                    <div className="small text-muted">
                      <span
                        className={`badge radius-6 ${d.profileStatus === "ACTIVE" ? "bg-success-subtle text-success-emphasis" : "bg-secondary-subtle"}`}
                      >
                        {d.profileStatus}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
