"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicAppointmentGet,
  staffClinicIntakeGet,
  staffClinicIntakeUpsert,
  staffClinicAppointmentPromote,
  staffClinicAppointmentEnqueue,
} from "@/lib/api";
import { canEnqueue } from "@/lib/appointmentStatusHelpers";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace } from "@/src/components/dashboard";
import { PRIMARY_NOT_FOUND } from "@/lib/clinicNotFoundHelpers";
import { staffClinicPatientRegisterPath } from "@/lib/staffClinicPatientRoutes";
import {
  celsiusToFahrenheitInputString,
  fahrenheitInputToStoredCelsius,
} from "@/lib/temperature";

const INTAKE_STATUS_BADGES = {
  NOT_STARTED: "secondary",
  PARTIAL: "warning",
  COMPLETE: "success",
};

const SYMPTOM_OPTIONS = [
  { value: "VOMITING", label: "Vomiting" },
  { value: "DIARRHEA", label: "Diarrhea" },
  { value: "LOSS_OF_APPETITE", label: "Loss of appetite" },
  { value: "LETHARGY", label: "Lethargy" },
  { value: "COUGHING_SNEEZING", label: "Coughing/Sneezing" },
  { value: "ITCHING", label: "Itching" },
  { value: "FEVER", label: "Fever" },
  { value: "LIMPING", label: "Limping" },
  { value: "URINARY_ISSUES", label: "Urinary issues" },
  { value: "SKIN_LESION", label: "Skin lesion" },
];

