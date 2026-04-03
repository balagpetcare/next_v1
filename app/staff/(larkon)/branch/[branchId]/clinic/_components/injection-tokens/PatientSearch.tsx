"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { staffClinicOwnerLookup, staffClinicPatientGet, staffClinicPatientsList } from "@/lib/api";
import type { SelectedPetContext } from "./types";
import { mapApiPetToContext } from "./patientUtils";

type PatientSearchProps = {
  branchId: string;
  registerHref: string;
  selectedPetContext: SelectedPetContext | null;
  onSelectPet: (ctx: SelectedPetContext) => void;
  onClearSelection: () => void;
  /** When true, omit outer panel border (parent card provides chrome). */
  embedded?: boolean;
};

export function PatientSearch({
  branchId,
  registerHref,
  selectedPetContext,
  onSelectPet,
  onClearSelection,
  embedded = false,
}: PatientSearchProps) {
  const [patientLookupPhone, setPatientLookupPhone] = useState("");
  const [patientLookupPetIdInput, setPatientLookupPetIdInput] = useState("");
  const [patientLookupName, setPatientLookupName] = useState("");
  const [patientLookupLoading, setPatientLookupLoading] = useState(false);
  const [patientLookupResults, setPatientLookupResults] = useState<unknown[]>([]);

  useEffect(() => {
    if (!branchId || !patientLookupName.trim()) return;
    const t = setTimeout(() => {
      setPatientLookupLoading(true);
      staffClinicPatientsList(branchId, { search: patientLookupName.trim(), limit: 25 })
        .then((r) => setPatientLookupResults(Array.isArray(r?.patients) ? r.patients : []))
        .catch(() => setPatientLookupResults([]))
        .finally(() => setPatientLookupLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [branchId, patientLookupName]);

  const searchOwnerPetsByPhone = useCallback(async () => {
    if (!branchId) return;
    const q = patientLookupPhone.trim();
    if (!q) {
      toast.error("Enter a phone number or email");
      return;
    }
    setPatientLookupName("");
    setPatientLookupLoading(true);
    setPatientLookupResults([]);
    try {
      const owner = await staffClinicOwnerLookup(branchId, q);
      if (!owner?.id) {
        toast.error("Owner not found");
        return;
      }
      const res = await staffClinicPatientsList(branchId, { ownerId: Number(owner.id), limit: 50 });
      const pets = Array.isArray(res?.patients) ? res.patients : [];
      setPatientLookupResults(pets);
      if (pets.length === 0) {
        toast.info("Owner found — no pets linked at this branch yet. Register a pet to continue.");
      }
    } catch {
      toast.error("No owner matches this phone or email");
      setPatientLookupResults([]);
    } finally {
      setPatientLookupLoading(false);
    }
  }, [branchId, patientLookupPhone]);

  const searchPetByNumericId = useCallback(async () => {
    if (!branchId) return;
    const id = Number(patientLookupPetIdInput);
    if (!Number.isFinite(id) || id <= 0) {
      toast.error("Enter a valid pet ID");
      return;
    }
    setPatientLookupName("");
    setPatientLookupLoading(true);
    try {
      const pet = await staffClinicPatientGet(branchId, id);
      if (!pet) {
        toast.error("Pet not found or not visible at this branch");
        setPatientLookupResults([]);
        return;
      }
      const ctx = mapApiPetToContext(pet);
      if (!ctx) {
        toast.error("This pet has no linked owner — link an owner before generating a token");
        setPatientLookupResults([]);
        return;
      }
      onSelectPet(ctx);
      setPatientLookupResults([]);
      toast.success("Pet selected");
    } catch {
      toast.error("Could not load pet");
      setPatientLookupResults([]);
    } finally {
      setPatientLookupLoading(false);
    }
  }, [branchId, patientLookupPetIdInput, onSelectPet]);

  return (
    <div
      className={
        embedded
          ? "rounded border border-light px-3 py-2 mb-2 bg-body-secondary bg-opacity-25"
          : "border rounded px-3 py-3 mb-3 bg-body-secondary bg-opacity-25"
      }
    >
      <div className="fw-semibold small mb-2">Search patient / owner</div>
      <div className="row g-2 align-items-end mb-2">
        <div className="col-md-4">
          <label className="form-label small">Parent phone or email</label>
          <input
            className="form-control form-control-sm radius-8"
            value={patientLookupPhone}
            onChange={(e) => setPatientLookupPhone(e.target.value)}
            placeholder="e.g. 017… or owner@…"
          />
        </div>
        <div className="col-md-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary radius-8 w-100"
            onClick={searchOwnerPetsByPhone}
            disabled={patientLookupLoading}
          >
            {patientLookupLoading ? "…" : "Find pets"}
          </button>
        </div>
        <div className="col-md-3">
          <label className="form-label small">Pet ID (numeric)</label>
          <input
            className="form-control form-control-sm radius-8"
            value={patientLookupPetIdInput}
            onChange={(e) => setPatientLookupPetIdInput(e.target.value)}
            placeholder="Pet id"
          />
        </div>
        <div className="col-md-3">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary radius-8 w-100"
            onClick={searchPetByNumericId}
            disabled={patientLookupLoading}
          >
            {patientLookupLoading ? "…" : "Lookup pet"}
          </button>
        </div>
      </div>
      <div className="mb-2">
        <label className="form-label small">Or search by pet / owner name (this branch)</label>
        <input
          className="form-control form-control-sm radius-8"
          value={patientLookupName}
          onChange={(e) => setPatientLookupName(e.target.value)}
          placeholder="Pet name, owner name, phone fragment, unique pet id…"
        />
        <small className="text-muted">Results update as you type.</small>
      </div>
      <div className="d-flex flex-wrap gap-2 mb-2">
        <Link href={registerHref} className="btn btn-sm btn-outline-secondary radius-8">
          Register new patient
        </Link>
      </div>
      {patientLookupLoading && patientLookupName.trim() && (
        <div className="small text-muted mb-2">Searching directory…</div>
      )}
      {patientLookupResults.length > 0 && (
        <div className="table-responsive border rounded radius-8 mb-0" style={{ maxHeight: 220, overflow: "auto" }}>
          <table className="table table-sm table-hover mb-0 small">
            <thead className="table-light sticky-top">
              <tr>
                <th>Owner</th>
                <th>Phone</th>
                <th>Pet</th>
                <th>Pet ID</th>
                <th>Species / breed</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {patientLookupResults.map((row: unknown) => {
                const r = row as Record<string, unknown>;
                const owner = r.owner as Record<string, unknown> | undefined;
                const animalType = r.animalType as Record<string, unknown> | undefined;
                const breed = r.breed as Record<string, unknown> | undefined;
                const ctx = mapApiPetToContext(row);
                return (
                  <tr key={String(r.id)}>
                    <td>{(owner?.displayName as string) ?? (owner?.username as string) ?? "—"}</td>
                    <td className="text-nowrap">{(owner?.phone as string) ?? "—"}</td>
                    <td>{(r.name as string) ?? "—"}</td>
                    <td className="font-monospace">
                      {String(r.id)}
                      {r.uniquePetId ? <span className="text-muted d-block small">{String(r.uniquePetId)}</span> : null}
                    </td>
                    <td className="small">
                      {[animalType?.name as string, (breed?.name as string) || (r.customBreedText as string)]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary radius-8"
                        disabled={!ctx}
                        onClick={() => {
                          if (!ctx) {
                            toast.error("Link an owner to this pet before continuing");
                            return;
                          }
                          onSelectPet(ctx);
                          setPatientLookupResults([]);
                          toast.success("Patient selected");
                        }}
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedPetContext && (
        <div className="border border-success border-opacity-50 rounded px-3 py-2 mt-3 small bg-success-subtle">
          <div className="d-flex flex-wrap justify-content-between gap-2 align-items-start">
            <div>
              <div className="fw-semibold text-success-emphasis">Selected patient</div>
              <div>
                <strong>{selectedPetContext.ownerDisplayName}</strong>
                {selectedPetContext.phone ? <span className="text-muted ms-1">{selectedPetContext.phone}</span> : null}
              </div>
              <div>
                Pet: <strong>{selectedPetContext.petName}</strong> (ID {selectedPetContext.petId}
                {selectedPetContext.uniquePetId ? (
                  <span className="text-muted"> · {selectedPetContext.uniquePetId}</span>
                ) : null}
                )
              </div>
              {(selectedPetContext.species || selectedPetContext.breed) && (
                <div className="text-muted">
                  {selectedPetContext.species}
                  {selectedPetContext.breed ? ` · ${selectedPetContext.breed}` : ""}
                  {selectedPetContext.registeredBranchId != null && (
                    <span className="ms-1">· Registered branch #{selectedPetContext.registeredBranchId}</span>
                  )}
                </div>
              )}
            </div>
            <button type="button" className="btn btn-sm btn-outline-secondary radius-8" onClick={onClearSelection}>
              Clear selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
