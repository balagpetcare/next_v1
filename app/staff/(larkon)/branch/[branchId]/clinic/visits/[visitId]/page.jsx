"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicVisitGet,
  staffClinicPrescriptionsByVisit,
  staffClinicBillingSummary,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { formatMetadataForDisplay } from "@/src/lib/displayFormatters";

const VISITS_PERMS = ["clinic.visits.read", "clinic.visits.manage", "clinic.emr.read", "clinic.emr.write"];

export default function StaffBranchClinicVisitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const visitId = useMemo(() => Number(params?.visitId), [params?.visitId]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [visit, setVisit] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [billingSummary, setBillingSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = VISITS_PERMS.some((p) => permissions.includes(p));

  useEffect(() => {
    if (!branchId || !visitId) return;
    setLoading(true);
    setError("");
    Promise.all([
      staffClinicVisitGet(branchId, visitId),
      staffClinicPrescriptionsByVisit(branchId, visitId).catch(() => []),
      staffClinicBillingSummary(branchId, visitId).catch(() => null),
    ])
      .then(([v, prx, bill]) => {
        setVisit(v ?? null);
        setPrescriptions(Array.isArray(prx) ? prx : []);
        setBillingSummary(bill ?? null);
      })
      .catch((e) => {
        setError(e?.message || "Failed to load visit.");
        setVisit(null);
      })
      .finally(() => setLoading(false));
  }, [branchId, visitId]);

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.visits.read"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic/visits`)}
      />
    );
  }

  if (loading && !visit) {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="py-24 text-center text-secondary-light">Loading visit...</div>
      </div>
    );
  }

  if (error && !visit) {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="alert alert-danger">{error}</div>
        <Link href={`/staff/branch/${branchId}/clinic/visits`} className="btn btn-outline-secondary">
          ← Back to Visits
        </Link>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="alert alert-warning">Visit not found.</div>
        <Link href={`/staff/branch/${branchId}/clinic/visits`} className="btn btn-outline-secondary">
          ← Back to Visits
        </Link>
      </div>
    );
  }

  const petName = visit.pet?.name ?? `Pet #${visit.petId}`;
  const ownerName = visit.patient?.profile?.displayName ?? `Patient #${visit.patientId}`;
  const doctorName = visit.doctor?.user?.profile?.displayName ?? "—";
  const started = visit.startedAt ? new Date(visit.startedAt).toLocaleString() : "—";
  const completed = visit.completedAt ? new Date(visit.completedAt).toLocaleString() : "—";

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}/clinic/visits`} className="btn btn-outline-secondary btn-sm">
          ← Visits
        </Link>
        <Link href={`/staff/branch/${branchId}/clinic/appointments`} className="btn btn-outline-secondary btn-sm">
          Appointments
        </Link>
        {visit.clinicalCase?.id && (
          <Link href={`/staff/branch/${branchId}/clinic/cases/${visit.clinicalCase.id}`} className="btn btn-outline-secondary btn-sm">
            Case #{visit.clinicalCase.id}
          </Link>
        )}
        <Link href={`/staff/branch/${branchId}/clinic/billing?visitId=${visitId}`} className="btn btn-outline-primary btn-sm">
          Billing
        </Link>
        <h5 className="mb-0">Visit {visit.treatmentCode ?? visit.id}</h5>
      </div>

      {error && <div className="alert alert-danger mb-16">{error}</div>}

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <Card title="Visit details" subtitle="">
            <dl className="row mb-0 small">
              <dt className="col-sm-4">Treatment #</dt>
              <dd className="col-sm-8">{visit.treatmentCode ?? visit.id}</dd>
              <dt className="col-sm-4">Pet</dt>
              <dd className="col-sm-8">
                {visit.petId ? (
                  <Link href={`/staff/branch/${branchId}/clinic/patients/${visit.petId}`}>{petName}</Link>
                ) : (
                  petName
                )}
              </dd>
              <dt className="col-sm-4">Owner</dt>
              <dd className="col-sm-8">{ownerName}</dd>
              <dt className="col-sm-4">Doctor</dt>
              <dd className="col-sm-8">{doctorName}</dd>
              <dt className="col-sm-4">Status</dt>
              <dd className="col-sm-8">
                <span className="badge bg-secondary">{visit.status ?? "—"}</span>
              </dd>
              <dt className="col-sm-4">Started</dt>
              <dd className="col-sm-8">{started}</dd>
              <dt className="col-sm-4">Completed</dt>
              <dd className="col-sm-8">{completed}</dd>
              {visit.appointmentId && (
                <>
                  <dt className="col-sm-4">Appointment</dt>
                  <dd className="col-sm-8">
                    <Link href={`/staff/branch/${branchId}/clinic/appointments`}>
                      #{visit.appointmentId}
                    </Link>
                  </dd>
                </>
              )}
            </dl>
          </Card>
        </div>

        <div className="col-12 col-lg-6">
          <Card title="Billing" subtitle="">
            {billingSummary ? (
              <div className="small">
                <p className="mb-2">Summary available. Create or view invoice from Billing.</p>
                <Link
                  href={`/staff/branch/${branchId}/clinic/billing?visitId=${visitId}`}
                  className="btn btn-sm btn-primary"
                >
                  Billing for this visit
                </Link>
              </div>
            ) : (
              <p className="text-muted small mb-0">No billing summary. Use Billing to create invoice for this visit.</p>
            )}
          </Card>
        </div>

        <div className="col-12">
          <Card title="Vitals" subtitle="">
            {visit.vitals?.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Weight (kg)</th>
                      <th>Temp (°C)</th>
                      <th>Heart rate</th>
                      <th>Resp. rate</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visit.vitals.map((v, i) => (
                      <tr key={v.id ?? i}>
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
            ) : (
              <p className="text-muted small mb-0">No vitals recorded.</p>
            )}
          </Card>
        </div>

        <div className="col-12">
          <Card title="Clinical notes" subtitle="">
            {visit.notes?.length > 0 ? (
              <ul className="list-unstyled mb-0">
                {visit.notes.map((n, i) => (
                  <li key={n.id ?? i} className="mb-2 pb-2 border-bottom">
                    <span className="text-muted small">
                      {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                      {n.createdBy?.user?.profile?.displayName ? ` · ${n.createdBy.user.profile.displayName}` : ""}
                    </span>
                    <div className="small">{formatMetadataForDisplay(n.contentJson)}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted small mb-0">No clinical notes.</p>
            )}
          </Card>
        </div>

        <div className="col-12">
          <Card title="Prescriptions" subtitle="">
            {prescriptions.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Status</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((p) => (
                      <tr key={p.id}>
                        <td>{p.id}</td>
                        <td>{p.status ?? "—"}</td>
                        <td>{p.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted small mb-0">No prescriptions for this visit.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
