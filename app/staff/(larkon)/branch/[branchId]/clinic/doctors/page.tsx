"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffDoctorsSummary,
  staffDoctorsAlerts,
  staffDoctorsEnriched,
  staffClinicListInvitations,
  staffClinicResendInvitation,
  staffClinicCancelInvitation,
} from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import {
  PageWorkspace,
  PageHeader,
  LoadingState,
  ErrorState,
} from "@/src/components/dashboard";
import {
  DoctorKpiCards,
  DoctorAlertStrip,
  DoctorSearchFilterBar,
  DoctorViewSwitcher,
  DoctorTable,
  DoctorSummaryCard,
  Doctor360Drawer,
} from "@/src/components/clinic/doctors";
import type { DoctorViewMode } from "@/src/components/clinic/doctors";
import type { DoctorsSummary, OperationalAlert, EnrichedDoctor } from "@/src/components/clinic/doctors";
import { doctors as doctorsRoute, invite, assignExisting, scheduleBoard } from "@/src/lib/doctorOperationsRoutes";

const DOCTORS_PERMS = ["clinic.doctors.view", "clinic.doctors.assign"];

export default function StaffClinicDoctorsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const [summary, setSummary] = useState<DoctorsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [doctors, setDoctors] = useState<EnrichedDoctor[]>([]);
  const [total, setTotal] = useState(0);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<DoctorViewMode>("table");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [drawerMemberId, setDrawerMemberId] = useState<number | null>(null);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = DOCTORS_PERMS.some((p) => permissions.includes(p));
  const canAssign = permissions.includes("clinic.doctors.assign");
  const canInvite = permissions.includes("clinic.doctors.invite");

  const [invitations, setInvitations] = useState<{ id: number; email: string | null; phone: string | null; displayName: string | null; role: string; inviteAsDoctor: boolean; status: string; expiresAt: string | null; createdAt: string | null; invitedByDisplayName: string | null }[]>([]);
  const [invitationsTotal, setInvitationsTotal] = useState(0);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationActionId, setInvitationActionId] = useState<number | null>(null);

  const loadSummary = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    setSummaryLoading(true);
    try {
      const data = await staffDoctorsSummary(branchId);
      setSummary(data ?? null);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [branchId, hasAccess]);

  const loadAlerts = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    setAlertsLoading(true);
    try {
      const data = await staffDoctorsAlerts(branchId);
      setAlerts(Array.isArray(data) ? data : []);
    } catch {
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, [branchId, hasAccess]);

  const loadDoctors = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    setDoctorsLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = { limit: 50, offset: 0 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      const data = await staffDoctorsEnriched(branchId, params);
      const rawItems = Array.isArray(data?.items) ? data.items : [];
      setDoctors(
        rawItems.map((d: any) => ({
          ...d,
          displayName: d.displayName ?? `Doctor #${d.memberId ?? 0}`,
          status: d.status ?? "ACTIVE",
          contractStatus: d.contractStatus ?? null,
          servicesAssignedCount: typeof d.servicesAssignedCount === "number" ? d.servicesAssignedCount : 0,
          packagesAssignedCount: typeof d.packagesAssignedCount === "number" ? d.packagesAssignedCount : 0,
        }))
      );
      setTotal(typeof data?.total === "number" ? data.total : 0);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load doctors");
      setDoctors([]);
      setTotal(0);
    } finally {
      setDoctorsLoading(false);
    }
  }, [branchId, hasAccess, search, statusFilter]);

  const loadInvitations = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    setInvitationsLoading(true);
    try {
      const data = await staffClinicListInvitations(branchId, { status: "PENDING", limit: 50, offset: 0 });
      setInvitations(Array.isArray(data?.items) ? data.items : []);
      setInvitationsTotal(typeof data?.total === "number" ? data.total : 0);
    } catch {
      setInvitations([]);
      setInvitationsTotal(0);
    } finally {
      setInvitationsLoading(false);
    }
  }, [branchId, hasAccess]);

  useEffect(() => {
    loadSummary();
    loadAlerts();
  }, [loadSummary, loadAlerts]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  useEffect(() => {
    if (canInvite || hasAccess) loadInvitations();
  }, [loadInvitations, canInvite, hasAccess]);

  const handleResendInvitation = useCallback(
    async (inviteId: number) => {
      if (!branchId || invitationActionId != null) return;
      setInvitationActionId(inviteId);
      try {
        await staffClinicResendInvitation(branchId, inviteId);
        await loadInvitations();
        await loadSummary();
      } catch (e) {
        alert((e as Error)?.message ?? "Failed to resend invitation");
      } finally {
        setInvitationActionId(null);
      }
    },
    [branchId, invitationActionId, loadInvitations, loadSummary]
  );

  const handleCancelInvitation = useCallback(
    async (inviteId: number) => {
      if (!branchId || invitationActionId != null) return;
      if (!confirm("Cancel this invitation? The invitee will no longer be able to accept it.")) return;
      setInvitationActionId(inviteId);
      try {
        await staffClinicCancelInvitation(branchId, inviteId);
        await loadInvitations();
        await loadSummary();
      } catch (e) {
        alert((e as Error)?.message ?? "Failed to cancel invitation");
      } finally {
        setInvitationActionId(null);
      }
    },
    [branchId, invitationActionId, loadInvitations, loadSummary]
  );

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("");
  }, []);

  if (ctxLoading) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading..." />
      </PageWorkspace>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.doctors.view"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic`)}
      />
    );
  }

  const basePath = doctorsRoute(branchId);

  return (
    <PageWorkspace>
      <div className="row g-0">
        <div className="col-12">
          <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <Link href={`/staff/branch/${branchId}/clinic`} className="btn btn-outline-secondary btn-sm radius-8">
              ← Clinic
            </Link>
            <nav aria-label="Breadcrumb" className="d-flex align-items-center gap-2">
              <Link href={`/staff/branch/${branchId}/clinic`} className="text-muted small">
                Clinic
              </Link>
              <span className="text-muted small">/</span>
              <span className="fw-semibold">Doctors</span>
            </nav>
          </div>

          <PageHeader
            title="Doctors"
            subtitle="Manage and assign doctors for this branch"
            breadcrumbs={[
              { label: "Clinic", href: `/staff/branch/${branchId}/clinic` },
              { label: "Doctors" },
            ]}
            actions={
              <>
                {canAssign && (
                  <>
                    <Link href={invite(branchId)} className="btn btn-primary btn-sm radius-8">
                      Invite Doctor
                    </Link>
                    <Link href={assignExisting(branchId)} className="btn btn-outline-primary btn-sm radius-8">
                      Assign Existing Doctor
                    </Link>
                  </>
                )}
                <Link href={scheduleBoard(branchId)} className="btn btn-outline-secondary btn-sm radius-8">
                  Schedule Board
                </Link>
              </>
            }
          />

          {error && <ErrorState message={error} onRetry={loadDoctors} className="mb-3" />}

          <DoctorKpiCards
            summary={summary}
            loading={summaryLoading}
            onCardClick={(filterKey) => setStatusFilter(filterKey === "status" ? "ACTIVE" : "")}
          />

          {!alertsLoading && alerts.length > 0 && <DoctorAlertStrip alerts={alerts} />}

          {(invitationsTotal > 0 || invitationsLoading) && (
            <div className="card radius-12 mb-3">
              <div className="card-body">
                <h6 className="card-title mb-3 d-flex align-items-center gap-2">
                  <i className="solar:letter-outline" />
                  Pending invitations
                  {invitationsTotal > 0 && (
                    <span className="badge bg-primary">{invitationsTotal}</span>
                  )}
                </h6>
                {invitationsLoading ? (
                  <div className="text-muted small py-2">Loading...</div>
                ) : invitations.length === 0 ? (
                  <p className="text-muted small mb-0">No pending invitations.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead>
                        <tr>
                          <th>Email / Phone</th>
                          <th>Role</th>
                          <th>Doctor</th>
                          <th>Expires</th>
                          <th>Invited by</th>
                          {canInvite && <th className="text-end">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {invitations.map((inv) => (
                          <tr key={inv.id}>
                            <td>
                              {inv.email || inv.phone || "—"}
                              {inv.displayName && (
                                <div className="text-muted small">{inv.displayName}</div>
                              )}
                            </td>
                            <td>{inv.role}</td>
                            <td>{inv.inviteAsDoctor ? "Yes" : "—"}</td>
                            <td className="small">
                              {inv.expiresAt
                                ? new Date(inv.expiresAt).toLocaleString(undefined, {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })
                                : "—"}
                            </td>
                            <td className="small text-muted">{inv.invitedByDisplayName ?? "—"}</td>
                            {canInvite && (
                              <td className="text-end">
                                <button
                                  type="button"
                                  className="btn btn-outline-primary btn-sm me-1"
                                  disabled={invitationActionId != null}
                                  onClick={() => handleResendInvitation(inv.id)}
                                >
                                  {invitationActionId === inv.id ? "..." : "Resend"}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  disabled={invitationActionId != null}
                                  onClick={() => handleCancelInvitation(inv.id)}
                                >
                                  {invitationActionId === inv.id ? "..." : "Cancel"}
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          <DoctorSearchFilterBar
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onReset={handleResetFilters}
          />

          <div className="d-flex justify-content-between align-items-center mb-2">
            <DoctorViewSwitcher mode={viewMode} onChange={setViewMode} />
          </div>

          {viewMode === "table" && (
            <DoctorTable
              branchId={branchId}
              doctors={doctors}
              loading={doctorsLoading}
              canAssign={canAssign}
              onDoctorClick={setDrawerMemberId}
            />
          )}

          {viewMode === "cards" && (
            <div className="row g-3">
              {doctorsLoading ? (
                <div className="col-12 text-center py-5">
                  <div className="spinner-border text-primary" role="status" />
                  <p className="text-muted mt-2 mb-0">Loading...</p>
                </div>
              ) : (
                doctors.map((d) => (
                  <div key={d.memberId} className="col-12 col-sm-6 col-md-4 col-lg-3">
                    <DoctorSummaryCard branchId={branchId} doctor={d} canAssign={canAssign} />
                  </div>
                ))
              )}
            </div>
          )}

          {viewMode === "schedule" && (
            <div className="card radius-12">
              <div className="card-body text-center py-5">
                <p className="text-muted mb-2">View the full schedule for all doctors on the Schedule Board.</p>
                <Link href={scheduleBoard(branchId)} className="btn btn-primary btn-sm radius-8">
                  Open Schedule Board
                </Link>
              </div>
            </div>
          )}

          <Doctor360Drawer
            open={drawerMemberId != null}
            onClose={() => setDrawerMemberId(null)}
            branchId={branchId}
            memberId={drawerMemberId}
          />
        </div>
      </div>
    </PageWorkspace>
  );
}
