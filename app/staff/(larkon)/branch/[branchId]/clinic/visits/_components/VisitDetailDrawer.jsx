"use client";

import { createPortal } from "react-dom";
import Link from "next/link";
import StatusBadge from "@/src/components/dashboard/StatusBadge";
import { staffClinicPatientDetailPath } from "@/lib/staffClinicPatientRoutes";
import { formatVisitDateTime } from "../_lib/formatVisitDateTime";

/**
 * Right-side drawer: visit operational snapshot + deep links (matches AppointmentDetailDrawer style).
 * Portals to document.body so backdrop/offcanvas are not clipped or trapped by parent overflow/stacking.
 */
export default function VisitDetailDrawer({ show, onClose, visit, loading, branchId, queueEvents, canBilling }) {
  if (!show) return null;
  if (typeof document === "undefined") return null;

  const v = visit;
  const petName = v?.pet?.name ?? (v?.petId ? `Pet #${v.petId}` : "—");
  const ownerName = v?.patient?.profile?.displayName ?? (v?.patientId ? `Patient #${v.patientId}` : "—");
  const doctorName = v?.doctor?.user?.profile?.displayName ?? "—";

  const Section = ({ title, children }) => (
    <div className="mb-3">
      <h6 className="text-secondary border-bottom pb-1 mb-2">{title}</h6>
      {children}
    </div>
  );

  const Row = ({ label, value }) => (
    <div className="d-flex justify-content-between small mb-1">
      <span className="text-muted">{label}</span>
      <span className="text-end ms-2">{value ?? "—"}</span>
    </div>
  );

  const panel = (
    <>
      <div className="offcanvas-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} aria-hidden="true" />
      <div
        className="offcanvas offcanvas-end show"
        tabIndex={-1}
        style={{
          visibility: "visible",
          width: "min(440px, calc(100vw - 24px))",
          maxWidth: "100%",
          zIndex: 1045,
          transform: "none",
        }}
        aria-modal="true"
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title">{v?.treatmentCode ? v.treatmentCode : v?.id ? `Visit #${v.id}` : "Visit"}</h5>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
        </div>
        <div className="offcanvas-body">
          {loading ? (
            <div className="placeholder-glow">
              <span className="placeholder col-12 d-block" />
              <span className="placeholder col-8 d-block mt-2" />
            </div>
          ) : !v ? (
            <p className="text-muted">Visit could not be loaded.</p>
          ) : (
            <>
              <Section title="Status">
                <Row label="Visit status" value={<StatusBadge status={v.status} />} />
                <Row
                  label="Appointment"
                  value={
                    v.appointmentId ? (
                      <Link href={`/staff/branch/${branchId}/clinic/appointments`}>#{v.appointmentId}</Link>
                    ) : (
                      <span className="badge bg-primary-subtle text-primary-emphasis">Walk-in</span>
                    )
                  }
                />
                {v.appointment?.status && (
                  <Row label="Appt. status" value={<StatusBadge status={v.appointment.status} subtle />} />
                )}
              </Section>

              <Section title="Patient">
                <Row label="Pet" value={v.petId ? <Link href={staffClinicPatientDetailPath(branchId, v.petId)}>{petName}</Link> : petName} />
                <Row label="Owner" value={ownerName} />
                <Row label="Doctor" value={doctorName} />
              </Section>

              <Section title="Timeline">
                <Row label="Created" value={formatVisitDateTime(v.createdAt)} />
                <Row label="Started" value={formatVisitDateTime(v.startedAt)} />
                <Row label="Completed" value={formatVisitDateTime(v.completedAt)} />
              </Section>

              <Section title="Operational signals">
                <Row
                  label="Queue"
                  value={
                    v.queueTicket ? (
                      <span>
                        {v.queueTicket.tokenNo ?? "—"} · <StatusBadge status={v.queueTicket.status} subtle />
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
                <Row
                  label="Billing"
                  value={
                    v.billing
                      ? `${v.billing.orderCount} order(s), ${v.billing.unpaidOrderCount} unpaid`
                      : "—"
                  }
                />
                <Row
                  label="Settlement"
                  value={
                    v.settlement
                      ? `${v.settlement.settlementStatus}${
                          v.settlement.doctorShare != null && Number.isFinite(Number(v.settlement.doctorShare))
                            ? ` · Dr ${Number(v.settlement.doctorShare).toFixed(2)}`
                            : ""
                        }`
                      : "—"
                  }
                />
                <Row
                  label="Case / Surgery"
                  value={
                    <span>
                      {v.clinicalCase?.id ? <span className="me-1">Case #{v.clinicalCase.id}</span> : null}
                      {v.surgeryCase?.id ? <span>Surgery #{v.surgeryCase.id}</span> : !v.clinicalCase?.id ? "—" : null}
                    </span>
                  }
                />
              </Section>

              <Section title="Queue events">
                {queueEvents === null ? (
                  <p className="small text-muted mb-0">Loading queue…</p>
                ) : queueEvents.events?.length > 0 ? (
                  <ul className="list-unstyled small mb-0" style={{ maxHeight: 200, overflowY: "auto" }}>
                    {queueEvents.events.map((ev) => (
                      <li key={ev.id} className="mb-1 pb-1 border-bottom">
                        <span className="text-muted">{formatVisitDateTime(ev.createdAt)}</span>
                        <div>
                          {ev.eventType ?? "—"} {ev.ticket?.tokenNo ? `· ${ev.ticket.tokenNo}` : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (queueEvents.tickets?.length ?? 0) > 0 ? (
                  <p className="small text-muted mb-0">
                    {queueEvents.tickets.length} ticket(s) linked — no timeline events recorded.
                  </p>
                ) : (
                  <p className="small text-muted mb-0">No queue tickets linked.</p>
                )}
              </Section>

              <div className="d-flex flex-wrap gap-2 mt-3">
                <Link href={`/staff/branch/${branchId}/clinic/visits/${v.id}`} className="btn btn-primary btn-sm">
                  Open full record
                </Link>
                <Link
                  href={`/staff/branch/${branchId}/clinic/billing?visitId=${v.id}`}
                  className="btn btn-outline-primary btn-sm"
                >
                  Billing
                </Link>
                <Link href={`/staff/branch/${branchId}/clinic/queue`} className="btn btn-outline-secondary btn-sm">
                  Queue
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(panel, document.body);
}
