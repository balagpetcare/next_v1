"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicAppointmentsListV2,
  staffClinicAppointmentStats,
  staffClinicAppointmentDoctorStats,
  staffClinicAppointmentServiceStats,
  staffClinicAppointmentExport,
  staffClinicAppointmentGet,
  staffClinicAppointmentCheckIn,
  staffClinicAppointmentEnqueue,
  staffClinicAppointmentCancel,
  staffClinicAppointmentNoShow,
  staffClinicAppointmentReschedule,
  staffAppointmentConfirm,
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
  staffClinicEnsureOwner,
  staffClinicPatientsList,
  staffClinicPatientRegister,
} from "@/lib/api";
import {
  canCheckIn,
  canConfirm,
  canCancel,
  canNoShow,
  canReschedule,
  canCompleteIntake,
  canEnqueue,
  isInActiveQueue,
  canOpenVisit,
} from "@/lib/appointmentStatusHelpers";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace } from "@/src/components/dashboard";
import AppointmentSummaryCards from "@/src/components/clinic/AppointmentSummaryCards";
import AppointmentFilterBar from "@/src/components/clinic/AppointmentFilterBar";
import AppointmentDetailDrawer from "@/src/components/clinic/AppointmentDetailDrawer";
import DoctorWorkloadPanel from "@/src/components/clinic/DoctorWorkloadPanel";
import ServiceBreakdownPanel from "@/src/components/clinic/ServiceBreakdownPanel";
import CreateAppointmentWizard from "./_components/CreateAppointmentWizard";
import CreateAppointmentModal from "./_components/CreateAppointmentModal";
import QuickAppointmentModal from "./_components/QuickAppointmentModal";
import RescheduleModal from "./_components/RescheduleModal";
import PayNowModal from "./_components/PayNowModal";
import SlipPrintModal from "./_components/SlipPrintModal";
import AssignDoctorModal from "./_components/AssignDoctorModal";
import CompleteIntakeModal from "./_components/CompleteIntakeModal";
import StatusBadge from "@/src/components/dashboard/StatusBadge";
import { PaginationBar } from "@/src/components/common/PaginationBar";

