"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  doctorGetVisit,
  doctorGetPatientHistory,
  doctorAddVisitNote,
  doctorAddVisitVital,
  doctorGetVisitBillingSummary,
  doctorGetCompletionEligibility,
  doctorCompleteVisit,
  doctorCreateVisitFollowUp,
  doctorCreateVisitLabRequisition,
  doctorCreateVisitPrescription,
  doctorFinalizePrescription,
  doctorUpdatePrescription,
  doctorGetConsultationTemplates,
  doctorAddVisitAttachment,
} from "@/lib/api";
import { DoctorMedicineCatalogInput } from "../_components/DoctorMedicineCatalogInput";
import { ClinicalAlerts } from "../../appointments/_components/ClinicalAlerts";
import { ClinicalHistoryTimeline } from "../../appointments/_components/ClinicalHistoryTimeline";
import type { VisitItem } from "../../appointments/_components/ClinicalHistoryTimeline";
import { formatPetTaxonomyLine } from "@/lib/formatPetTaxonomy";
import { PRIMARY_NOT_FOUND } from "@/lib/clinicNotFoundHelpers";
import {
  formatTempFValueFromCelsius,
  fahrenheitInputToStoredCelsiusOptional,
} from "@/lib/temperature";

const TABS = [
  "history",
  "vitals",
  "soap",
  "tests",
  "prescription",
  "plan",
  "billing",
  "token",
  "followup",
  "attachments",
  "complete",
] as const;
type TabId = (typeof TABS)[number];

type RxLine = {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  countryMedicineBrandId?: number | null;
};

function emptyRxLine(): RxLine {
  return {
    medicineName: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
    countryMedicineBrandId: undefined,
  };
}

