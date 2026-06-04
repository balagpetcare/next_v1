"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import CampaignStaffShell from "@/src/bpa/campaign/staff/CampaignStaffShell";
import { findVaccineType, defaultBatchFor, defaultExpiryDate } from "@/src/bpa/campaign/staff/vaccineHelpers";
import { trackRecentBooking } from "@/src/bpa/campaign/staff/recentBookings";
import {
  campaignBookingPath,
  campaignPublicBySlug,
  campaignStaffGetBooking,
  campaignStaffRecordVaccination,
  loadCampaignStaffContext,
} from "@/lib/campaignApi";

const PRECHECK = [
  { key: "appearHealthy", label: "Cat appears healthy" },
  { key: "noRecentIllness", label: "No recent illness reported" },
  { key: "notOnMedication", label: "Not on medication" },
  { key: "notPregnant", label: "Not pregnant (if female)" },
  { key: "ageAppropriate", label: "Appropriate age for vaccine" },
];

export default function CampaignStaffVaccinatePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const bookingRef = decodeURIComponent(String(params?.bookingId ?? ""));
  const ctx = loadCampaignStaffContext();
  const [booking, setBooking] = useState(null);
  const [vaccineTypes, setVaccineTypes] = useState([]);
  const [campaignPetId, setCampaignPetId] = useState(Number(searchParams.get("petId")) || 0);
  const [vaccineTypeId, setVaccineTypeId] = useState(0);
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState(defaultExpiryDate());
  const [notes, setNotes] = useState("");
  const [checks, setChecks] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [busy, setBusy] = useState(false);
  const [quickKind, setQuickKind] = useState("");

  const load = useCallback(async () => {
    try {
      const b = await campaignStaffGetBooking(bookingRef);
      setBooking(b);
      trackRecentBooking(b.bookingRef, {
        ownerName: b.ownerName || b.owner?.name,
        status: b.status,
      });
      const pending = (b.pets || []).filter((p) => p.vaccinationStatus === "PENDING");
      if (!campaignPetId && pending[0]) setCampaignPetId(pending[0].id);
      if (ctx?.campaignSlug) {
        const c = await campaignPublicBySlug(ctx.campaignSlug);
        const types = (c.vaccineTypes || []).map((vt) => ({
          id: vt.vaccineType?.id ?? vt.vaccineTypeId,
          name: vt.vaccineType?.name ?? `Vaccine #${vt.vaccineTypeId}`,
        }));
        setVaccineTypes(types);
        if (types[0] && !vaccineTypeId) setVaccineTypeId(types[0].id);
      }
    } catch (e) {
      setError(e?.message || "Failed to load booking");
    }
  }, [bookingRef, ctx?.campaignSlug, campaignPetId, vaccineTypeId]);

  useEffect(() => {
    load();
  }, [load]);

  function applyQuickAction(kind) {
    const vt = findVaccineType(vaccineTypes, kind);
    if (!vt) {
      setError(`${kind === "rabies" ? "Rabies" : "Cat Flu"} vaccine type not configured for this campaign`);
      return;
    }
    setError("");
    setQuickKind(kind);
    setVaccineTypeId(vt.id);
    if (!batchNumber.trim()) setBatchNumber(defaultBatchFor(kind));
    setChecks({
      appearHealthy: true,
      noRecentIllness: true,
      notOnMedication: true,
      notPregnant: true,
      ageAppropriate: true,
    });
  }

  async function submit(e) {
    e.preventDefault();
    if (!PRECHECK.every((c) => checks[c.key])) {
      setError("Complete all pre-vaccination checks");
      return;
    }
    if (!batchNumber.trim()) {
      setError("Batch number is required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await campaignStaffRecordVaccination({
        campaignPetId,
        vaccineTypeId,
        batchNumber: batchNumber.trim(),
        expiryDate: expiryDate || undefined,
        notes: notes.trim() || undefined,
      });
      setSuccess(result);
      setQuickKind("");
      await load();
    } catch (err) {
      setError(err?.message || "Failed to record vaccination");
    } finally {
      setBusy(false);
    }
  }

  const pendingPets = (booking?.pets || []).filter((p) => p.vaccinationStatus === "PENDING");
  const refPath = booking ? campaignBookingPath(booking) : encodeURIComponent(bookingRef);
  const rabiesAvailable = !!findVaccineType(vaccineTypes, "rabies");
  const catFluAvailable = !!findVaccineType(vaccineTypes, "catflu");

  return (
    <CampaignStaffShell title="Pet vaccination" backHref={`/staff/campaign/booking/${refPath}`}>
      {booking ? (
        <p className="small text-muted mb-2">
          {booking.bookingRef} · {booking.ownerName || booking.owner?.name}
        </p>
      ) : null}

      {success?.certificateToken ? (
        <div className="alert alert-success">
          <strong>Vaccination complete.</strong>
          <div className="small mt-1">Certificate: {success.certificateToken}</div>
          <div className="d-flex gap-2 mt-2 flex-wrap">
            <Link href={`/staff/campaign/certificate/${refPath}`} className="btn btn-sm btn-outline-success">
              Preview certificate
            </Link>
            {pendingPets.length > 1 ? (
              <button type="button" className="btn btn-sm btn-success" onClick={() => setSuccess(null)}>
                Vaccinate next pet
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="d-grid gap-2 mb-3">
        <div className="small text-muted text-uppercase">Quick complete</div>
        <div className="row g-2">
          <div className="col-6">
            <button
              type="button"
              className={`btn w-100 py-3 ${quickKind === "rabies" ? "btn-danger" : "btn-outline-danger"}`}
              disabled={!rabiesAvailable || pendingPets.length === 0}
              onClick={() => applyQuickAction("rabies")}
            >
              <i className="ri-shield-check-line d-block fs-4" aria-hidden />
              Rabies
            </button>
          </div>
          <div className="col-6">
            <button
              type="button"
              className={`btn w-100 py-3 ${quickKind === "catflu" ? "btn-primary" : "btn-outline-primary"}`}
              disabled={!catFluAvailable || pendingPets.length === 0}
              onClick={() => applyQuickAction("catflu")}
            >
              <i className="ri-heart-pulse-line d-block fs-4" aria-hidden />
              Cat Flu
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="card border-0 shadow-sm">
        <div className="card-body d-grid gap-3">
          <div>
            <label className="form-label">Select pet</label>
            <select
              className="form-select form-select-lg"
              value={campaignPetId}
              onChange={(e) => setCampaignPetId(Number(e.target.value))}
            >
              {pendingPets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {pendingPets.length === 0 ? (
              <div className="small text-muted mt-1">All pets vaccinated for this booking.</div>
            ) : null}
          </div>

          <div>
            <label className="form-label d-block">Pre-vaccination check</label>
            {PRECHECK.map((c) => (
              <label key={c.key} className="form-check mb-1">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={!!checks[c.key]}
                  onChange={(e) => setChecks((prev) => ({ ...prev, [c.key]: e.target.checked }))}
                />
                <span className="form-check-label">{c.label}</span>
              </label>
            ))}
          </div>

          <div>
            <label className="form-label">Vaccine type</label>
            <select
              className="form-select form-select-lg"
              value={vaccineTypeId}
              onChange={(e) => {
                setVaccineTypeId(Number(e.target.value));
                setQuickKind("");
              }}
            >
              {vaccineTypes.map((vt) => (
                <option key={vt.id} value={vt.id}>
                  {vt.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Batch number *</label>
            <input
              className="form-control form-control-lg font-monospace"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              required
              placeholder="RAB-2026-001"
            />
          </div>

          <div>
            <label className="form-label">Expiry date</label>
            <input
              type="date"
              className="form-control form-control-lg"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Vaccination notes</label>
            <textarea
              className="form-control"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations, reactions, deferral notes…"
              maxLength={500}
            />
            <div className="form-text">{notes.length}/500</div>
          </div>

          <button type="submit" className="btn btn-success btn-lg py-3" disabled={busy || pendingPets.length === 0}>
            {busy ? "Recording…" : "Record vaccination & generate certificate"}
          </button>
        </div>
      </form>

      {(booking?.pets || []).filter((p) => p.vaccinationStatus === "COMPLETED").length > 0 ? (
        <div className="mt-3">
          <Link href={`/staff/campaign/certificate/${refPath}`} className="btn btn-outline-secondary w-100">
            View all certificates
          </Link>
        </div>
      ) : null}
    </CampaignStaffShell>
  );
}
