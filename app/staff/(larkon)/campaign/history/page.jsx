"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import CampaignStaffShell from "@/src/bpa/campaign/staff/CampaignStaffShell";
import { loadRecentBookings } from "@/src/bpa/campaign/staff/recentBookings";
import {
  campaignStaffGetBooking,
  campaignStaffQueue,
  loadCampaignStaffContext,
} from "@/lib/campaignApi";

export default function CampaignStaffHistoryPage() {
  const ctx = loadCampaignStaffContext();
  const [queue, setQueue] = useState([]);
  const [recent, setRecent] = useState([]);
  const [completedToday, setCompletedToday] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const recents = loadRecentBookings();
      setRecent(recents);

      if (ctx?.locationId) {
        const q = await campaignStaffQueue(ctx.locationId);
        setQueue(Array.isArray(q) ? q : []);
      }

      const completed = [];
      for (const r of recents.slice(0, 10)) {
        try {
          const b = await campaignStaffGetBooking(r.bookingRef);
          const donePets = (b.pets || []).filter((p) => p.vaccinationStatus === "COMPLETED");
          if (donePets.length > 0) {
            completed.push({
              bookingRef: b.bookingRef,
              ownerName: b.ownerName || b.owner?.name,
              pets: donePets,
              status: b.status,
            });
          }
        } catch {
          /* skip stale refs */
        }
      }
      setCompletedToday(completed);
    } catch (e) {
      setError(e?.message || "Could not load history");
    } finally {
      setLoading(false);
    }
  }, [ctx?.locationId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <CampaignStaffShell title="Vaccination history" backHref="/staff/campaign">
      {!ctx ? (
        <div className="alert alert-warning">
          Select a campaign location first. <Link href="/staff/campaign">Go to home</Link>
        </div>
      ) : null}

      {error ? <div className="alert alert-danger">{error}</div> : null}
      {loading ? <p className="text-muted">Loading…</p> : null}

      {queue.length > 0 ? (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <h6 className="text-muted text-uppercase small mb-2">Current queue</h6>
            {queue.map((item, i) => (
              <div key={`${item.queueNumber}-${i}`} className="d-flex justify-content-between small py-2 border-bottom">
                <div>
                  <strong>{item.queueNumber || "—"}</strong> {item.ownerName}
                  <div className="text-muted">{item.status?.replace(/_/g, " ")}</div>
                </div>
                <span className="text-muted">{item.waitingMinutes ?? 0}m</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <h6 className="text-muted text-uppercase small mb-2">Recent vaccinations</h6>
          {completedToday.length === 0 ? (
            <p className="text-muted small mb-0">No completed vaccinations in recent bookings yet.</p>
          ) : (
            completedToday.map((row) => (
              <div key={row.bookingRef} className="mb-3 pb-2 border-bottom">
                <Link href={`/staff/campaign/booking/${encodeURIComponent(row.bookingRef)}`} className="fw-semibold text-decoration-none">
                  {row.bookingRef}
                </Link>
                <div className="small text-muted">{row.ownerName}</div>
                {row.pets.map((p) => (
                  <div key={p.id} className="d-flex justify-content-between small mt-1">
                    <span>{p.name}</span>
                    <span className="text-success">✓ {p.certificateToken ? "Cert issued" : "Done"}</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {recent.length > 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h6 className="text-muted text-uppercase small mb-2">Recently viewed bookings</h6>
            {recent.map((r) => (
              <Link
                key={r.bookingRef}
                href={`/staff/campaign/booking/${encodeURIComponent(r.bookingRef)}`}
                className="d-flex justify-content-between align-items-center py-2 border-bottom text-decoration-none text-body"
              >
                <div>
                  <div className="font-monospace small">{r.bookingRef}</div>
                  <div className="text-muted small">{r.ownerName}</div>
                </div>
                <span className="badge bg-light text-dark">{r.status?.replace(/_/g, " ") || "—"}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <Link href="/staff/campaign/lookup" className="btn btn-primary w-100 mt-3">
        Search another booking
      </Link>
    </CampaignStaffShell>
  );
}
