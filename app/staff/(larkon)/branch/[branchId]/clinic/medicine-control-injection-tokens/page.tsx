"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicCancelInjectionToken,
  staffClinicInjectionTokenWithContext,
  staffClinicInjectionTokensList,
} from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageHeader, StatCard, DetailDrawer, EmptyState, LoadingState, StatusBadge } from "@/src/components/dashboard";
import type { InjectionToken, InjectionTokenStatus } from "@/src/types/clinicMedicineControl";
import { humanizeEnum } from "@/src/lib/displayFormatters";
import { MEDICINE_SOURCE_OPTIONS } from "../_components/injection-tokens/constants";
import { PaginationBar } from "@/src/components/common/PaginationBar";

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

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function tokenMedicineSummary(row: InjectionToken): string {
  const lines = row.medicationLines;
  if (Array.isArray(lines) && lines.length > 0) {
    return `${lines.length} line(s)`;
  }
  return row.variant?.title ?? (row.variantId != null ? `Variant #${row.variantId}` : "—");
}

function tokenDoseSummary(row: InjectionToken): string {
  const lines = row.medicationLines;
  if (Array.isArray(lines) && lines.length > 1) {
    return `${lines.length} administrations`;
  }
  if (Array.isArray(lines) && lines.length === 1) {
    const l = lines[0];
    return `${String(l.expectedDose ?? "—")} ${l.unit ?? row.unit ?? ""}`.trim();
  }
  return `${String(row.expectedDose ?? "—")} ${row.unit ?? ""}`.trim();
}

