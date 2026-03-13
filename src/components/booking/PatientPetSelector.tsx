"use client";

import { useState } from "react";

export interface PetOption {
  id: number;
  name: string;
  animalType?: string;
}

export interface PatientOption {
  id: number;
  displayName: string;
  mobile?: string;
  pets?: PetOption[];
}

export interface PatientPetSelectorProps {
  patient?: PatientOption | null;
  pet?: PetOption | null;
  onPatientSelect?: (patient: PatientOption | null) => void;
  onPetSelect?: (pet: PetOption | null) => void;
  onSearch?: (query: string) => void;
  searchResults?: PatientOption[];
  searchLoading?: boolean;
  allowQuickCreate?: boolean;
}

export default function PatientPetSelector({
  patient,
  pet,
  onPatientSelect,
  onPetSelect,
  onSearch,
  searchResults = [],
  searchLoading,
  allowQuickCreate,
}: PatientPetSelectorProps) {
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    if (query.trim() && onSearch) onSearch(query.trim());
  };

  return (
    <div className="patient-pet-selector">
      <div className="mb-3">
        <label className="form-label">Search patient (phone or name)</label>
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Phone or name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
          />
          <button type="button" className="btn btn-outline-primary" onClick={handleSearch} disabled={searchLoading}>
            {searchLoading ? "Searching…" : "Search"}
          </button>
        </div>
      </div>
      {searchResults.length > 0 && (
        <div className="list-group mb-3">
          {searchResults.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`list-group-item list-group-item-action ${patient?.id === p.id ? "active" : ""}`}
              onClick={() => onPatientSelect?.(p)}
            >
              {p.displayName} {p.mobile ? ` · ${p.mobile}` : ""}
            </button>
          ))}
        </div>
      )}
      {patient && (
        <div className="card mb-3">
          <div className="card-body py-2">
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-semibold">{patient.displayName}</span>
              <button
                type="button"
                className="btn btn-sm btn-link text-muted"
                onClick={() => onPatientSelect?.(null)}
              >
                Clear
              </button>
            </div>
            {patient.pets?.length ? (
              <div className="mt-2">
                <label className="form-label small mb-1">Select pet</label>
                <div className="d-flex flex-wrap gap-2">
                  {patient.pets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`btn btn-sm ${pet?.id === p.id ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => onPetSelect?.(p)}
                    >
                      {p.name} {p.animalType ? `(${p.animalType})` : ""}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="small text-muted mb-0 mt-1">No pets registered.</p>
            )}
          </div>
        </div>
      )}
      {allowQuickCreate && (
        <p className="small text-muted">Quick-create pet can be added from the staff panel.</p>
      )}
    </div>
  );
}
