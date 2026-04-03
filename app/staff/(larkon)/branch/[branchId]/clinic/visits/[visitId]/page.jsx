"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicVisitGet,
  staffClinicPrescriptionsByVisit,
  staffClinicBillingSummary,
  staffClinicVisitComplete,
  staffClinicVisitCompletionEligibility,
  staffClinicVisitPaymentStatus,
  staffClinicVisitQueueEvents,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace } from "@/src/components/dashboard";
import StatusBadge from "@/src/components/dashboard/StatusBadge";
import { formatMetadataForDisplay } from "@/src/lib/displayFormatters";
import { PRIMARY_NOT_FOUND } from "@/lib/clinicNotFoundHelpers";
import { staffClinicPatientDetailPath } from "@/lib/staffClinicPatientRoutes";
import { formatVisitDateTime } from "../_lib/formatVisitDateTime";
import { formatTempFValueFromCelsius } from "@/lib/temperature";

const VISITS_PERMS = ["clinic.visits.read", "clinic.visits.manage", "clinic.emr.read", "clinic.emr.write"];
const PRESCRIPTION_READ = "clinic.prescription.read";

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
  const [completingVisit, setCompletingVisit] = useState(false);
  const [completionEligibility, setCompletionEligibility] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState([]);
  const [queuePayload, setQueuePayload] = useState(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [secondaryRefreshKey, setSecondaryRefreshKey] = useState(0);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = VISITS_PERMS.some((p) => permissions.includes(p));
  const canCompleteVisit = permissions.some((p) => ["clinic.visits.manage", "clinic.emr.write"].includes(p));
  const canPrescriptionRead = permissions.includes(PRESCRIPTION_READ);

  // Primary entity: load visit first. Prescriptions/billing are secondary and must not clear visit on failure.
  const loadVisit = useCallback(() => {
    if (!branchId || !visitId) return;
    setLoading(true);
    setError("");
    staffClinicVisitGet(branchId, visitId)
      .then((v) => {
        setVisit(v ?? null);
        setError("");
        return v;
      })
      .catch(() => {
        setVisit(null);
        setError(PRIMARY_NOT_FOUND.visit);
      })
      .finally(() => setLoading(false));
  }, [branchId, visitId]);

  useEffect(() => {
    loadVisit();
  }, [loadVisit]);

  // Secondary data keyed by visitId only (avoids stale visit state when route changes quickly).
  useEffect(() => {
    if (!branchId || !visitId) return;
    let cancelled = false;
    const rid = visitId;

    staffClinicPrescriptionsByVisit(branchId, rid)
      .then((prx) => {
        if (cancelled) return;
        setPrescriptions(Array.isArray(prx) ? prx : []);
      })
      .catch(() => {
        if (cancelled) return;
        setPrescriptions([]);
      });

    staffClinicBillingSummary(branchId, rid)
      .then((bs) => {
        if (cancelled) return;
        setBillingSummary(bs ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setBillingSummary(null);
      });

    staffClinicVisitPaymentStatus(branchId, rid)
      .then((ps) => {
        if (cancelled) return;
        setPaymentStatus(Array.isArray(ps) ? ps : []);
      })
      .catch(() => {
        if (cancelled) return;
        setPaymentStatus([]);
      });

    staffClinicVisitQueueEvents(branchId, rid)
      .then((q) => {
        if (cancelled) return;
        setQueuePayload(q && typeof q === "object" ? q : { tickets: [], events: [] });
      })
      .catch(() => {
        if (cancelled) return;
        setQueuePayload({ tickets: [], events: [] });
      });

    staffClinicVisitCompletionEligibility(branchId, rid)
      .then((el) => {
        if (cancelled) return;
        setCompletionEligibility(el && typeof el === "object" ? el : null);
      })
      .catch(() => {
        if (cancelled) return;
        setCompletionEligibility(null);
      });

    return () => {
      cancelled = true;
    };
  }, [branchId, visitId, secondaryRefreshKey]);

  const handleCompleteVisit = useCallback(() => {
    if (!branchId || !visitId) return;
    setCompletingVisit(true);
    setError("");
    const body =
      completionEligibility && !completionEligibility.eligible && overrideReason.trim()
        ? { overrideReason: overrideReason.trim() }
        : {};
    staffClinicVisitComplete(branchId, visitId, body)
      .then((v) => {
        if (v) setVisit(v);
        setOverrideReason("");
        setCompletionEligibility({ completed: true, eligible: true, unmet: [] });
        setSecondaryRefreshKey((k) => k + 1);
      })
      .catch((e) => {
        const unmet = e?.unmet;
        if (Array.isArray(unmet) && unmet.length) {
          setError(`${e.message || "Requirements not met"}\n${unmet.join("\n")}`);
          setCompletionEligibility((prev) => ({ ...(prev || {}), eligible: false, unmet, canOverride: true }));
        } else {
          setError(e?.message || "Failed to complete visit");
        }
      })
      .finally(() => setCompletingVisit(false));
  }, [branchId, visitId, completionEligibility, overrideReason]);

  if (ctxLoading) {
    return (
      <div className="py-40 px-3 text-center">
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
      <PageWorkspace>
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="py-24 text-center text-secondary-light">Loading visit...</div>
      </PageWorkspace>
    );
  }

  if (error && !visit) {
    return (
      <PageWorkspace>
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="alert alert-danger">
          {error}
          <div className="mt-2 d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={loadVisit}>
              Retry
            </button>
            <Link href={`/staff/branch/${branchId}/clinic/visits`} className="btn btn-sm btn-outline-secondary">
              ← Back to Visits
            </Link>
          </div>
        </div>
      </PageWorkspace>
    );
  }

  if (!visit) {
    return (
      <PageWorkspace>
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="alert alert-warning">
          {PRIMARY_NOT_FOUND.visit}
          <div className="mt-2 d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={loadVisit}>
              Retry
            </button>
            <Link href={`/staff/branch/${branchId}/clinic/visits`} className="btn btn-sm btn-outline-secondary">
              ← Back to Visits
            </Link>
          </div>
        </div>
      </PageWorkspace>
    );
  }

  const petName = visit.pet?.name ?? (visit.petId != null ? `Pet #${visit.petId}` : "—");
  const ownerName = visit.patient?.profile?.displayName ?? (visit.patientId != null ? `Patient #${visit.patientId}` : "—");
  const doctorName = visit.doctor?.user?.profile?.displayName ?? "—";
  const started = formatVisitDateTime(visit.startedAt);
  const completed = formatVisitDateTime(visit.completedAt);

  return (
    <PageWorkspace>
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
        {canCompleteVisit && visit?.status !== "COMPLETED" && (
          <div className="d-flex flex-column align-items-start gap-2">
            {completionEligibility && !completionEligibility.completed && !completionEligibility.eligible && (
              <div className="alert alert-warning py-2 small mb-0" style={{ maxWidth: 420 }}>
                <div className="fw-semibold mb-1">Completion requirements</div>
                <ul className="mb-0 ps-3">
                  {(completionEligibility.unmet || []).map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
                {completionEligibility.canOverride && (
                  <div className="mt-2">
                    <label className="form-label small mb-1">Override reason (required if completing anyway)</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Reason for override (audited)"
                    />
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleCompleteVisit}
              disabled={
                completingVisit ||
                (visit?.status !== "COMPLETED" &&
                  (completionEligibility == null ||
                    (!completionEligibility.completed &&
                      !completionEligibility.eligible &&
                      !(completionEligibility.canOverride && overrideReason.trim()))))
              }
            >
              {completingVisit ? "Completing…" : "Complete visit"}
            </button>
          </div>
        )}
        <h5 className="mb-0">Visit {visit.treatmentCode ?? visit.id}</h5>
      </div>

      {/* Secondary error (e.g. prescription/billing action failed); visit remains visible. */}
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
                  <Link href={staffClinicPatientDetailPath(branchId, visit.petId)}>{petName}</Link>
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
                <StatusBadge status={visit.status} />
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
              {visit.clinicalCase?.id && (
                <>
                  <dt className="col-sm-4">Clinical case</dt>
                  <dd className="col-sm-8">
                    <Link href={`/staff/branch/${branchId}/clinic/cases/${visit.clinicalCase.id}`}>
                      Case #{visit.clinicalCase.id}
                    </Link>{" "}
                    <StatusBadge status={visit.clinicalCase.status} subtle />
                  </dd>
                </>
              )}
              {visit.surgeryCase?.id && (
                <>
                  <dt className="col-sm-4">Surgery</dt>
                  <dd className="col-sm-8">
                    <Link href={`/staff/branch/${branchId}/clinic/surgeries/${visit.surgeryCase.id}`}>
                      Surgery #{visit.surgeryCase.id}
                    </Link>{" "}
                    <StatusBadge status={visit.surgeryCase.status} subtle />
                  </dd>
                </>
              )}
              {visit._count && (
                <>
                  <dt className="col-sm-4">Linked</dt>
                  <dd className="col-sm-8 small">
                    Rx {visit._count.prescriptions ?? 0} · Lab {visit._count.labRequisitions ?? 0} · Orders{" "}
                    {visit._count.orders ?? 0} · Dispense {visit._count.dispenseRequests ?? 0} · Tokens{" "}
                    {visit._count.injectionTokens ?? 0}
                  </dd>
                </>
              )}
              {(visit.doctor?.clinicStaffProfile?.defaultConsultationFee != null ||
                visit.doctor?.clinicStaffProfile?.followUpFee != null) && (
                <>
                  <dt className="col-sm-4">Consult fee hint</dt>
                  <dd className="col-sm-8 small">
                    Default: {String(visit.doctor.clinicStaffProfile.defaultConsultationFee ?? "—")} · Follow-up:{" "}
                    {String(visit.doctor.clinicStaffProfile.followUpFee ?? "—")}
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
                {Array.isArray(paymentStatus) && paymentStatus.length > 0 && (
                  <ul className="list-unstyled mb-2">
                    {paymentStatus.map((s, idx) => (
                      <li key={s.serviceId != null ? String(s.serviceId) : `pay-${idx}`} className="d-flex justify-content-between gap-2 border-bottom py-1">
                        <span>{s.serviceName}</span>
                        <span>{s.paid ? <span className="text-success">Paid</span> : <span className="text-warning">Unpaid</span>}</span>
                      </li>
                    ))}
                  </ul>
                )}
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
          <Card title="Queue timeline" subtitle="Events for tickets linked to this visit or appointment.">
            {queuePayload === null ? (
              <p className="text-muted small mb-0">Loading queue…</p>
            ) : queuePayload.events?.length > 0 ? (
              <ul className="list-unstyled small mb-0">
                {queuePayload.events.map((ev) => (
                  <li key={ev.id} className="mb-2 pb-2 border-bottom">
                    <span className="text-muted">{formatVisitDateTime(ev.createdAt)}</span>
                    <div>
                      {ev.eventType ?? "—"} {ev.ticket?.tokenNo ? `· Token ${ev.ticket.tokenNo}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (queuePayload.tickets?.length ?? 0) > 0 ? (
              <p className="text-muted small mb-0">
                {queuePayload.tickets.length} ticket(s) linked — no timeline events recorded.
              </p>
            ) : (
              <p className="text-muted small mb-0">No queue tickets linked to this visit.</p>
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
                      <th>Temp (°F)</th>
                      <th>Heart rate</th>
                      <th>Resp. rate</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visit.vitals.map((v, i) => (
                      <tr key={v.id ?? i}>
                        <td>{formatVisitDateTime(v.createdAt)}</td>
                        <td>{v.weightKg ?? "—"}</td>
                        <td>{formatTempFValueFromCelsius(v.tempC)}</td>
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
                      {formatVisitDateTime(n.createdAt)}
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
          <Card title="Prescriptions" subtitle="View and print only — prescriptions are authored in the doctor workspace.">
            {prescriptions.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Status</th>
                      <th>Notes</th>
                      {canPrescriptionRead && <th className="text-end">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((p) => (
                      <tr key={p.id}>
                        <td>{p.id}</td>
                        <td><span className={`badge ${p.status === "FINALIZED" ? "bg-success" : p.status === "DISPENSED" ? "bg-info" : "bg-warning"}`}>{p.status ?? "—"}</span></td>
                        <td>{p.notes ?? "—"}</td>
                        {canPrescriptionRead && (
                          <td className="text-end">
                            <Link href={`/staff/branch/${branchId}/clinic/prescriptions/${p.id}/print`} className="btn btn-sm btn-link p-0 me-1" target="_blank" rel="noopener noreferrer">Print</Link>
                          </td>
                        )}
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
    </PageWorkspace>
  );
}