export default function InjectionTokensOverviewPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params?.branchId]);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = PERMS.some((p) => permissions.includes(p));
  const canGenerate = permissions.includes("injection.token.generate");
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

  const [detailToken, setDetailToken] = useState<InjectionToken | null>(null);
  const [detailContext, setDetailContext] = useState<Record<string, unknown> | null>(null);
  const [cancelModal, setCancelModal] = useState<{ tokenId: number; tokenCode: string } | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [filterMedicineSource, setFilterMedicineSource] = useState<string>("");
  const [filterEncounterKind, setFilterEncounterKind] = useState<string>("");

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
        medicineSource: filterMedicineSource || undefined,
        encounterKind:
          filterEncounterKind === "EXTERNAL_WALK_IN" || filterEncounterKind === "INTERNAL_VISIT"
            ? filterEncounterKind
            : undefined,
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
  }, [branchId, statusFilter, tokenFilter, operatorFilter, fromDate, toDate, filterMedicineSource, filterEncounterKind, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter, tokenFilter, operatorFilter, fromDate, toDate, filterMedicineSource, filterEncounterKind]);

  const openDetail = useCallback(
    async (token: InjectionToken) => {
      setDetailToken(token);
      setDetailContext(null);
      if (!branchId || !token.id) return;
      try {
        const ctx = await staffClinicInjectionTokenWithContext(branchId, token.id);
        setDetailContext((ctx && typeof ctx === "object" ? ctx : null) as Record<string, unknown> | null);
        if (ctx && typeof ctx === "object") {
          setDetailToken((prev) => (prev && prev.id === token.id ? { ...prev, ...(ctx as object) } : prev));
        }
      } catch {
        setDetailContext(null);
      }
    },
    [branchId]
  );

  const handleCancelClick = useCallback(
    (token: InjectionToken) => {
      if (token.status !== "PENDING" || !canCancel) return;
      setCancelModal({ tokenId: token.id, tokenCode: token.tokenCode });
    },
    [canCancel]
  );

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

  const newHref = `/staff/branch/${branchId}/clinic/medicine-control/injection-tokens/new`;

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <PageHeader
        title="Injection Tokens"
        subtitle="Review tokens, filters, and details. Generate new tokens from the dedicated workflow."
        breadcrumbs={breadcrumbs}
        actions={
          <div className="d-flex flex-wrap gap-2">
            {canGenerate ? (
              <Link href={newHref} className="btn btn-primary btn-sm radius-8">
                Generate token
              </Link>
            ) : null}
            <Link href={`/staff/branch/${branchId}/clinic/medicine-control`} className="btn btn-outline-secondary btn-sm radius-8">
              ← Medicine Control
            </Link>
          </div>
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

      <div className="card radius-12">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <select
              className="form-select form-select-sm radius-8 w-auto"
              value={filterMedicineSource}
              onChange={(e) => setFilterMedicineSource(e.target.value)}
              title="Medicine source"
            >
              <option value="">All medicine sources</option>
              {MEDICINE_SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className="form-select form-select-sm radius-8 w-auto"
              value={filterEncounterKind}
              onChange={(e) => setFilterEncounterKind(e.target.value)}
              title="Encounter type"
            >
              <option value="">All encounters</option>
              <option value="INTERNAL_VISIT">Internal visit</option>
              <option value="EXTERNAL_WALK_IN">External / walk-in</option>
            </select>
            <select className="form-select form-select-sm radius-8 w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className="form-select form-select-sm radius-8 w-auto"
              value={operatorFilter}
              onChange={(e) => setOperatorFilter((e.target.value || "") as "" | "validatedByMe" | "generatedByMe")}
              title="Operator filter"
            >
              <option value="">All operators</option>
              <option value="validatedByMe">Validated by me</option>
              <option value="generatedByMe">Generated by me</option>
            </select>
            <input
              className="form-control form-control-sm radius-8 w-auto"
              style={{ minWidth: 160 }}
              placeholder="Search token code"
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
              description="Adjust filters or generate a token from the workflow."
              action={
                <div className="d-flex gap-2 flex-wrap">
                  <button type="button" className="btn btn-sm btn-outline-primary radius-8" onClick={load}>
                    Refresh
                  </button>
                  {canGenerate ? (
                    <Link href={newHref} className="btn btn-sm btn-primary radius-8">
                      Generate token
                    </Link>
                  ) : null}
                </div>
              }
            />
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Visit</th>
                    <th>Encounter</th>
                    <th>Source</th>
                    <th>Medicine</th>
                    <th>Dose / lines</th>
                    <th>Status</th>
                    <th>Lifecycle</th>
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
                      <td className="small">{humanizeEnum((row as InjectionToken & { encounterKind?: string }).encounterKind ?? "INTERNAL_VISIT")}</td>
                      <td className="small">{humanizeEnum(row.medicineSource)}</td>
                      <td className="small">{tokenMedicineSummary(row)}</td>
                      <td className="small">{tokenDoseSummary(row)}</td>
                      <td>
                        <StatusBadge status={row.status as InjectionTokenStatus} />
                      </td>
                      <td>
                        {(row as InjectionToken & { lifecycleLabel?: string }).lifecycleLabel ? (
                          <StatusBadge
                            status={(row as InjectionToken & { lifecycleLabel?: string }).lifecycleLabel!}
                            label={humanizeEnum((row as InjectionToken & { lifecycleLabel?: string }).lifecycleLabel!)}
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="small text-muted">{(row as InjectionToken & { generatedBy?: { profile?: { displayName?: string } } }).generatedBy?.profile?.displayName ?? "—"}</td>
                      <td className="small text-muted">{(row as InjectionToken & { validatedBy?: { profile?: { displayName?: string } } }).validatedBy?.profile?.displayName ?? "—"}</td>
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
          {total > 0 && (
            <PaginationBar
              page={page + 1}
              pageSize={pageSize}
              total={total}
              totalPages={Math.max(1, Math.ceil(total / pageSize))}
              disabled={loading}
              onPageChange={(p) => setPage(p - 1)}
              className="mt-3 pt-3 border-top"
              ariaLabel="Injection tokens pages"
            />
          )}
        </div>
      </div>

      <DetailDrawer
        open={!!detailToken}
        onClose={() => {
          setDetailToken(null);
          setDetailContext(null);
        }}
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
            {(detailToken as InjectionToken & { lifecycleLabel?: string }).lifecycleLabel && (
              <div className="mb-3">
                <span className="text-muted d-block">Lifecycle</span>
                <StatusBadge
                  status={(detailToken as InjectionToken & { lifecycleLabel?: string }).lifecycleLabel!}
                  label={humanizeEnum((detailToken as InjectionToken & { lifecycleLabel?: string }).lifecycleLabel!)}
                />
              </div>
            )}
            <div className="mb-3">
              <span className="text-muted d-block">Encounter</span>
              {humanizeEnum((detailToken as InjectionToken & { encounterKind?: string }).encounterKind ?? "INTERNAL_VISIT")}
            </div>
            <div className="mb-3">
              <span className="text-muted d-block">Medicine source</span>
              {humanizeEnum(detailToken.medicineSource)}
            </div>
            {((detailToken as InjectionToken & { externalPrescriberName?: string }).externalPrescriberName ||
              (detailToken as InjectionToken & { externalPrescriberClinic?: string }).externalPrescriberClinic ||
              (detailToken as InjectionToken & { externalRxNotes?: string }).externalRxNotes) && (
              <div className="mb-3 p-2 bg-light radius-8">
                <span className="text-muted d-block small">Outside prescription</span>
                {(detailToken as InjectionToken & { externalPrescriberName?: string }).externalPrescriberName && (
                  <div className="small">Prescriber: {(detailToken as InjectionToken & { externalPrescriberName?: string }).externalPrescriberName}</div>
                )}
                {(detailToken as InjectionToken & { externalPrescriberClinic?: string }).externalPrescriberClinic && (
                  <div className="small">Clinic: {(detailToken as InjectionToken & { externalPrescriberClinic?: string }).externalPrescriberClinic}</div>
                )}
                {(detailToken as InjectionToken & { externalRxNotes?: string }).externalRxNotes && (
                  <div className="small mt-1">{(detailToken as InjectionToken & { externalRxNotes?: string }).externalRxNotes}</div>
                )}
                {(detailToken as InjectionToken & { externalRxEvidenceUrl?: string }).externalRxEvidenceUrl && (
                  <a
                    href={(detailToken as InjectionToken & { externalRxEvidenceUrl?: string }).externalRxEvidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="small d-inline-block mt-1"
                  >
                    Evidence link
                  </a>
                )}
              </div>
            )}
            {(((detailToken as InjectionToken & { serviceChargeAmount?: unknown }).serviceChargeAmount != null &&
              (detailToken as InjectionToken & { serviceChargeAmount?: unknown }).serviceChargeAmount !== "") ||
              ((detailToken as InjectionToken & { medicineChargeAmount?: unknown }).medicineChargeAmount != null &&
                (detailToken as InjectionToken & { medicineChargeAmount?: unknown }).medicineChargeAmount !== "") ||
              ((detailToken as InjectionToken & { consumablesChargeAmount?: unknown }).consumablesChargeAmount != null &&
                (detailToken as InjectionToken & { consumablesChargeAmount?: unknown }).consumablesChargeAmount !== "")) && (
              <div className="mb-3 p-2 bg-light radius-8 small">
                <span className="text-muted d-block small">Billing snapshot (token)</span>
                {(detailToken as InjectionToken & { serviceChargeAmount?: unknown }).serviceChargeAmount != null &&
                  (detailToken as InjectionToken & { serviceChargeAmount?: unknown }).serviceChargeAmount !== "" && (
                    <div>Service: {String((detailToken as InjectionToken & { serviceChargeAmount?: unknown }).serviceChargeAmount)}</div>
                  )}
                {(detailToken as InjectionToken & { medicineChargeAmount?: unknown }).medicineChargeAmount != null &&
                  (detailToken as InjectionToken & { medicineChargeAmount?: unknown }).medicineChargeAmount !== "" && (
                    <div>Medicine: {String((detailToken as InjectionToken & { medicineChargeAmount?: unknown }).medicineChargeAmount)}</div>
                  )}
                {(detailToken as InjectionToken & { consumablesChargeAmount?: unknown }).consumablesChargeAmount != null &&
                  (detailToken as InjectionToken & { consumablesChargeAmount?: unknown }).consumablesChargeAmount !== "" && (
                    <div>Consumables: {String((detailToken as InjectionToken & { consumablesChargeAmount?: unknown }).consumablesChargeAmount)}</div>
                  )}
              </div>
            )}
            {detailContext?.order != null && typeof detailContext.order === "object" && (
              <div className="mb-3 p-2 border radius-8 small">
                <span className="text-muted d-block small">Linked order (source of truth)</span>
                {(() => {
                  const ord = detailContext.order as Record<string, unknown>;
                  return (
                    <div>
                      Order #{String(ord.id)} — {String(ord.orderNumber ?? "—")} — payment <strong>{String(ord.paymentStatus ?? "—")}</strong>
                      {ord.totalAmount != null && <span className="text-muted ms-1">(total {String(ord.totalAmount)})</span>}
                    </div>
                  );
                })()}
                {Array.isArray((detailContext.order as { items?: unknown[] }).items) &&
                  (detailContext.order as { items: unknown[] }).items.length > 0 && (
                    <ul className="mb-0 mt-2 ps-3">
                      {(detailContext.order as { items: Record<string, unknown>[] }).items.map((it) => (
                        <li key={String(it.id)}>
                          {(it.service as { name?: string } | undefined)?.name
                            ? `Service: ${(it.service as { name: string }).name}`
                            : (it.variant as { title?: string } | undefined)?.title
                              ? `Product: ${(it.variant as { title: string }).title}`
                              : (it.product as { name?: string } | undefined)?.name
                                ? `Product: ${(it.product as { name: string }).name}`
                                : `Line #${String(it.id)}`}
                          {" — "}qty {String(it.quantity)} × {String(it.price)} = {String(it.total)}
                        </li>
                      ))}
                    </ul>
                  )}
                <Link href={`/staff/branch/${branchId}/clinic/billing`} className="small d-inline-block mt-1">
                  Open billing (enter visit #{detailToken.visitId ?? "—"} if needed)
                </Link>
              </div>
            )}
            <div className="mb-3">
              <span className="text-muted d-block">Visit</span>
              <span>#{detailToken.visitId ?? "—"}</span>
              {(() => {
                const ptName = (detailContext?.patient as { profile?: { displayName?: string } } | undefined)?.profile?.displayName;
                return ptName ? <span className="ms-1">— {ptName}</span> : null;
              })()}
              {(() => {
                const petName = (detailContext?.pet as { name?: string } | undefined)?.name;
                return petName ? <span className="ms-1">/ {petName}</span> : null;
              })()}
            </div>
            {(() => {
              const lines =
                (Array.isArray(detailToken.medicationLines) && detailToken.medicationLines.length > 0
                  ? detailToken.medicationLines
                  : null) ??
                (Array.isArray(detailContext?.medicationLines) ? (detailContext.medicationLines as InjectionToken["medicationLines"]) : null);
              if (Array.isArray(lines) && lines.length > 0) {
                return (
                  <div className="mb-3">
                    <span className="text-muted d-block">Medicine lines ({lines.length})</span>
                    <ol className="ps-3 mb-0">
                      {lines.map((ln, i) => (
                        <li key={ln.id ?? i} className="mb-2">
                          <div className="fw-semibold">
                            {ln.medicineSource === "OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT"
                              ? ln.manualMedicineName ?? "Outside medicine"
                              : ln.variant?.title ?? `Variant #${ln.variantId ?? "—"}`}
                            <span className="text-muted fw-normal ms-1">({humanizeEnum(ln.medicineSource)})</span>
                          </div>
                          <div className="small">
                            {ln.route} · {String(ln.expectedDose ?? "—")} {ln.unit ?? ""}
                            {ln.durationText ? ` · ${ln.durationText}` : ""}
                            {ln.frequencyText ? ` · ${ln.frequencyText}` : ""}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              }
              return (
                <>
                  <div className="mb-3">
                    <span className="text-muted d-block">Medicine (legacy)</span>
                    {detailToken.variant?.title ?? (detailContext?.variant as { title?: string } | undefined)?.title ?? `Variant #${detailToken.variantId ?? "—"}`}
                  </div>
                  <div className="mb-3">
                    <span className="text-muted d-block">Expected dose</span>
                    {detailToken.expectedDose ?? "—"} {detailToken.unit ?? "ml"}
                  </div>
                </>
              );
            })()}
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
            {detailToken.visitId != null && Number(detailToken.visitId) > 0 && (
              <Link href={`/staff/branch/${branchId}/clinic/visits/${detailToken.visitId}`} className="btn btn-sm btn-outline-primary radius-8">
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
                <p className="mb-2">
                  Cancel token <strong>{cancelModal.tokenCode}</strong>? This cannot be undone. The token will not be usable for dose recording.
                </p>
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
                <button type="button" className="btn btn-outline-secondary radius-8" onClick={() => { setCancelModal(null); setCancelReason(""); }}>
                  Keep
                </button>
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
