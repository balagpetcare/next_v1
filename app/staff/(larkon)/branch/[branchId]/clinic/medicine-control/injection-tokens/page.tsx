"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicCancelInjectionToken,
  staffClinicGenerateInjectionToken,
  staffClinicInjectionTokensList,
  staffClinicValidateInjectionToken,
  staffClinicVisitGet,
  staffClinicVisitsList,
  staffClinicMedicinePoliciesList,
  staffClinicInjectionTokenWithContext,
  staffClinicPrescriptionsByVisit,
  staffClinicTreatmentCoursesList,
  staffClinicTreatmentCourseSchedule,
  staffClinicVialSessionsList,
} from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageHeader, StatCard, DetailDrawer, EmptyState, LoadingState, StatusBadge } from "@/src/components/dashboard";
import type { InjectionToken, InjectionTokenStatus } from "@/src/types/clinicMedicineControl";

const PERMS = [
  "injection.token.generate",
  "injection.token.validate",
  "injection.token.list",
  "injection.token.cancel",
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "USED", label: "Used" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
];

const MEDICINE_SOURCE_OPTIONS: { value: "INTERNAL" | "OUTSIDE" | "EXTERNAL"; label: string }[] = [
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

export default function InjectionTokensPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = PERMS.some((p) => permissions.includes(p));
  const canGenerate = permissions.includes("injection.token.generate");
  const canValidate = permissions.includes("injection.token.validate");
  const canCancel = permissions.includes("injection.token.cancel");

  const [list, setList] = useState<InjectionToken[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [tokenFilter, setTokenFilter] = useState("");
  const [operatorFilter, setOperatorFilter] = useState<"" | "validatedByMe" | "generatedByMe">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [actingId, setActingId] = useState<number | null>(null);

  const [visitId, setVisitId] = useState("");
  const [visitSummary, setVisitSummary] = useState<{ id: number; patientId?: number; petId?: number; patientName?: string; petName?: string } | null>(null);
  const [visitLoading, setVisitLoading] = useState(false);
  const [policies, setPolicies] = useState<any[]>([]);
  const [variantId, setVariantId] = useState("");
  const [expectedDose, setExpectedDose] = useState("");
  const [unit, setUnit] = useState("ml");
  const [medicineSource, setMedicineSource] = useState<"INTERNAL" | "OUTSIDE" | "EXTERNAL">("INTERNAL");
  const [expiresInHours, setExpiresInHours] = useState("24");
  const [creating, setCreating] = useState(false);

  const [validateCode, setValidateCode] = useState("");
  const [validateResult, setValidateResult] = useState<{ valid: boolean; token?: InjectionToken } | null>(null);
  const [validating, setValidating] = useState(false);

  const [detailToken, setDetailToken] = useState<InjectionToken | null>(null);
  const [detailContext, setDetailContext] = useState<any | null>(null);
  const [cancelModal, setCancelModal] = useState<{ tokenId: number; tokenCode: string } | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [visitSearchQuery, setVisitSearchQuery] = useState("");
  const [visitSearchResults, setVisitSearchResults] = useState<any[]>([]);
  const [visitSearchLoading, setVisitSearchLoading] = useState(false);
  const [visitSearchOpen, setVisitSearchOpen] = useState(false);

  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [treatmentCourses, setTreatmentCourses] = useState<any[]>([]);
  const [courseDays, setCourseDays] = useState<any[]>([]);
  const [vialSessionsForVariant, setVialSessionsForVariant] = useState<any[]>([]);
  const [prescriptionId, setPrescriptionId] = useState("");
  const [treatmentCourseId, setTreatmentCourseId] = useState("");
  const [treatmentDayId, setTreatmentDayId] = useState("");
  const [selectedVialSessionId, setSelectedVialSessionId] = useState("");
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseScheduleLoading, setCourseScheduleLoading] = useState(false);

  const load = useCallback(async () => {
    if (!branchId) return;
    setError(null);
    try {
      setLoading(true);
      const res = await staffClinicInjectionTokensList(branchId, {
        status: statusFilter || undefined,
        tokenCode: tokenFilter || undefined,
        validatedByMe: operatorFilter === "validatedByMe" || undefined,
        generatedByMe: operatorFilter === "generatedByMe" || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        skip: page * pageSize,
        take: pageSize,
      });
      const newTotal = Number(res?.total ?? 0);
      setList(Array.isArray(res?.list) ? res.list : []);
      setTotal(newTotal);
      setPage((prev) => (newTotal > 0 && prev >= Math.ceil(newTotal / pageSize) ? 0 : prev));
    } catch (e) {
      const msg = (e as Error)?.message || "Failed to load injection tokens";
      setError(msg);
      toast.error(msg);
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [branchId, statusFilter, tokenFilter, operatorFilter, fromDate, toDate, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!branchId || !canGenerate) return;
    staffClinicMedicinePoliciesList(branchId).then(setPolicies).catch(() => setPolicies([]));
  }, [branchId, canGenerate]);

  useEffect(() => {
    if (!branchId || !visitSearchQuery.trim()) {
      setVisitSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      setVisitSearchLoading(true);
      staffClinicVisitsList(branchId, { search: visitSearchQuery.trim(), limit: 20 })
        .then((r) => setVisitSearchResults(r?.visits ?? []))
        .catch(() => setVisitSearchResults([]))
        .finally(() => setVisitSearchLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [branchId, visitSearchQuery]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter, tokenFilter, operatorFilter, fromDate, toDate]);

  useEffect(() => {
    if (!branchId || !visitSummary?.id) {
      setPrescriptions([]);
      setPrescriptionId("");
      return;
    }
    setPrescriptionsLoading(true);
    staffClinicPrescriptionsByVisit(branchId, visitSummary.id)
      .then((list) => setPrescriptions(Array.isArray(list) ? list : []))
      .catch(() => setPrescriptions([]))
      .finally(() => setPrescriptionsLoading(false));
    setPrescriptionId("");
  }, [branchId, visitSummary?.id]);

  useEffect(() => {
    if (!branchId || visitSummary?.patientId == null) {
      setTreatmentCourses([]);
      setTreatmentCourseId("");
      setTreatmentDayId("");
      setCourseDays([]);
      return;
    }
    setCoursesLoading(true);
    staffClinicTreatmentCoursesList(branchId, { patientId: visitSummary.patientId, take: 50 })
      .then((r) => setTreatmentCourses(r?.list ?? []))
      .catch(() => setTreatmentCourses([]))
      .finally(() => setCoursesLoading(false));
    setTreatmentCourseId("");
    setTreatmentDayId("");
    setCourseDays([]);
  }, [branchId, visitSummary?.patientId]);

  useEffect(() => {
    if (!branchId || !treatmentCourseId) {
      setCourseDays([]);
      setTreatmentDayId("");
      return;
    }
    setCourseScheduleLoading(true);
    staffClinicTreatmentCourseSchedule(branchId, Number(treatmentCourseId))
      .then((c) => setCourseDays(c?.days ?? []))
      .catch(() => setCourseDays([]))
      .finally(() => setCourseScheduleLoading(false));
    setTreatmentDayId("");
  }, [branchId, treatmentCourseId]);

  useEffect(() => {
    if (!branchId || !variantId) {
      setVialSessionsForVariant([]);
      setSelectedVialSessionId("");
      return;
    }
    staffClinicVialSessionsList(branchId, { variantId: Number(variantId), status: "ACTIVE", take: 30 })
      .then((r) => setVialSessionsForVariant(r?.list ?? []))
      .catch(() => setVialSessionsForVariant([]));
    setSelectedVialSessionId("");
  }, [branchId, variantId]);

  const verifyVisit = useCallback(async () => {
    const id = Number(visitId);
    if (!branchId || !id) {
      toast.error("Enter a visit ID");
      return;
    }
    setVisitLoading(true);
    setVisitSummary(null);
    try {
      const v = await staffClinicVisitGet(branchId, id);
      if (!v) {
        toast.error("Visit not found");
        return;
      }
      setVisitSummary({
        id: v.id,
        patientId: v.patientId,
        petId: v.petId,
        patientName: v.patient?.profile?.displayName ?? undefined,
        petName: v.pet?.name ?? undefined,
      });
      toast.success("Visit verified");
    } catch (e) {
      toast.error((e as Error)?.message || "Failed to load visit");
    } finally {
      setVisitLoading(false);
    }
  }, [branchId, visitId]);

  const handleGenerate = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!branchId) return;
      const visitIdNum = Number(visitId);
      const variantIdNum = Number(variantId);
      const expectedDoseNum = Number(expectedDose);
      const expiresNum = Number(expiresInHours);
      if (!visitIdNum || !variantIdNum || !expectedDoseNum) {
        toast.error("Visit, medicine variant, and expected dose are required");
        return;
      }
      try {
        setCreating(true);
        const created = await staffClinicGenerateInjectionToken(branchId, {
          visitId: visitIdNum,
          variantId: variantIdNum,
          expectedDose: expectedDoseNum,
          unit: unit || null,
          medicineSource,
          expiresInHours: Number.isFinite(expiresNum) && expiresNum > 0 ? expiresNum : 24,
          prescriptionId: prescriptionId ? Number(prescriptionId) : undefined,
          treatmentCourseId: treatmentCourseId ? Number(treatmentCourseId) : undefined,
          treatmentDayId: treatmentDayId ? Number(treatmentDayId) : undefined,
          selectedVialSessionId: selectedVialSessionId ? Number(selectedVialSessionId) : undefined,
        });
        toast.success(`Token generated: ${created?.tokenCode ?? "Success"}`);
        setValidateCode(created?.tokenCode ?? "");
        setVisitId("");
        setVisitSummary(null);
        setExpectedDose("");
        setPrescriptionId("");
        setTreatmentCourseId("");
        setTreatmentDayId("");
        setSelectedVialSessionId("");
        await load();
      } catch (e) {
        toast.error((e as Error)?.message || "Failed to generate token");
      } finally {
        setCreating(false);
      }
    },
    [branchId, visitId, variantId, expectedDose, unit, medicineSource, expiresInHours, prescriptionId, treatmentCourseId, treatmentDayId, selectedVialSessionId, load]
  );

  const handleValidate = useCallback(async () => {
    if (!branchId || !validateCode.trim()) return;
    try {
      setValidating(true);
      const res = await staffClinicValidateInjectionToken(branchId, validateCode.trim());
      setValidateResult(res ?? null);
      toast.success(res?.valid ? "Token is valid" : "Token invalid");
    } catch (e) {
      setValidateResult(null);
      toast.error((e as Error)?.message || "Token validation failed");
    } finally {
      setValidating(false);
    }
  }, [branchId, validateCode]);

  const openDetail = useCallback(
    async (token: InjectionToken) => {
      setDetailToken(token);
      setDetailContext(null);
      if (!branchId || !token.id) return;
      try {
        const ctx = await staffClinicInjectionTokenWithContext(branchId, token.id);
        setDetailContext(ctx ?? null);
      } catch {
        setDetailContext(null);
      }
    },
    [branchId]
  );

  const handleCancelClick = useCallback((token: InjectionToken) => {
    if (token.status !== "PENDING" || !canCancel) return;
    setCancelModal({ tokenId: token.id, tokenCode: token.tokenCode });
  }, [canCancel]);

  const handleCancelConfirm = useCallback(async () => {
    if (!branchId || !cancelModal) return;
    try {
      setActingId(cancelModal.tokenId);
      await staffClinicCancelInjectionToken(branchId, cancelModal.tokenId, {
        reason: cancelReason.trim() || undefined,
      });
      toast.success("Token cancelled");
      setCancelModal(null);
      setCancelReason("");
      if (detailToken?.id === cancelModal.tokenId) setDetailToken(null);
      await load();
    } catch (e) {
      toast.error((e as Error)?.message || "Failed to cancel token");
    } finally {
      setActingId(null);
    }
  }, [branchId, cancelModal, cancelReason, detailToken?.id, load]);

  const pendingCount = useMemo(() => list.filter((t) => t.status === "PENDING").length, [list]);
  const usedCount = useMemo(() => list.filter((t) => t.status === "USED").length, [list]);

  if (isLoading) {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <LoadingState message="Loading…" />
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessDenied missingPerm="injection.token.list" onBack={() => window.history.back()} />;
  }

  const breadcrumbs = [
    { label: "Staff", href: "/staff" },
    { label: "Branch", href: `/staff/branch/${branchId}` },
    { label: "Clinic", href: `/staff/branch/${branchId}/clinic` },
    { label: "Medicine Control", href: `/staff/branch/${branchId}/clinic/medicine-control` },
    { label: "Injection Tokens" },
  ];

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <PageHeader
        title="Injection Tokens"
        subtitle="Generate and manage tokens for injection room dose administration. Tokens link visits and prescriptions to dose recording."
        breadcrumbs={breadcrumbs}
        actions={
          <Link href={`/staff/branch/${branchId}/clinic/medicine-control`} className="btn btn-outline-secondary btn-sm radius-8">
            ← Medicine Control
          </Link>
        }
      />

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <StatCard label="Pending" value={loading ? "—" : pendingCount} icon="ri-time-line" variant="warning" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard label="Used (this list)" value={loading ? "—" : usedCount} icon="ri-checkbox-circle-line" variant="success" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard label="Total" value={loading ? "—" : total} icon="ri-barcode-line" variant="primary" />
        </div>
      </div>

      {canGenerate && (
        <div className="card radius-12 mb-4">
          <div className="card-body">
            <h6 className="mb-3">Generate token</h6>
            <p className="text-muted small mb-3">Token is required for dose recording in the injection room. Visit must have a completed order. Search by treatment code or patient/pet name, or enter Visit ID and verify.</p>
            <form onSubmit={handleGenerate} className="row g-3">
              <div className="col-md-4">
                <label className="form-label small">Visit search</label>
                <input
                  type="text"
                  className="form-control form-control-sm radius-8"
                  placeholder="Treatment code or name…"
                  value={visitSearchQuery}
                  onChange={(e) => {
                    setVisitSearchQuery(e.target.value);
                    setVisitSearchOpen(true);
                  }}
                  onFocus={() => setVisitSearchOpen(true)}
                />
                {visitSearchOpen && (visitSearchQuery.trim() || visitSearchResults.length > 0) && (
                  <div className="position-relative">
                    <ul className="list-group list-group-flush small position-absolute top-0 start-0 end-0 z-3 shadow-sm radius-8 mt-1 overflow-auto" style={{ maxHeight: "200px" }}>
                      {visitSearchLoading ? (
                        <li className="list-group-item">Loading…</li>
                      ) : visitSearchResults.length === 0 ? (
                        <li className="list-group-item text-muted">No visits found</li>
                      ) : (
                        visitSearchResults.map((v: any) => (
                          <li
                            key={v.id}
                            className="list-group-item list-group-item-action cursor-pointer"
                            onClick={() => {
                              setVisitId(String(v.id));
                              setVisitSummary({
                                id: v.id,
                                patientId: v.patientId,
                                petId: v.petId,
                                patientName: v.patient?.profile?.displayName ?? undefined,
                                petName: v.pet?.name ?? undefined,
                              });
                              setVisitSearchQuery("");
                              setVisitSearchResults([]);
                              setVisitSearchOpen(false);
                            }}
                          >
                            #{v.id} {v.treatmentCode ?? ""} — {v.patient?.profile?.displayName ?? "—"} / {v.pet?.name ?? "—"}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
              <div className="col-md-4">
                <label className="form-label small">Visit ID (or from search)</label>
                <div className="d-flex gap-2">
                  <input
                    type="number"
                    className="form-control form-control-sm radius-8"
                    placeholder="Visit ID"
                    value={visitId}
                    onChange={(e) => {
                      setVisitId(e.target.value);
                      setVisitSummary(null);
                    }}
                  />
                  <button type="button" className="btn btn-sm btn-outline-secondary radius-8" onClick={verifyVisit} disabled={visitLoading}>
                    {visitLoading ? "…" : "Verify"}
                  </button>
                </div>
                {visitSummary && (
                  <small className="text-success d-block mt-1">
                    Visit #{visitSummary.id} — {visitSummary.patientName ?? "Patient"} / {visitSummary.petName ?? "Pet"}
                    {((prescriptions.length > 0) || (treatmentCourses.length > 0)) && (
                      <span className="text-muted ms-1"> · {prescriptions.length} Rx, {treatmentCourses.length} course(s)</span>
                    )}
                  </small>
                )}
              </div>
              <div className="col-md-4">
                <label className="form-label small">Medicine (variant)</label>
                <select
                  className="form-select form-select-sm radius-8"
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                  required
                >
                  <option value="">Select variant</option>
                  {(policies as any[]).map((p) => (
                    <option key={p.variantId ?? p.id} value={String(p.variantId ?? p.variant?.id ?? p.id)}>
                      {p.variant?.title ?? p.title ?? `Variant #${p.variantId ?? p.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label small">Expected dose</label>
                <input
                  type="number"
                  step="any"
                  className="form-control form-control-sm radius-8"
                  placeholder="e.g. 2"
                  value={expectedDose}
                  onChange={(e) => setExpectedDose(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small">Unit</label>
                <input className="form-control form-control-sm radius-8" placeholder="ml" value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
              <div className="col-md-2">
                <label className="form-label small">Expires (hours)</label>
                <input
                  type="number"
                  min="1"
                  className="form-control form-control-sm radius-8"
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Medicine source</label>
                <select className="form-select form-select-sm radius-8" value={medicineSource} onChange={(e) => setMedicineSource(e.target.value as any)}>
                  {MEDICINE_SOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {visitSummary && (
                <>
                  <div className="col-md-3">
                    <label className="form-label small">Prescription (optional)</label>
                    <select className="form-select form-select-sm radius-8" value={prescriptionId} onChange={(e) => setPrescriptionId(e.target.value)}>
                      <option value="">— None —</option>
                      {prescriptionsLoading ? <option>Loading…</option> : prescriptions.map((p: any) => (
                        <option key={p.id} value={String(p.id)}>Rx #{p.id}{p.items?.length ? ` (${p.items.length} items)` : ""}</option>
                      ))}
                    </select>
                    {prescriptionId && (() => {
                      const rx = prescriptions.find((p: any) => String(p.id) === prescriptionId);
                      const lines = rx?.items?.filter((i: any) => i.productVariantId) ?? [];
                      if (lines.length === 0) return null;
                      return (
                        <select
                          className="form-select form-select-sm radius-8 mt-1"
                          value={variantId}
                          onChange={(e) => {
                            const v = e.target.value;
                            setVariantId(v);
                            const item = lines.find((i: any) => String(i.productVariantId) === v);
                            if (item?.dosage && /[\d.]+/.test(String(item.dosage))) setExpectedDose(String(item.dosage).match(/[\d.]+/)?.[0] ?? expectedDose);
                          }}
                        >
                          <option value="">Line: pick variant</option>
                          {lines.map((i: any) => (
                            <option key={i.id} value={String(i.productVariantId)}>{i.medicineName} — {i.dosage}</option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small">Treatment course (optional)</label>
                    <select className="form-select form-select-sm radius-8" value={treatmentCourseId} onChange={(e) => setTreatmentCourseId(e.target.value)}>
                      <option value="">— None —</option>
                      {coursesLoading ? <option>Loading…</option> : treatmentCourses.map((c: any) => (
                        <option key={c.id} value={String(c.id)}>{c.variant?.title ?? `Course #${c.id}`} ({c._count?.days ?? 0} days)</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label small">Treatment day (optional)</label>
                    <select className="form-select form-select-sm radius-8" value={treatmentDayId} onChange={(e) => setTreatmentDayId(e.target.value)}>
                      <option value="">— None —</option>
                      {courseScheduleLoading ? <option>Loading…</option> : courseDays.map((d: any) => (
                        <option key={d.id} value={String(d.id)}>Day {d.dayNumber}{d.scheduledDate ? ` (${new Date(d.scheduledDate).toLocaleDateString()})` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label small">Vial session (optional)</label>
                    <select className="form-select form-select-sm radius-8" value={selectedVialSessionId} onChange={(e) => setSelectedVialSessionId(e.target.value)}>
                      <option value="">— None —</option>
                      {vialSessionsForVariant.map((v: any) => (
                        <option key={v.id} value={String(v.id)}>#{v.id} ({v.remainingQty} left)</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className="col-md-4 d-flex align-items-end">
                <button type="submit" className="btn btn-primary btn-sm radius-8" disabled={creating}>
                  {creating ? "Generating…" : "Generate token"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {canValidate && (
        <div className="card radius-12 mb-4">
          <div className="card-body">
            <h6 className="mb-2">Validate token</h6>
            <div className="d-flex gap-2 flex-wrap align-items-center">
              <input
                className="form-control form-control-sm radius-8"
                style={{ minWidth: 200 }}
                placeholder="Enter token code"
                value={validateCode}
                onChange={(e) => setValidateCode(e.target.value)}
              />
              <button type="button" className="btn btn-sm btn-outline-primary radius-8" onClick={handleValidate} disabled={validating}>
                {validating ? "…" : "Validate"}
              </button>
              {validateResult?.token && (
                <span className="badge bg-success-subtle text-success-emphasis radius-8">
                  Valid — {validateResult.token.variant?.title ?? `Variant #${validateResult.token.variantId}`}, {validateResult.token.expectedDose} {validateResult.token.unit ?? "ml"}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card radius-12">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <select
              className="form-select form-select-sm radius-8 w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              className="form-select form-select-sm radius-8 w-auto"
              value={operatorFilter}
              onChange={(e) => setOperatorFilter((e.target.value || "") as "" | "validatedByMe" | "generatedByMe")}
              title="Operator filter (validated by me / generated by me)"
            >
              <option value="">All operators</option>
              <option value="validatedByMe">Validated by me</option>
              <option value="generatedByMe">Generated by me</option>
            </select>
            <input
              className="form-control form-control-sm radius-8 w-auto"
              style={{ minWidth: 160 }}
              placeholder="Token code"
              value={tokenFilter}
              onChange={(e) => setTokenFilter(e.target.value)}
            />
            <input type="date" className="form-control form-control-sm radius-8 w-auto" value={fromDate} onChange={(e) => setFromDate(e.target.value)} title="From date" />
            <input type="date" className="form-control form-control-sm radius-8 w-auto" value={toDate} onChange={(e) => setToDate(e.target.value)} title="To date" />
            <button type="button" className="btn btn-sm btn-outline-primary radius-8" onClick={load} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </button>
            <span className="ms-auto small text-muted">
              {total} token{total !== 1 ? "s" : ""}
              {total > pageSize && (
                <> · Page {page + 1} of {Math.ceil(total / pageSize) || 1}</>
              )}
            </span>
          </div>

          {error && (
            <div className="alert alert-danger py-2 mb-3 radius-8 small" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <LoadingState message="Loading tokens…" />
          ) : list.length === 0 ? (
            <EmptyState
              icon="ri-barcode-line"
              title="No injection tokens found"
              description="Generate a token from a visit and medicine variant, or adjust filters."
              action={<button type="button" className="btn btn-sm btn-outline-primary radius-8" onClick={load}>Refresh</button>}
            />
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Visit</th>
                    <th>Variant</th>
                    <th>Dose</th>
                    <th>Status</th>
                    <th className="text-nowrap">Generated</th>
                    <th className="text-nowrap">Validated</th>
                    <th>Created</th>
                    <th>Expires</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr key={row.id}>
                      <td className="fw-semibold font-monospace small">{row.tokenCode}</td>
                      <td>{row.visitId ?? "—"}</td>
                      <td>{row.variant?.title ?? row.variantId ?? "—"}</td>
                      <td>{String(row.expectedDose ?? "—")} {row.unit ?? ""}</td>
                      <td><StatusBadge status={row.status as InjectionTokenStatus} /></td>
                      <td className="small text-muted">{(row as any).generatedBy?.profile?.displayName ?? "—"}</td>
                      <td className="small text-muted">{(row as any).validatedBy?.profile?.displayName ?? "—"}</td>
                      <td className="small">{formatDateTime(row.createdAt)}</td>
                      <td className="small">{formatDateTime(row.expiresAt)}</td>
                      <td className="text-end">
                        <div className="d-flex gap-1 justify-content-end">
                          <button type="button" className="btn btn-sm btn-outline-secondary radius-8" onClick={() => openDetail(row)} title="View details">
                            View
                          </button>
                          {row.status === "PENDING" && canCancel && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger radius-8"
                              onClick={() => handleCancelClick(row)}
                              disabled={actingId === row.id}
                            >
                              {actingId === row.id ? "…" : "Cancel"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > pageSize && (
            <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary radius-8"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </button>
              <span className="small text-muted">
                Page {page + 1} of {Math.ceil(total / pageSize) || 1}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary radius-8"
                disabled={page >= Math.ceil(total / pageSize) - 1 || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <DetailDrawer
        open={!!detailToken}
        onClose={() => { setDetailToken(null); setDetailContext(null); }}
        title={detailToken ? `Token ${detailToken.tokenCode}` : ""}
        subtitle="Details and context"
        placement="end"
        width="420px"
      >
        {detailToken && (
          <div className="small">
            <div className="mb-3">
              <span className="text-muted d-block">Status</span>
              <StatusBadge status={detailToken.status as InjectionTokenStatus} />
            </div>
            <div className="mb-3">
              <span className="text-muted d-block">Visit</span>
              <span>#{detailToken.visitId ?? "—"}</span>
              {detailContext?.patient?.profile?.displayName && (
                <span className="ms-1">— {detailContext.patient.profile.displayName}</span>
              )}
              {detailContext?.pet?.name && <span className="ms-1">/ {detailContext.pet.name}</span>}
            </div>
            <div className="mb-3">
              <span className="text-muted d-block">Medicine</span>
              {detailToken.variant?.title ?? detailContext?.variant?.title ?? `Variant #${detailToken.variantId}`}
              {detailToken.variant?.sku && <span className="text-muted ms-1">({detailToken.variant.sku})</span>}
            </div>
            <div className="mb-3">
              <span className="text-muted d-block">Expected dose</span>
              {detailToken.expectedDose} {detailToken.unit ?? "ml"}
            </div>
            {detailContext?.treatmentCourse && (
              <div className="mb-3 p-2 bg-light radius-8">
                <span className="text-muted d-block">Treatment course</span>
                Day {detailContext.treatmentDay?.dayNumber ?? "—"} of {detailContext.treatmentCourse?.durationDays ?? "—"}
              </div>
            )}
            {detailContext?.selectedVialSession && (
              <div className="mb-3">
                <span className="text-muted d-block">Selected vial session</span>
                #{detailContext.selectedVialSession.id} — {detailContext.selectedVialSession.remainingQty} ml remaining
                {detailContext.selectedVialSession.validUntil && (
                  <span className="text-muted ms-1">(valid until {formatDateTime(detailContext.selectedVialSession.validUntil)})</span>
                )}
              </div>
            )}
            <div className="mb-3">
              <span className="text-muted d-block">Created</span>
              {formatDateTime(detailToken.createdAt)}
            </div>
            {detailToken.expiresAt && (
              <div className="mb-3">
                <span className="text-muted d-block">Expires</span>
                {formatDateTime(detailToken.expiresAt)}
              </div>
            )}
            <div className="mb-3 p-2 bg-light radius-8">
              <span className="text-muted d-block small">Audit</span>
              <div className="small">
                Generated by: {((detailContext as any)?.generatedBy ?? (detailToken as any).generatedBy)?.profile?.displayName ?? (detailToken.generatedByUserId ? `User #${detailToken.generatedByUserId}` : "—")}
              </div>
              {(detailToken as any).validatedAt && (
                <div className="small mt-1">
                  Validated by: {((detailContext as any)?.validatedBy ?? (detailToken as any).validatedBy)?.profile?.displayName ?? ((detailToken as any).validatedByUserId ? `User #${(detailToken as any).validatedByUserId}` : "—")}
                  {" "}at {formatDateTime((detailToken as any).validatedAt)}
                </div>
              )}
              {detailToken.status === "USED" && detailToken.usedAt && (
                <div className="small mt-1">
                  Used by: {detailContext?.usedBy?.profile?.displayName ?? (detailToken.usedByUserId ? `User #${detailToken.usedByUserId}` : "—")} at {formatDateTime(detailToken.usedAt)}
                </div>
              )}
              {detailToken.status === "CANCELLED" && (
                <>
                  <div className="small mt-1">
                    Cancelled by: {detailContext?.cancelledBy?.profile?.displayName ?? (detailToken.cancelledByUserId ? `User #${detailToken.cancelledByUserId}` : "—")}
                    {detailToken.cancelledAt && ` at ${formatDateTime(detailToken.cancelledAt)}`}
                  </div>
                  {(detailToken.cancelReason ?? detailContext?.cancelReason) && (
                    <div className="small mt-1 text-muted">Reason: {(detailToken.cancelReason ?? detailContext?.cancelReason) as string}</div>
                  )}
                </>
              )}
            </div>
            {detailToken.visitId != null && Number(detailToken.visitId) > 0 && (
              <Link
                href={`/staff/branch/${branchId}/clinic/visits/${detailToken.visitId}`}
                className="btn btn-sm btn-outline-primary radius-8"
              >
                Open visit
              </Link>
            )}
          </div>
        )}
      </DetailDrawer>

      {cancelModal && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h6 className="modal-title">Cancel pending token</h6>
                <button type="button" className="btn-close" onClick={() => { setCancelModal(null); setCancelReason(""); }} aria-label="Close" />
              </div>
              <div className="modal-body">
                <p className="mb-2">Cancel token <strong>{cancelModal.tokenCode}</strong>? This cannot be undone. The token will not be usable for dose recording.</p>
                <label className="form-label small">Reason for cancellation (optional)</label>
                <textarea
                  className="form-control form-control-sm radius-8"
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Duplicate token, wrong visit"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary radius-8" onClick={() => { setCancelModal(null); setCancelReason(""); }}>Keep</button>
                <button type="button" className="btn btn-danger radius-8" onClick={handleCancelConfirm} disabled={actingId === cancelModal.tokenId}>
                  {actingId === cancelModal.tokenId ? "Cancelling…" : "Cancel token"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
