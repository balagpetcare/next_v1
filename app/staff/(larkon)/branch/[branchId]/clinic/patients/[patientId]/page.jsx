"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffClinicPatientClinicalOverview } from "@/lib/api";
import { PRIMARY_NOT_FOUND, formatStaffPatientApiError } from "@/lib/clinicNotFoundHelpers";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace } from "@/src/components/dashboard";
import {
  staffClinicPatientsPath,
  staffClinicPatientEditPath,
} from "@/lib/staffClinicPatientRoutes";

const PATIENTS_PERMS = ["clinic.patients.read", "clinic.patients.manage"];

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "visits", label: "Visits" },
  { key: "prescriptions", label: "Prescriptions" },
  { key: "vaccines", label: "Vaccines" },
  { key: "billing", label: "Billing" },
  { key: "surgery", label: "Surgery" },
  { key: "timeline", label: "Timeline" },
];

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

function fmtMoney(v) {
  if (v == null || v === "") return "—";
  try {
    return Number(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  } catch {
    return String(v);
  }
}

/** [patientId] = Pet.id (clinical patient record). Owner (User) is the human account. */
export default function StaffBranchClinicPatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const patientId = useMemo(() => {
    const raw = params?.patientId;
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  /** API/load error for dashboard card (message + code + kind for conditional help text) */
  const [loadError, setLoadError] = useState(null);
  const [tab, setTab] = useState("overview");

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = PATIENTS_PERMS.some((p) => permissions.includes(p));
  const hasManage = permissions.includes("clinic.patients.manage");
  const canAppointments = permissions.includes("clinic.appointments.manage") || permissions.includes("clinic.appointments.read");
  const canPrescription = permissions.includes("clinic.prescription.read");
  const canSurgery =
    permissions.includes("clinic.surgery.read") ||
    permissions.includes("clinic.surgery.create") ||
    permissions.includes("clinic.surgery.manage");

  const cancelledRef = useRef(false);
  const loadOverview = useCallback(() => {
    if (!branchId || patientId == null) return;
    cancelledRef.current = false;
    setLoading(true);
    setLoadError(null);
    staffClinicPatientClinicalOverview(branchId, patientId)
      .then((data) => {
        if (!cancelledRef.current) {
          setOverview(data ?? null);
          if (data?.patient) {
            setLoadError(null);
          } else {
            setLoadError(formatStaffPatientApiError(null, { emptyOverview: true }));
          }
        }
      })
      .catch((err) => {
        if (!cancelledRef.current) {
          setOverview(null);
          setLoadError(formatStaffPatientApiError(err));
        }
      })
      .finally(() => {
        if (!cancelledRef.current) setLoading(false);
      });
  }, [branchId, patientId]);

  useEffect(() => {
    /* Fetch patient workspace on branch/id change; loadOverview sets loading/error state. */
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional load sequence for clinic workspace
    loadOverview();
    return () => {
      cancelledRef.current = true;
    };
  }, [loadOverview]);

  if (ctxLoading) {
    return (
      <div className="py-40 px-3 text-center">
        <div className="spinner-border text-primary" role="status" aria-label="Loading" />
        <p className="mt-16 text-secondary-light">Loading branch…</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.patients.read"
        onBack={() => router.push(staffClinicPatientsPath(branchId))}
      />
    );
  }

  if (branchId && params?.patientId != null && params.patientId !== "" && patientId == null) {
    return (
      <PageWorkspace>
        <div className="container py-24">
          <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
          <div className="d-flex align-items-center gap-12 mb-24">
            <Link href={staffClinicPatientsPath(branchId)} className="btn btn-outline-secondary btn-sm">
              ← Patients
            </Link>
          </div>
          <Card title="Invalid patient link">
            <p className="text-secondary mb-16">The patient id in the URL is not valid. Open the patient from the directory list.</p>
            <Link href={staffClinicPatientsPath(branchId)} className="btn btn-sm btn-primary">
              Back to patients
            </Link>
          </Card>
        </div>
      </PageWorkspace>
    );
  }

  if (loading) {
    return (
      <PageWorkspace>
        <div className="container py-24">
          <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
          <div className="py-24 text-center text-secondary-light">
            <div className="spinner-border text-primary" role="status" aria-label="Loading patient" />
            <p className="mt-16 mb-0">Loading patient workspace…</p>
          </div>
        </div>
      </PageWorkspace>
    );
  }

  const errMsg = loadError?.message || PRIMARY_NOT_FOUND.patient;
  const errCode = loadError?.code || "";
  const errKind = loadError?.kind || "generic";

  if (loadError || !overview?.patient) {
    return (
      <PageWorkspace>
        <div className="container py-24">
          <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
          <div className="d-flex align-items-center gap-12 mb-24">
            <Link href={staffClinicPatientsPath(branchId)} className="btn btn-outline-secondary btn-sm">
              ← Patients
            </Link>
          </div>
          <Card title="Patient">
            <p className="text-danger mb-2">{errMsg}</p>
            {errCode ? (
              <p className="text-muted small mb-2">
                API code: <code className="small">{errCode}</code>
              </p>
            ) : null}
            {errKind === "notInBranch" ? (
              <p className="text-muted small mb-3">
                This pet is not linked to this branch (no clinic registration, appointment, or visit here). Open the patient from
                the Patients list for this branch or register the pet at this branch.
              </p>
            ) : null}
            {errKind === "notFound" ? (
              <p className="text-muted small mb-3">
                There is no pet with this id, the URL may not match the id returned after registration, or the record was removed.
              </p>
            ) : null}
            {errKind === "generic" ? (
              <ul className="text-muted small mb-3 ps-3">
                <li className="mb-2">
                  This pet may not be linked to <strong>this branch</strong> (no registration here, no appointment, no visit). Open the patient from the <strong>Patients</strong> list or register the pet at this branch.
                </li>
                <li>
                  If registration <strong>just</strong> succeeded, confirm the URL uses the <strong>pet id</strong> returned after save, and that the API database has the migration adding <code className="small">clinicRegisteredBranchId</code> applied.
                </li>
              </ul>
            ) : null}
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={loadOverview}>
                Retry
              </button>
              <Link href={staffClinicPatientsPath(branchId)} className="btn btn-sm btn-outline-secondary">
                Back to list
              </Link>
            </div>
          </Card>
        </div>
      </PageWorkspace>
    );
  }

  const patient = overview.patient;
  const owner = patient.owner;
  const lastVisit = overview.lastVisit;

  return (
    <PageWorkspace>
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

        <div className="d-flex align-items-start flex-wrap gap-12 mb-24">
          <Link href={staffClinicPatientsPath(branchId)} className="btn btn-outline-secondary btn-sm">
            ← Patients
          </Link>
          <div className="flex-grow-1">
            <h4 className="mb-4">{patient.name}</h4>
            <p className="text-muted small mb-0">
              Clinical patient ID <code>{patient.id}</code>
              {patient.uniquePetId ? (
                <>
                  {" "}
                  · Pet ID <code>{patient.uniquePetId}</code>
                </>
              ) : null}
              {owner?.userId ? (
                <>
                  {" "}
                  · Owner user <code>{owner.userId}</code>
                </>
              ) : null}
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2 justify-content-end">
            {hasManage && (
              <Link href={staffClinicPatientEditPath(branchId, patientId)} className="btn btn-sm btn-primary">
                Edit profile
              </Link>
            )}
            {canAppointments && (
              <Link href={`/staff/branch/${branchId}/clinic/appointments/new`} className="btn btn-sm btn-outline-primary">
                New appointment
              </Link>
            )}
            {canSurgery && (
              <Link href={`/staff/branch/${branchId}/clinic/surgeries/new`} className="btn btn-sm btn-outline-secondary">
                New surgery
              </Link>
            )}
            <Link href={`/staff/branch/${branchId}/clinic/billing`} className="btn btn-sm btn-outline-secondary">
              Branch billing
            </Link>
          </div>
        </div>

        {Array.isArray(overview.alerts) && overview.alerts.length > 0 && (
          <div className="alert alert-warning py-2 mb-16" role="alert">
            <strong>Alerts</strong>
            <ul className="mb-0 mt-8 small">
              {overview.alerts.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        <Card
          className="mb-24"
          title="Summary"
          subtitle={`${patient.animalType?.name ?? "—"} · ${patient.breed?.name ?? "—"} · ${patient.sex ?? "—"}`}
        >
          <div className="row g-3">
            <div className="col-md-6">
              <h6 className="text-muted text-uppercase small">Owner (client)</h6>
              <p className="mb-0">
                <strong>{owner?.displayName ?? "—"}</strong>
              </p>
              <p className="text-muted small mb-0">{owner?.phone ?? "—"}</p>
              <p className="text-muted small mb-0">{owner?.email ?? ""}</p>
            </div>
            <div className="col-md-6">
              <h6 className="text-muted text-uppercase small">Last visit at this branch</h6>
              {lastVisit ? (
                <>
                  <p className="mb-0">
                    <Link href={`/staff/branch/${branchId}/clinic/visits/${lastVisit.id}`}>
                      {lastVisit.treatmentCode || `Visit #${lastVisit.id}`}
                    </Link>{" "}
                    <span className="badge bg-light text-dark">{lastVisit.status}</span>
                  </p>
                  <p className="text-muted small mb-0">{fmtDate(lastVisit.completedAt || lastVisit.startedAt || lastVisit.createdAt)}</p>
                </>
              ) : (
                <p className="text-muted mb-0">No visits yet at this branch.</p>
              )}
            </div>
          </div>
        </Card>

        <ul className="nav nav-tabs flex-wrap mb-16">
          {TABS.map((t) => (
            <li className="nav-item" key={t.key}>
              <button
                type="button"
                className={`nav-link ${tab === t.key ? "active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>

        {tab === "overview" && (
          <div className="row g-3">
            <div className="col-md-6">
              <Card title="Pet profile">
                <dl className="row mb-0 small">
                  <dt className="col-sm-4">DOB</dt>
                  <dd className="col-sm-8">{patient.dateOfBirth ? fmtDate(patient.dateOfBirth) : "—"}</dd>
                  <dt className="col-sm-4">Microchip</dt>
                  <dd className="col-sm-8">{patient.microchipNumber || "—"}</dd>
                  <dt className="col-sm-4">Blood type</dt>
                  <dd className="col-sm-8">{patient.bloodType || "—"}</dd>
                  <dt className="col-sm-4">Notes</dt>
                  <dd className="col-sm-8">{patient.notes || "—"}</dd>
                </dl>
              </Card>
            </div>
            <div className="col-md-6">
              <Card title="Counts (this branch)">
                <ul className="list-unstyled small mb-0">
                  <li>Visits: {overview.visitsTotal ?? 0}</li>
                  <li>Vaccine records (shown): {(overview.vaccinations ?? []).length}</li>
                  <li>Prescriptions (shown): {(overview.prescriptions ?? []).length}</li>
                  <li>Surgery cases (shown): {(overview.surgeries ?? []).length}</li>
                  <li>Recent orders: {(overview.billingRecentOrders ?? []).length}</li>
                </ul>
              </Card>
            </div>
          </div>
        )}

        {tab === "visits" && (
          <Card title="Visit history" subtitle={`Total ${overview.visitsTotal ?? 0}`}>
            {(overview.visits ?? []).length === 0 ? (
              <p className="text-muted mb-0">No visits for this patient at this branch.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Visit</th>
                      <th>Status</th>
                      <th>Doctor</th>
                      <th>When</th>
                      <th className="text-end">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(overview.visits ?? []).map((v) => (
                      <tr key={v.id}>
                        <td>{v.treatmentCode || `#${v.id}`}</td>
                        <td>{v.status}</td>
                        <td>{v.doctor?.user?.profile?.displayName ?? "—"}</td>
                        <td className="text-muted small">{fmtDate(v.completedAt || v.startedAt || v.createdAt)}</td>
                        <td className="text-end">
                          <Link className="btn btn-sm btn-outline-primary" href={`/staff/branch/${branchId}/clinic/visits/${v.id}`}>
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {tab === "prescriptions" && (
          <Card title="Prescription history">
            {(overview.prescriptions ?? []).length === 0 ? (
              <p className="text-muted mb-0">No prescriptions linked to visits at this branch.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Status</th>
                      <th>Visit</th>
                      <th>Doctor</th>
                      <th>Medicines</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(overview.prescriptions ?? []).map((rx) => (
                      <tr key={rx.id}>
                        <td>
                          <code className="small">#{rx.id}</code>
                        </td>
                        <td>{rx.status}</td>
                        <td>
                          <Link href={`/staff/branch/${branchId}/clinic/visits/${rx.visitId}`}>
                            {rx.visit?.treatmentCode || `#${rx.visitId}`}
                          </Link>
                        </td>
                        <td>{rx.doctor?.user?.profile?.displayName ?? "—"}</td>
                        <td className="small">
                          {(rx.items ?? []).map((it) => it.medicineName).filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="text-end">
                          {canPrescription && (
                            <Link
                              className="btn btn-sm btn-outline-secondary"
                              href={`/staff/branch/${branchId}/clinic/prescriptions/${rx.id}/print`}
                            >
                              Print
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {tab === "vaccines" && (
          <div className="row g-3">
            <div className="col-md-6">
              <Card title="Recent vaccinations">
                {(overview.vaccinations ?? []).length === 0 ? (
                  <p className="text-muted mb-0">No vaccination records.</p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {(overview.vaccinations ?? []).map((v) => (
                      <li key={v.id} className="list-group-item px-0">
                        <strong>{v.vaccineType?.name ?? "Vaccine"}</strong>
                        <div className="small text-muted">{fmtDate(v.administeredAt)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
            <div className="col-md-6">
              <Card title="Upcoming due">
                {(overview.vaccinationsNextDue ?? []).length === 0 ? (
                  <p className="text-muted mb-0">No upcoming due dates on file.</p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {(overview.vaccinationsNextDue ?? []).map((v) => (
                      <li key={v.id} className="list-group-item px-0">
                        <strong>{v.vaccineType?.name ?? "Vaccine"}</strong>
                        <div className="small text-muted">Due {fmtDate(v.nextDueDate)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        )}

        {tab === "billing" && (
          <Card title="Billing summary" subtitle="Recent orders linked to visits for this patient at this branch">
            {(overview.billingRecentOrders ?? []).length === 0 ? (
              <p className="text-muted mb-0">No orders found.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Amount</th>
                      <th>Payment</th>
                      <th>Visit</th>
                      <th>Invoice</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(overview.billingRecentOrders ?? []).map((o) => (
                      <tr key={o.id}>
                        <td>{o.orderNumber}</td>
                        <td>{fmtMoney(o.totalAmount)}</td>
                        <td>{o.paymentStatus}</td>
                        <td>
                          {o.visitId ? (
                            <Link href={`/staff/branch/${branchId}/clinic/visits/${o.visitId}`}>#{o.visitId}</Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{o.clinicInvoice?.id ? <span className="small">Clinic #{o.clinicInvoice.id}</span> : "—"}</td>
                        <td className="text-muted small">{fmtDate(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {tab === "surgery" && (
          <Card title="Surgery / procedures">
            {(overview.surgeries ?? []).length === 0 ? (
              <p className="text-muted mb-0">No surgery cases for this patient at this branch.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Case</th>
                      <th>Service</th>
                      <th>Status</th>
                      <th>Scheduled</th>
                      <th className="text-end">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(overview.surgeries ?? []).map((s) => (
                      <tr key={s.id}>
                        <td>{s.caseNumber}</td>
                        <td>{s.service?.name ?? "—"}</td>
                        <td>{s.status}</td>
                        <td className="text-muted small">{fmtDate(s.scheduledStartAt)}</td>
                        <td className="text-end">
                          <Link className="btn btn-sm btn-outline-primary" href={`/staff/branch/${branchId}/clinic/surgeries/${s.id}`}>
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {tab === "timeline" && (
          <Card title="Timeline" subtitle="Combined visits, surgery, prescriptions, and orders (newest first)">
            {(overview.timeline ?? []).length === 0 ? (
              <p className="text-muted mb-0">No events.</p>
            ) : (
              <ul className="list-group list-group-flush">
                {(overview.timeline ?? []).map((ev, idx) => (
                  <li key={`${ev.type}-${ev.id}-${idx}`} className="list-group-item px-0 d-flex justify-content-between align-items-start">
                    <div>
                      <span className="badge bg-light text-dark me-2">{ev.type}</span>
                      {ev.label}
                      {ev.meta?.status ? <span className="text-muted small ms-2">({ev.meta.status})</span> : null}
                    </div>
                    <div className="text-muted small text-nowrap ms-2">{fmtDate(ev.at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </PageWorkspace>
  );
}
