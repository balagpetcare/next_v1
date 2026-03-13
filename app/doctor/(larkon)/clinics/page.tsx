"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doctorGetMe } from "@/lib/api";
import { DoctorInvitationsWidget } from "../dashboard/_components/DoctorInvitationsWidget";

export default function DoctorClinicsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const me = await doctorGetMe();
        setProfile(me ?? null);
      } catch (e) {
        setError((e as Error)?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const branches = profile?.branches ?? [];

  return (
    <div className="dashboard-main-body">
      <div className="d-flex align-items-center gap-2 mb-3">
        <Link href="/doctor/dashboard" className="btn btn-sm btn-outline-secondary radius-12">
          ← Dashboard
        </Link>
        <h5 className="mb-0">My Clinics</h5>
      </div>

      {error && (
        <div className="alert alert-danger radius-12 mb-3" role="alert">
          {error}
        </div>
      )}

      <DoctorInvitationsWidget />

      {loading ? (
        <div className="text-muted py-4">Loading…</div>
      ) : branches.length === 0 ? (
        <div className="card radius-12 mt-3">
          <div className="card-body text-center py-4">
            <p className="text-muted mb-2">You are not connected to any clinic yet.</p>
            <p className="small text-muted mb-0">Accept an invitation above or ask a clinic to invite you.</p>
          </div>
        </div>
      ) : (
        <div className="card radius-12 mt-3">
          <div className="card-header">
            <h6 className="mb-0">Active clinics</h6>
          </div>
          <div className="card-body p-0">
            <ul className="list-group list-group-flush">
              {branches.map((b: any) => (
                <li key={b.branchId} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <span className="fw-semibold">{b.branchName}</span>
                    <span className={`badge ms-2 ${b.onboardingStatus === "COMPLETED" ? "bg-success" : "bg-warning text-dark"}`}>
                      {b.onboardingStatus}
                    </span>
                  </div>
                  <div>
                    <Link href={`/doctor/schedule?branchId=${b.branchId}`} className="btn btn-sm btn-outline-primary radius-8 me-1">
                      Schedule
                    </Link>
                    <Link href={`/doctor/appointments?branchId=${b.branchId}`} className="btn btn-sm btn-outline-secondary radius-8">
                      Appointments
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
