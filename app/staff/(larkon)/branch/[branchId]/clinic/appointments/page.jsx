"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicAppointmentsListV2,
  staffClinicAppointmentStats,
  staffClinicAppointmentDoctorStats,
  staffClinicAppointmentServiceStats,
  staffClinicAppointmentExport,
  staffClinicAppointmentGet,
  staffClinicAppointmentCheckIn,
  staffClinicAppointmentCancel,
  staffClinicAppointmentNoShow,
  staffClinicAppointmentReschedule,
  staffClinicAppointmentCreateV2,
  staffClinicAppointmentSearch,
  staffClinicAppointmentCollectPayment,
  staffClinicAppointmentSlip,
  staffClinicAppointmentPaymentSlip,
  staffClinicAppointmentAssignDoctor,
  staffClinicAppointmentPromote,
  staffClinicCheckDuplicate,
  staffClinicSlots,
  staffClinicDoctors,
  staffClinicServices,
  staffClinicOwnerLookup,
  staffClinicPatientsList,
  staffClinicPatientRegister,
  getAnimalTypes,
  getBreedsByAnimalType,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import AppointmentSummaryCards from "@/src/components/clinic/AppointmentSummaryCards";
import AppointmentFilterBar from "@/src/components/clinic/AppointmentFilterBar";
import AppointmentDetailDrawer from "@/src/components/clinic/AppointmentDetailDrawer";
import DoctorWorkloadPanel from "@/src/components/clinic/DoctorWorkloadPanel";
import ServiceBreakdownPanel from "@/src/components/clinic/ServiceBreakdownPanel";
import CreateAppointmentWizard from "./_components/CreateAppointmentWizard";
import StatusBadge from "@/src/components/dashboard/StatusBadge";

const APPOINTMENTS_PERMS = ["clinic.appointments.read", "clinic.appointments.manage"];

function todayYMD() {
  return new Date().toISOString().split("T")[0];
}
function maxDateYMD() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

export default function StaffBranchClinicAppointmentsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [appointments, setAppointments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [datePreset, setDatePreset] = useState("today");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [statuses, setStatuses] = useState([]);
  const [serviceId, setServiceId] = useState("");
  const [visitType, setVisitType] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [source, setSource] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(50);
  const [sortBy, setSortBy] = useState("scheduledStartAt");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [doctorStats, setDoctorStats] = useState([]);
  const [doctorStatsLoading, setDoctorStatsLoading] = useState(false);
  const [serviceStats, setServiceStats] = useState([]);
  const [serviceStatsLoading, setServiceStatsLoading] = useState(false);
  const [detailAppointmentId, setDetailAppointmentId] = useState(null);
  const [detailAppointment, setDetailAppointment] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [actioningId, setActioningId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalSource, setCreateModalSource] = useState(undefined);
  const [showWizard, setShowWizard] = useState(false);
  const [rescheduleApt, setRescheduleApt] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [doctorFilter, setDoctorFilter] = useState("");
  const [doctorsForFilter, setDoctorsForFilter] = useState([]);
  const [servicesForFilter, setServicesForFilter] = useState([]);
  const [payModalApt, setPayModalApt] = useState(null);
  const [slipModalApt, setSlipModalApt] = useState(null);
  const [assignDoctorApt, setAssignDoctorApt] = useState(null);
  const [completeIntakeApt, setCompleteIntakeApt] = useState(null);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = APPOINTMENTS_PERMS.some((p) => permissions.includes(p));
  const canManage = permissions.includes("clinic.appointments.manage");

  const listParams = useMemo(() => {
    const p = {
      limit,
      offset: page * limit,
      sortBy,
      sortOrder,
      doctorId: doctorFilter ? Number(doctorFilter) : undefined,
      serviceId: serviceId ? Number(serviceId) : undefined,
      visitType: visitType || undefined,
      paymentStatus: paymentStatus || undefined,
      channel: source || undefined,
      priority: priority || undefined,
    };
    if (datePreset === "custom" && (fromDate || toDate)) {
      p.fromDate = fromDate || undefined;
      p.toDate = toDate || undefined;
    } else if (datePreset && datePreset !== "custom") {
      p.datePreset = datePreset;
    } else {
      p.date = date;
    }
    if (statuses?.length) p.statuses = statuses;
    else if (statusFilter) p.status = statusFilter;
    return p;
  }, [date, datePreset, fromDate, toDate, statusFilter, statuses, doctorFilter, serviceId, visitType, paymentStatus, source, priority, page, limit, sortBy, sortOrder]);

  const loadAppointments = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError("");
    try {
      const res = await staffClinicAppointmentsListV2(branchId, listParams);
      setAppointments(res?.items ?? []);
      setTotal(res?.total ?? 0);
    } catch (e) {
      setError(e?.message || "Failed to load appointments");
      setAppointments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [branchId, listParams]);

  const statsParams = useMemo(() => {
    if (datePreset === "custom" && (fromDate || toDate)) return { fromDate: fromDate || undefined, toDate: toDate || undefined };
    if (datePreset && datePreset !== "custom") return { datePreset };
    return { date };
  }, [date, datePreset, fromDate, toDate]);

  const loadStats = useCallback(async () => {
    if (!branchId) return;
    setStatsLoading(true);
    try {
      const data = await staffClinicAppointmentStats(branchId, statsParams);
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [branchId, statsParams]);

  const loadDoctorStats = useCallback(async () => {
    if (!branchId) return;
    setDoctorStatsLoading(true);
    try {
      const data = await staffClinicAppointmentDoctorStats(branchId, statsParams);
      setDoctorStats(Array.isArray(data) ? data : []);
    } catch {
      setDoctorStats([]);
    } finally {
      setDoctorStatsLoading(false);
    }
  }, [branchId, statsParams]);

  const loadServiceStats = useCallback(async () => {
    if (!branchId) return;
    setServiceStatsLoading(true);
    try {
      const data = await staffClinicAppointmentServiceStats(branchId, statsParams);
      setServiceStats(Array.isArray(data) ? data : []);
    } catch {
      setServiceStats([]);
    } finally {
      setServiceStatsLoading(false);
    }
  }, [branchId, statsParams]);

  useEffect(() => {
    if (!branchId) return;
    staffClinicDoctors(branchId).then((d) => setDoctorsForFilter(Array.isArray(d) ? d : []));
    staffClinicServices(branchId).then((s) => setServicesForFilter(Array.isArray(s) ? s : []));
  }, [branchId]);

  useEffect(() => {
    if (!branchId) return;
    loadAppointments();
  }, [branchId, loadAppointments]);

  useEffect(() => {
    if (!branchId) return;
    loadStats();
    loadDoctorStats();
    loadServiceStats();
  }, [branchId, loadStats, loadDoctorStats, loadServiceStats]);

  useEffect(() => {
    if (detailAppointmentId && branchId) {
      setDetailLoading(true);
      staffClinicAppointmentGet(branchId, detailAppointmentId)
        .then(setDetailAppointment)
        .catch(() => setDetailAppointment(null))
        .finally(() => setDetailLoading(false));
    } else {
      setDetailAppointment(null);
    }
  }, [branchId, detailAppointmentId]);

  async function handleCheckIn(appointmentId) {
    if (!branchId || !canManage) return;
    setActioningId(appointmentId);
    setError("");
    try {
      await staffClinicAppointmentCheckIn(branchId, appointmentId);
      await loadAppointments();
    } catch (e) {
      setError(e?.message || "Check-in failed");
    } finally {
      setActioningId(null);
    }
  }

  async function handleCancel(appointmentId, reason) {
    if (!branchId || !canManage) return;
    setActioningId(appointmentId);
    setError("");
    try {
      await staffClinicAppointmentCancel(branchId, appointmentId, reason);
      await loadAppointments();
    } catch (e) {
      setError(e?.message || "Cancel failed");
    } finally {
      setActioningId(null);
    }
  }

  async function handleNoShow(appointmentId) {
    if (!branchId || !canManage) return;
    setActioningId(appointmentId);
    setError("");
    try {
      await staffClinicAppointmentNoShow(branchId, appointmentId);
      await loadAppointments();
    } catch (e) {
      setError(e?.message || "No-show failed");
    } finally {
      setActioningId(null);
    }
  }

  async function handleReschedule(appointmentId, data) {
    if (!branchId || !canManage) return;
    setActioningId(appointmentId);
    setError("");
    try {
      await staffClinicAppointmentReschedule(branchId, appointmentId, data);
      setRescheduleApt(null);
      await loadAppointments();
    } catch (e) {
      setError(e?.message || "Reschedule failed");
      throw e;
    } finally {
      setActioningId(null);
    }
  }

  async function handleSearch() {
    if (!branchId || !searchQuery.trim()) return;
    setSearching(true);
    setError("");
    try {
      const res = await staffClinicAppointmentSearch(branchId, { q: searchQuery.trim(), limit: 20 });
      setSearchResults(res);
    } catch (e) {
      setError(e?.message || "Search failed");
      setSearchResults(null);
    } finally {
      setSearching(false);
    }
  }

  const canCheckIn = (s) => ["BOOKED", "CONFIRMED"].includes(s);
  const canCancel = (s) => ["BOOKED", "CONFIRMED", "CHECKED_IN", "DRAFT", "PRE_BOOKED"].includes(s);
  const canNoShow = (s) => ["BOOKED", "CONFIRMED", "DRAFT", "PRE_BOOKED"].includes(s);
  const canReschedule = (s) => ["BOOKED", "CONFIRMED"].includes(s);
  const canCompleteIntake = (s) => ["DRAFT", "PRE_BOOKED"].includes(s);
  const isUnpaid = (a) => (a.paymentStatus || "UNPAID") !== "PAID" && (a.paymentStatus || "UNPAID") !== "WAIVED";
  const isAnyDoctorUnassigned = (a) => !!a.isAnyDoctor && (a.doctorId == null || !a.doctor);

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
        missingPerm="clinic.appointments.read"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic`)}
      />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}/clinic`} className="btn btn-outline-secondary btn-sm">
          ← Clinic
        </Link>
        <h5 className="mb-0">Appointments</h5>
      </div>

      {error && (
        <div className="alert alert-danger mb-3" role="alert">
          {error}
        </div>
      )}

      <h5 className="mb-3">Appointment Operations Dashboard</h5>

      <AppointmentSummaryCards
        stats={stats}
        loading={statsLoading}
        onFilterByStatus={(statusesArr) => { setStatuses(statusesArr); setStatusFilter(""); }}
        onFilterByEmergency={() => setPriority("EMERGENCY")}
      />

      <div className="d-flex flex-wrap gap-3">
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <Card title="Appointments" subtitle="Filter and search. Click a row for details. Queue: use Queue for check-in flow.">
            <AppointmentFilterBar
              datePreset={datePreset}
              fromDate={fromDate}
              toDate={toDate}
              onDatePresetChange={(v) => { setDatePreset(v); setPage(0); }}
              onDateRangeChange={(r) => { setFromDate(r.fromDate ?? ""); setToDate(r.toDate ?? ""); setPage(0); }}
              statuses={statuses}
              onStatusesChange={(v) => { setStatuses(v); setStatusFilter(""); setPage(0); }}
              doctorId={doctorFilter ? Number(doctorFilter) : undefined}
              onDoctorIdChange={(v) => { setDoctorFilter(v != null ? String(v) : ""); setPage(0); }}
              serviceId={serviceId ? Number(serviceId) : undefined}
              onServiceIdChange={(v) => { setServiceId(v != null ? String(v) : ""); setPage(0); }}
              visitType={visitType}
              onVisitTypeChange={(v) => { setVisitType(v ?? ""); setPage(0); }}
              paymentStatus={paymentStatus}
              onPaymentStatusChange={(v) => { setPaymentStatus(v ?? ""); setPage(0); }}
              source={source}
              onSourceChange={(v) => { setSource(v ?? ""); setPage(0); }}
              priority={priority}
              onPriorityChange={(v) => { setPriority(v ?? ""); setPage(0); }}
              searchQuery={searchQuery}
              onSearchChange={(v) => { setSearchQuery(v); if (!v) setSearchResults(null); }}
              onSearchSubmit={handleSearch}
              doctors={doctorsForFilter}
              services={servicesForFilter}
              canManage={canManage}
              onCreateWalkIn={() => { setCreateModalSource("COUNTER"); setShowCreateModal(true); }}
              onCreatePhone={() => { setCreateModalSource("PHONE"); setShowCreateModal(true); }}
              onCreateOnline={() => { setCreateModalSource("ONLINE"); setShowCreateModal(true); }}
              onOpenWizard={canManage ? () => setShowWizard(true) : undefined}
              onExport={async () => {
                try {
                  const csv = await staffClinicAppointmentExport(branchId, listParams);
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "appointments.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (e) {
                  setError(e?.message || "Export failed");
                }
              }}
              showMoreFilters={showMoreFilters}
              onShowMoreFiltersChange={setShowMoreFilters}
            />
            {loading ? (
              <div className="py-24">
                <div className="placeholder-glow">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <span key={i} className="placeholder col-12 d-block mb-2" style={{ height: 36 }} />
                  ))}
                </div>
              </div>
            ) : (searchResults && searchResults.items?.length > 0) ? (
              <div className="mb-2 small text-info">Showing search results ({searchResults.total})</div>
            ) : null}
            {!loading && (searchResults?.items?.length > 0 ? searchResults.items : appointments).length === 0 ? (
              <div className="py-24 text-center text-secondary">
                <p className="mb-0">No appointments found for the selected filters.</p>
                {searchQuery && <button type="button" className="btn btn-outline-secondary btn-sm mt-2" onClick={() => { setSearchQuery(""); setSearchResults(null); }}>Clear search</button>}
              </div>
            ) : !loading ? (
              <>
                <div className="table-responsive">
                  <table className="table table-sm table-hover">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th>Time</th>
                        <th>Token</th>
                        <th>Patient</th>
                        <th>Pet</th>
                        <th>Service</th>
                        <th>Doctor</th>
                        <th>Visit</th>
                        <th>Payment</th>
                        <th>Priority</th>
                        <th>Source</th>
                        <th>Intake</th>
                        <th>Status</th>
                        {canManage && <th className="text-end">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(searchResults?.items ?? appointments).map((a) => {
                        const start =
                          a.scheduledStartAt &&
                          new Date(a.scheduledStartAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                        const patientName =
                          a.patient?.profile?.displayName ?? a.patient?.profile?.username ?? a.ownerNameSnapshot ?? "—";
                        const petName = a.pet?.name ?? a.petNameSnapshot ?? "—";
                        const serviceName = a.service?.name ?? "—";
                        const doctorName = a.doctor?.user?.profile?.displayName ?? (a.isAnyDoctor ? "Any" : "—");
                        const status = a.status ?? "BOOKED";
                        const src = a.channel ?? a.source ?? "STAFF";
                        const sourceLabel = src === "PHONE" ? "Phone" : src === "WALKIN" ? "Walk-in" : src === "MOBILE" || src === "OWNER_PORTAL" ? "Online" : "Counter";
                        const visitTypeVal = a.visitType ?? "WALK_IN";
                        const visitBadge = visitTypeVal === "EMERGENCY" ? "danger" : visitTypeVal === "SCHEDULED" ? "info" : "primary";
                        const payStatus = a.paymentStatus ?? "UNPAID";
                        const payBadge = payStatus === "PAID" ? "success" : payStatus === "PARTIAL" ? "warning" : "secondary";
                        const intakeStatus = a.intakeStatus ?? "NOT_STARTED";
                        const intakeBadge = intakeStatus === "COMPLETE" ? "success" : intakeStatus === "PARTIAL" ? "warning" : "secondary";
                        const priorityVal = a.priority ?? "NORMAL";
                        const priorityBadge = priorityVal === "EMERGENCY" ? "danger" : priorityVal === "VIP" ? "info" : "secondary";
                        const acting = actioningId === a.id;
                        const isEmergency = priorityVal === "EMERGENCY";
                        return (
                          <tr
                            key={a.id}
                            className={isEmergency ? "table-danger border-start border-danger border-3" : ""}
                            style={{ cursor: "pointer" }}
                            onClick={() => setDetailAppointmentId(a.id)}
                          >
                            <td>{start ?? "—"}</td>
                            <td>{a.tokenNo ?? a.id}</td>
                            <td>{patientName}</td>
                            <td>{petName}</td>
                            <td>{serviceName}</td>
                            <td>{doctorName}</td>
                            <td><span className={`badge bg-${visitBadge}`}>{visitTypeVal}</span></td>
                            <td><span className={`badge bg-${payBadge}`}>{payStatus}</span></td>
                            <td><span className={`badge bg-${priorityBadge}`}>{priorityVal}</span></td>
                            <td><span className="badge bg-light text-dark">{sourceLabel}</span></td>
                            <td>
                              <span className={`badge bg-${intakeBadge}`}>
                                {intakeStatus === "COMPLETE" ? "Complete" : intakeStatus === "PARTIAL" ? "Partial" : "—"}
                              </span>
                            </td>
                            <td>
                              <StatusBadge status={status} />
                              {a.appointmentMode === "QUICK_CALL" && (
                                <span className="badge bg-light text-dark ms-1">Phone</span>
                              )}
                            </td>
                            {canManage && (
                              <td className="text-end" onClick={(e) => e.stopPropagation()}>
                                <div className="btn-group btn-group-sm flex-wrap">
                                  {isUnpaid(a) && (
                                    <button type="button" className="btn btn-outline-warning btn-sm" onClick={() => setPayModalApt(a)} disabled={acting}>Pay</button>
                                  )}
                                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setSlipModalApt({ apt: a, type: "appointment" })}>Slip</button>
                                  {payStatus === "PAID" && (
                                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setSlipModalApt({ apt: a, type: "payment" })}>Receipt</button>
                                  )}
                                  {isAnyDoctorUnassigned(a) && (
                                    <button type="button" className="btn btn-outline-info btn-sm" onClick={() => setAssignDoctorApt(a)} disabled={acting}>Assign Dr</button>
                                  )}
                                  <Link href={`/staff/branch/${branchId}/clinic/intake/${a.id}`} className="btn btn-outline-secondary btn-sm" onClick={(e) => e.stopPropagation()}>Intake</Link>
                                  {canCompleteIntake(status) && (
                                    <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setCompleteIntakeApt(a)} disabled={acting}>Complete Intake</button>
                                  )}
                                  {canCheckIn(status) && (
                                    <button type="button" className="btn btn-success btn-sm" onClick={() => handleCheckIn(a.id)} disabled={acting}>{acting ? "…" : "Check-in"}</button>
                                  )}
                                  {canNoShow(status) && (
                                    <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => handleNoShow(a.id)} disabled={acting}>No-show</button>
                                  )}
                                  {canCancel(status) && (
                                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => { const r = window.prompt("Cancel reason (optional):"); handleCancel(a.id, r || undefined); }} disabled={acting}>Cancel</button>
                                  )}
                                  {canReschedule(status) && (
                                    <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setRescheduleApt(a)} disabled={acting}>Reschedule</button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {!searchResults && total > 0 && (
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-2">
                    <small className="text-muted">Total: {total}</small>
                    <div className="d-flex align-items-center gap-2">
                      <select className="form-select form-select-sm" style={{ width: 80 }} value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(0); }}>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</button>
                      <span className="small">Page {page + 1}</span>
                      <button type="button" className="btn btn-outline-secondary btn-sm" disabled={(page + 1) * limit >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </Card>
        </div>
        <div className="d-flex flex-column gap-3" style={{ width: 260 }}>
          <DoctorWorkloadPanel stats={doctorStats} loading={doctorStatsLoading} />
          <ServiceBreakdownPanel stats={serviceStats} loading={serviceStatsLoading} />
        </div>
      </div>

      <AppointmentDetailDrawer
        show={!!detailAppointmentId}
        onClose={() => setDetailAppointmentId(null)}
        appointment={detailAppointment}
        loading={detailLoading}
        branchId={branchId}
      />

      <p className="text-secondary-light text-sm mt-16">
        Queue and visit flow: <Link href={`/staff/branch/${branchId}/clinic/queue`}>Queue</Link>.
      </p>

      {showCreateModal && (
        <CreateAppointmentModal
          branchId={branchId}
          initialChannel={createModalSource}
          onClose={() => { setShowCreateModal(false); setCreateModalSource(undefined); }}
          onSuccess={() => {
            setShowCreateModal(false);
            setCreateModalSource(undefined);
            loadAppointments();
          }}
        />
      )}

      {showWizard && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} role="dialog">
          <div className="modal-dialog modal-lg modal-dialog-scrollable" style={{ maxWidth: 640 }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Booking wizard</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowWizard(false)} />
              </div>
              <div className="modal-body">
                <CreateAppointmentWizard
                  branchId={branchId}
                  onSuccess={() => {
                    setShowWizard(false);
                    loadAppointments();
                    toast.success("Appointment created.");
                  }}
                  onClose={() => setShowWizard(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {rescheduleApt && (
        <RescheduleModal
          branchId={branchId}
          appointment={rescheduleApt}
          onClose={() => setRescheduleApt(null)}
          onSuccess={async (data) => {
            await handleReschedule(rescheduleApt.id, data);
            setRescheduleApt(null);
          }}
        />
      )}

      {payModalApt && (
        <PayNowModal
          branchId={branchId}
          appointment={payModalApt}
          onClose={() => setPayModalApt(null)}
          onSuccess={() => { setPayModalApt(null); loadAppointments(); setSearchResults(null); }}
        />
      )}

      {slipModalApt && (
        <SlipPrintModal
          branchId={branchId}
          appointmentId={slipModalApt.apt.id}
          type={slipModalApt.type}
          onClose={() => setSlipModalApt(null)}
        />
      )}

      {assignDoctorApt && (
        <AssignDoctorModal
          branchId={branchId}
          appointment={assignDoctorApt}
          onClose={() => setAssignDoctorApt(null)}
          onSuccess={() => { setAssignDoctorApt(null); loadAppointments(); setSearchResults(null); }}
        />
      )}

      {completeIntakeApt && (
        <CompleteIntakeModal
          branchId={branchId}
          appointment={completeIntakeApt}
          onClose={() => setCompleteIntakeApt(null)}
          onSuccess={() => { setCompleteIntakeApt(null); loadAppointments(); setSearchResults(null); }}
          onCheckIn={handleCheckIn}
        />
      )}
    </div>
  );
}

const CHANNEL_MODES = [
  { id: "phone", label: "Phone", desc: "Quick booking by phone" },
  { id: "walkin", label: "Walk-in", desc: "Patient at counter" },
  { id: "full", label: "Online / Scheduled", desc: "Full details, referral or online" },
];

function formatPetLabel(p) {
  const typeName = p.animalType?.name ?? "?";
  const breedName = p.breed?.name ?? "";
  const sex = p.sex ?? "";
  const ownerName = p.owner?.displayName ?? "";
  const parts = [p.name, typeName, breedName, sex].filter(Boolean);
  const label = parts.join(" — ");
  return ownerName ? `${label} — Owner: ${ownerName}` : label;
}

const PET_ID_NEW = "__new__";

function PetSelectWithQuickCreate({ owner, patients, setPatients, form, setForm, branchId, animalTypes, setFormError }) {
  const [breeds, setBreeds] = useState([]);
  const [quickPet, setQuickPet] = useState({ name: "", animalTypeId: "", breedId: "", sex: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (quickPet.animalTypeId) {
      getBreedsByAnimalType(Number(quickPet.animalTypeId)).then((b) => setBreeds(Array.isArray(b) ? b : []));
    } else setBreeds([]);
  }, [quickPet.animalTypeId]);

  const refetchPatients = useCallback(() => {
    if (!owner?.id || !branchId) return;
    staffClinicPatientsList(branchId, { ownerId: owner.id, limit: 50 }).then((res) =>
      setPatients(Array.isArray(res?.patients) ? res.patients : [])
    );
  }, [owner?.id, branchId, setPatients]);

  const handleAddQuickPet = useCallback(() => {
    const name = (quickPet.name || "").trim();
    const animalTypeId = quickPet.animalTypeId ? Number(quickPet.animalTypeId) : null;
    if (!name) {
      setFormError("Pet name is required.");
      return;
    }
    if (!animalTypeId) {
      setFormError("Pet type is required.");
      return;
    }
    if (!owner?.id) return;
    setCreating(true);
    setFormError("");
    staffClinicPatientRegister(branchId, {
      userId: owner.id,
      name,
      animalTypeId,
      breedId: quickPet.breedId ? Number(quickPet.breedId) : undefined,
      sex: quickPet.sex || undefined,
    })
      .then((newPet) => {
        if (newPet?.id) {
          refetchPatients();
          setForm((f) => ({ ...f, petId: String(newPet.id) }));
          setQuickPet({ name: "", animalTypeId: "", breedId: "", sex: "" });
        }
      })
      .catch((e) => setFormError(e?.message || "Failed to add pet"))
      .finally(() => setCreating(false));
  }, [branchId, owner?.id, quickPet, refetchPatients, setForm, setFormError]);

  const showQuickCreate = form.petId === PET_ID_NEW;
  const ownerFound = !!owner;

  return (
    <div className="mb-3">
      <label className="form-label">Pet (optional)</label>
      <select
        className="form-select"
        value={form.petId}
        onChange={(e) => setForm((f) => ({ ...f, petId: e.target.value }))}
        disabled={!ownerFound}
      >
        <option value="">—</option>
        {!ownerFound ? null : patients.length === 0 ? (
          <option disabled>No pets found for this owner</option>
        ) : (
          patients.map((p) => (
            <option key={p.id} value={p.id}>
              {formatPetLabel(p)}
            </option>
          ))
        )}
        {ownerFound && <option value={PET_ID_NEW}>+ Create Quick Pet</option>}
      </select>
      {showQuickCreate && ownerFound && (
        <div className="border rounded p-2 mt-2 bg-light">
          <div className="small fw-medium mb-2 d-flex justify-content-between align-items-center flex-wrap gap-1">
            <span>Add new pet</span>
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-muted"
              onClick={() => setForm((f) => ({ ...f, petId: "" }))}
            >
              No pet / choose existing
            </button>
          </div>
          <input
            type="text"
            className="form-control form-control-sm mb-2"
            placeholder="Pet name"
            value={quickPet.name}
            onChange={(e) => setQuickPet((q) => ({ ...q, name: e.target.value }))}
          />
          <select
            className="form-select form-select-sm mb-2"
            value={quickPet.animalTypeId}
            onChange={(e) => setQuickPet((q) => ({ ...q, animalTypeId: e.target.value, breedId: "" }))}
          >
            <option value="">Pet type</option>
            {(animalTypes || []).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            className="form-select form-select-sm mb-2"
            value={quickPet.breedId}
            onChange={(e) => setQuickPet((q) => ({ ...q, breedId: e.target.value }))}
          >
            <option value="">Breed (optional)</option>
            {breeds.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            className="form-select form-select-sm mb-2"
            value={quickPet.sex}
            onChange={(e) => setQuickPet((q) => ({ ...q, sex: e.target.value }))}
          >
            <option value="">Sex (optional)</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
          <button type="button" className="btn btn-sm btn-primary" onClick={handleAddQuickPet} disabled={creating}>
            {creating ? "…" : "Add Pet"}
          </button>
        </div>
      )}
    </div>
  );
}

function CreateAppointmentModal({ branchId, onClose, onSuccess, initialChannel }) {
  const initialMode =
    initialChannel === "PHONE" ? "phone" : initialChannel === "ONLINE" ? "full" : "walkin";
  const [channelMode, setChannelMode] = useState(initialMode);
  const [step, setStep] = useState(0);
  const [ownerQuery, setOwnerQuery] = useState("");
  const [owner, setOwner] = useState(null);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [animalTypes, setAnimalTypes] = useState([]);
  const [form, setForm] = useState({
    visitType: "WALK_IN",
    channel: "COUNTER",
    priority: "NORMAL",
    patientId: "",
    petId: "",
    doctorId: "",
    serviceId: "",
    date: todayYMD(),
    slotStart: "",
    slotEnd: "",
    notes: "",
    payNow: false,
    paymentMethod: "CASH",
    amount: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!branchId) {
      setOptionsLoading(false);
      return;
    }
    setOptionsLoading(true);
    setOptionsError("");
    Promise.all([staffClinicDoctors(branchId), staffClinicServices(branchId), getAnimalTypes()])
      .then(([d, s, at]) => {
        setDoctors(Array.isArray(d) ? d : []);
        setServices(Array.isArray(s) ? s : []);
        setAnimalTypes(Array.isArray(at) ? at : []);
      })
      .catch(() => {
        setOptionsError("Could not load doctors/services. Check branch clinic setup.");
      })
      .finally(() => setOptionsLoading(false));
  }, [branchId]);

  useEffect(() => {
    if (!form.date || !branchId) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    staffClinicSlots(branchId, {
      date: form.date,
      doctorId: form.doctorId ? Number(form.doctorId) : undefined,
      serviceId: form.serviceId ? Number(form.serviceId) : undefined,
    })
      .then((s) => setSlots(Array.isArray(s) ? s : []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [branchId, form.date, form.doctorId, form.serviceId]);

  const isToday = form.date === todayYMD();
  const now = new Date();
  const slotsFiltered = isToday
    ? slots.filter((s) => s.end && new Date(s.end) > now)
    : slots;

  async function searchOwner() {
    if (!ownerQuery.trim()) return;
    setOwnerSearching(true);
    setFormError("");
    try {
      const o = await staffClinicOwnerLookup(branchId, ownerQuery.trim());
      setOwner(o || null);
      if (o?.id) {
        setForm((f) => ({ ...f, patientId: String(o.id) }));
        const res = await staffClinicPatientsList(branchId, { ownerId: o.id, limit: 50 });
        setPatients(Array.isArray(res?.patients) ? res.patients : []);
      } else {
        setPatients([]);
      }
    } catch {
      setOwner(null);
      setPatients([]);
      setFormError("Owner not found. Try phone or email.");
    } finally {
      setOwnerSearching(false);
    }
  }

  function buildPayload(source, channel, visitType, isInstant, isAnyDoctor, paymentStatus, paymentMethod, paidAmount) {
    const rawDoctorId = form.doctorId ? Number(form.doctorId) : null;
    const isAnyDoctorVal = !form.doctorId || form.doctorId === "any" || rawDoctorId === 0 || Number.isNaN(rawDoctorId);
    const effectiveDoctorId = isAnyDoctorVal ? null : rawDoctorId;
    return {
      patientId: Number(form.patientId),
      petId: form.petId ? Number(form.petId) : undefined,
      doctorId: effectiveDoctorId,
      serviceId: Number(form.serviceId),
      scheduledStartAt: form.slotStart,
      scheduledEndAt: form.slotEnd,
      source: source || "STAFF",
      notes: form.notes || undefined,
      visitType: visitType || form.visitType,
      isInstant: !!isInstant,
      isAnyDoctor: effectiveDoctorId == null,
      channel: channel || form.channel,
      paymentStatus: paymentStatus ?? (form.payNow ? "PAID" : "UNPAID"),
      paymentMethod: form.payNow ? form.paymentMethod : undefined,
      paidAmount: form.payNow && form.amount ? Number(form.amount) : undefined,
      priority: form.priority,
    };
  }

  function doCreate(payload) {
    setSubmitting(true);
    staffClinicAppointmentCreateV2(branchId, payload)
      .then(() => onSuccess())
      .catch((err) => setFormError(err?.message || "Create failed"))
      .finally(() => setSubmitting(false));
  }

  const selectedService = services.find((s) => s.id === Number(form.serviceId));
  const suggestedAmount = selectedService?.price != null ? Number(selectedService.price) : "";

  function SlotSelect({ value, onChange, filteredSlots }) {
    const slotValue = value && filteredSlots.some((s) => s.start && new Date(s.start).toISOString() === value) ? value : "";
    return (
      <select
        className="form-select"
        value={slotValue}
        onChange={(e) => {
          const iso = e.target.value;
          const s = filteredSlots.find((x) => x.start && new Date(x.start).toISOString() === iso);
          if (s?.start != null && s?.end != null) onChange(new Date(s.start).toISOString(), new Date(s.end).toISOString());
        }}
      >
        <option value="">Select</option>
        {filteredSlots.map((s) => {
          const iso = s.start ? new Date(s.start).toISOString() : "";
          return (
            <option key={iso || Math.random()} value={iso}>
              {s.start && new Date(s.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {" – "}
              {s.end && new Date(s.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </option>
          );
        })}
      </select>
    );
  }

  return (
    <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1}>
      <div className="modal-dialog modal-dialog-scrollable modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">New appointment</h5>
            <div className="d-flex align-items-center gap-2 small">
              {CHANNEL_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`btn btn-sm ${channelMode === m.id ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => setChannelMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body">
            {formError && <div className="alert alert-danger py-2">{formError}</div>}
            {optionsError && <div className="alert alert-warning py-2 small">{optionsError}</div>}

            {channelMode === "phone" && (
              <PhoneQuickForm
                branchId={branchId}
                form={form}
                setForm={setForm}
                ownerQuery={ownerQuery}
                setOwnerQuery={setOwnerQuery}
                owner={owner}
                setOwner={setOwner}
                patients={patients}
                setPatients={setPatients}
                doctors={doctors}
                services={services}
                slots={slotsFiltered}
                slotsLoading={slotsLoading}
                optionsLoading={optionsLoading}
                searchOwner={searchOwner}
                ownerSearching={ownerSearching}
                buildPayload={buildPayload}
                doCreate={doCreate}
                submitting={submitting}
                setFormError={setFormError}
                SlotSelect={SlotSelect}
                todayYMD={todayYMD}
                maxDateYMD={maxDateYMD}
                onClose={onClose}
                animalTypes={animalTypes}
              />
            )}

            {channelMode === "walkin" && (
              <WalkInForm
                branchId={branchId}
                form={form}
                setForm={setForm}
                step={step}
                setStep={setStep}
                ownerQuery={ownerQuery}
                setOwnerQuery={setOwnerQuery}
                owner={owner}
                setOwner={setOwner}
                patients={patients}
                setPatients={setPatients}
                doctors={doctors}
                services={services}
                slots={slotsFiltered}
                slotsLoading={slotsLoading}
                optionsLoading={optionsLoading}
                searchOwner={searchOwner}
                ownerSearching={ownerSearching}
                buildPayload={buildPayload}
                doCreate={doCreate}
                submitting={submitting}
                setFormError={setFormError}
                selectedService={selectedService}
                suggestedAmount={suggestedAmount}
                SlotSelect={SlotSelect}
                todayYMD={todayYMD}
                maxDateYMD={maxDateYMD}
                onClose={onClose}
                animalTypes={animalTypes}
              />
            )}

            {channelMode === "full" && (
              <FullBookingForm
                branchId={branchId}
                form={form}
                setForm={setForm}
                step={step}
                setStep={setStep}
                ownerQuery={ownerQuery}
                setOwnerQuery={setOwnerQuery}
                owner={owner}
                setOwner={setOwner}
                patients={patients}
                setPatients={setPatients}
                doctors={doctors}
                services={services}
                slots={slotsFiltered}
                slotsLoading={slotsLoading}
                optionsLoading={optionsLoading}
                searchOwner={searchOwner}
                ownerSearching={ownerSearching}
                buildPayload={buildPayload}
                doCreate={doCreate}
                submitting={submitting}
                setFormError={setFormError}
                selectedService={selectedService}
                suggestedAmount={suggestedAmount}
                SlotSelect={SlotSelect}
                todayYMD={todayYMD}
                maxDateYMD={maxDateYMD}
                onClose={onClose}
                animalTypes={animalTypes}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneQuickForm({
  branchId,
  form,
  setForm,
  ownerQuery,
  setOwnerQuery,
  owner,
  setOwner,
  patients,
  setPatients,
  doctors,
  services,
  slots,
  slotsLoading,
  optionsLoading,
  searchOwner,
  ownerSearching,
  buildPayload,
  doCreate,
  submitting,
  setFormError,
  SlotSelect,
  todayYMD,
  maxDateYMD,
  onClose,
  animalTypes,
}) {
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [forceCreate, setForceCreate] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!form.patientId) {
      setFormError("Find owner by phone/email first.");
      return;
    }
    if (form.petId === PET_ID_NEW) {
      setFormError("Complete quick pet creation (name + type + Add Pet) or use “No pet / choose existing” in the Pet section.");
      return;
    }
    if (!form.serviceId || !form.date || !form.slotStart || !form.slotEnd) {
      setFormError("Please fill service, date and time slot.");
      return;
    }
    const mobile = ownerQuery?.trim() || owner?.auth?.phone || "";
    const petName = form.petId && form.petId !== PET_ID_NEW ? (patients.find((p) => p.id === Number(form.petId))?.name ?? "") : "";
    if (!forceCreate && mobile && branchId) {
      const dup = await staffClinicCheckDuplicate(branchId, { mobile, petName: petName || undefined, date: form.date });
      if (dup?.possibleDuplicate && dup?.existing?.length) {
        setDuplicateWarning(dup);
        setFormError("Possible duplicate appointment (same mobile + date). Click Create again to save anyway.");
        return;
      }
    }
    setDuplicateWarning(null);
    setForceCreate(false);
    const payload = buildPayload("PHONE", "PHONE", "SCHEDULED", false, true, "UNPAID");
    doCreate(payload);
  }
  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label className="form-label">Owner (phone or email) *</label>
        <div className="d-flex gap-2">
          <input
            type="text"
            className="form-control"
            placeholder="Phone or email"
            value={ownerQuery}
            onChange={(e) => {
              setOwnerQuery(e.target.value);
              setOwner(null);
              setForm((f) => ({ ...f, patientId: "" }));
            }}
          />
          <button type="button" className="btn btn-outline-primary" onClick={searchOwner} disabled={ownerSearching}>
            {ownerSearching ? "…" : "Find"}
          </button>
        </div>
        {owner && <small className="text-success">{owner.profile?.displayName ?? "Owner #" + owner.id}</small>}
      </div>
      {duplicateWarning?.possibleDuplicate && (
        <div className="alert alert-warning py-2 small mb-2">
          Possible duplicate appointment found. <button type="button" className="btn btn-link p-0 small" onClick={() => { setForceCreate(true); setFormError(""); }}>Create anyway</button>
        </div>
      )}
      <PetSelectWithQuickCreate
        owner={owner}
        patients={patients}
        setPatients={setPatients}
        form={form}
        setForm={setForm}
        branchId={branchId}
        animalTypes={animalTypes}
        setFormError={setFormError}
      />
      <div className="mb-3">
        <label className="form-label">Service *</label>
        <select className="form-select" value={form.serviceId} onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))} required disabled={optionsLoading}>
          <option value="">{optionsLoading ? "Loading…" : "Select service"}</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label className="form-label">Doctor</label>
        <select className="form-select" value={form.doctorId} onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value, slotStart: "", slotEnd: "" }))} disabled={optionsLoading}>
          <option value="">Any Available Doctor</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>{d.displayName}</option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label className="form-label">Date *</label>
        <input
          type="date"
          className="form-control"
          value={form.date}
          min={todayYMD()}
          max={maxDateYMD()}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value, slotStart: "", slotEnd: "" }))}
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Time slot *</label>
        {slotsLoading ? (
          <p className="text-muted small">Loading slots…</p>
        ) : (
          <SlotSelect
            value={form.slotStart}
            onChange={(start, end) => setForm((f) => ({ ...f, slotStart: start, slotEnd: end }))}
            filteredSlots={slots}
          />
        )}
      </div>
      <div className="mb-3">
        <label className="form-label">Notes</label>
        <textarea className="form-control" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      </div>
      <div className="modal-footer d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "…" : "Create"}</button>
      </div>
    </form>
  );
}

function WalkInForm({
  branchId,
  form,
  setForm,
  step,
  setStep,
  ownerQuery,
  setOwnerQuery,
  owner,
  setOwner,
  patients,
  setPatients,
  doctors,
  services,
  slots,
  slotsLoading,
  optionsLoading,
  searchOwner,
  ownerSearching,
  buildPayload,
  doCreate,
  submitting,
  setFormError,
  selectedService,
  suggestedAmount,
  SlotSelect,
  todayYMD,
  maxDateYMD,
  onClose,
  animalTypes,
}) {
  const WALKIN_STEPS = ["Patient & priority", "Service & slot", "Confirm"];
  function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!form.patientId) {
      setFormError("Select patient (owner phone/email + Find) first.");
      return;
    }
    if (form.petId === PET_ID_NEW) {
      setFormError("Complete quick pet creation (name + type + Add Pet) or use “No pet / choose existing” in the Pet section.");
      return;
    }
    if (!form.serviceId || !form.date || !form.slotStart || !form.slotEnd) {
      setFormError("Please fill service, date and time slot.");
      return;
    }
    const payload = buildPayload("STAFF", "COUNTER", "WALK_IN", true);
    doCreate(payload);
  }
  return (
    <form onSubmit={handleSubmit}>
      {step === 0 && (
        <div>
          <p className="text-muted small mb-2">Owner phone or email, then Find. Select pet if present.</p>
          <div className="mb-3">
            <label className="form-label">Owner (phone or email) *</label>
            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control"
                placeholder="Phone or email"
                value={ownerQuery}
                onChange={(e) => {
                  setOwnerQuery(e.target.value);
                  setOwner(null);
                  setForm((f) => ({ ...f, patientId: "" }));
                }}
              />
              <button type="button" className="btn btn-outline-primary" onClick={searchOwner} disabled={ownerSearching}>
                {ownerSearching ? "…" : "Find"}
              </button>
            </div>
            {owner && <small className="text-success">{owner.profile?.displayName ?? "Owner #" + owner.id}</small>}
          </div>
          <PetSelectWithQuickCreate
            owner={owner}
            patients={patients}
            setPatients={setPatients}
            form={form}
            setForm={setForm}
            branchId={branchId}
            animalTypes={animalTypes}
            setFormError={setFormError}
          />
          <div className="mb-3">
            <label className="form-label">Priority</label>
            <select className="form-select" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              <option value="NORMAL">Normal</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
        </div>
      )}
      {step === 1 && (
        <div>
          <div className="mb-3">
            <label className="form-label">Service *</label>
            <select className="form-select" value={form.serviceId} onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))} required disabled={optionsLoading}>
              <option value="">{optionsLoading ? "Loading…" : "Select service"}</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Doctor</label>
            <select className="form-select" value={form.doctorId} onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value, slotStart: "", slotEnd: "" }))} disabled={optionsLoading}>
              <option value="">Any Available Doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.displayName}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Date *</label>
            <input
              type="date"
              className="form-control"
              value={form.date}
              min={todayYMD()}
              max={maxDateYMD()}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value, slotStart: "", slotEnd: "" }))}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Time slot *</label>
            {slotsLoading ? (
              <p className="text-muted small">Loading slots…</p>
            ) : (
              <SlotSelect
                value={form.slotStart}
                onChange={(start, end) => setForm((f) => ({ ...f, slotStart: start, slotEnd: end }))}
                filteredSlots={slots}
              />
            )}
          </div>
          <div className="mb-3">
            <label className="form-label">Notes</label>
            <textarea className="form-control" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="small">
          <p><strong>Patient:</strong> {owner?.profile?.displayName ?? "—"} | Pet: {form.petId && form.petId !== PET_ID_NEW ? (patients.find((p) => p.id === Number(form.petId))?.name ?? "—") : "—"}</p>
          <p><strong>Service:</strong> {selectedService?.name ?? "—"} | Doctor: {form.doctorId ? doctors.find((d) => d.id === Number(form.doctorId))?.displayName : "Any"}</p>
          <p><strong>Date:</strong> {form.date} | Time: {form.slotStart ? new Date(form.slotStart).toLocaleTimeString() : "—"}</p>
          <div className="mb-3 mt-2">
            <div className="form-check">
              <input type="radio" className="form-check-input" id="walkinPayLater" checked={!form.payNow} onChange={() => setForm((f) => ({ ...f, payNow: false }))} />
              <label className="form-check-label" htmlFor="walkinPayLater">Pay later</label>
            </div>
            <div className="form-check">
              <input type="radio" className="form-check-input" id="walkinPayNow" checked={form.payNow} onChange={() => setForm((f) => ({ ...f, payNow: true, amount: suggestedAmount || form.amount }))} />
              <label className="form-check-label" htmlFor="walkinPayNow">Pay now</label>
            </div>
            {form.payNow && (
              <>
                <select className="form-select form-select-sm mt-2" value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="DIGITAL">Digital</option>
                </select>
                <input type="number" className="form-control form-control-sm mt-2" step="0.01" min="0" placeholder={suggestedAmount} value={form.amount || suggestedAmount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </>
            )}
          </div>
        </div>
      )}
      <div className="modal-footer d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
        {step > 0 && <button type="button" className="btn btn-outline-primary" onClick={() => setStep((s) => s - 1)}>Back</button>}
        {step < 2 ? (
          <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !form.patientId}>
            Next
          </button>
        ) : (
          <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "…" : "Create"}</button>
        )}
      </div>
    </form>
  );
}

const FULL_STEPS = ["Visit type", "Patient", "Doctor & time", "Billing", "Confirm"];

function FullBookingForm({
  branchId,
  form,
  setForm,
  step,
  setStep,
  ownerQuery,
  setOwnerQuery,
  owner,
  setOwner,
  patients,
  setPatients,
  doctors,
  services,
  slots,
  slotsLoading,
  optionsLoading,
  searchOwner,
  ownerSearching,
  buildPayload,
  doCreate,
  submitting,
  setFormError,
  selectedService,
  suggestedAmount,
  SlotSelect,
  todayYMD,
  maxDateYMD,
  onClose,
  animalTypes,
}) {
  function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    const isAnyDoctor = !form.doctorId || form.doctorId === "any";
    if (!form.patientId) {
      setFormError("Please select a patient (Step 2: owner phone/email + Find).");
      return;
    }
    if (form.petId === PET_ID_NEW) {
      setFormError("Complete quick pet creation (name + type + Add Pet) or use “No pet / choose existing” in the Pet section.");
      return;
    }
    if (!form.serviceId || (!isAnyDoctor && !form.doctorId) || !form.date || !form.slotStart || !form.slotEnd) {
      setFormError("Please fill service, doctor (or Any), date and time slot.");
      return;
    }
    const slot = slots.find(
      (s) =>
        s.start &&
        new Date(s.start).toISOString() === form.slotStart &&
        s.end &&
        new Date(s.end).toISOString() === form.slotEnd
    );
    if (!slot) {
      setFormError("Please select a time slot from the list.");
      return;
    }
    const payload = buildPayload("STAFF", form.channel, form.visitType, form.visitType === "WALK_IN");
    doCreate(payload);
  }
  return (
    <form onSubmit={handleSubmit}>
      {step === 0 && (
        <div>
          <div className="mb-3">
            <label className="form-label">Visit type</label>
            <select className="form-select" value={form.visitType} onChange={(e) => setForm((f) => ({ ...f, visitType: e.target.value }))}>
              <option value="WALK_IN">Walk-in</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Channel</label>
            <select className="form-select" value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}>
              <option value="COUNTER">Counter</option>
              <option value="PHONE">Phone</option>
              <option value="ONLINE">Online</option>
              <option value="REFERRAL">Referral</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Priority</label>
            <select className="form-select" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              <option value="NORMAL">Normal</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
        </div>
      )}
      {step === 1 && (
        <div>
          <p className="text-muted small mb-2">Search by owner phone or email and click Find.</p>
          <div className="mb-3">
            <label className="form-label">Owner (phone or email) *</label>
            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control"
                placeholder="Phone or email"
                value={ownerQuery}
                onChange={(e) => {
                  setOwnerQuery(e.target.value);
                  setOwner(null);
                  setForm((f) => ({ ...f, patientId: "" }));
                }}
              />
              <button type="button" className="btn btn-outline-primary" onClick={searchOwner} disabled={ownerSearching}>
                {ownerSearching ? "…" : "Find"}
              </button>
            </div>
            {owner && <small className="text-success">{owner.profile?.displayName ?? "Owner #" + owner.id}</small>}
          </div>
          <PetSelectWithQuickCreate
            owner={owner}
            patients={patients}
            setPatients={setPatients}
            form={form}
            setForm={setForm}
            branchId={branchId}
            animalTypes={animalTypes}
            setFormError={setFormError}
          />
        </div>
      )}
      {step === 2 && (
        <div>
          <div className="mb-3">
            <label className="form-label">Service *</label>
            <select className="form-select" value={form.serviceId} onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))} required disabled={optionsLoading}>
              <option value="">{optionsLoading ? "Loading…" : "Select service"}</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Doctor</label>
            <select className="form-select" value={form.doctorId} onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value, slotStart: "", slotEnd: "" }))} disabled={optionsLoading}>
              <option value="">Any Available Doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.displayName}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Date *</label>
            <input
              type="date"
              className="form-control"
              value={form.date}
              min={todayYMD()}
              max={maxDateYMD()}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value, slotStart: "", slotEnd: "" }))}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Time slot *</label>
            {slotsLoading ? (
              <p className="text-muted small">Loading slots…</p>
            ) : (
              <SlotSelect
                value={form.slotStart}
                onChange={(start, end) => setForm((f) => ({ ...f, slotStart: start, slotEnd: end }))}
                filteredSlots={slots}
              />
            )}
          </div>
          <div className="mb-3">
            <label className="form-label">Notes</label>
            <textarea className="form-control" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      )}
      {step === 3 && (
        <div>
          <div className="mb-3">
            <div className="form-check">
              <input type="radio" className="form-check-input" id="fullPayLater" checked={!form.payNow} onChange={() => setForm((f) => ({ ...f, payNow: false }))} />
              <label className="form-check-label" htmlFor="fullPayLater">Pay later</label>
            </div>
            <div className="form-check">
              <input type="radio" className="form-check-input" id="fullPayNow" checked={form.payNow} onChange={() => setForm((f) => ({ ...f, payNow: true, amount: suggestedAmount || form.amount }))} />
              <label className="form-check-label" htmlFor="fullPayNow">Pay now</label>
            </div>
            {form.payNow && (
              <>
                <div className="mb-3 mt-2">
                  <label className="form-label">Payment method</label>
                  <select className="form-select" value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="DIGITAL">Digital</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Amount</label>
                  <input type="number" className="form-control" step="0.01" min="0" value={form.amount || suggestedAmount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder={suggestedAmount} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {step === 4 && (
        <div className="small">
          <p><strong>Visit:</strong> {form.visitType} / {form.channel} / {form.priority}</p>
          <p><strong>Patient:</strong> {owner?.profile?.displayName ?? "—"} | Pet: {form.petId && form.petId !== PET_ID_NEW ? (patients.find((p) => p.id === Number(form.petId))?.name ?? "—") : "—"}</p>
          <p><strong>Service:</strong> {selectedService?.name ?? "—"} | Doctor: {form.doctorId ? doctors.find((d) => d.id === Number(form.doctorId))?.displayName : "Any"}</p>
          <p><strong>Date:</strong> {form.date} | Time: {form.slotStart ? new Date(form.slotStart).toLocaleTimeString() : "—"}</p>
          <p><strong>Payment:</strong> {form.payNow ? `Pay now (${form.paymentMethod}) ${form.amount || suggestedAmount}` : "Pay later"}</p>
        </div>
      )}
      <div className="modal-footer d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
        {step > 0 && step < 4 && <button type="button" className="btn btn-outline-primary" onClick={() => setStep((s) => s - 1)}>Back</button>}
        {step < 4 ? (
          <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !form.patientId}>
            Next
          </button>
        ) : (
          <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "…" : "Create"}</button>
        )}
      </div>
    </form>
  );
}

function RescheduleModal({ branchId, appointment, onClose, onSuccess }) {
  const [doctors, setDoctors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [doctorId, setDoctorId] = useState(appointment?.doctorId ?? "");
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!branchId) return;
    staffClinicDoctors(branchId).then((d) => setDoctors(Array.isArray(d) ? d : []));
  }, [branchId]);

  useEffect(() => {
    if (!date || !branchId) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    staffClinicSlots(branchId, {
      date,
      doctorId: doctorId ? Number(doctorId) : undefined,
    })
      .then((s) => setSlots(Array.isArray(s) ? s : []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [branchId, date, doctorId]);

  const isTodayReschedule = date === new Date().toISOString().split("T")[0];
  const now = new Date();
  const slotsFilteredReschedule = isTodayReschedule
    ? slots.filter((s) => s.end && new Date(s.end) > now)
    : slots;

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!slotStart || !slotEnd) {
      setFormError("Please select a time slot.");
      return;
    }
    setSubmitting(true);
    try {
      await onSuccess({
        scheduledStartAt: slotStart,
        scheduledEndAt: slotEnd,
        doctorId: doctorId ? Number(doctorId) : undefined,
      });
      // Parent closes modal via setRescheduleApt(null)
    } catch (_) {
      // Error shown by parent
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Reschedule appointment #{appointment?.id}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {formError && <div className="alert alert-danger py-2">{formError}</div>}
              <div className="mb-3">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSlotStart("");
                    setSlotEnd("");
                  }}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Doctor (optional)</label>
                <select
                  className="form-select"
                  value={doctorId}
                  onChange={(e) => {
                    setDoctorId(e.target.value);
                    setSlotStart("");
                    setSlotEnd("");
                  }}
                >
                  <option value="">Any</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Time slot</label>
                {slotsLoading ? (
                  <p className="text-muted small">Loading slots…</p>
                ) : (
                  <select
                    className="form-select"
                    value={slotStart && slotsFilteredReschedule.some((s) => s.start && new Date(s.start).toISOString() === slotStart) ? slotStart : ""}
                    onChange={(e) => {
                      const iso = e.target.value;
                      const s = slotsFilteredReschedule.find((x) => x.start && new Date(x.start).toISOString() === iso);
                      if (s?.start != null && s?.end != null) {
                        setSlotStart(new Date(s.start).toISOString());
                        setSlotEnd(new Date(s.end).toISOString());
                      }
                    }}
                  >
                    <option value="">Select</option>
                    {slotsFilteredReschedule.map((s) => {
                      const iso = s.start ? new Date(s.start).toISOString() : "";
                      return (
                        <option key={iso || "s"} value={iso}>
                          {s.start && new Date(s.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {" – "}
                          {s.end && new Date(s.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "…" : "Reschedule"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function PayNowModal({ branchId, appointment, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const servicePrice = appointment?.service?.price != null ? Number(appointment.service.price) : 0;
  useEffect(() => {
    if (!amount && servicePrice) setAmount(String(servicePrice));
  }, [servicePrice]);
  async function handlePay() {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount"); return; }
    setSubmitting(true);
    setError("");
    try {
      await staffClinicAppointmentCollectPayment(branchId, appointment.id, { amount: amt, method });
      onSuccess();
    } catch (e) {
      setError(e?.message || "Payment failed");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Collect payment — #{appointment?.id}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body">
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <p className="small">Patient: {appointment?.patient?.profile?.displayName ?? "—"} | Service: {appointment?.service?.name ?? "—"}</p>
            <div className="mb-3">
              <label className="form-label">Amount</label>
              <input type="number" className="form-control" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={servicePrice} />
            </div>
            <div className="mb-3">
              <label className="form-label">Method</label>
              <select className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="UPI">UPI</option>
                <option value="DIGITAL">Digital</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handlePay} disabled={submitting}>{submitting ? "…" : "Collect & close"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlipPrintModal({ branchId, appointmentId, type, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!branchId || !appointmentId) return;
    setLoading(true);
    const fn = type === "payment" ? staffClinicAppointmentPaymentSlip : staffClinicAppointmentSlip;
    fn(branchId, appointmentId)
      .then(setData)
      .catch((e) => setError(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [branchId, appointmentId, type]);
  function doPrint() {
    const el = document.getElementById("slip-content");
    if (el) {
      const win = window.open("", "_blank");
      win.document.write(`
        <html><head><title>${type === "payment" ? "Payment" : "Appointment"} slip</title>
        <style>body{font-family:monospace;padding:12px;max-width:320px;} .row{display:flex;justify-content:space-between;} hr{margin:8px 0;}
        </style></head><body>${el.innerHTML}</body></html>`);
      win.document.close();
      win.print();
      win.close();
    }
  }
  return (
    <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{type === "payment" ? "Payment slip" : "Appointment slip"}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body">
            {loading && <p className="text-muted">Loading…</p>}
            {error && <div className="alert alert-danger py-2">{error}</div>}
            {data && (
              <div id="slip-content" className="slip-thermal">
                {type === "payment" ? (
                  <>
                    <div><strong>Payment slip</strong></div>
                    <hr />
                    <div className="row"><span>Appointment #</span><span>{data.appointmentId}</span></div>
                    <div className="row"><span>Token</span><span>{data.tokenNo ?? "—"}</span></div>
                    <div className="row"><span>Patient</span><span>{data.patientName}</span></div>
                    <div className="row"><span>Pet</span><span>{data.petName}</span></div>
                    <div className="row"><span>Service</span><span>{data.serviceName}</span></div>
                    <div className="row"><span>Amount</span><span>{data.paidAmount}</span></div>
                    <div className="row"><span>Method</span><span>{data.paymentMethod}</span></div>
                    <div className="row"><span>Paid at</span><span>{data.paidAt ? new Date(data.paidAt).toLocaleString() : ""}</span></div>
                  </>
                ) : (
                  <>
                    <div><strong>Appointment slip</strong></div>
                    <hr />
                    <div className="row"><span>ID / Token</span><span>{data.appointmentId} {data.tokenNo ? ` / ${data.tokenNo}` : ""}</span></div>
                    <div className="row"><span>Patient</span><span>{data.patientName}</span></div>
                    <div className="row"><span>Pet</span><span>{data.petName ?? "—"}</span></div>
                    <div className="row"><span>Doctor</span><span>{data.doctorName}</span></div>
                    <div className="row"><span>Service</span><span>{data.serviceName}</span></div>
                    <div className="row"><span>Date / Time</span><span>{data.scheduledStartAt ? new Date(data.scheduledStartAt).toLocaleString() : ""}</span></div>
                    <div className="row"><span>Payment</span><span>{data.paymentStatus ?? "UNPAID"}</span></div>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Close</button>
            {data && <button type="button" className="btn btn-primary" onClick={doPrint}>Print</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompleteIntakeModal({ branchId, appointment, onClose, onSuccess, onCheckIn }) {
  const [step, setStep] = useState(0);
  const [ownerQuery, setOwnerQuery] = useState(appointment?.mobileSnapshot ?? "");
  const [linkedOwner, setLinkedOwner] = useState(appointment?.patient ?? null);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [patients, setPatients] = useState([]);
  const [petId, setPetId] = useState(appointment?.petId ? String(appointment.petId) : "");
  const [doctorId, setDoctorId] = useState(appointment?.doctorId ? String(appointment.doctorId) : "");
  const [doctors, setDoctors] = useState([]);
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!branchId) return;
    staffClinicDoctors(branchId).then((d) => setDoctors(Array.isArray(d) ? d : []));
  }, [branchId]);

  useEffect(() => {
    if (!linkedOwner?.id || !branchId) { setPatients([]); return; }
    staffClinicPatientsList(branchId, { ownerId: linkedOwner.id, limit: 50 }).then((res) =>
      setPatients(Array.isArray(res?.patients) ? res.patients : [])
    );
  }, [branchId, linkedOwner?.id]);

  async function searchOwner() {
    if (!ownerQuery.trim() || !branchId) return;
    setOwnerSearching(true);
    setError("");
    try {
      const o = await staffClinicOwnerLookup(branchId, ownerQuery.trim());
      setLinkedOwner(o || null);
      if (o?.id) {
        const res = await staffClinicPatientsList(branchId, { ownerId: o.id, limit: 50 });
        setPatients(Array.isArray(res?.patients) ? res.patients : []);
      } else setPatients([]);
    } catch {
      setLinkedOwner(null);
      setPatients([]);
      setError("Owner not found.");
    } finally {
      setOwnerSearching(false);
    }
  }

  async function handlePromote() {
    if (!linkedOwner?.id) { setError("Link owner first (Step 1)."); return; }
    setSubmitting(true);
    setError("");
    try {
      await staffClinicAppointmentPromote(branchId, appointment.id, {
        patientId: linkedOwner.id,
        petId: petId ? Number(petId) : null,
        doctorId: doctorId ? Number(doctorId) : undefined,
        notes: notes || undefined,
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e?.message || "Promote failed");
    } finally {
      setSubmitting(false);
    }
  }

  const a = appointment;
  const displayOwner = a?.ownerNameSnapshot ?? a?.patient?.profile?.displayName ?? "—";
  const displayPet = a?.petNameSnapshot ?? a?.pet?.name ?? "—";
  const displayMobile = a?.mobileSnapshot ?? "—";

  return (
    <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1}>
      <div className="modal-dialog modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Complete intake — #{a?.id}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body">
            {error && <div className="alert alert-danger py-2 small">{error}</div>}
            <p className="small text-muted">Snapshot: {displayOwner} | {displayMobile} | Pet: {displayPet}</p>

            {step === 0 && (
              <div>
                <label className="form-label">Mobile (find owner)</label>
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="form-control"
                    value={ownerQuery}
                    onChange={(e) => setOwnerQuery(e.target.value)}
                    placeholder="Phone or email"
                  />
                  <button type="button" className="btn btn-outline-primary" onClick={searchOwner} disabled={ownerSearching}>
                    {ownerSearching ? "…" : "Find"}
                  </button>
                </div>
                {linkedOwner && <span className="badge bg-success mt-2">Owner: {linkedOwner.profile?.displayName ?? linkedOwner.id}</span>}
              </div>
            )}

            {step === 1 && (
              <div>
                <label className="form-label">Pet</label>
                <select className="form-select" value={petId} onChange={(e) => setPetId(e.target.value)}>
                  <option value="">—</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{formatPetLabel(p)}</option>
                  ))}
                </select>
                {patients.length === 0 && linkedOwner && <small className="text-muted">No pets. You can promote without pet and add later.</small>}
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="mb-2">
                  <label className="form-label">Doctor (optional)</label>
                  <select className="form-select" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                    <option value="">Any</option>
                    {doctors.map((d) => <option key={d.id} value={d.id}>{d.displayName}</option>)}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label">Notes</label>
                  <textarea className="form-control" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <button type="button" className="btn btn-primary w-100" onClick={handlePromote} disabled={submitting}>
                  {submitting ? "…" : "Promote to Booked"}
                </button>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
            {step > 0 && <button type="button" className="btn btn-outline-primary" onClick={() => setStep((s) => s - 1)}>Back</button>}
            {step < 2 && (
              <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !linkedOwner}>
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssignDoctorModal({ branchId, appointment, onClose, onSuccess }) {
  const [doctors, setDoctors] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!branchId) return;
    staffClinicDoctors(branchId).then((d) => setDoctors(Array.isArray(d) ? d : []));
  }, [branchId]);
  async function handleAssign() {
    if (!selectedId) { setError("Select a doctor"); return; }
    setSubmitting(true);
    setError("");
    try {
      await staffClinicAppointmentAssignDoctor(branchId, appointment.id, Number(selectedId));
      onSuccess();
    } catch (e) {
      setError(e?.message || "Assign failed");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Assign doctor — appointment #{appointment?.id}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body">
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <p className="small">Patient: {appointment?.patient?.profile?.displayName ?? "—"} | Service: {appointment?.service?.name ?? "—"}</p>
            <div className="mb-3">
              <label className="form-label">Select doctor</label>
              <select className="form-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                <option value="">—</option>
                {doctors.map((d) => <option key={d.id} value={d.id}>{d.displayName}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleAssign} disabled={submitting}>{submitting ? "…" : "Assign"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
