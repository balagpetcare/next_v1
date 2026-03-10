"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  staffClinicVisitGet,
  staffClinicVisitUpdate,
  staffClinicVitalAdd,
  staffClinicNoteAdd,
  staffClinicAttachmentAdd,
  staffClinicTemplatesList,
  staffClinicTemplateApply,
  staffClinicDischargeAdd,
  staffClinicVisitPaymentStatus,
} from "@/lib/api";

export default function ClinicVisitDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const visitId = params?.visitId ? Number(params.visitId) : null;
  const branchId = searchParams?.get("branchId") || "";
  const [visit, setVisit] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actioning, setActioning] = useState(null);

  // Form state for add vital
  const [vitalForm, setVitalForm] = useState({ weightKg: "", tempC: "", heartRate: "", respRate: "", notes: "" });
  const [noteForm, setNoteForm] = useState({ noteType: "SOAP", contentJson: "{}" });
  const [attachmentForm, setAttachmentForm] = useState({ fileUrl: "", fileName: "", note: "" });
  const [dischargeForm, setDischargeForm] = useState({ contentJson: "{}" });

  useEffect(() => {
    if (!branchId || !visitId) return;
    loadVisit();
  }, [branchId, visitId]);

  useEffect(() => {
    if (!branchId) return;
    loadTemplates();
  }, [branchId]);

  async function loadVisit() {
    if (!branchId || !visitId) return;
    setLoading(true);
    setError("");
    try {
      const [data, statusList] = await Promise.all([
        staffClinicVisitGet(branchId, visitId),
        staffClinicVisitPaymentStatus(branchId, visitId).catch(() => []),
      ]);
      setVisit(data ?? null);
      setPaymentStatus(Array.isArray(statusList) ? statusList : []);
    } catch (e) {
      setError((e && e.message) || "Failed to load visit");
      setVisit(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplates() {
    if (!branchId) return;
    try {
      const list = await staffClinicTemplatesList(branchId);
      setTemplates(Array.isArray(list) ? list : []);
    } catch {
      setTemplates([]);
    }
  }

  async function handleAddVital(e) {
    e.preventDefault();
    if (!branchId || !visitId) return;
    setActioning("vital");
    setError("");
    try {
      const body = {
        weightKg: vitalForm.weightKg ? Number(vitalForm.weightKg) : undefined,
        tempC: vitalForm.tempC ? Number(vitalForm.tempC) : undefined,
        heartRate: vitalForm.heartRate ? Number(vitalForm.heartRate) : undefined,
        respRate: vitalForm.respRate ? Number(vitalForm.respRate) : undefined,
        notes: vitalForm.notes || undefined,
      };
      await staffClinicVitalAdd(branchId, visitId, body);
      setVitalForm({ weightKg: "", tempC: "", heartRate: "", respRate: "", notes: "" });
      await loadVisit();
    } catch (e) {
      setError((e && e.message) || "Add vital failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!branchId || !visitId) return;
    setActioning("note");
    setError("");
    try {
      let contentJson = {};
      try {
        contentJson = JSON.parse(noteForm.contentJson || "{}");
      } catch {
        contentJson = { raw: noteForm.contentJson };
      }
      await staffClinicNoteAdd(branchId, visitId, { noteType: noteForm.noteType, contentJson });
      setNoteForm({ noteType: "SOAP", contentJson: "{}" });
      await loadVisit();
    } catch (e) {
      setError((e && e.message) || "Add note failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleAddAttachment(e) {
    e.preventDefault();
    if (!branchId || !visitId || !attachmentForm.fileUrl) return;
    setActioning("attachment");
    setError("");
    try {
      await staffClinicAttachmentAdd(branchId, visitId, {
        fileUrl: attachmentForm.fileUrl,
        fileName: attachmentForm.fileName || undefined,
        note: attachmentForm.note || undefined,
      });
      setAttachmentForm({ fileUrl: "", fileName: "", note: "" });
      await loadVisit();
    } catch (e) {
      setError((e && e.message) || "Add attachment failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleApplyTemplate(templateId) {
    if (!branchId || !visitId) return;
    setActioning(`template-${templateId}`);
    setError("");
    try {
      await staffClinicTemplateApply(branchId, visitId, templateId);
      await loadVisit();
    } catch (e) {
      setError((e && e.message) || "Apply template failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleDischarge(e) {
    e.preventDefault();
    if (!branchId || !visitId) return;
    setActioning("discharge");
    setError("");
    try {
      let contentJson = {};
      try {
        contentJson = JSON.parse(dischargeForm.contentJson || "{}");
      } catch {
        contentJson = { raw: dischargeForm.contentJson };
      }
      await staffClinicDischargeAdd(branchId, visitId, { contentJson });
      setDischargeForm({ contentJson: "{}" });
      await loadVisit();
    } catch (e) {
      setError((e && e.message) || "Discharge note failed");
    } finally {
      setActioning(null);
    }
  }

  const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  const visitQ = branchId && visitId ? `?branchId=${encodeURIComponent(branchId)}` : "";

  if (!branchId || !visitId) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12">
          <div className="card-body text-center text-muted py-5">
            <p className="mb-0">Missing branchId or visitId. Open from visits list.</p>
            <Link href={`/clinic/visits${q}`} className="btn btn-sm btn-outline-primary mt-2">Back to Visits</Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !visit) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12"><div className="card-body">Loading...</div></div>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <p className="text-muted mb-0">Visit not found.</p>
            <Link href={`/clinic/visits${q}`} className="btn btn-sm btn-outline-primary mt-2">Back to Visits</Link>
          </div>
        </div>
      </div>
    );
  }

  const petName = visit.pet?.name ?? "—";
  const ownerName = visit.patient?.profile?.displayName ?? "—";
  const doctorName = visit.doctor?.user?.profile?.displayName ?? "—";
  const ownerPhone = visit.patient?.auth?.phone ?? visit.patient?.auth?.email ?? "";
  const intake = visit.appointment?.intake;
  const intakeStatus = visit.appointment?.intakeStatus ?? "NOT_STARTED";
  const rf = intake?.riskFlagsJson && typeof intake.riskFlagsJson === "object" ? intake.riskFlagsJson : {};
  const previousVisits = visit.previousVisits ?? [];

  return (
    <div className="dashboard-main-body">
      <div className="card radius-12 mb-3">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="mb-0">Visit #{visit.id} — {petName}</h6>
          <Link href={`/clinic/visits${q}`} className="btn btn-sm btn-outline-primary radius-12">Back to list</Link>
        </div>
        <div className="card-body">
          <p className="mb-1"><strong>Pet:</strong> {petName} · <strong>Owner:</strong> {ownerName} · <strong>Doctor:</strong> {doctorName}</p>
          <p className="mb-0 text-muted small">Status: {visit.status} · Created: {visit.createdAt ? new Date(visit.createdAt).toLocaleString() : "—"}</p>
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
            <p className="mb-1"><strong>Owner:</strong> {ownerName}{ownerPhone ? ` · ${ownerPhone}` : ""}</p>
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
                  {previousVisits.map((pv) => (
                    <li key={pv.id}>
                      {pv.treatmentCode ?? `#${pv.id}`} · {pv.startedAt ? new Date(pv.startedAt).toLocaleDateString() : "—"}
                      {pv.followUpNotes && ` · ${pv.followUpNotes.slice(0, 60)}${pv.followUpNotes.length > 60 ? "…" : ""}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className={`alert radius-12 mb-3 ${(error && typeof error === "string" && error.toLowerCase().includes("payment")) ? "alert-warning" : "alert-danger"}`} role="alert">
          {error}
          {(error && typeof error === "string" && error.toLowerCase().includes("payment")) && (
            <p className="mb-0 mt-2 small">Collect payment at reception before starting this service.</p>
          )}
        </div>
      )}

      {paymentStatus.length > 0 && (
        <div className="card radius-12 mb-3">
          <div className="card-header"><h6 className="mb-0">Payment status</h6></div>
          <div className="card-body py-2">
            <div className="d-flex flex-wrap gap-2">
              {paymentStatus.map((row) => (
                <span key={row.serviceId} className="d-inline-flex align-items-center gap-1 px-2 py-1 rounded bg-light">
                  <span className="fw-medium">{row.serviceName}</span>
                  <span className={`badge radius-8 ${row.paid ? "bg-success" : "bg-warning text-dark"}`}>
                    {row.paid ? "Paid" : "Unpaid"}
                  </span>
                  {row.paid && row.receiptNumber && <span className="text-muted small">{row.receiptNumber}</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Vitals */}
      <div className="card radius-12 mb-3">
        <div className="card-header"><h6 className="mb-0">Vitals</h6></div>
        <div className="card-body">
          <ul className="list-unstyled mb-3">
            {(visit.vitals || []).map((v) => (
              <li key={v.id} className="mb-2">
                {v.weightKg != null && <span className="me-2">Weight: {v.weightKg} kg</span>}
                {v.tempC != null && <span className="me-2">Temp: {v.tempC} °C</span>}
                {v.heartRate != null && <span className="me-2">HR: {v.heartRate}</span>}
                {v.respRate != null && <span className="me-2">RR: {v.respRate}</span>}
                {v.notes && <span className="text-muted">{v.notes}</span>}
                <span className="text-muted small ms-2">{v.createdAt ? new Date(v.createdAt).toLocaleString() : ""}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={handleAddVital} className="row g-2 align-items-end">
            <div className="col-auto"><input type="number" step="0.1" className="form-control form-control-sm" placeholder="Weight (kg)" value={vitalForm.weightKg} onChange={(e) => setVitalForm((f) => ({ ...f, weightKg: e.target.value }))} /></div>
            <div className="col-auto"><input type="number" step="0.1" className="form-control form-control-sm" placeholder="Temp (°C)" value={vitalForm.tempC} onChange={(e) => setVitalForm((f) => ({ ...f, tempC: e.target.value }))} /></div>
            <div className="col-auto"><input type="number" className="form-control form-control-sm" placeholder="HR" value={vitalForm.heartRate} onChange={(e) => setVitalForm((f) => ({ ...f, heartRate: e.target.value }))} /></div>
            <div className="col-auto"><input type="number" className="form-control form-control-sm" placeholder="RR" value={vitalForm.respRate} onChange={(e) => setVitalForm((f) => ({ ...f, respRate: e.target.value }))} /></div>
            <div className="col-auto"><input type="text" className="form-control form-control-sm" placeholder="Notes" value={vitalForm.notes} onChange={(e) => setVitalForm((f) => ({ ...f, notes: e.target.value }))} /></div>
            <div className="col-auto"><button type="submit" className="btn btn-sm btn-primary radius-12" disabled={!!actioning}>{actioning === "vital" ? "..." : "Add"}</button></div>
          </form>
        </div>
      </div>

      {/* Clinical notes (SOAP) */}
      <div className="card radius-12 mb-3">
        <div className="card-header"><h6 className="mb-0">Clinical notes</h6></div>
        <div className="card-body">
          <ul className="list-unstyled mb-3">
            {(visit.notes || []).map((n) => (
              <li key={n.id} className="mb-2 p-2 bg-light radius-12">
                <span className="badge bg-secondary me-2">{n.noteType}</span>
                <pre className="mb-0 small">{typeof n.contentJson === "object" ? JSON.stringify(n.contentJson, null, 2) : String(n.contentJson)}</pre>
                <span className="text-muted small">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={handleAddNote} className="mb-2">
            <select className="form-select form-select-sm mb-2" value={noteForm.noteType} onChange={(e) => setNoteForm((f) => ({ ...f, noteType: e.target.value }))}>
              <option value="SOAP">SOAP</option>
              <option value="PROGRESS">Progress</option>
              <option value="OTHER">Other</option>
            </select>
            <textarea className="form-control form-control-sm mb-2" rows={3} placeholder='{"subjective":"","objective":"","assessment":"","plan":""}' value={noteForm.contentJson} onChange={(e) => setNoteForm((f) => ({ ...f, contentJson: e.target.value }))} />
            <button type="submit" className="btn btn-sm btn-primary radius-12" disabled={!!actioning}>{actioning === "note" ? "..." : "Add note"}</button>
          </form>
        </div>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <div className="card radius-12 mb-3">
          <div className="card-header"><h6 className="mb-0">Apply template</h6></div>
          <div className="card-body">
            <div className="d-flex flex-wrap gap-2">
              {templates.map((t) => (
                <button key={t.id} type="button" className="btn btn-sm btn-outline-secondary radius-12" onClick={() => handleApplyTemplate(t.id)} disabled={!!actioning}>
                  {actioning === `template-${t.id}` ? "..." : t.name || `Template ${t.id}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Attachments */}
      <div className="card radius-12 mb-3">
        <div className="card-header"><h6 className="mb-0">Attachments</h6></div>
        <div className="card-body">
          <ul className="list-unstyled mb-3">
            {(visit.attachments || []).map((a) => (
              <li key={a.id} className="mb-2">
                <a href={a.fileUrl} target="_blank" rel="noopener noreferrer">{a.fileName || a.fileUrl}</a>
                {a.note && <span className="text-muted small ms-2">{a.note}</span>}
              </li>
            ))}
          </ul>
          <form onSubmit={handleAddAttachment} className="row g-2 align-items-end">
            <div className="col-md-4"><input type="url" className="form-control form-control-sm" placeholder="File URL" value={attachmentForm.fileUrl} onChange={(e) => setAttachmentForm((f) => ({ ...f, fileUrl: e.target.value }))} required /></div>
            <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="File name" value={attachmentForm.fileName} onChange={(e) => setAttachmentForm((f) => ({ ...f, fileName: e.target.value }))} /></div>
            <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Note" value={attachmentForm.note} onChange={(e) => setAttachmentForm((f) => ({ ...f, note: e.target.value }))} /></div>
            <div className="col-auto"><button type="submit" className="btn btn-sm btn-primary radius-12" disabled={!!actioning}>{actioning === "attachment" ? "..." : "Add"}</button></div>
          </form>
        </div>
      </div>

      {/* Discharge */}
      <div className="card radius-12 mb-3">
        <div className="card-header"><h6 className="mb-0">Discharge note</h6></div>
        <div className="card-body">
          <form onSubmit={handleDischarge} className="mb-2">
            <textarea className="form-control form-control-sm mb-2" rows={2} placeholder='{"instructions":"","followUp":""}' value={dischargeForm.contentJson} onChange={(e) => setDischargeForm((f) => ({ ...f, contentJson: e.target.value }))} />
            <button type="submit" className="btn btn-sm btn-primary radius-12" disabled={!!actioning}>{actioning === "discharge" ? "..." : "Add discharge note"}</button>
          </form>
        </div>
      </div>

      <div className="d-flex gap-2">
        <Link href={`/clinic/prescriptions${visitQ}${visitId ? `&visitId=${visitId}` : ""}`} className="btn btn-sm btn-outline-primary radius-12">Prescriptions</Link>
        <Link href={`/clinic/billing${visitQ}${visitId ? `&visitId=${visitId}` : ""}`} className="btn btn-sm btn-outline-primary radius-12">Billing</Link>
      </div>
    </div>
  );
}
