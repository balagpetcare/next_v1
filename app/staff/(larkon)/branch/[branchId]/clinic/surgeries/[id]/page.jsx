"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicSurgeryGet,
  staffClinicSurgeryUpdate,
  staffClinicSurgeryStatus,
  staffClinicSurgeryAddStaff,
  staffClinicSurgeryUpdateStaff,
  staffClinicSurgeryRemoveStaff,
  staffClinicSurgeryChecklistGet,
  staffClinicSurgeryChecklistAdd,
  staffClinicSurgeryChecklistUpdate,
  staffClinicSurgeryConsumablesList,
  staffClinicSurgeryConsumablesPlan,
  staffClinicSurgeryBillingGet,
  staffClinicSurgeryEstimateCreate,
  staffClinicSurgeryFinalizeBill,
  staffClinicSurgeryPayoutsList,
  staffClinicDoctorsEnriched,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace } from "@/src/components/dashboard";
import { staffClinicPatientDetailPath } from "@/lib/staffClinicPatientRoutes";

const SURGERY_PERMS = ["clinic.surgery.read", "clinic.surgery.create", "clinic.surgery.manage"];
const ALLOWED_TRANSITIONS = {
  DRAFT: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["PRE_OP", "CANCELLED"],
  PRE_OP: ["READY_FOR_OT", "CANCELLED"],
  READY_FOR_OT: ["IN_PROGRESS"],
  IN_PROGRESS: ["POST_OP"],
  POST_OP: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};
const STAFF_ROLES = ["PRIMARY_SURGEON", "ASSISTANT_SURGEON", "ANESTHETIST", "OT_NURSE", "TECHNICIAN"];

export default function StaffBranchClinicSurgeryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const id = useMemo(() => (params?.id && params.id !== "new" ? Number(params.id) : null), [params?.id]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [doctors, setDoctors] = useState([]);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [toStatus, setToStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [addStaffBranchMemberId, setAddStaffBranchMemberId] = useState("");
  const [addStaffRole, setAddStaffRole] = useState("ASSISTANT_SURGEON");
  const [addStaffSubmitting, setAddStaffSubmitting] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [editStaffRole, setEditStaffRole] = useState("");
  const [editStaffSubmitting, setEditStaffSubmitting] = useState(false);
  const [checklistItems, setChecklistItems] = useState([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [newChecklistPhase, setNewChecklistPhase] = useState("PRE_OP");
  const [newChecklistLabel, setNewChecklistLabel] = useState("");
  const [addChecklistSubmitting, setAddChecklistSubmitting] = useState(false);
  const [consumables, setConsumables] = useState({ items: [] });
  const [consumablesLoading, setConsumablesLoading] = useState(false);
  const [billingSummary, setBillingSummary] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [estimateSubmitting, setEstimateSubmitting] = useState(false);
  const [finalizeSubmitting, setFinalizeSubmitting] = useState(false);
  const [payouts, setPayouts] = useState({ items: [] });
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [notesForm, setNotesForm] = useState({ preopNotes: "", operativeNotes: "", postopNotes: "", complicationNotes: "" });
  const [notesSaving, setNotesSaving] = useState(false);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = SURGERY_PERMS.some((p) => permissions.includes(p));
  const hasManage = permissions.includes("clinic.surgery.manage");

  const loadCase = useCallback(() => {
    if (!branchId || !id) return;
    setLoading(true);
    setError("");
    staffClinicSurgeryGet(branchId, id)
      .then((data) => {
        setCaseData(data ?? null);
        setError("");
      })
      .catch(() => {
        setCaseData(null);
        setError("Surgery case not found.");
      })
      .finally(() => setLoading(false));
  }, [branchId, id]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  useEffect(() => {
    if (caseData) {
      setNotesForm({
        preopNotes: caseData.preopNotes ?? "",
        operativeNotes: caseData.operativeNotes ?? "",
        postopNotes: caseData.postopNotes ?? "",
        complicationNotes: caseData.complicationNotes ?? "",
      });
    }
  }, [caseData?.id]);

  useEffect(() => {
    if (!branchId) return;
    staffClinicDoctorsEnriched(branchId, { limit: 200 })
      .then((res) => setDoctors(res?.items ?? []))
      .catch(() => setDoctors([]));
  }, [branchId]);

  const loadChecklist = useCallback((phase) => {
    if (!branchId || !id) return;
    setChecklistLoading(true);
    staffClinicSurgeryChecklistGet(branchId, id, phase ? { phase } : undefined)
      .then((d) => setChecklistItems(d?.items ?? []))
      .catch(() => setChecklistItems([]))
      .finally(() => setChecklistLoading(false));
  }, [branchId, id]);

  const loadConsumables = useCallback(() => {
    if (!branchId || !id) return;
    setConsumablesLoading(true);
    staffClinicSurgeryConsumablesList(branchId, id)
      .then((d) => setConsumables(d ?? { items: [] }))
      .catch(() => setConsumables({ items: [] }))
      .finally(() => setConsumablesLoading(false));
  }, [branchId, id]);

  useEffect(() => {
    if (activeTab === "preop" || activeTab === "postop") loadChecklist(activeTab === "preop" ? "PRE_OP" : "POST_OP");
  }, [activeTab, loadChecklist]);

  useEffect(() => {
    if (activeTab === "consumables") loadConsumables();
  }, [activeTab, loadConsumables]);

  const loadBilling = useCallback(() => {
    if (!branchId || !id) return;
    setBillingLoading(true);
    staffClinicSurgeryBillingGet(branchId, id)
      .then((d) => setBillingSummary(d ?? null))
      .catch(() => setBillingSummary(null))
      .finally(() => setBillingLoading(false));
  }, [branchId, id]);

  const loadPayouts = useCallback(() => {
    if (!branchId || !id) return;
    setPayoutsLoading(true);
    staffClinicSurgeryPayoutsList(branchId, id)
      .then((d) => setPayouts(d ?? { items: [] }))
      .catch(() => setPayouts({ items: [] }))
      .finally(() => setPayoutsLoading(false));
  }, [branchId, id]);

  useEffect(() => {
    if (activeTab === "billing") loadBilling();
  }, [activeTab, loadBilling]);

  useEffect(() => {
    if (activeTab === "payouts") loadPayouts();
  }, [activeTab, loadPayouts]);

  const handleCreateEstimate = useCallback(() => {
    if (!branchId || !id) return;
    setEstimateSubmitting(true);
    staffClinicSurgeryEstimateCreate(branchId, id, {})
      .then(() => loadBilling())
      .catch((e) => setError(e?.message || "Failed to create estimate"))
      .finally(() => setEstimateSubmitting(false));
  }, [branchId, id, loadBilling]);

  const handleFinalizeBill = useCallback(() => {
    if (!branchId || !id) return;
    setFinalizeSubmitting(true);
    staffClinicSurgeryFinalizeBill(branchId, id)
      .then(() => { loadBilling(); loadPayouts(); })
      .catch((e) => setError(e?.message || "Failed to finalize"))
      .finally(() => setFinalizeSubmitting(false));
  }, [branchId, id, loadBilling, loadPayouts]);

  const handleAddChecklistItem = useCallback(() => {
    if (!branchId || !id || !newChecklistLabel.trim()) return;
    setAddChecklistSubmitting(true);
    const phase = activeTab === "postop" ? "POST_OP" : "PRE_OP";
    staffClinicSurgeryChecklistAdd(branchId, id, { phase, itemLabel: newChecklistLabel.trim() })
      .then(() => {
        setNewChecklistLabel("");
        loadChecklist(phase);
      })
      .catch((e) => setError(e?.message || "Failed to add item"))
      .finally(() => setAddChecklistSubmitting(false));
  }, [branchId, id, newChecklistLabel, activeTab, loadChecklist]);

  const handleToggleChecklistItem = useCallback((item, completed) => {
    if (!branchId || !id) return;
    staffClinicSurgeryChecklistUpdate(branchId, id, item.id, { isCompleted: completed })
      .then(() => loadChecklist(activeTab === "postop" ? "POST_OP" : "PRE_OP"))
      .catch((e) => setError(e?.message || "Failed to update"));
  }, [branchId, id, activeTab, loadChecklist]);

  const handleSaveNotes = useCallback(() => {
    if (!branchId || !id) return;
    setNotesSaving(true);
    staffClinicSurgeryUpdate(branchId, id, notesForm)
      .then((updated) => {
        setCaseData(updated ?? caseData);
        setError("");
      })
      .catch((e) => setError(e?.message || "Failed to save notes"))
      .finally(() => setNotesSaving(false));
  }, [branchId, id, notesForm, caseData]);

  const nextStatusOptions = useMemo(() => {
    if (!caseData?.status) return [];
    return ALLOWED_TRANSITIONS[caseData.status] || [];
  }, [caseData?.status]);

  const handleStatusTransition = useCallback(() => {
    if (!branchId || !id || !toStatus) return;
    setStatusSubmitting(true);
    setError("");
    staffClinicSurgeryStatus(branchId, id, { toStatus, reason: statusReason || undefined })
      .then((updated) => {
        setCaseData(updated ?? caseData);
        setToStatus("");
        setStatusReason("");
      })
      .catch((e) => setError(e?.message || "Status update failed"))
      .finally(() => setStatusSubmitting(false));
  }, [branchId, id, toStatus, statusReason, caseData]);

  const handleAddStaff = useCallback(() => {
    const branchMemberId = Number(addStaffBranchMemberId);
    if (!branchId || !id || !Number.isFinite(branchMemberId)) return;
    setAddStaffSubmitting(true);
    setError("");
    staffClinicSurgeryAddStaff(branchId, id, { branchMemberId, role: addStaffRole })
      .then((updated) => {
        setCaseData(updated ?? caseData);
        setShowAddStaff(false);
        setAddStaffBranchMemberId("");
        setAddStaffRole("ASSISTANT_SURGEON");
      })
      .catch((e) => setError(e?.message || "Failed to add staff"))
      .finally(() => setAddStaffSubmitting(false));
  }, [branchId, id, addStaffBranchMemberId, addStaffRole, caseData]);

  const handleUpdateStaff = useCallback(
    (staffRow) => {
      if (!branchId || !id || !editingStaffId || editingStaffId !== staffRow.id) return;
      setEditStaffSubmitting(true);
      setError("");
      staffClinicSurgeryUpdateStaff(branchId, id, staffRow.id, { role: editStaffRole })
        .then((updated) => {
          setCaseData(updated ?? caseData);
          setEditingStaffId(null);
        })
        .catch((e) => setError(e?.message || "Failed to update staff"))
        .finally(() => setEditStaffSubmitting(false));
    },
    [branchId, id, editingStaffId, editStaffRole, caseData]
  );

  const handleRemoveStaff = useCallback(
    (staffRow) => {
      if (!branchId || !id || !window.confirm("Remove this staff assignment?")) return;
      staffClinicSurgeryRemoveStaff(branchId, id, staffRow.id)
        .then((updated) => setCaseData(updated ?? caseData))
        .catch((e) => setError(e?.message || "Failed to remove staff"));
    },
    [branchId, id, caseData]
  );

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
        missingPerm="clinic.surgery.read"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic/surgeries`)}
      />
    );
  }

  if (id == null) {
    return (
      <PageWorkspace>
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="alert alert-warning">
          Invalid surgery ID.
          <Link href={`/staff/branch/${branchId}/clinic/surgeries`} className="btn btn-sm btn-outline-secondary ms-2">
            ← Surgeries
          </Link>
        </div>
      </PageWorkspace>
    );
  }

  if (loading && !caseData) {
    return (
      <PageWorkspace>
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="py-24 text-center text-secondary-light">Loading surgery...</div>
      </PageWorkspace>
    );
  }

  if (error && !caseData) {
    return (
      <PageWorkspace>
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="alert alert-danger">
          {error}
          <div className="mt-2 d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={loadCase}>
              Retry
            </button>
            <Link href={`/staff/branch/${branchId}/clinic/surgeries`} className="btn btn-sm btn-outline-secondary">
              ← Surgeries
            </Link>
          </div>
        </div>
      </PageWorkspace>
    );
  }

  const c = caseData;
  const petName = c?.pet?.name ?? (c?.petId ? `Pet #${c.petId}` : "—");
  const ownerName = c?.patient?.profile?.displayName ?? "—";
  const primaryDoctorName = c?.primaryDoctor?.user?.profile?.displayName ?? "—";
  const staffList = c?.staff ?? [];

  return (
    <PageWorkspace>
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}/clinic/surgeries`} className="btn btn-outline-secondary btn-sm">
          ← Surgeries
        </Link>
        {c?.appointmentId && (
          <Link
            href={`/staff/branch/${branchId}/clinic/appointments`}
            className="btn btn-outline-secondary btn-sm"
          >
            Appointment #{c.appointmentId}
          </Link>
        )}
        {c?.visitId && (
          <Link
            href={`/staff/branch/${branchId}/clinic/visits/${c.visitId}`}
            className="btn btn-outline-secondary btn-sm"
          >
            Visit #{c.visitId}
          </Link>
        )}
        <h5 className="mb-0">{c?.caseNumber ?? `Surgery #${id}`}</h5>
      </div>

      {error && <div className="alert alert-danger mb-16">{error}</div>}

      <ul className="nav nav-tabs mb-3" role="tablist">
        <li className="nav-item">
          <button type="button" className={`nav-link ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>Overview</button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${activeTab === "team" ? "active" : ""}`} onClick={() => setActiveTab("team")}>Team</button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${activeTab === "preop" ? "active" : ""}`} onClick={() => setActiveTab("preop")}>Pre-op</button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${activeTab === "postop" ? "active" : ""}`} onClick={() => setActiveTab("postop")}>Post-op</button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${activeTab === "consumables" ? "active" : ""}`} onClick={() => setActiveTab("consumables")}>Consumables</button>
        </li>
        {permissions.some((p) => ["clinic.surgery.read", "clinic.surgery.billing"].includes(p)) && (
          <li className="nav-item">
            <button type="button" className={`nav-link ${activeTab === "billing" ? "active" : ""}`} onClick={() => setActiveTab("billing")}>Billing</button>
          </li>
        )}
        {permissions.includes("clinic.surgery.payout") && (
          <li className="nav-item">
            <button type="button" className={`nav-link ${activeTab === "payouts" ? "active" : ""}`} onClick={() => setActiveTab("payouts")}>Payouts</button>
          </li>
        )}
      </ul>

      {activeTab === "overview" && (
        <div className="row g-3">
          <div className="col-12 col-lg-6">
            <Card title="Case details" subtitle="">
              <dl className="row mb-0 small">
                <dt className="col-sm-4">Case number</dt>
                <dd className="col-sm-8"><code>{c?.caseNumber}</code></dd>
                <dt className="col-sm-4">Status</dt>
                <dd className="col-sm-8">
                  <span
                    className={`badge ${
                      c?.status === "COMPLETED" ? "bg-success" : c?.status === "CANCELLED" ? "bg-secondary" : "bg-light text-dark"
                    }`}
                  >
                    {c?.status}
                  </span>
                </dd>
                <dt className="col-sm-4">Pet</dt>
                <dd className="col-sm-8">
                  {c?.petId ? (
                    <Link href={staffClinicPatientDetailPath(branchId, c.petId)}>{petName}</Link>
                  ) : (
                    petName
                  )}
                </dd>
                <dt className="col-sm-4">Owner</dt>
                <dd className="col-sm-8">{ownerName}</dd>
                <dt className="col-sm-4">Primary surgeon</dt>
                <dd className="col-sm-8">{primaryDoctorName}</dd>
                <dt className="col-sm-4">Service</dt>
                <dd className="col-sm-8">{c?.service?.name ?? "—"}</dd>
                <dt className="col-sm-4">OT room</dt>
                <dd className="col-sm-8">{c?.room?.name ?? c?.room?.code ?? "—"}</dd>
                <dt className="col-sm-4">Scheduled start</dt>
                <dd className="col-sm-8">
                  {c?.scheduledStartAt
                    ? new Date(c.scheduledStartAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
                    : "—"}
                </dd>
                <dt className="col-sm-4">Scheduled end</dt>
                <dd className="col-sm-8">
                  {c?.scheduledEndAt
                    ? new Date(c.scheduledEndAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
                    : "—"}
                </dd>
              </dl>
            </Card>
          </div>
          <div className="col-12 col-lg-6">
            {hasManage && nextStatusOptions.length > 0 && (
              <Card title="Status transition" subtitle="">
                <div className="d-flex flex-wrap gap-2 align-items-end">
                  <div>
                    <label className="form-label small mb-1">To status</label>
                    <select
                      className="form-select form-select-sm"
                      style={{ width: "160px" }}
                      value={toStatus}
                      onChange={(e) => setToStatus(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {nextStatusOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label small mb-1">Reason (optional)</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      style={{ width: "180px" }}
                      placeholder="Reason"
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={!toStatus || statusSubmitting}
                    onClick={handleStatusTransition}
                  >
                    {statusSubmitting ? "Updating…" : "Transition"}
                  </button>
                </div>
              </Card>
            )}
            <Card title="Timeline" subtitle="Recent status changes">
              {c?.statusLogs?.length > 0 ? (
                <ul className="list-unstyled mb-0 small">
                  {c.statusLogs.slice(0, 10).map((log) => (
                    <li key={log.id} className="mb-2 pb-2 border-bottom">
                      <span className="text-muted">
                        {log.toStatus}
                        {log.createdAt ? ` · ${new Date(log.createdAt).toLocaleString()}` : ""}
                        {log.changedBy?.profile?.displayName ? ` · ${log.changedBy.profile.displayName}` : ""}
                      </span>
                      {log.reason && <div className="text-secondary">{log.reason}</div>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted small mb-0">No status history.</p>
              )}
            </Card>
          </div>
          <div className="col-12">
            <Card title="Clinical notes" subtitle="Pre-op, operative, post-op, complications.">
              {hasManage ? (
                <>
                  <div className="row g-2 mb-2">
                    <div className="col-12 col-md-6">
                      <label className="form-label small">Pre-op notes</label>
                      <textarea className="form-control form-control-sm" rows={2} value={notesForm.preopNotes} onChange={(e) => setNotesForm((f) => ({ ...f, preopNotes: e.target.value }))} />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small">Operative notes</label>
                      <textarea className="form-control form-control-sm" rows={2} value={notesForm.operativeNotes} onChange={(e) => setNotesForm((f) => ({ ...f, operativeNotes: e.target.value }))} />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small">Post-op notes</label>
                      <textarea className="form-control form-control-sm" rows={2} value={notesForm.postopNotes} onChange={(e) => setNotesForm((f) => ({ ...f, postopNotes: e.target.value }))} />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small">Complication notes</label>
                      <textarea className="form-control form-control-sm" rows={2} value={notesForm.complicationNotes} onChange={(e) => setNotesForm((f) => ({ ...f, complicationNotes: e.target.value }))} />
                    </div>
                  </div>
                  <button type="button" className="btn btn-primary btn-sm" disabled={notesSaving} onClick={handleSaveNotes}>{notesSaving ? "Saving…" : "Save notes"}</button>
                </>
              ) : (
                <dl className="row mb-0 small">
                  {notesForm.preopNotes && <><dt className="col-sm-3">Pre-op</dt><dd className="col-sm-9">{notesForm.preopNotes}</dd></>}
                  {notesForm.operativeNotes && <><dt className="col-sm-3">Operative</dt><dd className="col-sm-9">{notesForm.operativeNotes}</dd></>}
                  {notesForm.postopNotes && <><dt className="col-sm-3">Post-op</dt><dd className="col-sm-9">{notesForm.postopNotes}</dd></>}
                  {notesForm.complicationNotes && <><dt className="col-sm-3">Complications</dt><dd className="col-sm-9">{notesForm.complicationNotes}</dd></>}
                  {!notesForm.preopNotes && !notesForm.operativeNotes && !notesForm.postopNotes && !notesForm.complicationNotes && <p className="text-muted mb-0">No notes recorded.</p>}
                </dl>
              )}
            </Card>
          </div>
        </div>
      )}

      {activeTab === "team" && (
        <Card title="Surgery team" subtitle="Staff assigned to this case.">
          {hasManage && (
            <div className="mb-16">
              {!showAddStaff ? (
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => setShowAddStaff(true)}
                >
                  Add staff
                </button>
              ) : (
                <div className="d-flex flex-wrap gap-2 align-items-end p-2 bg-light rounded">
                  <select
                    className="form-select form-select-sm"
                    style={{ width: "200px" }}
                    value={addStaffBranchMemberId}
                    onChange={(e) => setAddStaffBranchMemberId(e.target.value)}
                  >
                    <option value="">Select member…</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.user?.profile?.displayName ?? d.displayName ?? `Member #${d.id}`}
                      </option>
                    ))}
                  </select>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: "160px" }}
                    value={addStaffRole}
                    onChange={(e) => setAddStaffRole(e.target.value)}
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={!addStaffBranchMemberId || addStaffSubmitting}
                    onClick={handleAddStaff}
                  >
                    {addStaffSubmitting ? "Adding…" : "Add"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => { setShowAddStaff(false); setAddStaffBranchMemberId(""); }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  {hasManage && <th></th>}
                </tr>
              </thead>
              <tbody>
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan={hasManage ? 3 : 2} className="text-muted">No additional staff. Primary surgeon is set on the case.</td>
                  </tr>
                ) : (
                  staffList.map((row) => (
                    <tr key={row.id}>
                      <td>{row.branchMember?.user?.profile?.displayName ?? `Member #${row.branchMemberId}`}</td>
                      <td>
                        {editingStaffId === row.id ? (
                          <select
                            className="form-select form-select-sm"
                            style={{ width: "160px" }}
                            value={editStaffRole}
                            onChange={(e) => setEditStaffRole(e.target.value)}
                          >
                            {STAFF_ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        ) : (
                          row.role
                        )}
                      </td>
                      {hasManage && (
                        <td>
                          {editingStaffId === row.id ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-primary me-1"
                                disabled={editStaffSubmitting}
                                onClick={() => handleUpdateStaff(row)}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setEditingStaffId(null)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary me-1"
                                onClick={() => {
                                  setEditingStaffId(row.id);
                                  setEditStaffRole(row.role || "ASSISTANT_SURGEON");
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleRemoveStaff(row)}
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {(activeTab === "preop" || activeTab === "postop") && (
        <Card title={activeTab === "preop" ? "Pre-op checklist" : "Post-op checklist"} subtitle="">
          {hasManage && (
            <div className="mb-16 d-flex gap-2 align-items-end flex-wrap">
              <input
                type="text"
                className="form-control form-control-sm"
                style={{ width: "240px" }}
                placeholder="New item label"
                value={newChecklistLabel}
                onChange={(e) => setNewChecklistLabel(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!newChecklistLabel.trim() || addChecklistSubmitting}
                onClick={handleAddChecklistItem}
              >
                {addChecklistSubmitting ? "Adding…" : "Add item"}
              </button>
            </div>
          )}
          {checklistLoading ? (
            <div className="text-center py-16"><div className="spinner-border text-primary" role="status" /></div>
          ) : (
            <ul className="list-group list-group-flush">
              {checklistItems.length === 0 ? (
                <li className="list-group-item text-muted">No items. {hasManage && "Add one above."}</li>
              ) : (
                checklistItems.map((item) => (
                  <li key={item.id} className="list-group-item d-flex align-items-center gap-2">
                    {hasManage ? (
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={!!item.isCompleted}
                        onChange={() => handleToggleChecklistItem(item, !item.isCompleted)}
                      />
                    ) : (
                      item.isCompleted && <span className="text-success">✓</span>
                    )}
                    <span className={item.isCompleted ? "text-decoration-line-through text-muted" : ""}>{item.itemLabel}</span>
                    {item.completedAt && (
                      <span className="small text-muted ms-auto">
                        {new Date(item.completedAt).toLocaleString()}
                        {item.completedBy?.profile?.displayName && ` · ${item.completedBy.profile.displayName}`}
                      </span>
                    )}
                  </li>
                ))
              )}
            </ul>
          )}
        </Card>
      )}

      {activeTab === "consumables" && (
        <Card title="Consumables" subtitle="Planned and recorded consumables for this surgery.">
          {consumablesLoading ? (
            <div className="text-center py-16"><div className="spinner-border text-primary" role="status" /></div>
          ) : (
            <>
              {consumables.items?.length === 0 ? (
                <p className="text-muted mb-0">No consumables recorded. Use inventory or pharmacy flow to plan consumables for this case.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Mode</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Items</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consumables.items.map((cons) => (
                        <tr key={cons.id}>
                          <td>{cons.mode ?? "—"}</td>
                          <td>{cons.status ?? "—"}</td>
                          <td>{cons.createdAt ? new Date(cons.createdAt).toLocaleString() : "—"}</td>
                          <td>
                            {cons.items?.length > 0 ? (
                              <ul className="list-unstyled mb-0 small">
                                {cons.items.map((it, i) => (
                                  <li key={it.id ?? i}>
                                    {it.clinicalItem?.name ?? it.product?.name ?? `Item #${it.id}`}: {it.quantityPlanned ?? it.quantityActual ?? "—"}
                                  </li>
                                ))}
                              </ul>
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {activeTab === "billing" && (
        <Card title="Billing" subtitle="Estimate and finalize billing for this surgery.">
          {billingLoading ? (
            <div className="text-center py-16"><div className="spinner-border text-primary" role="status" /></div>
          ) : (
            <>
              {billingSummary?.invoice ? (
                <div className="mb-16">
                  <p className="mb-2">Status: <strong>{billingSummary.invoice.billingStatus ?? "—"}</strong></p>
                  <p className="mb-2 small">Order: {billingSummary.invoice.order?.orderNumber ?? "—"} · Total: {billingSummary.invoice.order?.totalAmount ?? "—"}</p>
                  <p className="mb-2 small">Doctor fee: {billingSummary.invoice.doctorFeeAmount ?? "—"} · Clinic share: {billingSummary.invoice.clinicShareAmount ?? "—"}</p>
                  {billingSummary.invoice.billingStatus !== "FINALIZED" && permissions.includes("clinic.surgery.billing") && (
                    <button type="button" className="btn btn-primary btn-sm" disabled={finalizeSubmitting} onClick={handleFinalizeBill}>
                      {finalizeSubmitting ? "Finalizing…" : "Finalize bill"}
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-muted mb-2">No invoice yet. Create an estimate to generate an order and invoice.</p>
                  {permissions.includes("clinic.surgery.billing") && (
                    <button type="button" className="btn btn-primary btn-sm" disabled={estimateSubmitting} onClick={handleCreateEstimate}>
                      {estimateSubmitting ? "Creating…" : "Create estimate"}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {activeTab === "payouts" && (
        <Card title="Payouts" subtitle="Settlement ledger entries for this surgery.">
          {payoutsLoading ? (
            <div className="text-center py-16"><div className="spinner-border text-primary" role="status" /></div>
          ) : (
            <>
              {payouts.items?.length === 0 ? (
                <p className="text-muted mb-0">No payout entries. Finalize the bill to generate ledger entries.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Role</th>
                        <th>Gross</th>
                        <th>Doctor share</th>
                        <th>Clinic share</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.items.map((row) => (
                        <tr key={row.id}>
                          <td>{row.staffRole ?? "—"}</td>
                          <td>{row.grossAmount ?? "—"}</td>
                          <td>{row.doctorShare ?? "—"}</td>
                          <td>{row.clinicShare ?? "—"}</td>
                          <td>{row.settlementStatus ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </PageWorkspace>
  );
}
