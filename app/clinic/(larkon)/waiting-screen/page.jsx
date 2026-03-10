"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { staffClinicQueueScreen } from "@/lib/api";

const POLL_MS = 4000;

export default function ClinicWaitingScreenPage() {
  const searchParams = useSearchParams();
  const branchId = searchParams?.get("branchId") || "";
  const [payload, setPayload] = useState({ nowServing: null, upNext: [], estimates: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!branchId) {
      setLoading(false);
      setError("Missing branchId");
      return;
    }
    let cancelled = false;
    async function fetchScreen() {
      try {
        const data = await staffClinicQueueScreen(branchId);
        if (!cancelled) setPayload(data || { nowServing: null, upNext: [], estimates: [] });
      } catch (e) {
        if (!cancelled) setError((e && e.message) || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchScreen();
    const interval = setInterval(fetchScreen, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [branchId]);

  if (!branchId) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark text-white">
        <div className="text-center p-4">
          <p className="mb-0">Open with ?branchId=... for the waiting screen.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark text-white">
        <div className="text-center p-4">
          <p className="mb-0 text-warning">{error}</p>
        </div>
      </div>
    );
  }

  const { nowServing, upNext } = payload;

  return (
    <div className="min-vh-100 d-flex flex-column bg-dark text-white">
      <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center p-4">
        <h5 className="text-uppercase text-muted mb-4">Now serving</h5>
        {loading && <p className="mb-0">Loading...</p>}
        {!loading && nowServing && (
          <div className="display-1 fw-bold text-center d-flex align-items-center justify-content-center flex-wrap gap-2">
            {nowServing.tokenNo || "—"}
            {nowServing.isEmergency && (
              <span className="badge bg-danger fs-6">Emergency</span>
            )}
          </div>
        )}
        {!loading && !nowServing && (
          <div className="display-6 text-muted">—</div>
        )}

        {!loading && upNext && upNext.length > 0 && (
          <div className="mt-5 pt-4 border-top border-secondary">
            <h6 className="text-uppercase text-muted mb-3">Up next</h6>
            <div className="d-flex flex-wrap gap-3 justify-content-center">
              {upNext.slice(0, 8).map((t, i) => (
                <span key={i} className="d-inline-flex align-items-center gap-1">
                  <span className="fs-4 badge bg-secondary">{t.tokenNo || "—"}</span>
                  {t.isEmergency && <span className="badge bg-danger">E</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
