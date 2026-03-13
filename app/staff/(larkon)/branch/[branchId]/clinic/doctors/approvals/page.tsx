"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doctors } from "@/src/lib/doctorOperationsRoutes";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffDoctorsPendingApprovals, staffDoctorApprovalAction } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace, PageHeader, LoadingState, SectionCard, FilterBar, EmptyState } from "@/src/components/dashboard";
import { Doctor360Drawer } from "@/src/components/clinic/doctors";

const DOCTORS_PERMS = ["clinic.doctors.view", "approvals.view"];

const TYPE_LABELS: Record<string, string> = {
  DOCTOR_INVITE: "Doctor Invite",
  DOCTOR_SCHEDULE: "Schedule",
  DOCTOR_FEE_CHANGE: "Fee Change",
  DOCTOR_ACTIVATION: "Activation",
  DOCTOR_DEACTIVATION: "Deactivation",
  DOCTOR_SERVICE_PRIVILEGE: "Service",
  DOCTOR_PACKAGE_PRIVILEGE: "Package",
  DOCTOR_LEAVE: "Leave",
  DOCTOR_CREDENTIAL: "Credential",
};

const PRIORITY_BY_TYPE: Record<string, string> = {
  DOCTOR_LEAVE: "High",
  DOCTOR_CREDENTIAL: "High",
  DOCTOR_INVITE: "Medium",
  DOCTOR_ACTIVATION: "Medium",
  DOCTOR_DEACTIVATION: "Medium",
  DOCTOR_SERVICE_PRIVILEGE: "Medium",
  DOCTOR_PACKAGE_PRIVILEGE: "Medium",
  DOCTOR_SCHEDULE: "Low",
  DOCTOR_FEE_CHANGE: "Low",
};

function getSlaAge(createdAt: string | null | undefined): { text: string; variant: "success" | "warning" | "danger" } {
  if (!createdAt) return { text: "—", variant: "success" };
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const hours = (now - created) / (1000 * 60 * 60);
  if (hours < 24) return { text: `${Math.round(hours)}h`, variant: "success" };
  if (hours < 72) return { text: `${Math.round(hours / 24)}d`, variant: "warning" };
  return { text: `${Math.round(hours / 24)}d`, variant: "danger" };
}

export default function StaffClinicDoctorsApprovalsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [actingId, setActingId] = useState<number | null>(null);
  const [drawerMemberId, setDrawerMemberId] = useState<number | null>(null);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = DOCTORS_PERMS.some((p) => permissions.includes(p));
  const canApprove = permissions.includes("approvals.manage");

  const load = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    setLoading(true);
    setError("");
    try {
      const res = await staffDoctorsPendingApprovals(branchId);
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, hasAccess]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = useCallback(
    async (requestId: number, decision: "APPROVED" | "REJECTED", rejectReason?: string) => {
      if (!branchId || !canApprove) return;
      setActingId(requestId);
      setError("");
      try {
        await staffDoctorApprovalAction(branchId, requestId, { decision, rejectReason });
        await load();
      } catch (e) {
        setError((e as Error)?.message ?? "Action failed");
      } finally {
        setActingId(null);
      }
    },
    [branchId, canApprove, load]
  );

  const filtered = useMemo(() => {
    if (!typeFilter) return items;
    return items.filter((r: any) => r.requestType === typeFilter);
  }, [items, typeFilter]);

  const byType = useMemo(() => {
    const m: Record<string, any[]> = {};
    filtered.forEach((r: any) => {
      const t = r.requestType ?? "OTHER";
      if (!m[t]) m[t] = [];
      m[t].push(r);
    });
    return m;
  }, [filtered]);

  if (ctxLoading) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading..." />
      </PageWorkspace>
    );
  }

  if (!branch) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading branch…" />
      </PageWorkspace>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="approvals.view"
        onBack={() => router.push(doctors(branchId))}
      />
    );
  }

  return (
    <PageWorkspace>
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <PageHeader title="Pending Approvals" subtitle="Doctor-related requests" />
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Link href={doctors(branchId)} className="btn btn-outline-secondary btn-sm radius-8">← Doctors</Link>
      </div>
      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}

      <FilterBar className="mb-3" onReset={() => setTypeFilter("")} resetLabel="All types">
        <select
          className="form-select form-select-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </FilterBar>

      {loading ? (
        <SectionCard><div className="text-center py-5"><div className="spinner-border text-primary" role="status" /><p className="text-muted mt-2 mb-0">Loading...</p></div></SectionCard>
      ) : filtered.length === 0 ? (
        <SectionCard>
          <EmptyState
            title="No approvals pending"
            description="There are no doctor-related approval requests for this branch."
            icon="ri:checkbox-multiple-line"
            action={<Link href={doctors(branchId)} className="btn btn-outline-primary btn-sm radius-8">Back to Doctors</Link>}
          />
        </SectionCard>
      ) : (
        Object.entries(byType).map(([requestType, list]) => (
          <SectionCard
            key={requestType}
            title={TYPE_LABELS[requestType] ?? requestType}
            subtitle={`${list.length} pending`}
          >
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Doctor</th>
                    <th>Requested by</th>
                    <th>Date</th>
                    <th>Priority</th>
                    <th>SLA age</th>
                    {canApprove && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {list.map((r: any) => {
                    const doctorMemberId = r.doctorId ?? r.payload?.memberId ?? r.payload?.doctorId;
                    const sla = getSlaAge(r.createdAt);
                    const priority = r.priority ?? PRIORITY_BY_TYPE[r.requestType] ?? "—";
                    return (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>
                        {doctorMemberId != null ? (
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-start text-body text-decoration-none"
                            onClick={() => setDrawerMemberId(doctorMemberId)}
                          >
                            {r.doctorDisplayName ?? r.payload?.displayName ?? `Doctor #${doctorMemberId}`}
                          </button>
                        ) : (
                          r.doctorDisplayName ?? "—"
                        )}
                      </td>
                      <td>{r.requestedBy?.profile?.displayName ?? "—"}</td>
                      <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
                      <td><span className="badge bg-secondary radius-8">{priority}</span></td>
                      <td>
                        {sla.text !== "—" ? (
                          <span className={`badge bg-${sla.variant} radius-8`}>{sla.text}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      {canApprove && (
                        <td className="text-end">
                          <div className="d-flex gap-1 justify-content-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              disabled={actingId === r.id}
                              onClick={() => handleAction(r.id, "APPROVED")}
                            >
                              {actingId === r.id ? "…" : "Approve"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              disabled={actingId === r.id}
                              onClick={() => handleAction(r.id, "REJECTED", "Rejected by manager")}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        ))
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
