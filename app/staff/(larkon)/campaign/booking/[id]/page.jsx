"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import CampaignStaffShell from "@/src/bpa/campaign/staff/CampaignStaffShell";
import VaccinationStatusTimeline from "@/src/bpa/campaign/staff/VaccinationStatusTimeline";
import VaccinationHistory from "@/src/bpa/campaign/staff/VaccinationHistory";
import { trackRecentBooking } from "@/src/bpa/campaign/staff/recentBookings";
import {
  campaignBookingPath,
  campaignStaffCheckIn,
  campaignStaffGetBooking,
  loadCampaignStaffContext,
} from "@/lib/campaignApi";

function statusLabel(s) {
  return String(s || "").replace(/_/g, " ");
}

function formatSlot(slot) {
  if (!slot?.startTime) return null;
  const end = slot.endTime ? ` – ${slot.endTime}` : "";
  return `${slot.startTime}${end}`;
}

function petAge(pet) {
  if (!pet?.ageMonths) return null;
  const years = Math.floor(pet.ageMonths / 12);
  const months = pet.ageMonths % 12;
  if (years > 0) return `${years} yr${years > 1 ? "s" : ""}`;
  return `${months} mo`;
}

export default function CampaignStaffBookingPage() {
  const params = useParams();
  const router = useRouter();
  const id = decodeURIComponent(String(params?.id ?? ""));
  const ctx = loadCampaignStaffContext();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkInResult, setCheckInResult] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const b = await campaignStaffGetBooking(id);
      setBooking(b);
      trackRecentBooking(b.bookingRef, {
        ownerName: b.ownerName || b.owner?.name,
        status: b.status,
      });
    } catch (e) {
      setError(e?.message || "Booking not found");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function checkIn() {
    if (!ctx?.locationId) {
      setError("Select a location first");
      return;
    }
    setError("");
    setCheckingIn(true);
    try {
      const identifier = booking?.qrToken || booking?.bookingRef || id;
      const result = await campaignStaffCheckIn(identifier, ctx.locationId);
      setCheckInResult(result);
      await load();
    } catch (e) {
      setError(e?.message || "Check-in failed");
    } finally {
      setCheckingIn(false);
    }
  }

  const refPath = booking ? campaignBookingPath(booking) : encodeURIComponent(id);
  const canCheckIn = booking && ["CONFIRMED", "DRAFT"].includes(booking.status);
  const canVaccinate = booking && ["CHECKED_IN", "IN_PROGRESS"].includes(booking.status);
  const hasCerts = (booking?.pets || []).some((p) => p.certificateToken);

  return (
    <CampaignStaffShell title="Booking details" backHref="/staff/campaign/scan">
      {loading ? <p className="text-muted">Loading…</p> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {booking ? (
        <>
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <div className="text-success small fw-semibold mb-1">VALID BOOKING</div>
              <h4 className="font-monospace mb-2">{booking.bookingRef}</h4>
              <p className="mb-1">
                <strong>{booking.ownerName || booking.owner?.name}</strong>
              </p>
              <p className="text-muted small mb-2">
                <a href={`tel:${booking.ownerPhone || booking.owner?.phone}`}>
                  {booking.ownerPhone || booking.owner?.phone}
                </a>
              </p>
              <span className="badge bg-primary">{statusLabel(booking.status)}</span>
              {booking.queueNumber ? (
                <span className="badge bg-dark ms-2">Queue {booking.queueNumber}</span>
              ) : null}
              {formatSlot(booking.slot) ? (
                <p className="small mt-2 mb-0">
                  <i className="ri-time-line me-1" aria-hidden />
                  {formatSlot(booking.slot)}
                </p>
              ) : null}
              {booking.location?.name ? (
                <p className="small mb-0 text-muted">
                  <i className="ri-map-pin-line me-1" aria-hidden />
                  {booking.location.name}
                </p>
              ) : null}
            </div>
          </div>

          <VaccinationStatusTimeline booking={booking} />
          <VaccinationHistory pets={booking.pets || []} />

          <h6 className="text-muted text-uppercase small">Pets ({booking.pets?.length ?? 0})</h6>
          {(booking.pets || []).map((pet) => (
            <div key={pet.id} className="card border-0 shadow-sm mb-2">
              <div className="card-body py-2 d-flex justify-content-between align-items-center gap-2">
                <div>
                  <div className="fw-semibold">{pet.name}</div>
                  <div className="small text-muted">
                    {[pet.gender, petAge(pet)].filter(Boolean).join(" · ") || pet.vaccinationStatus}
                  </div>
                </div>
                <div className="d-flex flex-column align-items-end gap-1">
                  <span
                    className={`badge ${
                      pet.vaccinationStatus === "COMPLETED" ? "bg-success" : "bg-warning text-dark"
                    }`}
                  >
                    {pet.vaccinationStatus}
                  </span>
                  {pet.vaccinationStatus === "PENDING" && canVaccinate ? (
                    <Link
                      href={`/staff/campaign/vaccinate/${refPath}?petId=${pet.id}`}
                      className="btn btn-sm btn-success"
                    >
                      Vaccinate
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ))}

          {checkInResult?.queueNumber || checkInResult?.booking?.queueNumber ? (
            <div className="alert alert-success">
              Checked in — Queue {checkInResult.queueNumber || checkInResult.booking?.queueNumber}
            </div>
          ) : null}

          <div className="d-grid gap-2 mt-3">
            {canCheckIn ? (
              <button type="button" className="btn btn-primary btn-lg py-3" onClick={checkIn} disabled={checkingIn}>
                {checkingIn ? "Checking in…" : "Check in"}
              </button>
            ) : null}
            {canVaccinate ? (
              <Link href={`/staff/campaign/vaccinate/${refPath}`} className="btn btn-success btn-lg py-3">
                Record vaccination
              </Link>
            ) : null}
            {hasCerts ? (
              <Link href={`/staff/campaign/certificate/${refPath}`} className="btn btn-outline-secondary btn-lg">
                Certificates
              </Link>
            ) : null}
            <button type="button" className="btn btn-outline-primary" onClick={() => router.push("/staff/campaign/scan")}>
              Scan next
            </button>
          </div>
        </>
      ) : null}
    </CampaignStaffShell>
  );
}
