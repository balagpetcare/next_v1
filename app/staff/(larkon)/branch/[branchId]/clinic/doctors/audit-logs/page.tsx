"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffDoctorsAuditLogs, staffDoctorsEnriched } from "@/lib/api";
import { formatAuditDetails, humanizeFieldLabel, humanizeEnum, getAuditModule, getAuditRiskLevel } from "@/src/lib/displayFormatters";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import {
  PageWorkspace,
  PageHeader,
  LoadingState,
  SectionCard,
  EmptyState,
} from "@/src/components/dashboard";
import { DoctorOperationsFilterBar, Doctor360Drawer } from "@/src/components/clinic/doctors";
import { doctors, auditLogs as auditLogsRoute } from "@/src/lib/doctorOperationsRoutes";
import { PaginationBar } from "@/src/components/common/PaginationBar";

const DOCTORS_PERMS = ["clinic.doctors.view", "clinic.doctors.assign"];
const LIMIT = 25;

export default function StaffClinicDoctorsAuditLogsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const memberIdFromUrl = useMemo(() => {
    const m = searchParams?.get("memberId");
    if (m == null || m === "") return undefined;
    const n = parseInt(m, 10);
    return Number.isNaN(n) ? undefined : n;
  }, [searchParams]);

  const [doctorOptions, setDoctorOptions] = useState<Array<{ memberId: number }>>([]);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [drawerMemberId, setDrawerMemberId] = useState<number | null>(null);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = DOCTORS_PERMS.some((p) => permissions.includes(p));

  const loadDoctors = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    try {
      const data = await staffDoctorsEnriched(branchId, { limit: 100, offset: 0 });
      const raw = Array.isArray(data?.items) ? data.items : [];
      setDoctorOptions(
        raw.map((d: any) => ({ memberId: d.memberId ?? d.branchMemberId ?? 0 }))
      );
    } catch {
      setDoctorOptions([]);
    }
  }, [branchId, hasAccess]);

  const loadLogs = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    setLoading(true);
    try {
      const data = await staffDoctorsAuditLogs(branchId, {
        memberId: memberIdFromUrl ?? undefined,
        limit: LIMIT,
        offset: page * LIMIT,
      });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(typeof data?.total === "number" ? data.total : 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [branchId, hasAccess, memberIdFromUrl, page]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const setMemberIdInUrl = useCallback(
    (memberId: number | undefined) => {
      const path = auditLogsRoute(branchId);
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      if (memberId != null) next.set("memberId", String(memberId));
      else next.delete("memberId");
      setPage(0);
      const q = next.toString();
      router.replace(q ? `${path}?${q}` : path, { scroll: false });
    },
    [branchId, router, searchParams]
  );

  const doctorExistsInBranch = useMemo(
    () => memberIdFromUrl == null || doctorOptions.some((d) => d.memberId === memberIdFromUrl),
    [memberIdFromUrl, doctorOptions]
  );
  const invalidDoctorInUrl = memberIdFromUrl != null && !doctorExistsInBranch;

  if (ctxLoading || !branch) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading branch…" />
      </PageWorkspace>
    );
  }

  if (!hasAccess) {
    return (
      <PageWorkspace>
        <BranchHeader branch={branch} />
        <AccessDenied requiredPerm="clinic.doctors.view" />
      </PageWorkspace>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <PageWorkspace>
      <BranchHeader branch={branch} />
      <PageHeader
        title="Audit Logs"
        subtitle={
          memberIdFromUrl != null
            ? "Change history filtered by doctor"
            : "Doctor management change history for this branch"
        }
      />

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Link
          href={doctors(branchId)}
          className="btn btn-outline-secondary btn-sm radius-8"
        >
          ← Doctors
        </Link>
      </div>

      <DoctorOperationsFilterBar
        branchId={branchId}
        doctorValue={memberIdFromUrl}
        onDoctorChange={setMemberIdInUrl}
        doctorPlaceholder="All doctors"
        enabled={hasAccess}
        className="mb-3"
      />

      {invalidDoctorInUrl ? (
        <SectionCard title="Audit trail">
          <EmptyState
            title="Doctor not found"
            description="The selected doctor is not assigned to this branch. Choose another doctor or clear the filter."
            icon="ri:user-search-line"
            action={
              <button
                type="button"
                className="btn btn-outline-primary btn-sm radius-8"
                onClick={() => setMemberIdInUrl(undefined)}
              >
                Clear filter
              </button>
            }
          />
        </SectionCard>
      ) : (
        <SectionCard
          title="Audit trail"
          subtitle={
            total > 0
              ? `${total} record(s)${memberIdFromUrl != null ? " (filtered)" : ""}`
              : undefined
          }
        >
          {loading ? (
            <LoadingState message="Loading…" />
          ) : items.length === 0 ? (
            <EmptyState
              title="No audit events"
              description="No audit events for this branch in the selected period. Clear the doctor filter to see all branch activity."
              icon="ri:file-list-3-line"
              action={
                memberIdFromUrl != null ? (
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm radius-8"
                    onClick={() => setMemberIdInUrl(undefined)}
                  >
                    Show all doctors
                  </button>
                ) : (
                  <Link
                    href={doctors(branchId)}
                    className="btn btn-outline-primary btn-sm radius-8"
                  >
                    Back to Doctors
                  </Link>
                )
              }
            />
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Actor</th>
                      {memberIdFromUrl == null && (
                        <th>Doctor</th>
                      )}
                      <th>Module</th>
                      <th>Action</th>
                      <th>Risk</th>
                      <th>Source</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((log: any) => (
                      <tr key={log.id ?? log.createdAt ?? Math.random()}>
                        <td className="text-nowrap small">
                          {log.createdAt
                            ? new Date(log.createdAt).toLocaleString(undefined, {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : "—"}
                        </td>
                        <td>{log.changedByDisplayName ?? (log.changedByUserId != null ? `#${log.changedByUserId}` : "—")}</td>
                        {memberIdFromUrl == null && (
                          <td className="small">
                            {(log.clinicStaffProfile?.branchMemberId ?? log.entityId) != null ? (
                              <button
                                type="button"
                                className="btn btn-link btn-sm p-0 text-start text-body text-decoration-none"
                                onClick={() => setDrawerMemberId(log.clinicStaffProfile?.branchMemberId ?? log.entityId)}
                              >
                                {log.doctorDisplayName ?? log.entityDisplayName ?? `#${log.clinicStaffProfile?.branchMemberId ?? log.entityId}`}
                              </button>
                            ) : (
                              log.doctorDisplayName ?? log.entityDisplayName ?? "—"
                            )}
                          </td>
                        )}
                        <td className="small">{getAuditModule(log.action)}</td>
                        <td className="small">{humanizeEnum(log.action) || log.action || "—"}</td>
                        <td className="small">
                          {getAuditRiskLevel(log.action) && (
                            <span className={`badge ${getAuditRiskLevel(log.action) === "high" ? "bg-danger" : getAuditRiskLevel(log.action) === "medium" ? "bg-warning" : "bg-secondary"} radius-8`}>
                              {getAuditRiskLevel(log.action)}
                            </span>
                          )}
                          {!getAuditRiskLevel(log.action) && "—"}
                        </td>
                        <td className="small">
                          <span className={`badge ${log.changedByUserId ? "bg-primary-subtle text-primary" : "bg-secondary-subtle text-secondary"} radius-8`}>
                            {log.changedByUserId ? "Manual" : "System"}
                          </span>
                        </td>
                        <td className="small text-muted">
                          {(() => {
                            const details = formatAuditDetails({
                              action: log.action,
                              field: log.field,
                              oldValue: log.oldValue,
                              newValue: log.newValue,
                            });
                            if (details.length > 0) return details.join(" · ");
                            if (log.field) return `${humanizeFieldLabel(log.field)}: —`;
                            return "—";
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {total > 0 && (
                <PaginationBar
                  page={page + 1}
                  pageSize={LIMIT}
                  total={total}
                  totalPages={totalPages}
                  disabled={loading}
                  onPageChange={(p) => setPage(p - 1)}
                  className="mt-3 pt-3 border-top"
                  ariaLabel="Doctor audit log pages"
                />
              )}
            </>
          )}
        </SectionCard>
      )}

      <Doctor360Drawer
        open={drawerMemberId != null}
        onClose={() => setDrawerMemberId(null)}
        branchId={branchId}
        memberId={drawerMemberId}
      />
    </PageWorkspace>
  );
}
