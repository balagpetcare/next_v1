"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { doctorGetVisit } from "@/lib/api";

export default function DoctorVisitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const [visit, setVisit] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const v = await doctorGetVisit(Number(id));
        if (!cancelled) setVisit(v ?? null);
      } catch (e) {
        if (!cancelled) setError((e as Error)?.message ?? "Failed to load visit");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (!id) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid visit id.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12">
          <div className="card-body text-center text-muted py-5">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !visit) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-danger radius-12">{error || "Visit not found."}</div>
        <Link href="/doctor/patients" className="btn btn-outline-secondary">Back to patients</Link>
      </div>
    );
  }

  const patientName = visit?.patient?.profile?.displayName ?? visit?.patient?.id ?? "—";
  const petName = visit?.pet?.name ?? "—";
  const branchName = visit?.branch?.name ?? "—";
  const ownerPhone = visit?.patient?.auth?.phone ?? visit?.patient?.auth?.email ?? "";
  const intake = visit?.appointment?.intake;
  const intakeStatus = visit?.appointment?.intakeStatus ?? "NOT_STARTED";
  const rf = intake?.riskFlagsJson && typeof intake?.riskFlagsJson === "object" ? intake.riskFlagsJson : {};
  const previousVisits = visit?.previousVisits ?? [];

  return (
    <div className="dashboard-main-body">
      <div className="d-flex align-items-center gap-2 mb-3">
        <Link href="/doctor/patients" className="btn btn-sm btn-outline-secondary">← Patients</Link>
        <h6 className="mb-0">Visit #{visit.id}</h6>
      </div>

      <div className="card radius-12 mb-3">
        <div className="card-header">
          <h6 className="mb-0">Overview</h6>
        </div>
        <div className="card-body">
          <div className="row g-2 small">
            <div className="col-6 col-md-3"><span className="text-muted">Branch</span><br />{branchName}</div>
            <div className="col-6 col-md-3"><span className="text-muted">Patient</span><br />{patientName}</div>
            <div className="col-6 col-md-3"><span className="text-muted">Pet</span><br />{petName}</div>
            <div className="col-6 col-md-3"><span className="text-muted">Status</span><br /><span className="badge bg-secondary">{visit.status ?? "—"}</span></div>
            <div className="col-6 col-md-3"><span className="text-muted">Date</span><br />{visit.createdAt ? new Date(visit.createdAt).toLocaleString() : "—"}</div>
          </div>
        </div>
      </div>

      {/* Doctor Summary Panel (intake + treatment code + previous visits) */}
      {(visit.treatmentCode || intake || previousVisits.length > 0) && (
        <div className="card radius-12 mb-3 border-primary">
          <div className="card-header bg-light">
            <h6 className="mb-0">Summary (for doctor)</h6>
            {visit.treatmentCode && <span className="badge bg-primary ms-2">{visit.treatmentCode}</span>}
            <span className={`badge ms-2 ${intakeStatus === "COMPLETE" ? "bg-success" : intakeStatus === "PARTIAL" ? "bg-warning text-dark" : "bg-secondary"}`}>
              Intake: {intakeStatus === "COMPLETE" ? "Complete" : intakeStatus === "PARTIAL" ? "Partial" : "—"}
            </span>
          </div>
          <div className="card-body">
            <p className="mb-1"><strong>Owner:</strong> {patientName}{ownerPhone ? ` · ${ownerPhone}` : ""}</p>
            <p className="mb-1"><strong>Pet:</strong> {petName}{visit.pet?.animalType?.name ? ` (${visit.pet.animalType.name})` : ""}{visit.pet?.breed?.name ? ` · ${visit.pet.breed.name}` : ""}</p>
            {intake?.chiefComplaint && (
              <p className="mb-1"><strong>Chief complaint:</strong> {intake.chiefComplaint}{intake.complaintDuration ? ` · ${intake.complaintDuration}` : ""}{intake.complaintOnset ? ` · ${intake.complaintOnset}` : ""}</p>
            )}
            {(intake?.weightKg != null || intake?.tempC != null || intake?.heartRate != null || intake?.respRate != null || intake?.hydrationStatus) && (
              <p className="mb-1"><strong>Vitals (intake):</strong>{" "}
                {intake.weightKg != null && <span className="me-2">Wt: {intake.weightKg} kg</span>}
                {intake.tempC != null && <span className="me-2">Temp: {intake.tempC} °C</span>}
                {intake.heartRate != null && <span className="me-2">HR: {intake.heartRate}</span>}
                {intake.respRate != null && <span className="me-2">RR: {intake.respRate}</span>}
                {intake.hydrationStatus && <span>Hydration: {intake.hydrationStatus}</span>}
              </p>
            )}
            {(rf.isEmergency || rf.isAggressive || rf.infectiousSuspicion) && (
              <p className="mb-1">
                {rf.isEmergency && <span className="badge bg-danger me-1">Emergency</span>}
                {rf.isAggressive && <span className="badge bg-warning text-dark me-1">Aggressive</span>}
                {rf.infectiousSuspicion && <span className="badge bg-secondary me-1">Infectious?</span>}
              </p>
            )}
            {previousVisits.length > 0 && (
              <div className="mt-2">
                <strong>Previous visits:</strong>
                <ul className="list-unstyled mb-0 small">
                  {previousVisits.map((pv: any) => (
                    <li key={pv.id}>
                      {pv.treatmentCode ?? `#${pv.id}`} · {pv.startedAt ? new Date(pv.startedAt).toLocaleDateString() : "—"}
                      {pv.followUpNotes && ` · ${String(pv.followUpNotes).slice(0, 60)}${pv.followUpNotes.length > 60 ? "…" : ""}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {visit.vitals && visit.vitals.length > 0 && (
        <div className="card radius-12 mb-3">
          <div className="card-header">
            <h6 className="mb-0">Vitals</h6>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Weight (kg)</th>
                    <th>Temp (°C)</th>
                    <th>Heart rate</th>
                    <th>Resp. rate</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {visit.vitals.map((v: any) => (
                    <tr key={v.id}>
                      <td>{v.createdAt ? new Date(v.createdAt).toLocaleString() : "—"}</td>
                      <td>{v.weightKg ?? "—"}</td>
                      <td>{v.tempC ?? "—"}</td>
                      <td>{v.heartRate ?? "—"}</td>
                      <td>{v.respRate ?? "—"}</td>
                      <td>{v.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {visit.notes && visit.notes.length > 0 && (
        <div className="card radius-12 mb-3">
          <div className="card-header">
            <h6 className="mb-0">Clinical notes (EMR)</h6>
          </div>
          <div className="card-body">
            {visit.notes.map((n: any) => (
              <div key={n.id} className="border-bottom pb-2 mb-2 last:border-0">
                <div className="small text-muted">
                  {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                  {n.createdBy?.user?.profile?.displayName ? ` · ${n.createdBy.user.profile.displayName}` : ""}
                </div>
                <pre className="mb-0 small bg-light p-2 rounded" style={{ whiteSpace: "pre-wrap" }}>
                  {typeof n.contentJson === "object" ? JSON.stringify(n.contentJson, null, 2) : String(n.contentJson ?? "")}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!visit.vitals || visit.vitals.length === 0) && (!visit.notes || visit.notes.length === 0) && (
        <div className="card radius-12">
          <div className="card-body text-muted small">No vitals or clinical notes for this visit.</div>
        </div>
      )}
    </div>
  );
}