const APPOINTMENTS_PERMS = ["clinic.appointments.read", "clinic.appointments.manage"];

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function maxDateYMD() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function StaffBranchClinicAppointmentsPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const promoteAppointmentId = useMemo(() => {
    const p = searchParams?.get("promote");
    if (p == null) return null;
    const n = parseInt(p, 10);
    return Number.isFinite(n) ? n : null;
  }, [searchParams]);
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
  const [showQuickModal, setShowQuickModal] = useState(false);
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

  const refreshAll = useCallback(async () => {
    await Promise.all([loadAppointments(), loadStats(), loadDoctorStats(), loadServiceStats()]);
  }, [loadAppointments, loadStats, loadDoctorStats, loadServiceStats]);

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

  // Open Complete intake modal when URL has ?promote=<appointmentId> (e.g. from intake page when owner/pet missing)
  useEffect(() => {
    if (!branchId || !promoteAppointmentId) return;
    const list = searchResults?.items ?? appointments;
    const inList = list.find((a) => a.id === promoteAppointmentId);
    const openModal = (apt) => {
      setCompleteIntakeApt(apt);
      const q = new URLSearchParams(searchParams?.toString() ?? "");
      q.delete("promote");
      const next = q.toString() ? `${pathname}?${q}` : pathname;
      if (pathname) router.replace(next);
    };
    if (inList) {
      openModal(inList);
      return;
    }
    staffClinicAppointmentGet(branchId, promoteAppointmentId)
      .then((apt) => { if (apt) openModal(apt); })
      .catch(() => {});
  }, [branchId, promoteAppointmentId, appointments, searchResults?.items, pathname, router, searchParams]);

  async function handleCheckIn(appointmentId) {
    if (!branchId || !canManage) return;
    setActioningId(appointmentId);
    setError("");
    try {
      await staffClinicAppointmentCheckIn(branchId, appointmentId);
      await refreshAll();
    } catch (e) {
      const msg = e?.message || "Check-in failed";
      const isSnapshotOnly = msg.includes("Link owner and pet") || msg.includes("Promote the appointment first");
      setError(isSnapshotOnly ? `${msg} Use the "Complete intake" action for this appointment to link owner & pet, then try check-in again.` : msg);
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
      await refreshAll();
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
      await refreshAll();
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
      await refreshAll();
    } catch (e) {
      setError(e?.message || "Reschedule failed");
      throw e;
    } finally {
      setActioningId(null);
    }
  }

  async function handleEnqueue(appointmentId) {
    if (!branchId || !canManage) return;
    setActioningId(appointmentId);
    setError("");
    try {
      await staffClinicAppointmentEnqueue(branchId, appointmentId);
      await refreshAll();
    } catch (e) {
      setError(e?.message || "Enqueue failed — appointment must be checked in first");
    } finally {
      setActioningId(null);
    }
  }

  async function handleConfirm(appointmentId) {
    if (!branchId || !canManage) return;
    setActioningId(appointmentId);
    setError("");
    try {
      await staffAppointmentConfirm(branchId, appointmentId);
      await refreshAll();
    } catch (e) {
      setError(e?.message || "Confirm failed");
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

  const isUnpaid = (a) => (a.paymentStatus || "UNPAID") !== "PAID" && (a.paymentStatus || "UNPAID") !== "WAIVED";
  const isAnyDoctorUnassigned = (a) => !!a.isAnyDoctor && (a.doctorId == null || !a.doctor);

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
        missingPerm="clinic.appointments.read"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic`)}
      />
    );
  }

  return (
    <PageWorkspace>
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
              onQuickAppointment={canManage ? () => setShowQuickModal(true) : undefined}
              onOpenWizard={canManage ? () => router.push(`/staff/branch/${branchId}/clinic/appointments/new`) : undefined}
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
                                {status === "IN_QUEUE" ? "In Queue" : 
                                 status === "CALLED" ? "Called" : 
                                 status === "IN_CONSULT" ? "In Treatment" :
                                 intakeStatus === "COMPLETE" ? "Complete" : 
                                 intakeStatus === "PARTIAL" ? "Partial" : "—"}
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
                                    <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setCompleteIntakeApt(a)} disabled={acting}>Complete intake</button>
                                  )}
                                  {canConfirm(status) && (
                                    <button type="button" className="btn btn-outline-info btn-sm" onClick={() => handleConfirm(a.id)} disabled={acting}>{acting ? "…" : "Confirm"}</button>
                                  )}
                                  {canCheckIn(status) && a.patientId && a.petId && (
                                    <button type="button" className="btn btn-success btn-sm" onClick={() => handleCheckIn(a.id)} disabled={acting}>{acting ? "…" : "Check-in"}</button>
                                  )}
                                  {canCheckIn(status) && (!a.patientId || !a.petId) && (
                                    <span className="badge bg-warning text-dark ms-1" title="Link owner & pet via Intake page first">Link first</span>
                                  )}
                                  {canNoShow(status) && (
                                    <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => handleNoShow(a.id)} disabled={acting}>No-show</button>
                                  )}
                                  {/* Post-check-in actions: queue and visit navigation */}
                                  {canEnqueue(status) && (
                                    <button type="button" className="btn btn-outline-info btn-sm" onClick={() => handleEnqueue(a.id)} disabled={acting} title="Move to queue (IN_QUEUE)">{acting ? "…" : "Add to Queue"}</button>
                                  )}
                                  {isInActiveQueue(status) && (
                                    <Link href={`/staff/branch/${branchId}/clinic/queue`} className="btn btn-outline-secondary btn-sm" onClick={(e) => e.stopPropagation()} title="Go to queue console">Queue ↗</Link>
                                  )}
                                  {canOpenVisit(status) && a.visitId && (
                                    <Link href={`/staff/branch/${branchId}/clinic/visits/${a.visitId}`} className="btn btn-outline-primary btn-sm" onClick={(e) => e.stopPropagation()}>Visit ↗</Link>
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
                  <PaginationBar
                    page={page + 1}
                    pageSize={limit}
                    total={total}
                    totalPages={Math.max(1, Math.ceil(total / limit))}
                    disabled={false}
                    onPageChange={(p) => setPage(p - 1)}
                    className="mt-2 pt-2 border-top"
                    ariaLabel="Appointments pages"
                    endBeforeNav={
                      <label className="d-flex align-items-center gap-1 small text-muted mb-0">
                        <span className="text-nowrap">Per page</span>
                        <select
                          className="form-select form-select-sm"
                          style={{ width: 80 }}
                          value={limit}
                          onChange={(e) => {
                            setLimit(Number(e.target.value));
                            setPage(0);
                          }}
                        >
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </label>
                    }
                  />
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
        onCompleteDetails={(apt) => {
          setDetailAppointmentId(null);
          setCompleteIntakeApt(apt);
        }}
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
            refreshAll();
          }}
        />
      )}

      {showQuickModal && (
        <QuickAppointmentModal
          branchId={branchId}
          onClose={() => setShowQuickModal(false)}
          onSuccess={() => {
            setShowQuickModal(false);
            refreshAll();
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
                    refreshAll();
                    toast.success("Appointment created.");
                  }}
                  onCancel={() => setShowWizard(false)}
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
          onSuccess={() => { setPayModalApt(null); refreshAll(); setSearchResults(null); }}
          onRefreshList={loadAppointments}
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
          onSuccess={() => { setAssignDoctorApt(null); refreshAll(); setSearchResults(null); }}
          onRefreshList={loadAppointments}
        />
      )}

      {completeIntakeApt && (
        <CompleteIntakeModal
          branchId={branchId}
          appointment={completeIntakeApt}
          onClose={() => setCompleteIntakeApt(null)}
          onSuccess={() => { setCompleteIntakeApt(null); refreshAll(); setSearchResults(null); }}
          onCheckIn={handleCheckIn}
        />
      )}
    </PageWorkspace>
  );
}