export default function StaffClinicIntakePage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  // Route param [appointmentId] is the single source of truth. Query param is fallback only when route is missing/invalid; never let query override route.
  const appointmentId = useMemo(() => {
    const fromRoute = params?.appointmentId;
    if (fromRoute != null && fromRoute !== "") {
      const n = Number(fromRoute);
      if (Number.isFinite(n)) return n;
    }
    const fromQuery = searchParams?.get("appointmentId");
    if (fromQuery != null) {
      const n = parseInt(String(fromQuery), 10);
      if (Number.isFinite(n)) return n;
    }
    return null;
  }, [params, searchParams]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const [appointment, setAppointment] = useState(null);
  const [intake, setIntake] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [intakeLoadError, setIntakeLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [registeredSuccessMessage, setRegisteredSuccessMessage] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState("");
  const [enqueueing, setEnqueueing] = useState(false);
  const [enqueueError, setEnqueueError] = useState("");
  const [intakeRetrying, setIntakeRetrying] = useState(false);
  const postRegisterPromoteDoneRef = useRef(false);

  const registeredFromUrl = searchParams?.get("registered") === "1";
  const ownerIdFromUrl = useMemo(() => {
    const v = searchParams?.get("ownerId");
    if (v == null) return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }, [searchParams]);
  const petIdFromUrl = useMemo(() => {
    const v = searchParams?.get("petId");
    if (v == null) return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }, [searchParams]);
  const appointmentIdFromUrl = useMemo(() => {
    const v = searchParams?.get("appointmentId");
    if (v == null) return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }, [searchParams]);
  const [form, setForm] = useState({
    chiefComplaint: "",
    complaintDuration: "",
    complaintOnset: "",
    symptoms: [],
    additionalSymptoms: "",
    weightKg: "",
    tempF: "",
    heartRate: "",
    respRate: "",
    hydrationStatus: "",
    dietType: "",
    waterIntake: "",
    livingEnvironment: "",
    otherAnimals: false,
    pastIllnesses: "",
    currentMedications: "",
    knownAllergies: "",
    vaccineStatus: "",
    dewormingStatus: "",
    isEmergency: false,
    emergencyType: "",
    isAggressive: false,
    infectiousSuspicion: false,
    isolationNeeded: false,
    riskNotes: "",
  });

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const canManage = permissions.includes("clinic.appointments.manage");

  // Load appointment first; owner/patient binding is separate (promote effect). Never couple fetch to query params.
  const load = useCallback(async () => {
    if (!branchId || appointmentId == null || !Number.isFinite(appointmentId)) {
      setLoading(false);
      setAppointment(null);
      setIntake(null);
      setIntakeLoadError("");
      if (branchId && (appointmentId == null || !Number.isFinite(appointmentId))) {
        setError("Invalid appointment ID in URL.");
      } else {
        setError("");
      }
      return;
    }
    setLoading(true);
    setError("");
    setPromoteError("");
    setIntakeLoadError("");
    // Load appointment first; intake separately. Only show "Appointment not found" when appointment fetch truly fails.
    let apt = null;
    try {
      apt = await staffClinicAppointmentGet(branchId, appointmentId);
      setAppointment(apt ?? null);
    } catch {
      setAppointment(null);
      setIntake(null);
      setIntakeLoadError("");
      setError(PRIMARY_NOT_FOUND.appointment);
      setLoading(false);
      return;
    }
    try {
      const inq = await staffClinicIntakeGet(branchId, appointmentId);
      setIntakeLoadError("");
      const i = inq && inq.intake === null ? null : inq && (inq.id != null || inq.appointmentId != null) ? inq : null;
      setIntake(i ?? null);
      if (i) {
        const rf = (i.riskFlagsJson && typeof i.riskFlagsJson === "object") ? i.riskFlagsJson : {};
        const feed = (i.feedingJson && typeof i.feedingJson === "object") ? i.feedingJson : {};
        const hist = (i.historyJson && typeof i.historyJson === "object") ? i.historyJson : {};
        const sym = Array.isArray(i.symptomsJson) ? i.symptomsJson : [];
        setForm({
          chiefComplaint: i.chiefComplaint ?? "",
          complaintDuration: i.complaintDuration ?? "",
          complaintOnset: i.complaintOnset ?? "",
          symptoms: sym,
          additionalSymptoms: i.additionalSymptoms ?? "",
          weightKg: i.weightKg != null ? String(i.weightKg) : "",
          tempF: celsiusToFahrenheitInputString(i.tempC),
          heartRate: i.heartRate != null ? String(i.heartRate) : "",
          respRate: i.respRate != null ? String(i.respRate) : "",
          hydrationStatus: i.hydrationStatus ?? "",
          dietType: feed.dietType ?? "",
          waterIntake: feed.waterIntake ?? "",
          livingEnvironment: feed.livingEnvironment ?? "",
          otherAnimals: !!feed.otherAnimals,
          pastIllnesses: hist.pastIllnesses ?? "",
          currentMedications: hist.currentMedications ?? "",
          knownAllergies: hist.knownAllergies ?? "",
          vaccineStatus: hist.vaccineStatus ?? "",
          dewormingStatus: hist.dewormingStatus ?? "",
          isEmergency: !!rf.isEmergency,
          emergencyType: rf.emergencyType ?? "",
          isAggressive: !!rf.isAggressive,
          infectiousSuspicion: !!rf.infectiousSuspicion,
          isolationNeeded: !!rf.isolationNeeded,
          riskNotes: rf.notes ?? "",
        });
      }
    } catch (e) {
      setIntake(null);
      setIntakeLoadError(e?.message || "Failed to load intake data.");
    } finally {
      setLoading(false);
    }
  }, [branchId, appointmentId]);

  // Retry intake fetch only (appointment already loaded). Safe when appointment exists.
  const loadIntakeOnly = useCallback(async () => {
    if (!branchId || appointmentId == null || !Number.isFinite(appointmentId) || !appointment) return;
    setIntakeRetrying(true);
    setIntakeLoadError("");
    try {
      const inq = await staffClinicIntakeGet(branchId, appointmentId);
      setIntakeLoadError("");
      const i = inq && inq.intake === null ? null : inq && (inq.id != null || inq.appointmentId != null) ? inq : null;
      setIntake(i ?? null);
      if (i) {
        const rf = (i.riskFlagsJson && typeof i.riskFlagsJson === "object") ? i.riskFlagsJson : {};
        const feed = (i.feedingJson && typeof i.feedingJson === "object") ? i.feedingJson : {};
        const hist = (i.historyJson && typeof i.historyJson === "object") ? i.historyJson : {};
        const sym = Array.isArray(i.symptomsJson) ? i.symptomsJson : [];
        setForm({
          chiefComplaint: i.chiefComplaint ?? "",
          complaintDuration: i.complaintDuration ?? "",
          complaintOnset: i.complaintOnset ?? "",
          symptoms: sym,
          additionalSymptoms: i.additionalSymptoms ?? "",
          weightKg: i.weightKg != null ? String(i.weightKg) : "",
          tempF: celsiusToFahrenheitInputString(i.tempC),
          heartRate: i.heartRate != null ? String(i.heartRate) : "",
          respRate: i.respRate != null ? String(i.respRate) : "",
          hydrationStatus: i.hydrationStatus ?? "",
          dietType: feed.dietType ?? "",
          waterIntake: feed.waterIntake ?? "",
          livingEnvironment: feed.livingEnvironment ?? "",
          otherAnimals: !!feed.otherAnimals,
          pastIllnesses: hist.pastIllnesses ?? "",
          currentMedications: hist.currentMedications ?? "",
          knownAllergies: hist.knownAllergies ?? "",
          vaccineStatus: hist.vaccineStatus ?? "",
          dewormingStatus: hist.dewormingStatus ?? "",
          isEmergency: !!rf.isEmergency,
          emergencyType: rf.emergencyType ?? "",
          isAggressive: !!rf.isAggressive,
          infectiousSuspicion: !!rf.infectiousSuspicion,
          isolationNeeded: !!rf.isolationNeeded,
          riskNotes: rf.notes ?? "",
        });
      }
    } catch (e) {
      setIntake(null);
      setIntakeLoadError(e?.message || "Failed to load intake data.");
    } finally {
      setIntakeRetrying(false);
    }
  }, [branchId, appointmentId, appointment]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-promote after registration return: bind owner/pet to appointment. Run only after appointment has loaded so we don't call promote for a missing/different-branch appointment.
  useEffect(() => {
    if (!branchId || appointmentId == null || !Number.isFinite(appointmentId) || !registeredFromUrl) return;
    if (ownerIdFromUrl == null || ownerIdFromUrl < 1 || !Number.isFinite(ownerIdFromUrl)) return;
    if (!appointment) return; // wait for appointment to load first
    if (postRegisterPromoteDoneRef.current) return;
    postRegisterPromoteDoneRef.current = true;
    setPromoting(true);
    staffClinicAppointmentPromote(branchId, appointmentId, {
      patientId: ownerIdFromUrl,
      petId: petIdFromUrl != null && Number.isFinite(petIdFromUrl) && petIdFromUrl > 0 ? petIdFromUrl : null,
    })
      .then(() => {
        setPromoteError("");
        setRegisteredSuccessMessage(true);
        const q = new URLSearchParams(searchParams?.toString() ?? "");
        q.delete("registered");
        q.delete("ownerId");
        q.delete("petId");
        q.delete("appointmentId");
        const next = q.toString() ? `${pathname}?${q}` : pathname ?? `/staff/branch/${branchId}/clinic/intake/${appointmentId}`;
        router.replace(next);
        load();
      })
      .catch((e) => {
        postRegisterPromoteDoneRef.current = false;
        setPromoteError(e?.message || "Failed to link owner to appointment.");
      })
      .finally(() => setPromoting(false));
  }, [branchId, appointmentId, appointment, registeredFromUrl, ownerIdFromUrl, petIdFromUrl, pathname, searchParams, router, load]);

  async function handleEnqueue() {
    if (!branchId || !appointmentId || !canManage) return;
    setEnqueueing(true);
    setEnqueueError("");
    try {
      await staffClinicAppointmentEnqueue(branchId, appointmentId);
      await load();
    } catch (e) {
      setEnqueueError(e?.message || "Failed to add to queue");
    } finally {
      setEnqueueing(false);
    }
  }

  async function handleSave() {
    if (!branchId || !appointmentId || !canManage) return;
    setSaving(true);
    setError("");
    try {
      const feedingJson =
        form.dietType || form.waterIntake || form.livingEnvironment || form.otherAnimals
          ? {
              dietType: form.dietType || null,
              waterIntake: form.waterIntake || null,
              livingEnvironment: form.livingEnvironment || null,
              otherAnimals: form.otherAnimals,
            }
          : null;
      const historyJson =
        form.pastIllnesses ||
        form.currentMedications ||
        form.knownAllergies ||
        form.vaccineStatus ||
        form.dewormingStatus
          ? {
              pastIllnesses: form.pastIllnesses || "",
              currentMedications: form.currentMedications || "",
              knownAllergies: form.knownAllergies || "",
              vaccineStatus: form.vaccineStatus || "",
              dewormingStatus: form.dewormingStatus || "",
            }
          : null;
      const riskFlagsJson = {
        isEmergency: form.isEmergency,
        emergencyType: form.isEmergency ? form.emergencyType || null : null,
        isAggressive: form.isAggressive,
        infectiousSuspicion: form.infectiousSuspicion,
        isolationNeeded: form.isolationNeeded,
        notes: form.riskNotes || "",
      };
      await staffClinicIntakeUpsert(branchId, appointmentId, {
        chiefComplaint: form.chiefComplaint || null,
        complaintDuration: form.complaintDuration || null,
        complaintOnset: form.complaintOnset || null,
        symptomsJson: form.symptoms.length ? form.symptoms : null,
        additionalSymptoms: form.additionalSymptoms || null,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : null,
        tempC: fahrenheitInputToStoredCelsius(form.tempF),
        heartRate: form.heartRate ? parseInt(form.heartRate, 10) : null,
        respRate: form.respRate ? parseInt(form.respRate, 10) : null,
        hydrationStatus: form.hydrationStatus || null,
        feedingJson,
        historyJson,
        riskFlagsJson,
      });
      await load();
    } catch (e) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const intakeStatus = intake?.status ?? appointment?.intakeStatus ?? "NOT_STARTED";
  const statusBadge = INTAKE_STATUS_BADGES[intakeStatus] ?? "secondary";

  if (ctxLoading || !branchId) {
    return (
      <div className="py-40 px-3 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary">Loading...</p>
      </div>
    );
  }

  if (!branch) {
    return (
      <PageWorkspace>
        <AccessDenied title="Branch not found" onBack={() => router.push("/staff")} />
      </PageWorkspace>
    );
  }

  const patientName =
    appointment?.patient?.profile?.displayName ?? appointment?.patient?.profile?.username ?? "—";
  const petName = appointment?.pet?.name ?? "—";
  const doctorName = appointment?.doctor?.user?.profile?.displayName ?? "—";

  return (
    <PageWorkspace>
      <BranchHeader branch={branch} />
      <div className="d-flex justify-content-between align-items-center mb-16">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item">
              <Link href={`/staff/branch/${branchId}/clinic`}>Clinic</Link>
            </li>
            <li className="breadcrumb-item">
              <Link href={`/staff/branch/${branchId}/clinic/appointments`}>Appointments</Link>
            </li>
            <li className="breadcrumb-item active">Intake #{appointmentId ?? "?"}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2 flex-wrap align-items-center">
          <span className={`badge bg-${statusBadge}`}>
            Intake: {intakeStatus === "COMPLETE" ? "Complete" : intakeStatus === "PARTIAL" ? "Partial" : "Not started"}
          </span>
          {appointment?.status && (
            <span className="badge bg-secondary">{appointment.status}</span>
          )}
        </div>
      </div>

      {registeredSuccessMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>Owner/patient registered successfully.</strong> Continue intake below.
          <button type="button" className="btn-close" onClick={() => setRegisteredSuccessMessage(false)} aria-label="Close" />
        </div>
      )}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError("")} aria-label="Close" />
        </div>
      )}
      {promoting && (
        <div className="alert alert-info" role="alert">
          Linking owner and pet to appointment…
        </div>
      )}
      {intakeLoadError && appointment && (
        <div className="alert alert-warning alert-dismissible fade show d-flex align-items-center flex-wrap gap-2" role="alert">
          <span className="flex-grow-1">Intake data could not be loaded: {intakeLoadError}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-warning"
            onClick={() => loadIntakeOnly()}
            disabled={intakeRetrying}
          >
            {intakeRetrying ? "Retrying…" : "Retry intake"}
          </button>
          <button type="button" className="btn-close" onClick={() => setIntakeLoadError("")} aria-label="Dismiss" />
        </div>
      )}

      {loading ? (
        <Card title="Intake form">
          <div className="py-24 text-center text-secondary">Loading appointment and intake...</div>
        </Card>
      ) : !appointment ? (
        <Card title="Intake form">
          <div className="py-24 text-center text-danger">
            {error || PRIMARY_NOT_FOUND.appointment}
          </div>
          <div className="d-flex flex-wrap gap-2 justify-content-center">
            <button type="button" className="btn btn-outline-primary" onClick={() => load()}>
              Retry
            </button>
            <Link href={`/staff/branch/${branchId}/clinic/appointments`} className="btn btn-outline-secondary">
              Back to Appointments
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {(!appointment.patientId || !appointment.petId) && (
            <div className="alert alert-warning mb-16" role="alert">
              <strong>Owner & pet not linked.</strong>{" "}
              Patient/owner not linked to this appointment. Link or register owner and pet below, then continue intake.
              {promoteError && (
                <div className="alert alert-danger py-2 mt-2 mb-0" role="alert">
                  <div className="d-flex align-items-start flex-wrap gap-2">
                    <span className="flex-grow-1">
                      Could not link owner and pet to this appointment ({promoteError}). You can refresh the page to retry, or use the links below to link from the appointments list or register again.
                    </span>
                    <button type="button" className="btn-close" onClick={() => setPromoteError("")} aria-label="Dismiss" />
                  </div>
                  <div className="mt-2 d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-light"
                      onClick={() => window.location.reload()}
                    >
                      Refresh page
                    </button>
                  </div>
                </div>
              )}
              <div className="mt-2 d-flex flex-wrap gap-2">
                <Link
                  href={`/staff/branch/${branchId}/clinic/appointments?promote=${appointment.id}`}
                  className="btn btn-sm btn-warning"
                >
                  Link owner & pet (Complete intake)
                </Link>
                <Link
                  href={(() => {
                    const q = new URLSearchParams();
                    q.set("returnTo", `/staff/branch/${branchId}/clinic/intake/${appointment.id}`);
                    q.set("appointmentId", String(appointment.id));
                    const mobile = (appointment.mobileSnapshot ?? "").trim();
                    const ownerName = (appointment.ownerNameSnapshot ?? "").trim();
                    const petName = (appointment.petNameSnapshot ?? "").trim();
                    if (mobile) q.set("phone", mobile);
                    if (ownerName) q.set("displayName", ownerName);
                    if (petName) q.set("petName", petName);
                    return staffClinicPatientRegisterPath(branchId, q.toString());
                  })()}
                  className="btn btn-sm btn-outline-primary"
                >
                  Register owner & pet, then return here
                </Link>
              </div>
            </div>
          )}
          <Card title="Owner & Pet summary" className="mb-16">
            <div className="row g-2">
              <div className="col-md-6">
                <strong>Owner:</strong> {patientName}
              </div>
              <div className="col-md-6">
                <strong>Pet:</strong> {petName}
                {appointment?.pet?.animalType?.name && ` (${appointment.pet.animalType.name})`}
              </div>
              <div className="col-md-6">
                <strong>Doctor:</strong> {doctorName}
              </div>
            </div>
          </Card>

          <Card title="Chief complaint" className="mb-16">
            <div className="mb-3">
              <label className="form-label">Why is the patient here today?</label>
              <textarea
                className="form-control"
                rows={2}
                value={form.chiefComplaint}
                onChange={(e) => setForm((f) => ({ ...f, chiefComplaint: e.target.value }))}
                placeholder="Brief description"
              />
            </div>
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label">Duration</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.complaintDuration}
                  onChange={(e) => setForm((f) => ({ ...f, complaintDuration: e.target.value }))}
                  placeholder="e.g. 3 days, 2 hours"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Onset</label>
                <select
                  className="form-select"
                  value={form.complaintOnset}
                  onChange={(e) => setForm((f) => ({ ...f, complaintOnset: e.target.value }))}
                >
                  <option value="">—</option>
                  <option value="SUDDEN">Sudden</option>
                  <option value="GRADUAL">Gradual</option>
                </select>
              </div>
            </div>
          </Card>

          <Card title="Symptoms" className="mb-16">
            <div className="row g-2 mb-3">
              {SYMPTOM_OPTIONS.map((opt) => (
                <div className="col-6 col-md-4" key={opt.value}>
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id={`sym-${opt.value}`}
                      checked={form.symptoms.includes(opt.value)}
                      onChange={(e) => {
                        setForm((f) => ({
                          ...f,
                          symptoms: e.target.checked
                            ? [...f.symptoms, opt.value]
                            : f.symptoms.filter((s) => s !== opt.value),
                        }));
                      }}
                    />
                    <label className="form-check-label" htmlFor={`sym-${opt.value}`}>
                      {opt.label}
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <label className="form-label">Additional description</label>
            <textarea
              className="form-control"
              rows={2}
              value={form.additionalSymptoms}
              onChange={(e) => setForm((f) => ({ ...f, additionalSymptoms: e.target.value }))}
              placeholder="Free text"
            />
          </Card>

          <Card title="Vitals" className="mb-16">
            <div className="row g-2">
              <div className="col-6 col-md-2">
                <label className="form-label">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  value={form.weightKg}
                  onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))}
                />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label">Temp (°F)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  value={form.tempF}
                  onChange={(e) => setForm((f) => ({ ...f, tempF: e.target.value }))}
                />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label">Heart rate</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.heartRate}
                  onChange={(e) => setForm((f) => ({ ...f, heartRate: e.target.value }))}
                />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label">Resp. rate</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.respRate}
                  onChange={(e) => setForm((f) => ({ ...f, respRate: e.target.value }))}
                />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label">Hydration</label>
                <select
                  className="form-select"
                  value={form.hydrationStatus}
                  onChange={(e) => setForm((f) => ({ ...f, hydrationStatus: e.target.value }))}
                >
                  <option value="">—</option>
                  <option value="NORMAL">Normal</option>
                  <option value="DEHYDRATED">Dehydrated</option>
                </select>
              </div>
            </div>
          </Card>

          <Card title="Feeding & lifestyle" className="mb-16">
            <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label">Diet type</label>
                <select
                  className="form-select"
                  value={form.dietType}
                  onChange={(e) => setForm((f) => ({ ...f, dietType: e.target.value }))}
                >
                  <option value="">—</option>
                  <option value="DRY_FOOD">Dry food</option>
                  <option value="WET_FOOD">Wet food</option>
                  <option value="HOME_COOKED">Home cooked</option>
                  <option value="MIXED">Mixed</option>
                  <option value="RAW">Raw</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Water intake</label>
                <select
                  className="form-select"
                  value={form.waterIntake}
                  onChange={(e) => setForm((f) => ({ ...f, waterIntake: e.target.value }))}
                >
                  <option value="">—</option>
                  <option value="NORMAL">Normal</option>
                  <option value="LOW">Low</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Environment</label>
                <select
                  className="form-select"
                  value={form.livingEnvironment}
                  onChange={(e) => setForm((f) => ({ ...f, livingEnvironment: e.target.value }))}
                >
                  <option value="">—</option>
                  <option value="INDOOR">Indoor</option>
                  <option value="OUTDOOR">Outdoor</option>
                  <option value="BOTH">Both</option>
                </select>
              </div>
              <div className="col-12">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="otherAnimals"
                    checked={form.otherAnimals}
                    onChange={(e) => setForm((f) => ({ ...f, otherAnimals: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="otherAnimals">
                    Lives with other animals
                  </label>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Clinical history" className="mb-16">
            <div className="row g-2 mb-2">
              <div className="col-12">
                <label className="form-label">Past illnesses / surgeries</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.pastIllnesses}
                  onChange={(e) => setForm((f) => ({ ...f, pastIllnesses: e.target.value }))}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Current medications</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.currentMedications}
                  onChange={(e) => setForm((f) => ({ ...f, currentMedications: e.target.value }))}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Known allergies</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.knownAllergies}
                  onChange={(e) => setForm((f) => ({ ...f, knownAllergies: e.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Vaccine status</label>
                <select
                  className="form-select"
                  value={form.vaccineStatus}
                  onChange={(e) => setForm((f) => ({ ...f, vaccineStatus: e.target.value }))}
                >
                  <option value="">—</option>
                  <option value="UP_TO_DATE">Up to date</option>
                  <option value="NOT_SURE">Not sure</option>
                  <option value="NOT_VACCINATED">Not vaccinated</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Deworming</label>
                <select
                  className="form-select"
                  value={form.dewormingStatus}
                  onChange={(e) => setForm((f) => ({ ...f, dewormingStatus: e.target.value }))}
                >
                  <option value="">—</option>
                  <option value="YES">Yes</option>
                  <option value="NO">No</option>
                  <option value="NOT_SURE">Not sure</option>
                </select>
              </div>
            </div>
          </Card>

          <Card title="Risk flags" className="mb-16">
            <div className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                id="isEmergency"
                checked={form.isEmergency}
                onChange={(e) => setForm((f) => ({ ...f, isEmergency: e.target.checked }))}
              />
              <label className="form-check-label" htmlFor="isEmergency">
                Emergency
              </label>
            </div>
            {form.isEmergency && (
              <div className="mb-2 ms-4">
                <select
                  className="form-select form-select-sm"
                  value={form.emergencyType}
                  onChange={(e) => setForm((f) => ({ ...f, emergencyType: e.target.value }))}
                >
                  <option value="">—</option>
                  <option value="BREATHING">Breathing difficulty</option>
                  <option value="BLEEDING">Bleeding</option>
                  <option value="SEIZURE">Seizure</option>
                  <option value="UNCONSCIOUS">Unconscious</option>
                </select>
              </div>
            )}
            <div className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                id="isAggressive"
                checked={form.isAggressive}
                onChange={(e) => setForm((f) => ({ ...f, isAggressive: e.target.checked }))}
              />
              <label className="form-check-label" htmlFor="isAggressive">
                Aggressive / handling caution
              </label>
            </div>
            <div className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                id="infectiousSuspicion"
                checked={form.infectiousSuspicion}
                onChange={(e) => setForm((f) => ({ ...f, infectiousSuspicion: e.target.checked }))}
              />
              <label className="form-check-label" htmlFor="infectiousSuspicion">
                Infectious suspicion (isolation suggested)
              </label>
            </div>
            <div className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                id="isolationNeeded"
                checked={form.isolationNeeded}
                onChange={(e) => setForm((f) => ({ ...f, isolationNeeded: e.target.checked }))}
              />
              <label className="form-check-label" htmlFor="isolationNeeded">
                Isolation needed
              </label>
            </div>
            <label className="form-label">Notes</label>
            <input
              type="text"
              className="form-control"
              value={form.riskNotes}
              onChange={(e) => setForm((f) => ({ ...f, riskNotes: e.target.value }))}
            />
          </Card>

          {canManage && (
            <div className="d-flex gap-2 mb-24 flex-wrap">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving\u2026" : "Save intake"}
              </button>
              {canEnqueue(appointment?.status) && (
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleEnqueue}
                  disabled={enqueueing}
                >
                  {enqueueing ? "Adding\u2026" : "Add to Queue"}
                </button>
              )}
              <Link
                href={`/staff/branch/${branchId}/clinic/appointments`}
                className="btn btn-outline-secondary"
              >
                Back to Appointments
              </Link>
            </div>
          )}
          {enqueueError && (
            <div className="alert alert-danger mt-2">{enqueueError}</div>
          )}
        </>
      )}
    </PageWorkspace>
  );
}
