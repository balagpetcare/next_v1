"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { staffDoctorFees, staffDoctorProfile } from "@/lib/api";
import {
  formatValueForDisplay,
  humanizeEnum,
  humanizeFieldLabel,
} from "@/src/lib/displayFormatters";
import { labelForClinicApprovalRequestType } from "@/src/lib/clinicApprovalLabels";
import { profile as profileRoute } from "@/src/lib/doctorOperationsRoutes";
import SectionCard from "@/src/components/dashboard/SectionCard";

/** Match table row logic: API may omit doctorMemberId until enrichment. */
export function doctorMemberIdFromRow(row: Record<string, unknown> | undefined): number | null {
  if (!row) return null;
  const top = row.doctorMemberId;
  if (top != null && Number.isFinite(Number(top))) return Number(top);
  const p = row.payload;
  if (p && typeof p === "object") {
    const o = p as Record<string, unknown>;
    for (const k of ["memberId", "doctorId", "branchMemberId"]) {
      const v = o[k];
      if (v != null && v !== "" && Number.isFinite(Number(v))) return Number(v);
    }
  }
  return null;
}

function effectiveDateFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const keys = ["effectiveFrom", "effectiveDate", "startDate", "validFrom"];
  for (const k of keys) {
    const v = p[k];
    if (v != null && String(v).trim() !== "") {
      try {
        const d = new Date(String(v));
        if (!Number.isNaN(d.getTime())) return d.toLocaleString();
      } catch {
        /* ignore */
      }
      return String(v);
    }
  }
  return null;
}

function payloadDisplayName(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const n = p.displayName ?? p.name;
  if (n != null && String(n).trim() !== "") return String(n);
  return null;
}

function feeFieldLabel(feeType: string): string {
  const t = feeType.toLowerCase();
  if (t === "consultation" || t === "default") return "Consultation";
  if (t === "followup") return "Follow-up";
  if (t === "emergency") return "Emergency";
  return feeType || "Fee";
}

function currentFeeForType(
  current: { consultation?: number | null; followUp?: number | null; emergency?: number | null },
  feeType: string
): number | null | undefined {
  const t = feeType.toLowerCase();
  if (t === "consultation" || t === "default") return current.consultation;
  if (t === "followup") return current.followUp;
  if (t === "emergency") return current.emergency;
  return undefined;
}

/** High-signal payload keys shown first in review (order preserved). */
const PAYLOAD_SUMMARY_KEY_ORDER = [
  "name",
  "displayName",
  "email",
  "phone",
  "feeType",
  "proposedValue",
  "effectiveFrom",
  "effectiveDate",
  "reason",
  "branchMemberId",
  "memberId",
  "doctorId",
  "clinicStaffProfileId",
  "roleInClinic",
  "doctorCredentialId",
  "schedulePayload",
  "leaveType",
  "startDate",
  "endDate",
];

function prettyStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function NestedObjectTable({ obj, depth = 0 }: { obj: Record<string, unknown>; depth?: number }) {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return <span className="text-muted">—</span>;
  return (
    <dl className={`row small mb-0 ${depth > 0 ? "mt-1" : ""}`}>
      {entries.map(([k, v]) => (
        <div key={k} className="col-12 d-flex flex-wrap border-bottom border-light py-1 gap-2">
          <dt className="text-muted mb-0" style={{ minWidth: "7rem" }}>
            {humanizeFieldLabel(k)}
          </dt>
          <dd className="mb-0 flex-grow-1 text-break">{formatPayloadCell(v, depth + 1)}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatPayloadCell(value: unknown, depth: number): ReactNode {
  if (value === null || value === undefined) return <span className="text-muted">—</span>;
  if (typeof value === "boolean") return humanizeEnum(String(value));
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return <span className="text-break">{value}</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted">—</span>;
    if (depth > 2) return <span className="text-break small">{formatValueForDisplay(value)}</span>;
    return (
      <ul className="mb-0 ps-3">
        {value.map((item, i) => (
          <li key={`arr-${i}`} className="text-break">
            {formatPayloadCell(item, depth + 1)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    if (depth > 3) return <span className="text-break small">{formatValueForDisplay(value)}</span>;
    return <NestedObjectTable obj={value as Record<string, unknown>} depth={depth} />;
  }
  return String(value);
}

function splitPayloadForDisplay(payload: unknown): {
  summaryEntries: { key: string; label: string; value: unknown }[];
  otherEntries: { key: string; label: string; value: unknown }[];
} {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { summaryEntries: [], otherEntries: [] };
  }
  const obj = payload as Record<string, unknown>;
  const used = new Set<string>();
  const summaryEntries: { key: string; label: string; value: unknown }[] = [];
  for (const key of PAYLOAD_SUMMARY_KEY_ORDER) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      summaryEntries.push({ key, label: humanizeFieldLabel(key), value: obj[key] });
      used.add(key);
    }
  }
  const otherEntries: { key: string; label: string; value: unknown }[] = [];
  for (const key of Object.keys(obj).sort()) {
    if (!used.has(key)) otherEntries.push({ key, label: humanizeFieldLabel(key), value: obj[key] });
  }
  return { summaryEntries, otherEntries };
}

function auditActionBadgeClass(action: string): string {
  const a = action.toUpperCase();
  if (a.includes("APPROVE") && !a.includes("UN")) return "badge bg-success-subtle text-success-emphasis border border-success-subtle";
  if (a.includes("REJECT")) return "badge bg-danger-subtle text-danger-emphasis border border-danger-subtle";
  if (a.includes("CREATE") || a.includes("SUBMIT") || a.includes("REQUEST"))
    return "badge bg-primary-subtle text-primary-emphasis border border-primary-subtle";
  return "badge bg-light text-dark border";
}

function auditLogStableKey(log: Record<string, unknown>, idx: number): string {
  if (log.id != null) return `approval-log-${String(log.id)}`;
  const ts = log.createdAt != null ? String(log.createdAt) : "";
  const act = log.action != null ? String(log.action) : "";
  return `approval-log-${idx}-${ts}-${act}`;
}

type Props = {
  branchId: string;
  row: Record<string, unknown>;
  loadError?: boolean;
  isPartialRow?: boolean;
  onOpenDoctor360?: (memberId: number) => void;
};

export default function ApprovalRequestDetailSections({
  branchId,
  row,
  loadError = false,
  isPartialRow = false,
  onOpenDoctor360,
}: Props) {
  const payload = row?.payload;
  const requestType = String(row?.requestType ?? "");
  const actionLogs = Array.isArray(row?.actionLogs) ? (row?.actionLogs as Record<string, unknown>[]) : [];
  const doctorMemberId = doctorMemberIdFromRow(row);
  const doctorNameFromRow = row?.doctorDisplayName != null ? String(row.doctorDisplayName) : null;
  const pName = payloadDisplayName(payload);

  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState(false);
  const [feeCurrent, setFeeCurrent] = useState<{
    consultation?: number | null;
    followUp?: number | null;
    emergency?: number | null;
  } | null>(null);

  const [doctorProfile, setDoctorProfile] = useState<Record<string, unknown> | null>(null);
  const [doctorProfileLoading, setDoctorProfileLoading] = useState(false);

  const loadFees = useCallback(async () => {
    if (!branchId || requestType !== "DOCTOR_FEE_CHANGE" || doctorMemberId == null) return;
    setFeeLoading(true);
    setFeeError(false);
    try {
      const data = await staffDoctorFees(branchId, doctorMemberId);
      const cur = data?.current;
      if (cur && typeof cur === "object") {
        setFeeCurrent({
          consultation: cur.consultation != null ? Number(cur.consultation) : null,
          followUp: cur.followUp != null ? Number(cur.followUp) : null,
          emergency: cur.emergency != null ? Number(cur.emergency) : null,
        });
      } else {
        setFeeCurrent({});
      }
    } catch {
      setFeeError(true);
      setFeeCurrent(null);
    } finally {
      setFeeLoading(false);
    }
  }, [branchId, requestType, doctorMemberId]);

  const loadDoctorProfile = useCallback(async () => {
    if (!branchId || doctorMemberId == null || !Number.isFinite(doctorMemberId)) {
      setDoctorProfile(null);
      return;
    }
    setDoctorProfileLoading(true);
    try {
      const data = await staffDoctorProfile(branchId, doctorMemberId);
      setDoctorProfile(data && typeof data === "object" ? (data as Record<string, unknown>) : null);
    } catch {
      setDoctorProfile(null);
    } finally {
      setDoctorProfileLoading(false);
    }
  }, [branchId, doctorMemberId]);

  useEffect(() => {
    void loadFees();
  }, [loadFees]);

  useEffect(() => {
    void loadDoctorProfile();
  }, [loadDoctorProfile]);

  const feeType =
    payload && typeof payload === "object"
      ? String((payload as Record<string, unknown>).feeType ?? "consultation")
      : "consultation";
  const proposedValue =
    payload && typeof payload === "object" && (payload as Record<string, unknown>).proposedValue != null
      ? Number((payload as Record<string, unknown>).proposedValue)
      : null;
  const feeReason =
    payload && typeof payload === "object" && (payload as Record<string, unknown>).reason != null
      ? String((payload as Record<string, unknown>).reason)
      : "";

  const subtitleType = labelForClinicApprovalRequestType(requestType);
  const requestIdLabel = row?.id != null ? `Request #${row.id}` : "Approval request";

  const { summaryEntries, otherEntries } = useMemo(() => splitPayloadForDisplay(payload), [payload]);
  const hasStructuredPayload =
    payload != null && typeof payload === "object" && !Array.isArray(payload) && Object.keys(payload as object).length > 0;
  const rawPayloadJson = useMemo(() => (hasStructuredPayload ? prettyStringify(payload) : ""), [payload, hasStructuredPayload]);

  const displayDoctorName =
    (doctorProfile?.displayName != null ? String(doctorProfile.displayName) : null) ??
    doctorNameFromRow ??
    pName ??
    (doctorMemberId != null ? `Doctor #${doctorMemberId}` : null);

  const payloadInviteEmail =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>).email : undefined;
  const payloadInvitePhone =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>).phone : undefined;

  return (
    <div className="d-flex flex-column gap-3">
      {loadError && isPartialRow && (
        <div className="alert alert-warning border-0 py-2 px-3 small mb-0 radius-8" role="status">
          Live details could not be refreshed; showing partial data. The audit timeline may be incomplete.
        </div>
      )}

      <SectionCard
        title={requestIdLabel}
        subtitle={subtitleType}
        marginBottom={false}
        className="shadow-sm border"
      >
        <dl className="row small mb-0 g-2">
          <dt className="col-sm-4 col-lg-3 text-muted fw-normal mb-0">Status</dt>
          <dd className="col-sm-8 col-lg-9 mb-0 fw-medium">{humanizeEnum(String(row.status ?? "—"))}</dd>
          <dt className="col-sm-4 col-lg-3 text-muted fw-normal mb-0">Requested by</dt>
          <dd className="col-sm-8 col-lg-9 mb-0">
            {(row.requestedBy as { profile?: { displayName?: string } })?.profile?.displayName ??
              (row.requestedByUserId != null ? `User #${row.requestedByUserId}` : "—")}
          </dd>
          <dt className="col-sm-4 col-lg-3 text-muted fw-normal mb-0">Requested at</dt>
          <dd className="col-sm-8 col-lg-9 mb-0">
            {row.createdAt ? new Date(String(row.createdAt)).toLocaleString() : "—"}
          </dd>
          <dt className="col-sm-4 col-lg-3 text-muted fw-normal mb-0">Effective</dt>
          <dd className="col-sm-8 col-lg-9 mb-0">{effectiveDateFromPayload(payload) ?? "—"}</dd>
          <dt className="col-sm-4 col-lg-3 text-muted fw-normal mb-0">Priority</dt>
          <dd className="col-sm-8 col-lg-9 mb-0">
            <span className="badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle radius-8">
              {String(row.priorityLabel ?? "—")}
            </span>
          </dd>
          {row.rejectReason != null && String(row.rejectReason).trim() !== "" && (
            <>
              <dt className="col-sm-4 col-lg-3 text-muted fw-normal mb-0">Reject reason</dt>
              <dd className="col-sm-8 col-lg-9 mb-0 text-break">{String(row.rejectReason)}</dd>
            </>
          )}
          {((row.approvedBy as { profile?: { displayName?: string } } | undefined)?.profile?.displayName != null ||
            row.approvedByUserId != null) && (
            <>
              <dt className="col-sm-4 col-lg-3 text-muted fw-normal mb-0">Decided by</dt>
              <dd className="col-sm-8 col-lg-9 mb-0">
                {(row.approvedBy as { profile?: { displayName?: string } })?.profile?.displayName ??
                  (row.approvedByUserId != null ? `User #${row.approvedByUserId}` : "—")}
              </dd>
            </>
          )}
          {row.approvedAt != null && String(row.approvedAt).trim() !== "" && (
            <>
              <dt className="col-sm-4 col-lg-3 text-muted fw-normal mb-0">Decided at</dt>
              <dd className="col-sm-8 col-lg-9 mb-0">{new Date(String(row.approvedAt)).toLocaleString()}</dd>
            </>
          )}
        </dl>
      </SectionCard>

      <SectionCard
        title="Doctor"
        subtitle={
          doctorMemberId != null
            ? "Branch member linked to this request"
            : "No branch doctor member on file for this request"
        }
        marginBottom={false}
        className="shadow-sm border"
        actions={
          doctorMemberId != null && Number.isFinite(doctorMemberId) ? (
            <div className="d-flex flex-wrap gap-2">
              {onOpenDoctor360 && (
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm radius-8"
                  onClick={() => onOpenDoctor360(doctorMemberId)}
                >
                  Quick view
                </button>
              )}
              <Link href={profileRoute(branchId, doctorMemberId)} className="btn btn-outline-secondary btn-sm radius-8">
                Open profile
              </Link>
            </div>
          ) : undefined
        }
      >
        {doctorMemberId != null && Number.isFinite(doctorMemberId) ? (
          doctorProfileLoading ? (
            <p className="text-muted small mb-0">Loading doctor details…</p>
          ) : (
            <div className="rounded-3 border bg-body-tertiary bg-opacity-50 p-3">
              <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="h5 mb-0 text-break">{displayDoctorName}</div>
                  <div className="text-muted small">Branch member ID · {doctorMemberId}</div>
                </div>
              </div>
              <div className="row g-3 small">
                <div className="col-sm-6 col-lg-4">
                  <div className="text-muted text-uppercase" style={{ fontSize: "0.65rem", letterSpacing: "0.06em" }}>
                    Email
                  </div>
                  <div className="text-break fw-medium">{doctorProfile?.email != null ? String(doctorProfile.email) : "—"}</div>
                </div>
                <div className="col-sm-6 col-lg-4">
                  <div className="text-muted text-uppercase" style={{ fontSize: "0.65rem", letterSpacing: "0.06em" }}>
                    Phone
                  </div>
                  <div className="text-break fw-medium">{doctorProfile?.phone != null ? String(doctorProfile.phone) : "—"}</div>
                </div>
                <div className="col-sm-6 col-lg-4">
                  <div className="text-muted text-uppercase" style={{ fontSize: "0.65rem", letterSpacing: "0.06em" }}>
                    Role in clinic
                  </div>
                  <div className="text-break fw-medium">
                    {doctorProfile?.branchRole != null ? humanizeEnum(String(doctorProfile.branchRole)) : "—"}
                  </div>
                </div>
                <div className="col-sm-6 col-lg-4">
                  <div className="text-muted text-uppercase" style={{ fontSize: "0.65rem", letterSpacing: "0.06em" }}>
                    Clinic staff profile ID
                  </div>
                  <div className="font-monospace small">{doctorProfile?.clinicStaffProfileId != null ? String(doctorProfile.clinicStaffProfileId) : "—"}</div>
                </div>
                <div className="col-sm-6 col-lg-4">
                  <div className="text-muted text-uppercase" style={{ fontSize: "0.65rem", letterSpacing: "0.06em" }}>
                    Status
                  </div>
                  <div>{doctorProfile?.activeStatus != null ? humanizeEnum(String(doctorProfile.activeStatus)) : "—"}</div>
                </div>
              </div>
              {!doctorProfile && !doctorProfileLoading && (
                <p className="text-muted small mt-2 mb-0">
                  Extended profile could not be loaded; basic identifiers still apply.
                </p>
              )}
            </div>
          )
        ) : (
          <div className="alert alert-light border text-muted small mb-0 py-3" role="note">
            <strong className="text-body">No linked doctor member.</strong>{" "}
            {payloadInviteEmail != null || payloadInvitePhone != null || pName ? (
              <>
                Details from the request payload:
                <dl className="row small mt-2 mb-0">
                  {pName && (
                    <>
                      <dt className="col-sm-4 text-muted">Name</dt>
                      <dd className="col-sm-8 text-break">{pName}</dd>
                    </>
                  )}
                  {payloadInviteEmail != null && String(payloadInviteEmail).trim() !== "" && (
                    <>
                      <dt className="col-sm-4 text-muted">Email</dt>
                      <dd className="col-sm-8 text-break">{String(payloadInviteEmail)}</dd>
                    </>
                  )}
                  {payloadInvitePhone != null && String(payloadInvitePhone).trim() !== "" && (
                    <>
                      <dt className="col-sm-4 text-muted">Phone</dt>
                      <dd className="col-sm-8 text-break">{String(payloadInvitePhone)}</dd>
                    </>
                  )}
                </dl>
              </>
            ) : (
              <>This request type may not include a branch member yet (for example a pending invite). Use the payload section below for context.</>
            )}
          </div>
        )}
      </SectionCard>

      {requestType === "DOCTOR_FEE_CHANGE" && doctorMemberId != null && (
        <SectionCard
          title="Fee comparison"
          subtitle="Current values are read from the live branch profile, not a point-in-time snapshot."
          marginBottom={false}
          className="shadow-sm border"
        >
          {feeLoading ? (
            <p className="text-muted small mb-0">Loading fee snapshot…</p>
          ) : feeError ? (
            <p className="text-danger small mb-0">Could not load current fees.</p>
          ) : feeCurrent && proposedValue != null && Number.isFinite(proposedValue) ? (
            <>
              <div className="table-responsive rounded border">
                <table className="table table-sm table-hover mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th scope="col" className="text-muted small fw-semibold">
                        Field
                      </th>
                      <th scope="col" className="text-muted small fw-semibold">
                        Current (live)
                      </th>
                      <th scope="col" className="text-muted small fw-semibold">
                        Proposed
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{feeFieldLabel(feeType)}</td>
                      <td>
                        {(() => {
                          const c = currentFeeForType(feeCurrent, feeType);
                          return c != null && Number.isFinite(c) ? String(c) : "—";
                        })()}
                      </td>
                      <td className="fw-semibold">{String(proposedValue)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {effectiveDateFromPayload(payload) && (
                <p className="small text-muted mb-0 mt-2">
                  <span className="fw-medium text-body">Effective · </span>
                  {effectiveDateFromPayload(payload)}
                </p>
              )}
              {feeReason.trim() !== "" && (
                <p className="small mb-0 mt-1 text-break">
                  <span className="fw-medium text-body">Reason · </span>
                  {feeReason}
                </p>
              )}
            </>
          ) : (
            <p className="text-muted small mb-0">No proposed fee value in payload.</p>
          )}
        </SectionCard>
      )}

      <SectionCard
        title="Request payload"
        subtitle="Structured fields for review; expand for full JSON."
        marginBottom={false}
        className="shadow-sm border"
      >
        {!hasStructuredPayload ? (
          <p className="text-muted small mb-0">No structured payload on this request.</p>
        ) : (
          <>
            {(summaryEntries.length > 0 || otherEntries.length > 0) && (
              <div className="mb-3">
                <div className="text-uppercase text-muted small fw-semibold mb-2" style={{ letterSpacing: "0.04em" }}>
                  Structured details
                </div>
                <div className="rounded border bg-light bg-opacity-25">
                  <div className="table-responsive">
                    <table className="table table-sm mb-0 align-top">
                      <tbody>
                        {summaryEntries.map(({ key, label, value }) => (
                          <tr key={`sum-${key}`}>
                            <th
                              scope="row"
                              className="text-muted small fw-normal text-nowrap border-end bg-body-secondary bg-opacity-25"
                              style={{ width: "32%", maxWidth: "12rem" }}
                            >
                              {label}
                            </th>
                            <td className="small text-break">{formatPayloadCell(value, 0)}</td>
                          </tr>
                        ))}
                        {otherEntries.map(({ key, label, value }) => (
                          <tr key={`rest-${key}`}>
                            <th
                              scope="row"
                              className="text-muted small fw-normal text-nowrap border-end bg-body-secondary bg-opacity-10"
                              style={{ width: "32%", maxWidth: "12rem" }}
                            >
                              {label}
                            </th>
                            <td className="small text-break">{formatPayloadCell(value, 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            <details className="border rounded overflow-hidden">
              <summary className="px-3 py-2 bg-body-secondary bg-opacity-25 small fw-semibold cursor-pointer user-select-none">
                Raw payload (JSON)
              </summary>
              <pre
                className="small mb-0 p-3 bg-body-tertiary text-break"
                style={{
                  maxHeight: "min(24rem, 55vh)",
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {rawPayloadJson}
              </pre>
            </details>
          </>
        )}
      </SectionCard>

      <SectionCard
        title="Audit timeline"
        subtitle="Decision history for this approval request"
        marginBottom={false}
        className="shadow-sm border"
      >
        {actionLogs.length === 0 ? (
          <div className="rounded-3 border border-dashed py-4 px-3 text-center bg-body-secondary bg-opacity-10">
            <div className="text-muted small fw-semibold mb-1">
              {String(row.status) === "PENDING" ? "Awaiting decision" : "No log entries"}
            </div>
            <p className="text-muted small mb-0 mx-auto" style={{ maxWidth: "28rem" }}>
              {String(row.status) === "PENDING"
                ? "There are no approval or rejection events yet. Actions you take will appear here with timestamp and actor."
                : "The API returned no timeline rows for this request. Decisions may still be recorded on the request summary above."}
            </p>
          </div>
        ) : (
          <div className="position-relative ps-1">
            <div
              className="position-absolute top-0 bottom-0 border-start border-2"
              style={{ left: "0.6rem", borderColor: "var(--bs-border-color-translucent)" }}
              aria-hidden
            />
            <ul className="list-unstyled mb-0">
              {actionLogs.map((log, idx) => {
                const actionStr = String(log.action ?? "");
                return (
                  <li key={auditLogStableKey(log, idx)} className="position-relative pb-4 ps-4 ms-2">
                    <span
                      className="position-absolute rounded-circle bg-body border border-2"
                      style={{
                        width: "0.65rem",
                        height: "0.65rem",
                        left: "-0.2rem",
                        top: "0.35rem",
                        borderColor: "var(--bs-border-color)",
                      }}
                      aria-hidden
                    />
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                      <span className={auditActionBadgeClass(actionStr)}>{humanizeEnum(actionStr)}</span>
                      <span className="text-muted small">
                        {log.createdAt ? new Date(String(log.createdAt)).toLocaleString() : "—"}
                      </span>
                    </div>
                    <div className="small text-muted mb-1">
                      Actor ·{" "}
                      <span className="text-body">
                        {log.byUserId != null ? `User #${log.byUserId}` : "System / unspecified"}
                      </span>
                    </div>
                    {log.reason != null && String(log.reason).trim() !== "" && (
                      <div className="small text-break border-start border-3 border-secondary-subtle ps-2 ms-1 py-1 mb-1">
                        {String(log.reason)}
                      </div>
                    )}
                    {log.meta != null && (
                      <div className="rounded border bg-light px-2 py-1 small text-muted text-break">
                        {formatValueForDisplay(log.meta)}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
