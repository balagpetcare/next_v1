"use client";

import Link from "next/link";

/**
 * Right-side detail drawer for a single appointment.
 * Sections: Basic Info, Patient/Pet, Clinical, Payment, Workflow, (Complete details for snapshot-only), Timeline.
 */
export default function AppointmentDetailDrawer({ show, onClose, appointment, loading, branchId, onCompleteDetails }) {
  if (!show) return null;

  const a = appointment;
  const patientName = a?.patient?.profile?.displayName ?? a?.ownerNameSnapshot ?? "—";
  const petName = a?.pet?.name ?? a?.petNameSnapshot ?? "—";
  const doctorName = a?.doctor?.user?.profile?.displayName ?? (a?.isAnyDoctor ? "Any" : "—");
  const serviceName = a?.service?.name ?? "—";
  const events = Array.isArray(a?.events) ? [...a.events].reverse() : [];
  const sourceLabel = (a?.channel ?? a?.source) === "PHONE" ? "Phone" : (a?.channel ?? a?.source) === "ONLINE" ? "Online" : "Counter";

  const isSnapshotOnly =
    a &&
    !a.patientId &&
    (a.ownerNameSnapshot != null || a.mobileSnapshot != null || a.appointmentMode === "QUICK_CALL");

  const Section = ({ title, children }) => (
    <div className="mb-3">
      <h6 className="text-secondary border-bottom pb-1 mb-2">{title}</h6>
      {children}
    </div>
  );

  const Row = ({ label, value }) => (
    <div className="d-flex justify-content-between small">
      <span className="text-muted">{label}</span>
      <span>{value ?? "—"}</span>
    </div>
  );

  return (
    <>
      {show && (
        <div
          className="offcanvas-backdrop fade show"
          style={{ zIndex: 1040 }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        className={`offcanvas offcanvas-end ${show ? "show" : ""}`}
        tabIndex={-1}
        style={{ visibility: show ? "visible" : "hidden", width: 420, zIndex: 1045 }}
        aria-modal="true"
      >
      <div className="offcanvas-header border-bottom">
        <h5 className="offcanvas-title">Appointment #{a?.id ?? "—"}</h5>
        <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
      </div>
      <div className="offcanvas-body">
        {loading ? (
          <div className="placeholder-glow">
            <span className="placeholder col-12 d-block" />
            <span className="placeholder col-8 d-block mt-2" />
            <span className="placeholder col-10 d-block mt-2" />
          </div>
        ) : !a ? (
          <p className="text-muted">Appointment could not be loaded.</p>
        ) : (
          <>
            <Section title="Basic info">
              <Row label="Appointment ID" value={a.id} />
              <Row label="Date & time" value={a.scheduledStartAt ? new Date(a.scheduledStartAt).toLocaleString() : "—"} />
              <Row label="Status" value={<span className={`badge bg-${statusBadge(a.status)}`}>{a.status}</span>} />
              <Row label="Source" value={sourceLabel} />
              <Row label="Created at" value={a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"} />
              <Row label="Last updated" value={a.updatedAt ? new Date(a.updatedAt).toLocaleString() : "—"} />
            </Section>

            <Section title="Patient / Pet">
              {isSnapshotOnly && (
                <div className="alert alert-info py-2 px-2 small mb-2">
                  <strong>Quick entry.</strong> Owner and pet are from snapshot only (not linked to a customer record). Link them below to enable check-in and visits.
                </div>
              )}
              {(a.noShowCount ?? 0) > 0 && (
                <div className="alert alert-warning py-2 px-2 small mb-2">
                  Patient has {a.noShowCount} no-show(s) on record.
                </div>
              )}
              <Row label="Pet name" value={petName} />
              <Row label="Pet type" value={a?.petTypeSnapshot ?? a?.pet?.animalType?.name ?? "—"} />
              <Row label="Owner name" value={patientName} />
              <Row label="Mobile" value={a?.mobileSnapshot ?? (a?.patient?.auth ? "—" : "—")} />
              {a?.patient?.profile?.username && <Row label="Email" value={a.patient.profile.username} />}
            </Section>

            {isSnapshotOnly && typeof onCompleteDetails === "function" && (
              <Section title="Complete appointment details">
                <p className="small text-muted mb-2">
                  Link this appointment to an existing owner and pet so you can check in and run visits. Uses the same promote flow as Complete intake.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onCompleteDetails(a)}
                >
                  Complete appointment details
                </button>
              </Section>
            )}

            <Section title="Clinical">
              <Row label="Assigned doctor" value={doctorName} />
              <Row label="Service" value={serviceName} />
              <Row label="Visit type" value={a.visitType ?? "—"} />
              <Row label="Priority" value={a.priority ?? "—"} />
              {a.notes && <Row label="Notes" value={a.notes} />}
            </Section>

            <Section title="Payment">
              <Row label="Payment status" value={a.paymentStatus ?? "—"} />
              <Row label="Paid amount" value={a.paidAmount != null ? Number(a.paidAmount) : "—"} />
              <Row label="Payment method" value={a.paymentMethod ?? "—"} />
            </Section>

            {branchId && (
              <Section title="Workflow (Appointment → Visit → Case → Billing)">
                {a.visitId ? (
                  <div className="d-flex flex-wrap gap-2 small">
                    <Link href={`/staff/branch/${branchId}/clinic/visits/${a.visitId}`} className="btn btn-outline-primary btn-sm">
                      View Visit
                    </Link>
                    <Link href={`/staff/branch/${branchId}/clinic/billing?visitId=${a.visitId}`} className="btn btn-outline-secondary btn-sm">
                      Billing
                    </Link>
                  </div>
                ) : (
                  <p className="small text-muted mb-0">Check in from Queue to start a visit. Then open Visit → Case → Billing.</p>
                )}
              </Section>
            )}

            <Section title="Timeline">
              {events.length === 0 ? (
                <p className="small text-muted">No events</p>
              ) : (
                <ul className="list-unstyled small">
                  {events.map((ev) => (
                    <li key={ev.id} className="mb-1">
                      <span className="text-muted">{ev.eventType}</span>
                      {ev.createdAt && (
                        <span className="ms-2 text-secondary">
                          {new Date(ev.createdAt).toLocaleString()}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}
      </div>
      </div>
    </>
  );
}

function statusBadge(s) {
  const map = {
    DRAFT: "light", PRE_BOOKED: "info", BOOKED: "primary", CONFIRMED: "info",
    CHECKED_IN: "warning", IN_QUEUE: "secondary", CALLED: "secondary", IN_CONSULT: "secondary",
    COMPLETED: "success", CANCELLED: "danger", NO_SHOW: "dark",
  };
  return map[s] ?? "secondary";
}