export default function DoctorVisitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const visitId = id ? Number(id) : NaN;
  const [visit, setVisit] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("history");
  const [history, setHistory] = useState<{ visits?: VisitItem[]; pet?: { vaccinations?: unknown[] } } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [billingSummary, setBillingSummary] = useState<any | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [actioning, setActioning] = useState(false);
  const [completionEligibility, setCompletionEligibility] = useState<{
    eligible: boolean;
    unmet: string[];
    canOverride: boolean;
  } | null>(null);
  const [showCompletionGuardModal, setShowCompletionGuardModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [eligibilityLoading, setEligibilityLoading] = useState(false);

  const [soapForm, setSoapForm] = useState({ subjective: "", objective: "", assessment: "", plan: "" });
  const [vitalForm, setVitalForm] = useState({ weightKg: "", tempF: "", heartRate: "", respRate: "", notes: "" });
  const [testForm, setTestForm] = useState({ testsJson: [] as string[], notes: "" });
  const [rxForm, setRxForm] = useState({ notes: "", items: [emptyRxLine()] });
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<number | null>(null);
  const [editRxForm, setEditRxForm] = useState({ notes: "", items: [] as RxLine[] });
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [createFollowUpAppointment, setCreateFollowUpAppointment] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentNote, setAttachmentNote] = useState("");

  const loadVisit = useCallback(async () => {
    if (!Number.isFinite(visitId)) return;
    setLoading(true);
    setError("");
    try {
      const v = await doctorGetVisit(visitId);
      setVisit(v ?? null);
    } catch {
      setError(PRIMARY_NOT_FOUND.visit);
      setVisit(null);
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  useEffect(() => {
    loadVisit();
  }, [loadVisit]);

  useEffect(() => {
    if (!visit?.petId) {
      setHistory(null);
      return;
    }
    setHistoryLoading(true);
    doctorGetPatientHistory(visit.petId)
      .then((data: any) => {
        setHistory(data ?? null);
      })
      .catch(() => setHistory(null))
      .finally(() => setHistoryLoading(false));
  }, [visit?.petId]);

  useEffect(() => {
    if (visit?.branchId && activeTab === "soap") {
      doctorGetConsultationTemplates(visit.branchId)
        .then((d: any) => setTemplates(d?.templates ?? []))
        .catch(() => setTemplates([]));
    }
  }, [visit?.branchId, activeTab]);

  useEffect(() => {
    if (activeTab === "billing" && Number.isFinite(visitId)) {
      setBillingLoading(true);
      doctorGetVisitBillingSummary(visitId)
        .then(setBillingSummary)
        .catch(() => setBillingSummary(null))
        .finally(() => setBillingLoading(false));
    }
  }, [activeTab, visitId]);

  const refresh = useCallback(() => {
    loadVisit();
  }, [loadVisit]);

  const handleAddSoap = async () => {
    if (!Number.isFinite(visitId)) return;
    setActioning(true);
    try {
      await doctorAddVisitNote(visitId, {
        noteType: "SOAP",
        contentJson: soapForm,
      });
      toast.success("SOAP note saved");
      setSoapForm({ subjective: "", objective: "", assessment: "", plan: "" });
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to save");
    } finally {
      setActioning(false);
    }
  };

  const handleAddVital = async () => {
    if (!Number.isFinite(visitId)) return;
    setActioning(true);
    try {
      await doctorAddVisitVital(visitId, {
        weightKg: vitalForm.weightKg ? Number(vitalForm.weightKg) : undefined,
        tempC: fahrenheitInputToStoredCelsiusOptional(vitalForm.tempF),
        heartRate: vitalForm.heartRate ? Number(vitalForm.heartRate) : undefined,
        respRate: vitalForm.respRate ? Number(vitalForm.respRate) : undefined,
        notes: vitalForm.notes || undefined,
      });
      toast.success("Vital recorded");
      setVitalForm({ weightKg: "", tempF: "", heartRate: "", respRate: "", notes: "" });
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to save");
    } finally {
      setActioning(false);
    }
  };

  const handleAddLabRequisition = async () => {
    if (!Number.isFinite(visitId) || !testForm.testsJson.length) {
      toast.warning("Add at least one test");
      return;
    }
    setActioning(true);
    try {
      await doctorCreateVisitLabRequisition(visitId, {
        testsJson: testForm.testsJson,
        notes: testForm.notes || undefined,
      });
      toast.success("Test order created");
      setTestForm({ testsJson: [], notes: "" });
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to create");
    } finally {
      setActioning(false);
    }
  };

  const handleAddPrescription = async () => {
    const items = rxForm.items.filter((i) => i.medicineName.trim() && i.dosage.trim() && i.frequency.trim() && i.duration.trim());
    if (!Number.isFinite(visitId) || !items.length) {
      toast.warning("Add at least one medicine with dose, frequency, duration");
      return;
    }
    setActioning(true);
    try {
      await doctorCreateVisitPrescription(visitId, {
        notes: rxForm.notes || undefined,
        items: items.map((i) => ({
          medicineName: i.medicineName.trim(),
          dosage: i.dosage.trim(),
          frequency: i.frequency.trim(),
          duration: i.duration.trim(),
          instructions: i.instructions.trim() || undefined,
          countryMedicineBrandId:
            i.countryMedicineBrandId != null && Number.isFinite(Number(i.countryMedicineBrandId))
              ? Number(i.countryMedicineBrandId)
              : undefined,
        })),
      });
      toast.success("Prescription created");
      setRxForm({ notes: "", items: [emptyRxLine()] });
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to create");
    } finally {
      setActioning(false);
    }
  };

  const handleFinalizePrescription = async (prescriptionId: number) => {
    setActioning(true);
    try {
      await doctorFinalizePrescription(prescriptionId);
      toast.success("Prescription finalized");
      setEditingPrescriptionId(null);
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to finalize");
    } finally {
      setActioning(false);
    }
  };

  const startEditPrescription = (pr: any) => {
    setEditingPrescriptionId(pr.id);
    setEditRxForm({
      notes: pr.notes ?? "",
      items: (pr.items ?? []).map((item: any) => ({
        medicineName: item.medicineName ?? "",
        dosage: item.dosage ?? "",
        frequency: item.frequency ?? "",
        duration: item.duration ?? "",
        instructions: item.instructions ?? "",
        countryMedicineBrandId: item.countryMedicineBrandId ?? undefined,
      })),
    });
  };

  const handleSavePrescriptionEdit = async () => {
    if (editingPrescriptionId == null) return;
    const items = editRxForm.items.filter((i) => i.medicineName.trim() && i.dosage.trim() && i.frequency.trim() && i.duration.trim());
    if (!items.length) {
      toast.warning("Add at least one complete medicine line");
      return;
    }
    setActioning(true);
    try {
      await doctorUpdatePrescription(editingPrescriptionId, {
        notes: editRxForm.notes || undefined,
        items: items.map((i) => ({
          medicineName: i.medicineName.trim(),
          dosage: i.dosage.trim(),
          frequency: i.frequency.trim(),
          duration: i.duration.trim(),
          instructions: i.instructions.trim() || undefined,
          countryMedicineBrandId:
            i.countryMedicineBrandId != null && Number.isFinite(Number(i.countryMedicineBrandId))
              ? Number(i.countryMedicineBrandId)
              : undefined,
        })),
      });
      toast.success("Prescription updated");
      setEditingPrescriptionId(null);
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to update");
    } finally {
      setActioning(false);
    }
  };

  const handleFollowUp = async () => {
    if (!Number.isFinite(visitId) || !followUpDate) {
      toast.warning("Select follow-up date");
      return;
    }
    setActioning(true);
    try {
      await doctorCreateVisitFollowUp(visitId, {
        followUpDate,
        followUpNotes: followUpNotes || undefined,
        createAppointment: createFollowUpAppointment,
      });
      toast.success("Follow-up set");
      setFollowUpDate("");
      setFollowUpNotes("");
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to set follow-up");
    } finally {
      setActioning(false);
    }
  };

  const handleAddAttachment = async () => {
    if (!Number.isFinite(visitId) || !attachmentUrl.trim()) {
      toast.warning("Enter attachment URL");
      return;
    }
    setActioning(true);
    try {
      await doctorAddVisitAttachment(visitId, {
        fileUrl: attachmentUrl.trim(),
        note: attachmentNote.trim() || undefined,
      });
      toast.success("Attachment added");
      setAttachmentUrl("");
      setAttachmentNote("");
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to add attachment");
    } finally {
      setActioning(false);
    }
  };

  const doCompleteVisit = async (payload?: { overrideReason?: string }) => {
    if (!Number.isFinite(visitId)) return;
    setActioning(true);
    setShowCompletionGuardModal(false);
    setOverrideReason("");
    try {
      await doctorCompleteVisit(visitId, payload);
      toast.success("Visit completed");
      if (visit?.appointmentId) {
        router.push(`/doctor/appointments/${visit.appointmentId}`);
      } else {
        router.push("/doctor/appointments");
      }
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to complete");
    } finally {
      setActioning(false);
    }
  };

  const handleCompleteVisit = async () => {
    if (!Number.isFinite(visitId)) return;
    setEligibilityLoading(true);
    setCompletionEligibility(null);
    try {
      const result = await doctorGetCompletionEligibility(visitId);
      setEligibilityLoading(false);
      if (!result) {
        toast.error("Could not check completion requirements.");
        return;
      }
      if (result.eligible) {
        const message = visit?.appointmentId
          ? "Mark this visit as completed? The linked appointment will also be marked completed."
          : "Mark this visit as completed?";
        if (!confirm(message)) return;
        await doCompleteVisit();
        return;
      }
      setCompletionEligibility({ eligible: result.eligible, unmet: result.unmet || [], canOverride: result.canOverride ?? false });
      setShowCompletionGuardModal(true);
    } catch (e) {
      setEligibilityLoading(false);
      toast.error((e as Error)?.message ?? "Failed to check requirements");
    }
  };

  const handleCompleteWithOverride = () => {
    const reason = overrideReason?.trim();
    if (!reason) {
      toast.warning("Please provide a reason to complete anyway.");
      return;
    }
    doCompleteVisit({ overrideReason: reason });
  };

  const applyTemplate = (t: any) => {
    const c = t?.contentJson;
    if (c && typeof c === "object") {
      setSoapForm({
        subjective: String(c.subjective ?? ""),
        objective: String(c.objective ?? ""),
        assessment: String(c.assessment ?? ""),
        plan: String(c.plan ?? ""),
      });
      toast.info("Template applied");
    }
  };

  if (!id) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid visit id.</div>
      </div>
    );
  }

  if (loading && !visit) {
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
        <div className="alert alert-danger radius-12">
          {error || PRIMARY_NOT_FOUND.visit}
          <div className="mt-2 d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => loadVisit()}>Retry</button>
            <Link href="/doctor/appointments" className="btn btn-sm btn-outline-secondary">Back to appointments</Link>
          </div>
        </div>
      </div>
    );
  }

  const patientName = visit?.patient?.profile?.displayName ?? visit?.patient?.id ?? "—";
  const petName = visit?.pet?.name ?? "—";
  const branchName = visit?.branch?.name ?? "—";
  const ownerPhone = visit?.patient?.auth?.phone ?? visit?.patient?.auth?.email ?? "";
  const intake = visit?.appointment?.intake;
  const previousVisits = visit?.previousVisits ?? [];
  const pet = visit?.pet;
  const allergies = pet?.allergies;
  const healthDisorders = pet?.healthDisorders;

  return (
    <div className="dashboard-main-body">
      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        {visit.appointmentId ? (
          <Link href={`/doctor/appointments/${visit.appointmentId}`} className="btn btn-sm btn-outline-secondary">← Appointment</Link>
        ) : (
          <Link href="/doctor/patients" className="btn btn-sm btn-outline-secondary">← Patients</Link>
        )}
        <Link href="/doctor/appointments" className="btn btn-sm btn-outline-secondary">Appointments</Link>
        <span className="fw-semibold">Visit #{visit.id}</span>
        {visit.treatmentCode && <span className="badge bg-primary">{visit.treatmentCode}</span>}
        <span className={`badge ${visit.status === "COMPLETED" ? "bg-success" : "bg-secondary"}`}>{visit.status ?? "—"}</span>
      </div>

      <div className="card radius-12 mb-3">
        <div className="card-body py-2">
          <div className="row align-items-center">
            <div className="col">
              <strong>{petName}</strong>
              {(formatPetTaxonomyLine(pet) || pet?.animalType?.name) && (
                <span className="text-muted ms-1">({formatPetTaxonomyLine(pet) || pet?.animalType?.name})</span>
              )}
              <span className="text-muted ms-2">·</span>
              <span className="ms-2">{patientName}</span>
              {ownerPhone && <span className="text-muted small ms-1">{ownerPhone}</span>}
              <span className="text-muted ms-2">·</span>
              <span className="ms-2">{branchName}</span>
            </div>
            <div className="col-auto">
              <ClinicalAlerts
                allergies={allergies}
                healthDisorders={healthDisorders}
                isEmergency={false}
                isRepeatVisit={previousVisits.length > 0}
              />
            </div>
          </div>
        </div>
      </div>

      <ul className="nav nav-tabs nav-tabs-scroll flex-nowrap mb-3 overflow-auto" role="tablist">
        {TABS.map((tab) => (
          <li key={tab} className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "history" && "History"}
              {tab === "vitals" && "Vitals"}
              {tab === "soap" && "SOAP"}
              {tab === "tests" && "Tests"}
              {tab === "prescription" && "Prescription"}
              {tab === "plan" && "Plan"}
              {tab === "billing" && "Billing"}
              {tab === "token" && "Token"}
              {tab === "followup" && "Follow-up"}
              {tab === "attachments" && "Attachments"}
              {tab === "complete" && "Complete"}
            </button>
          </li>
        ))}
      </ul>

      {activeTab === "history" && (
        <div className="card radius-12">
          <div className="card-body">
            <ClinicalHistoryTimeline
              visits={history?.visits}
              pet={history?.pet}
              loading={historyLoading}
              error={false}
              onRetry={() => visit?.petId && doctorGetPatientHistory(visit.petId).then(setHistory)}
            />
          </div>
        </div>
      )}

      {activeTab === "vitals" && (
        <div className="card radius-12">
          <div className="card-header"><h6 className="mb-0">Vitals</h6></div>
          <div className="card-body">
            {intake && (intake.weightKg != null || intake.tempC != null || intake.heartRate != null || intake.respRate != null) && (
              <p className="small text-muted mb-2">
                Intake: Wt {intake.weightKg ?? "—"} kg · Temp{" "}
                {intake.tempC != null ? `${formatTempFValueFromCelsius(intake.tempC)} °F` : "—"}
                {" "}· HR {intake.heartRate ?? "—"} · RR {intake.respRate ?? "—"}
              </p>
            )}
            {visit.vitals && visit.vitals.length > 0 && (
              <div className="table-responsive mb-3">
                <table className="table table-sm">
                  <thead><tr><th>Time</th><th>Weight (kg)</th><th>Temp (°F)</th><th>HR</th><th>RR</th><th>Notes</th></tr></thead>
                  <tbody>
                    {visit.vitals.map((v: any) => (
                      <tr key={v.id}>
                        <td>{v.createdAt ? new Date(v.createdAt).toLocaleString() : "—"}</td>
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
            )}
            <div className="row g-2 mb-2">
              <div className="col-md-2"><input type="number" step="0.1" className="form-control form-control-sm" placeholder="Weight (kg)" value={vitalForm.weightKg} onChange={(e) => setVitalForm((f) => ({ ...f, weightKg: e.target.value }))} /></div>
              <div className="col-md-2"><input type="number" step="0.1" className="form-control form-control-sm" placeholder="Temp (°F)" value={vitalForm.tempF} onChange={(e) => setVitalForm((f) => ({ ...f, tempF: e.target.value }))} /></div>
              <div className="col-md-2"><input type="number" className="form-control form-control-sm" placeholder="Heart rate" value={vitalForm.heartRate} onChange={(e) => setVitalForm((f) => ({ ...f, heartRate: e.target.value }))} /></div>
              <div className="col-md-2"><input type="number" className="form-control form-control-sm" placeholder="Resp. rate" value={vitalForm.respRate} onChange={(e) => setVitalForm((f) => ({ ...f, respRate: e.target.value }))} /></div>
              <div className="col-md-4"><input type="text" className="form-control form-control-sm" placeholder="Notes" value={vitalForm.notes} onChange={(e) => setVitalForm((f) => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <button type="button" className="btn btn-sm btn-primary" disabled={actioning} onClick={handleAddVital}>Add vital</button>
          </div>
        </div>
      )}

      {activeTab === "soap" && (
        <div className="card radius-12">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h6 className="mb-0">SOAP notes</h6>
            {templates.length > 0 && (
              <select className="form-select form-select-sm w-auto" value="" onChange={(e) => { const t = templates.find((x: any) => String(x.id) === e.target.value); if (t) applyTemplate(t); e.target.value = ""; }}>
                <option value="">Load template...</option>
                {templates.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="card-body">
            {visit.notes && visit.notes.length > 0 && (
              <div className="mb-3">
                {visit.notes.map((n: any) => {
                  const c = n.contentJson || {};
                  const isSoap = n.noteType === "SOAP";
                  return (
                    <div key={n.id} className="border-bottom pb-2 mb-2 small">
                      <span className="text-muted">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}</span>
                      {isSoap && (c.subjective || c.objective || c.assessment || c.plan) && (
                        <div className="mt-1">
                          {c.subjective && <div><strong>S:</strong> {String(c.subjective)}</div>}
                          {c.objective && <div><strong>O:</strong> {String(c.objective)}</div>}
                          {c.assessment && <div><strong>A:</strong> {String(c.assessment)}</div>}
                          {c.plan && <div><strong>P:</strong> {String(c.plan)}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mb-2">
              <label className="form-label small">Subjective</label>
              <textarea className="form-control form-control-sm" rows={2} value={soapForm.subjective} onChange={(e) => setSoapForm((f) => ({ ...f, subjective: e.target.value }))} placeholder="Owner complaint..." />
            </div>
            <div className="mb-2">
              <label className="form-label small">Objective</label>
              <textarea className="form-control form-control-sm" rows={2} value={soapForm.objective} onChange={(e) => setSoapForm((f) => ({ ...f, objective: e.target.value }))} placeholder="Vitals, exam findings..." />
            </div>
            <div className="mb-2">
              <label className="form-label small">Assessment (diagnosis)</label>
              <textarea className="form-control form-control-sm" rows={2} value={soapForm.assessment} onChange={(e) => setSoapForm((f) => ({ ...f, assessment: e.target.value }))} placeholder="Diagnosis..." />
            </div>
            <div className="mb-2">
              <label className="form-label small">Plan</label>
              <textarea className="form-control form-control-sm" rows={2} value={soapForm.plan} onChange={(e) => setSoapForm((f) => ({ ...f, plan: e.target.value }))} placeholder="Treatment plan..." />
            </div>
            <button type="button" className="btn btn-sm btn-primary" disabled={actioning} onClick={handleAddSoap}>Save SOAP note</button>
          </div>
        </div>
      )}

      {activeTab === "tests" && (
        <div className="card radius-12">
          <div className="card-header"><h6 className="mb-0">Test orders</h6></div>
          <div className="card-body">
            {visit.labRequisitions && visit.labRequisitions.length > 0 && (
              <ul className="list-unstyled small mb-3">
                {visit.labRequisitions.map((req: any) => {
                  const tests = req.testsJson;
                  const label = Array.isArray(tests) ? tests.join(", ") : typeof tests === "object" ? JSON.stringify(tests) : String(tests ?? "");
                  return (
                    <li key={req.id} className="mb-1">
                      {req.createdAt && new Date(req.createdAt).toLocaleString()}
                      <span className="badge bg-secondary ms-1">{req.status}</span> {label}
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mb-2">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Add test (e.g. CBC, X-ray) then press Enter"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const v = (e.target as HTMLInputElement).value.trim();
                    if (v) {
                      setTestForm((f) => ({ ...f, testsJson: [...f.testsJson, v] }));
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
              {testForm.testsJson.length > 0 && (
                <div className="mt-1">
                  {testForm.testsJson.map((t, i) => (
                    <span key={i} className="badge bg-light text-dark me-1">
                      {t}
                      <button type="button" className="btn-close btn-close-sm ms-1" style={{ fontSize: "0.6rem" }} onClick={() => setTestForm((f) => ({ ...f, testsJson: f.testsJson.filter((_, j) => j !== i) }))} aria-label="Remove" />
                    </span>
                  ))}
                </div>
              )}
            </div>
            <input type="text" className="form-control form-control-sm mb-2" placeholder="Notes" value={testForm.notes} onChange={(e) => setTestForm((f) => ({ ...f, notes: e.target.value }))} />
            <button type="button" className="btn btn-sm btn-primary" disabled={actioning} onClick={handleAddLabRequisition}>Create test order</button>
          </div>
        </div>
      )}

      {activeTab === "prescription" && (
        <div className="card radius-12">
          <div className="card-header">
            <h6 className="mb-0">Prescriptions</h6>
            <p className="text-muted small mb-0 mt-1">
              Medicine field searches your clinic’s <strong>national catalog</strong> (country from the organization). Inventory products use a separate flow elsewhere.
            </p>
          </div>
          <div className="card-body">
            {visit.prescriptions && visit.prescriptions.length > 0 && (
              <ul className="list-unstyled small mb-3">
                {visit.prescriptions.map((pr: any) => (
                  <li key={pr.id} className="mb-2 border-bottom pb-2">
                    <span className="badge bg-secondary me-1">{pr.status}</span>
                    {pr.status === "DRAFT" && editingPrescriptionId !== pr.id && (
                      <>
                        <button type="button" className="btn btn-sm btn-outline-secondary ms-1" disabled={actioning} onClick={() => startEditPrescription(pr)}>Edit</button>
                        <button type="button" className="btn btn-sm btn-outline-success ms-1" disabled={actioning} onClick={() => handleFinalizePrescription(pr.id)}>Finalize</button>
                      </>
                    )}
                    {pr.status === "DRAFT" && editingPrescriptionId === pr.id && (
                      <div className="mt-2 p-2 bg-light radius-8">
                        <input type="text" className="form-control form-control-sm mb-2" placeholder="Notes" value={editRxForm.notes} onChange={(e) => setEditRxForm((f) => ({ ...f, notes: e.target.value }))} />
                        {editRxForm.items.map((item, idx) => (
                          <div key={idx} className="row g-1 mb-1">
                            <div className="col-md-3">
                              {visit?.branchId ? (
                                <DoctorMedicineCatalogInput
                                  branchId={visit.branchId}
                                  medicineName={item.medicineName}
                                  countryMedicineBrandId={item.countryMedicineBrandId}
                                  disabled={actioning}
                                  onMedicineNameChange={(name) =>
                                    setEditRxForm((f) => ({
                                      ...f,
                                      items: f.items.map((it, i) =>
                                        i === idx ? { ...it, medicineName: name, countryMedicineBrandId: undefined } : it
                                      ),
                                    }))
                                  }
                                  onCatalogSelect={(r) => {
                                    const label = [r.brandName, r.genericName, r.strengthDisplay, r.dosageForm]
                                      .filter(Boolean)
                                      .join(" · ");
                                    setEditRxForm((f) => ({
                                      ...f,
                                      items: f.items.map((it, i) =>
                                        i === idx
                                          ? { ...it, medicineName: label, countryMedicineBrandId: r.countryMedicineBrandId }
                                          : it
                                      ),
                                    }));
                                  }}
                                />
                              ) : (
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="Medicine"
                                  value={item.medicineName}
                                  onChange={(e) =>
                                    setEditRxForm((f) => ({
                                      ...f,
                                      items: f.items.map((it, i) =>
                                        i === idx ? { ...it, medicineName: e.target.value } : it
                                      ),
                                    }))
                                  }
                                />
                              )}
                            </div>
                            <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Dose" value={item.dosage} onChange={(e) => setEditRxForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, dosage: e.target.value } : it) }))} /></div>
                            <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Frequency" value={item.frequency} onChange={(e) => setEditRxForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, frequency: e.target.value } : it) }))} /></div>
                            <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Duration" value={item.duration} onChange={(e) => setEditRxForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, duration: e.target.value } : it) }))} /></div>
                            <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Instructions" value={item.instructions} onChange={(e) => setEditRxForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, instructions: e.target.value } : it) }))} /></div>
                          </div>
                        ))}
                        <button type="button" className="btn btn-sm btn-outline-secondary me-1" onClick={() => setEditRxForm((f) => ({ ...f, items: [...f.items, emptyRxLine()] }))}>+ Line</button>
                        <button type="button" className="btn btn-sm btn-primary me-1" disabled={actioning} onClick={handleSavePrescriptionEdit}>Save</button>
                        <button type="button" className="btn btn-sm btn-outline-dark" disabled={actioning} onClick={() => setEditingPrescriptionId(null)}>Cancel</button>
                      </div>
                    )}
                    {editingPrescriptionId !== pr.id && pr.notes && <p className="mb-1">{pr.notes}</p>}
                    {editingPrescriptionId !== pr.id && Array.isArray(pr.items) && (
                      <ul className="mb-0 ps-3">
                        {pr.items.map((item: any) => (
                          <li key={item.id}>
                            {item.countryMedicineBrand ? (
                              <span className="badge bg-info-subtle text-dark me-1" title="Imported national catalog">
                                Catalog
                              </span>
                            ) : null}
                            {item.medicineName} — {item.dosage} · {item.frequency} · {item.duration}
                            {item.instructions ? ` (${item.instructions})` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <input type="text" className="form-control form-control-sm mb-2" placeholder="Prescription notes" value={rxForm.notes} onChange={(e) => setRxForm((f) => ({ ...f, notes: e.target.value }))} />
            {rxForm.items.map((item, idx) => (
              <div key={idx} className="row g-1 mb-1">
                <div className="col-md-3">
                  {visit?.branchId ? (
                    <DoctorMedicineCatalogInput
                      branchId={visit.branchId}
                      medicineName={item.medicineName}
                      countryMedicineBrandId={item.countryMedicineBrandId}
                      disabled={actioning}
                      onMedicineNameChange={(name) =>
                        setRxForm((f) => ({
                          ...f,
                          items: f.items.map((it, i) =>
                            i === idx ? { ...it, medicineName: name, countryMedicineBrandId: undefined } : it
                          ),
                        }))
                      }
                      onCatalogSelect={(r) => {
                        const label = [r.brandName, r.genericName, r.strengthDisplay, r.dosageForm]
                          .filter(Boolean)
                          .join(" · ");
                        setRxForm((f) => ({
                          ...f,
                          items: f.items.map((it, i) =>
                            i === idx
                              ? { ...it, medicineName: label, countryMedicineBrandId: r.countryMedicineBrandId }
                              : it
                          ),
                        }));
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Medicine"
                      value={item.medicineName}
                      onChange={(e) =>
                        setRxForm((f) => ({
                          ...f,
                          items: f.items.map((it, i) =>
                            i === idx ? { ...it, medicineName: e.target.value } : it
                          ),
                        }))
                      }
                    />
                  )}
                </div>
                <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Dose" value={item.dosage} onChange={(e) => setRxForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, dosage: e.target.value } : it) }))} /></div>
                <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Frequency" value={item.frequency} onChange={(e) => setRxForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, frequency: e.target.value } : it) }))} /></div>
                <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Duration" value={item.duration} onChange={(e) => setRxForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, duration: e.target.value } : it) }))} /></div>
                <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Instructions" value={item.instructions} onChange={(e) => setRxForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, instructions: e.target.value } : it) }))} /></div>
              </div>
            ))}
            <button type="button" className="btn btn-sm btn-outline-secondary me-1" onClick={() => setRxForm((f) => ({ ...f, items: [...f.items, emptyRxLine()] }))}>+ Add line</button>
            <button type="button" className="btn btn-sm btn-primary" disabled={actioning} onClick={handleAddPrescription}>Create prescription</button>
          </div>
        </div>
      )}

      {activeTab === "plan" && (
        <div className="card radius-12">
          <div className="card-header"><h6 className="mb-0">Treatment plan</h6></div>
          <div className="card-body">
            {visit.treatmentCourses && visit.treatmentCourses.length > 0 ? (
              <ul className="list-unstyled small mb-0">
                {visit.treatmentCourses.map((tc: any) => (
                  <li key={tc.id} className="mb-2">
                    <span className="badge bg-secondary me-1">{tc.status}</span>
                    Variant #{tc.variantId} · {tc.totalPrescribedDoses} dose(s)
                    {tc.doses && tc.doses.length > 0 && <span className="text-muted ms-1">· {tc.doses.length} administered</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted small mb-0">No treatment courses for this visit. In-clinic treatments and injection courses are created via billing/token flow.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "billing" && (
        <div className="card radius-12">
          <div className="card-header"><h6 className="mb-0">Billing status</h6></div>
          <div className="card-body">
            {billingLoading && <p className="text-muted small">Loading...</p>}
            {!billingLoading && billingSummary && (
              <div className="small">
                {billingSummary.servicePaymentStatus != null && (
                  <div>Service payment: <span className="badge bg-secondary">{String(billingSummary.servicePaymentStatus)}</span></div>
                )}
                {billingSummary.prescriptions && billingSummary.prescriptions.length > 0 && (
                  <div><span className="text-success">✓</span> {billingSummary.prescriptions.length} prescription(s) finalized</div>
                )}
                {billingSummary.appointment?.service && (
                  <div>Consultation: {billingSummary.appointment.service.name}</div>
                )}
              </div>
            )}
            {!billingLoading && !billingSummary && <p className="text-muted small mb-0">No billing summary available.</p>}
          </div>
        </div>
      )}

      {activeTab === "token" && (
        <div className="card radius-12">
          <div className="card-header"><h6 className="mb-0">Injection tokens</h6></div>
          <div className="card-body">
            {visit.injectionTokens && visit.injectionTokens.length > 0 ? (
              <ul className="list-unstyled small mb-0">
                {visit.injectionTokens.map((t: any) => (
                  <li key={t.id} className="mb-1">
                    {t.tokenCode} — <span className="badge bg-secondary">{t.status}</span>
                    {t.expectedDose != null && <span className="ms-1">{t.expectedDose} {t.unit ?? ""}</span>}
                    {t.usedAt && <span className="text-muted ms-1">Used {new Date(t.usedAt).toLocaleString()}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted small mb-0">No injection tokens. Tokens are generated after treatment billing.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "followup" && (
        <div className="card radius-12">
          <div className="card-header"><h6 className="mb-0">Follow-up</h6></div>
          <div className="card-body">
            {visit.followUpDate && (
              <p className="small mb-2">Current: {new Date(visit.followUpDate).toLocaleDateString()}{visit.followUpNotes ? ` — ${visit.followUpNotes}` : ""}</p>
            )}
            <div className="mb-2">
              <input type="date" className="form-control form-control-sm" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
            </div>
            <div className="mb-2">
              <input type="text" className="form-control form-control-sm" placeholder="Reason / instructions" value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)} />
            </div>
            <div className="form-check form-check-inline mb-2">
              <input type="checkbox" className="form-check-input" id="createFuApt" checked={createFollowUpAppointment} onChange={(e) => setCreateFollowUpAppointment(e.target.checked)} />
              <label className="form-check-label" htmlFor="createFuApt">Create follow-up appointment</label>
            </div>
            <br />
            <button type="button" className="btn btn-sm btn-primary" disabled={actioning || !followUpDate} onClick={handleFollowUp}>Set follow-up</button>
          </div>
        </div>
      )}

      {activeTab === "attachments" && (
        <div className="card radius-12">
          <div className="card-header"><h6 className="mb-0">Attachments</h6></div>
          <div className="card-body">
            {visit.attachments && visit.attachments.length > 0 && (
              <ul className="list-unstyled small mb-3">
                {visit.attachments.map((a: any) => (
                  <li key={a.id} className="mb-1">
                    <a href={a.fileUrl} target="_blank" rel="noopener noreferrer">{a.fileName || "Attachment"}</a>
                    {a.note && <span className="text-muted ms-1">— {a.note}</span>}
                  </li>
                ))}
              </ul>
            )}
            <div className="mb-2">
              <input type="url" className="form-control form-control-sm" placeholder="File URL (e.g. from upload)" value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} />
            </div>
            <div className="mb-2">
              <input type="text" className="form-control form-control-sm" placeholder="Note" value={attachmentNote} onChange={(e) => setAttachmentNote(e.target.value)} />
            </div>
            <button type="button" className="btn btn-sm btn-primary" disabled={actioning || !attachmentUrl.trim()} onClick={handleAddAttachment}>Add attachment</button>
          </div>
        </div>
      )}

      {activeTab === "complete" && (
        <div className="card radius-12">
          <div className="card-header"><h6 className="mb-0">Complete visit</h6></div>
          <div className="card-body">
            {visit.status === "COMPLETED" ? (
              <p className="text-success mb-0">This visit is already completed.</p>
            ) : (
              <>
                <p className="small text-muted mb-2">Mark this visit as completed. The linked appointment will also be marked completed.</p>
                <button type="button" className="btn btn-primary" disabled={actioning || eligibilityLoading} onClick={handleCompleteVisit}>
                  {eligibilityLoading ? "Checking…" : "Complete visit"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showCompletionGuardModal && completionEligibility && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Completion requirements not met</h6>
                <button type="button" className="btn-close" onClick={() => { setShowCompletionGuardModal(false); setOverrideReason(""); }} aria-label="Close" />
              </div>
              <div className="modal-body">
                <p className="small text-muted mb-2">The following are required before completing this visit:</p>
                <ul className="list-unstyled mb-3">
                  {completionEligibility.unmet.map((item, i) => (
                    <li key={i} className="mb-1">• {item}</li>
                  ))}
                </ul>
                {completionEligibility.canOverride && (
                  <>
                    <label className="form-label small">Reason for completing anyway (required to override)</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="e.g. Emergency handoff, follow-up only, patient left before documentation"
                      maxLength={500}
                    />
                    <p className="form-text small text-muted mb-0 mt-1">
                      Use workflow or clinical reasons only. Avoid patient names, IDs, or other personal details; this may be used in reports.
                    </p>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setShowCompletionGuardModal(false); setOverrideReason(""); }}>
                  Cancel
                </button>
                {completionEligibility.canOverride ? (
                  <button type="button" className="btn btn-sm btn-primary" disabled={actioning || !overrideReason.trim()} onClick={handleCompleteWithOverride}>
                    Complete anyway
                  </button>
                ) : (
                  <span className="small text-muted">Add the missing items above and try again.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
