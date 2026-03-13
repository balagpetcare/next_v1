"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicRecordDose,
  staffClinicValidateInjectionToken,
  staffClinicInjectionTokenWithContext,
  staffClinicVialSessionsList,
  staffClinicDoseByVisit,
  staffClinicInjectionRoomBoard,
  staffClinicRoomsList,
} from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageHeader, DetailDrawer, LoadingState, StatusBadge } from "@/src/components/dashboard";
import type { InjectionToken, TokenContext, VialSessionListItem, MedicineSource } from "@/src/types/clinicMedicineControl";

const PERMS = ["medicine.dose.record", "injection.token.validate", "injection.token.emergency_bypass"];

const MEDICINE_SOURCE_OPTIONS: { value: MedicineSource; label: string }[] = [
  { value: "INTERNAL", label: "Internal" },
  { value: "OUTSIDE", label: "Outside" },
  { value: "EXTERNAL", label: "External" },
];

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

const STEPS = [
  { key: "validate", label: "Validate token" },
  { key: "summary", label: "Patient & medicine" },
  { key: "source", label: "Source / vial" },
  { key: "record", label: "Record dose" },
];

export default function InjectionRoomPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = PERMS.some((p) => permissions.includes(p));
  const canBypass = permissions.includes("injection.token.emergency_bypass");

  const [step, setStep] = useState<number>(1);
  const [tokenCode, setTokenCode] = useState("");
  const [tokenPayload, setTokenPayload] = useState<InjectionToken | null>(null);
  const [tokenContext, setTokenContext] = useState<TokenContext | null>(null);
  const [validating, setValidating] = useState(false);
  const [validateError, setValidateError] = useState<string | null>(null);

  const [vialSessions, setVialSessions] = useState<VialSessionListItem[]>([]);
  const [vialLoading, setVialLoading] = useState(false);
  const [vialSessionId, setVialSessionId] = useState<string>("");
  const [administeredDose, setAdministeredDose] = useState("");
  const [prescribedDose, setPrescribedDose] = useState("");
  const [unit, setUnit] = useState("ml");
  const [route, setRoute] = useState("INJECTION");
  const [medicineSource, setMedicineSource] = useState<MedicineSource>("INTERNAL");
  const [saving, setSaving] = useState(false);

  const [emergencyBypassModal, setEmergencyBypassModal] = useState(false);
  const [bypassReason, setBypassReason] = useState("");
  const [bypassPatientId, setBypassPatientId] = useState("");
  const [bypassVariantId, setBypassVariantId] = useState("");
  const [bypassVisitId, setBypassVisitId] = useState("");
  const [bypassDose, setBypassDose] = useState("");
  const [bypassUnit, setBypassUnit] = useState("ml");
  const [doseHistoryOpen, setDoseHistoryOpen] = useState(false);
  const [doseHistory, setDoseHistory] = useState<any[]>([]);
  const [doseHistoryLoading, setDoseHistoryLoading] = useState(false);

  const [boardTab, setBoardTab] = useState<"pending" | "unassigned" | "completed" | "bypass" | "expired">("pending");
  const [boardRoomId, setBoardRoomId] = useState<number | null>(null);
  const [boardValidatedByMe, setBoardValidatedByMe] = useState(false);
  const [boardAdministeredByMe, setBoardAdministeredByMe] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [board, setBoard] = useState<{
    date: string;
    pendingTokens: any[];
    unassignedTokens: any[];
    completedToday: any[];
    bypassToday: any[];
    expiredOrProblemToday: any[];
  } | null>(null);
  const [boardLoading, setBoardLoading] = useState(false);

  const validateToken = useCallback(async () => {
    if (!branchId || !tokenCode.trim()) return;
    setValidateError(null);
    try {
      setValidating(true);
      const result = await staffClinicValidateInjectionToken(branchId, tokenCode.trim());
      const token = result?.token ?? null;
      if (!result?.valid || !token) {
        setValidateError(result?.reason ?? "Token not found or invalid");
        setTokenPayload(null);
        setTokenContext(null);
        toast.error(result?.reason ?? "Token validation failed");
        return;
      }
      setTokenPayload(token);
      setTokenContext(null);
      setPrescribedDose(String(token.expectedDose ?? ""));
      setAdministeredDose(String(token.expectedDose ?? ""));
      setUnit(String(token.unit ?? "ml"));
      setMedicineSource((token.medicineSource ?? "INTERNAL") as MedicineSource);
      if (token.selectedVialSessionId) setVialSessionId(String(token.selectedVialSessionId));
      else setVialSessionId("");
      if (token.id) {
        const ctx = await staffClinicInjectionTokenWithContext(branchId, token.id);
        setTokenContext(ctx ?? null);
      }
      setStep(2);
      toast.success(result.alreadyValidated ? "Token was already validated — ready to inject" : "Token validated");
    } catch (e) {
      const msg = (e as Error)?.message || "Token validation failed";
      setValidateError(msg);
      setTokenPayload(null);
      setTokenContext(null);
      toast.error(msg);
    } finally {
      setValidating(false);
    }
  }, [branchId, tokenCode]);

  useEffect(() => {
    if (!branchId || !tokenPayload?.variantId || step < 3) return;
    setVialLoading(true);
    staffClinicVialSessionsList(branchId, { status: "ACTIVE", variantId: tokenPayload.variantId, take: 20 })
      .then((r) => setVialSessions(r.list ?? []))
      .catch(() => setVialSessions([]))
      .finally(() => setVialLoading(false));
  }, [branchId, tokenPayload?.variantId, step]);

  const loadBoard = useCallback(() => {
    if (!branchId) return;
    setBoardLoading(true);
    staffClinicInjectionRoomBoard(branchId, {
      roomId: boardRoomId ?? undefined,
      validatedByMe: boardValidatedByMe || undefined,
      administeredByMe: boardAdministeredByMe || undefined,
    })
      .then((d) => setBoard(d ?? null))
      .catch(() => setBoard(null))
      .finally(() => setBoardLoading(false));
  }, [branchId, boardRoomId, boardValidatedByMe, boardAdministeredByMe]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    if (!branchId) return;
    staffClinicRoomsList(branchId)
      .then((r) => setRooms(r?.items ?? []))
      .catch(() => setRooms([]));
  }, [branchId]);

  const loadDoseHistory = useCallback(() => {
    if (!branchId || !tokenPayload?.visitId) return;
    setDoseHistoryOpen(true);
    setDoseHistoryLoading(true);
    staffClinicDoseByVisit(branchId, tokenPayload.visitId)
      .then(setDoseHistory)
      .catch(() => setDoseHistory([]))
      .finally(() => setDoseHistoryLoading(false));
  }, [branchId, tokenPayload?.visitId]);

  const submitDose = useCallback(
    async (e: FormEvent, isBypass: boolean = false) => {
      e.preventDefault();
      if (!branchId || !tokenPayload) return;
      const doseNum = Number(administeredDose);
      if (!tokenPayload.patientId || !tokenPayload.variantId || !Number.isFinite(doseNum) || doseNum <= 0) {
        toast.error("Patient, variant, and a valid administered dose are required");
        return;
      }
      if (isBypass && !canBypass) {
        toast.error("Emergency bypass permission required");
        return;
      }
      try {
        setSaving(true);
        await staffClinicRecordDose(branchId, {
          patientId: Number(tokenPayload.patientId),
          visitId: tokenPayload.visitId ? Number(tokenPayload.visitId) : undefined,
          variantId: Number(tokenPayload.variantId),
          vialSessionId: vialSessionId ? Number(vialSessionId) : undefined,
          injectionTokenId: isBypass ? undefined : tokenPayload.id,
          medicineSource,
          prescribedDose: prescribedDose ? Number(prescribedDose) : undefined,
          administeredDose: doseNum,
          unit,
          route,
          emergencyBypass: isBypass || undefined,
          emergencyBypassReason: isBypass && bypassReason.trim() ? bypassReason.trim() : undefined,
        });
        toast.success("Dose recorded successfully");
        setTokenCode("");
        setTokenPayload(null);
        setTokenContext(null);
        setVialSessionId("");
        setStep(1);
        setEmergencyBypassModal(false);
        setBypassReason("");
        loadBoard();
      } catch (e) {
        const msg = (e as Error)?.message || "Failed to record dose";
        if (msg.includes("ROOM_MISMATCH") || msg.includes("different room")) {
          toast.error("Selected vial is in a different room than the token's pre-selected vial. Use the vial assigned to this token or record in the correct room.");
        } else {
          toast.error(msg);
        }
      } finally {
        setSaving(false);
      }
    },
    [branchId, tokenPayload, vialSessionId, medicineSource, prescribedDose, administeredDose, unit, route, canBypass, bypassReason, loadBoard]
  );

  const handleEmergencyBypassSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!branchId || !canBypass) return;
      if (!bypassReason.trim()) {
        toast.error("Please enter a reason for emergency bypass");
        return;
      }
      const patientIdNum = Number(bypassPatientId);
      const variantIdNum = Number(bypassVariantId);
      const doseNum = Number(bypassDose);
      if (!patientIdNum || !variantIdNum || !Number.isFinite(doseNum) || doseNum <= 0) {
        toast.error("Patient ID, variant ID, and administered dose are required");
        return;
      }
      try {
        setSaving(true);
        await staffClinicRecordDose(branchId, {
          patientId: patientIdNum,
          visitId: bypassVisitId ? Number(bypassVisitId) : undefined,
          variantId: variantIdNum,
          administeredDose: doseNum,
          unit: bypassUnit || "ml",
          route: "INJECTION",
          medicineSource: "INTERNAL",
          emergencyBypass: true,
          emergencyBypassReason: bypassReason.trim() || undefined,
        });
        toast.success("Dose recorded (emergency bypass)");
        setEmergencyBypassModal(false);
        setBypassReason("");
        setBypassPatientId("");
        setBypassVariantId("");
        setBypassVisitId("");
        setBypassDose("");
        loadBoard();
      } catch (err) {
        toast.error((err as Error)?.message || "Failed to record dose");
      } finally {
        setSaving(false);
      }
    },
    [branchId, canBypass, bypassReason, bypassPatientId, bypassVariantId, bypassVisitId, bypassDose, bypassUnit, loadBoard]
  );

  const resetWorkflow = useCallback(() => {
    setStep(1);
    setTokenCode("");
    setTokenPayload(null);
    setTokenContext(null);
    setValidateError(null);
    setVialSessionId("");
    setAdministeredDose("");
    setPrescribedDose("");
    setEmergencyBypassModal(false);
    setBypassReason("");
  }, []);

  const tokenExpired = tokenPayload?.expiresAt && new Date(tokenPayload.expiresAt) < new Date();
  const tokenNotPending = tokenPayload && tokenPayload.status !== "PENDING";

  if (isLoading) {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <LoadingState message="Loading…" />
      </div>
    );
  }
  if (!hasAccess) return <AccessDenied missingPerm="medicine.dose.record" onBack={() => window.history.back()} />;

  const breadcrumbs = [
    { label: "Staff", href: "/staff" },
    { label: "Branch", href: `/staff/branch/${branchId}` },
    { label: "Clinic", href: `/staff/branch/${branchId}/clinic` },
    { label: "Medicine Control", href: `/staff/branch/${branchId}/clinic/medicine-control` },
    { label: "Injection Room" },
  ];

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <PageHeader
        title="Injection Room"
        subtitle="Validate token and record dose administration. Follow the steps in order."
        breadcrumbs={breadcrumbs}
        actions={
          <Link href={`/staff/branch/${branchId}/clinic/medicine-control`} className="btn btn-outline-secondary btn-sm radius-8">
            ← Medicine Control
          </Link>
        }
      />

      <div className="mb-4">
        <div className="d-flex flex-wrap gap-2 align-items-center">
          {STEPS.map((s, i) => (
            <span
              key={s.key}
              className={`badge radius-8 ${i + 1 <= step ? "bg-primary" : "bg-secondary"}`}
            >
              {i + 1}. {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Operations board: pending / completed today / bypass / expired */}
      <div className="card radius-12 mb-4">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <h6 className="mb-0">Operations board</h6>
            <select
              className="form-select form-select-sm radius-8 w-auto"
              value={boardRoomId ?? ""}
              onChange={(e) => setBoardRoomId(e.target.value ? Number(e.target.value) : null)}
              title="Filter by room (pending tokens with selected vial in room)"
            >
              <option value="">All rooms</option>
              {rooms.map((r: any) => (
                <option key={r.id} value={String(r.id)}>{r.name ?? `Room #${r.id}`}</option>
              ))}
            </select>
            <label className="d-flex align-items-center gap-1 small mb-0">
              <input
                type="checkbox"
                className="form-check-input"
                checked={boardValidatedByMe}
                onChange={(e) => setBoardValidatedByMe(e.target.checked)}
              />
              Validated by me
            </label>
            <label className="d-flex align-items-center gap-1 small mb-0">
              <input
                type="checkbox"
                className="form-check-input"
                checked={boardAdministeredByMe}
                onChange={(e) => setBoardAdministeredByMe(e.target.checked)}
              />
              Administered by me
            </label>
          </div>
          <ul className="nav nav-tabs nav-tabs-sm mb-2">
            <li className="nav-item">
              <button type="button" className={`nav-link radius-8 ${boardTab === "pending" ? "active" : ""}`} onClick={() => setBoardTab("pending")}>
                Pending / ready
              </button>
            </li>
            <li className="nav-item">
              <button type="button" className={`nav-link radius-8 ${boardTab === "unassigned" ? "active" : ""}`} onClick={() => setBoardTab("unassigned")}>
                Unassigned (no room)
              </button>
            </li>
            <li className="nav-item">
              <button type="button" className={`nav-link radius-8 ${boardTab === "completed" ? "active" : ""}`} onClick={() => setBoardTab("completed")}>
                Completed today
              </button>
            </li>
            <li className="nav-item">
              <button type="button" className={`nav-link radius-8 ${boardTab === "bypass" ? "active" : ""}`} onClick={() => setBoardTab("bypass")}>
                Bypass cases
              </button>
            </li>
            <li className="nav-item">
              <button type="button" className={`nav-link radius-8 ${boardTab === "expired" ? "active" : ""}`} onClick={() => setBoardTab("expired")}>
                Expired / problem
              </button>
            </li>
          </ul>
          {boardLoading ? (
            <p className="text-muted small mb-0">Loading…</p>
          ) : board ? (
            <div className="small">
              {boardTab === "pending" && (
                <ul className="list-group list-group-flush">
                  {(board.pendingTokens ?? []).length === 0 ? (
                    <li className="list-group-item text-muted">No pending tokens</li>
                  ) : (
                    (board.pendingTokens ?? []).slice(0, 20).map((t: any) => (
                      <li key={t.id} className="list-group-item d-flex justify-content-between align-items-center px-0">
                        <span>
                          <span className="font-monospace">{t.tokenCode}</span>
                          {t.selectedVialSession?.room?.name && (
                            <span className="badge bg-secondary-subtle text-secondary-emphasis ms-1 radius-8">{t.selectedVialSession.room.name}</span>
                          )}
                          {t.validatedBy?.profile?.displayName && (
                            <span className="badge bg-info-subtle text-info-emphasis ms-1 radius-8">Validated by {t.validatedBy.profile.displayName}</span>
                          )}
                        </span>
                        <span>{t.variant?.title ?? `#${t.variantId}`} · {t.expectedDose} {t.unit ?? "ml"}</span>
                      </li>
                    ))
                  )}
                </ul>
              )}
              {boardTab === "unassigned" && (
                <ul className="list-group list-group-flush">
                  {(board.unassignedTokens ?? []).length === 0 ? (
                    <li className="list-group-item text-muted">No unassigned tokens (all pending have a selected vial/room)</li>
                  ) : (
                    (board.unassignedTokens ?? []).slice(0, 20).map((t: any) => (
                      <li key={t.id} className="list-group-item d-flex justify-content-between align-items-center px-0">
                        <span className="font-monospace">{t.tokenCode}</span>
                        <span>{t.variant?.title ?? `#${t.variantId}`} · {t.expectedDose} {t.unit ?? "ml"}</span>
                      </li>
                    ))
                  )}
                </ul>
              )}
              {boardTab === "completed" && (
                <ul className="list-group list-group-flush">
                  {(board.completedToday ?? []).length === 0 ? (
                    <li className="list-group-item text-muted">No doses completed today</li>
                  ) : (
                    (board.completedToday ?? []).slice(0, 20).map((d: any) => (
                      <li key={d.id} className="list-group-item px-0">
                        {d.variant?.title ?? `#${d.variantId}`} — {d.administeredDose} {d.unit ?? "ml"}
                        <span className="text-muted d-block">
                          {d.patient?.profile?.displayName ?? "—"}
                          {d.administeredBy?.profile?.displayName && ` · Administered by ${d.administeredBy.profile.displayName}`}
                          {" · "}{formatDateTime(d.administeredAt)}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              )}
              {boardTab === "bypass" && (
                <ul className="list-group list-group-flush">
                  {(board.bypassToday ?? []).length === 0 ? (
                    <li className="list-group-item text-muted">No bypass doses today</li>
                  ) : (
                    (board.bypassToday ?? []).slice(0, 20).map((d: any) => (
                      <li key={d.id} className="list-group-item px-0">
                        {d.variant?.title ?? `#${d.variantId}`} — {d.administeredDose} {d.unit ?? "ml"}
                        <span className="text-muted d-block">
                          {(d.emergencyBypassReason as string) || "—"}
                          {d.administeredBy?.profile?.displayName && ` · Administered by ${d.administeredBy.profile.displayName}`}
                          {" · "}{formatDateTime(d.administeredAt)}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              )}
              {boardTab === "expired" && (
                <ul className="list-group list-group-flush">
                  {(board.expiredOrProblemToday ?? []).length === 0 ? (
                    <li className="list-group-item text-muted">No expired or cancelled tokens today</li>
                  ) : (
                    (board.expiredOrProblemToday ?? []).slice(0, 20).map((t: any) => (
                      <li key={t.id} className="list-group-item px-0">
                        <span className="font-monospace">{t.tokenCode}</span> — {t.status}
                        {t.cancelReason && <span className="text-muted d-block">{(t.cancelReason as string)}</span>}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-muted small mb-0">Unable to load board</p>
          )}
        </div>
      </div>

      {/* Step 1: Validate token */}
      <div className="card radius-12 mb-4">
        <div className="card-body">
          <h6 className="mb-2">Step 1: Validate token</h6>
          <p className="text-muted small mb-3">Enter the injection token code from the billing or token generation flow.</p>
          <div className="d-flex gap-2 flex-wrap align-items-center">
            <input
              className="form-control form-control-sm radius-8"
              style={{ minWidth: 220 }}
              placeholder="Token code"
              value={tokenCode}
              onChange={(e) => {
                setTokenCode(e.target.value);
                setValidateError(null);
              }}
            />
            <button type="button" className="btn btn-sm btn-primary radius-8" onClick={validateToken} disabled={validating}>
              {validating ? "Validating…" : "Validate"}
            </button>
            {canBypass && (
              <button type="button" className="btn btn-sm btn-outline-danger radius-8" onClick={() => setEmergencyBypassModal(true)}>
                Emergency bypass (no token)
              </button>
            )}
          </div>
          {validateError && (
            <div className="alert alert-danger py-2 mt-2 mb-0 radius-8 small" role="alert">
              {validateError}
            </div>
          )}
          {tokenPayload && (tokenPayload as any).validatedAt && (
            <div className="alert alert-info py-2 mt-2 mb-0 radius-8 small" role="alert">
              Already validated by {(tokenPayload as any).validatedBy?.profile?.displayName ?? "staff"} at {formatDateTime((tokenPayload as any).validatedAt)}. You can proceed to inject.
            </div>
          )}
          {tokenPayload && (tokenExpired || tokenNotPending) && (
            <div className="alert alert-warning py-2 mt-2 mb-0 radius-8 small" role="alert">
              {tokenExpired && "This token has expired. Do not use for dose recording."}
              {tokenNotPending && !tokenExpired && `Token status is ${tokenPayload.status}. It cannot be used for recording.`}
            </div>
          )}
        </div>
      </div>

      {/* Step 2: Patient & medicine summary */}
      {tokenPayload && step >= 2 && (
        <div className="card radius-12 mb-4">
          <div className="card-body">
            <h6 className="mb-3">Step 2: Patient & medicine summary</h6>
            <div className="row g-3">
              <div className="col-md-4">
                <div className="p-3 bg-light radius-8">
                  <div className="small text-muted mb-1">Visit</div>
                  <span className="fw-semibold">#{tokenPayload.visitId ?? "—"}</span>
                  {tokenContext?.patient?.profile?.displayName && (
                    <span className="d-block small mt-1">{tokenContext.patient.profile.displayName}</span>
                  )}
                  {tokenContext?.pet?.name && <span className="d-block small">{tokenContext.pet.name}</span>}
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3 bg-light radius-8">
                  <div className="small text-muted mb-1">Medicine</div>
                  <span className="fw-semibold">{tokenPayload.variant?.title ?? `Variant #${tokenPayload.variantId}`}</span>
                  <div className="small mt-1">Expected: {tokenPayload.expectedDose} {tokenPayload.unit ?? "ml"}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3 bg-light radius-8">
                  <div className="small text-muted mb-1">Token</div>
                  <StatusBadge status={tokenPayload.status} />
                  {tokenContext?.treatmentCourse && (
                    <div className="small mt-1">Day {tokenContext.treatmentDay?.dayNumber ?? "—"} of {tokenContext.treatmentCourse?.durationDays ?? "—"}</div>
                  )}
                </div>
              </div>
            </div>
            {tokenPayload.visitId && (
              <button type="button" className="btn btn-sm btn-outline-secondary radius-8 mt-2" onClick={loadDoseHistory}>
                View dose history for this visit
              </button>
            )}
            <div className="mt-3">
              <button type="button" className="btn btn-sm btn-outline-primary radius-8" onClick={() => setStep(3)}>
                Next: Select source / vial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Source / vial */}
      {tokenPayload && step >= 3 && (() => {
        const tokenRoomId = (tokenContext?.selectedVialSession as any)?.room?.id ?? null;
        const selectedVial = vialSessionId ? vialSessions.find((v: any) => String(v.id) === vialSessionId) : null;
        const selectedVialRoomId = selectedVial?.room?.id ?? null;
        const roomMismatch = tokenRoomId != null && selectedVialRoomId != null && tokenRoomId !== selectedVialRoomId;
        return (
        <div className="card radius-12 mb-4">
          <div className="card-body">
            <h6 className="mb-3">Step 3: Source / vial session</h6>
            <p className="text-muted small mb-3">Select the vial session to deduct from, or leave empty if using outside medicine.</p>
            {tokenContext?.selectedVialSession && (
              <div className="mb-3 p-2 bg-success-subtle radius-8 small">
                Pre-selected vial: #{tokenContext.selectedVialSession.id} — {tokenContext.selectedVialSession.remainingQty} ml remaining
                {(tokenContext.selectedVialSession as any)?.room?.name && ` · Room: ${(tokenContext.selectedVialSession as any).room.name}`}
                {tokenContext.selectedVialSession.validUntil && ` (valid until ${formatDateTime(tokenContext.selectedVialSession.validUntil)})`}
              </div>
            )}
            {roomMismatch && (
              <div className="alert alert-warning py-2 mb-3 radius-8 small" role="alert">
                Room mismatch: the token was assigned to a vial in another room. Recording with this vial will be rejected. Use the pre-selected vial or switch to the correct room.
              </div>
            )}
            {vialLoading ? (
              <p className="text-muted small">Loading active vials…</p>
            ) : (
              <div className="row g-2 align-items-center">
                <div className="col-md-6">
                  <label className="form-label small">Vial session</label>
                  <select
                    className="form-select form-select-sm radius-8"
                    value={vialSessionId}
                    onChange={(e) => setVialSessionId(e.target.value)}
                  >
                    <option value="">— None / use pre-selected —</option>
                    {vialSessions.map((v: any) => (
                      <option key={v.id} value={String(v.id)}>
                        #{v.id} — {v.remainingQty} ml remaining {v.room?.name ? ` · ${v.room.name}` : ""} {v.validUntil ? `(valid ${formatDateTime(v.validUntil)})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="mt-3">
              <button type="button" className="btn btn-sm btn-outline-secondary radius-8 me-2" onClick={() => setStep(2)}>Back</button>
              <button type="button" className="btn btn-sm btn-primary radius-8" onClick={() => setStep(4)}>Next: Record dose</button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Step 4: Record dose */}
      {tokenPayload && step >= 4 && (() => {
        const expectedNum = Number(tokenPayload.expectedDose);
        const administeredNum = Number(administeredDose);
        const doseDiffers = Number.isFinite(expectedNum) && Number.isFinite(administeredNum) && administeredNum !== expectedNum;
        return (
        <div className="card radius-12 mb-4">
          <div className="card-body">
            <h6 className="mb-3">Step 4: Record dose</h6>
            <p className="text-muted small mb-2">Expected from token: {tokenPayload.expectedDose} {tokenPayload.unit ?? "ml"}</p>
            {doseDiffers && (
              <div className="alert alert-info py-2 mb-3 radius-8 small" role="alert">
                Administered dose differs from token expected dose. Confirm this is intentional before recording.
              </div>
            )}
            <form onSubmit={(e) => submitDose(e, false)} className="row g-3">
              <div className="col-md-2">
                <label className="form-label small">Prescribed dose</label>
                <input
                  type="number"
                  step="any"
                  className="form-control form-control-sm radius-8"
                  value={prescribedDose}
                  onChange={(e) => setPrescribedDose(e.target.value)}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small">Administered dose *</label>
                <input
                  type="number"
                  step="any"
                  className="form-control form-control-sm radius-8"
                  value={administeredDose}
                  onChange={(e) => setAdministeredDose(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small">Unit</label>
                <input className="form-control form-control-sm radius-8" value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label small">Route</label>
                <input className="form-control form-control-sm radius-8" value={route} onChange={(e) => setRoute(e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label small">Medicine source</label>
                <select className="form-select form-select-sm radius-8" value={medicineSource} onChange={(e) => setMedicineSource(e.target.value as MedicineSource)}>
                  {MEDICINE_SOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 d-flex gap-2 align-items-center">
                <button type="button" className="btn btn-sm btn-outline-secondary radius-8" onClick={() => setStep(3)}>Back</button>
                <button type="submit" className="btn btn-sm btn-primary radius-8" disabled={saving}>
                  {saving ? "Recording…" : "Record dose"}
                </button>
                <button type="button" className="btn btn-sm btn-outline-secondary radius-8" onClick={resetWorkflow}>Start over</button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* Emergency bypass modal */}
      {emergencyBypassModal && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header border-danger">
                <h6 className="modal-title text-danger">Emergency bypass (no token)</h6>
                <button type="button" className="btn-close" onClick={() => { setEmergencyBypassModal(false); setBypassReason(""); }} aria-label="Close" />
              </div>
              <form onSubmit={handleEmergencyBypassSubmit}>
                <div className="modal-body">
                  <p className="small text-muted mb-3">Recording without a token is audited. Use only in exceptional cases (e.g. token lost, system down).</p>
                  <div className="mb-3">
                    <label className="form-label small">Reason for bypass *</label>
                    <textarea
                      className="form-control form-control-sm radius-8"
                      rows={2}
                      value={bypassReason}
                      onChange={(e) => setBypassReason(e.target.value)}
                      placeholder="e.g. Token lost, system down, urgent care"
                      required
                    />
                  </div>
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label small">Patient ID *</label>
                      <input type="number" className="form-control form-control-sm radius-8" value={bypassPatientId} onChange={(e) => setBypassPatientId(e.target.value)} required />
                    </div>
                    <div className="col-6">
                      <label className="form-label small">Variant ID *</label>
                      <input type="number" className="form-control form-control-sm radius-8" value={bypassVariantId} onChange={(e) => setBypassVariantId(e.target.value)} required />
                    </div>
                    <div className="col-6">
                      <label className="form-label small">Visit ID (optional)</label>
                      <input type="number" className="form-control form-control-sm radius-8" value={bypassVisitId} onChange={(e) => setBypassVisitId(e.target.value)} />
                    </div>
                    <div className="col-3">
                      <label className="form-label small">Dose *</label>
                      <input type="number" step="any" className="form-control form-control-sm radius-8" value={bypassDose} onChange={(e) => setBypassDose(e.target.value)} required />
                    </div>
                    <div className="col-3">
                      <label className="form-label small">Unit</label>
                      <input className="form-control form-control-sm radius-8" value={bypassUnit} onChange={(e) => setBypassUnit(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary radius-8" onClick={() => { setEmergencyBypassModal(false); setBypassReason(""); }}>Cancel</button>
                  <button type="submit" className="btn btn-danger radius-8" disabled={saving || !bypassReason.trim()}>
                    {saving ? "Recording…" : "Record dose (bypass)"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Dose history drawer */}
      <DetailDrawer open={doseHistoryOpen} onClose={() => setDoseHistoryOpen(false)} title="Dose history" subtitle={tokenPayload?.visitId ? `Visit #${tokenPayload.visitId}` : ""} placement="end" width="380px">
        {doseHistoryLoading ? (
          <LoadingState message="Loading…" />
        ) : doseHistory.length === 0 ? (
          <p className="text-muted small mb-0">No doses recorded for this visit.</p>
        ) : (
          <ul className="list-group list-group-flush small">
            {doseHistory.map((d: any) => (
              <li key={d.id} className="list-group-item px-0">
                {d.variant?.title ?? `Variant #${d.variantId}`} — {d.administeredDose} {d.unit ?? "ml"}
                <span className="text-muted d-block">{formatDateTime(d.administeredAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </DetailDrawer>
    </div>
  );
}