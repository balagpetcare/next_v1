"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { doctors } from "@/src/lib/doctorOperationsRoutes";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffDoctorsServiceMatrix, staffDoctorsPutServiceMatrix } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace, PageHeader, LoadingState, SectionCard, EmptyState } from "@/src/components/dashboard";
import { Doctor360Drawer } from "@/src/components/clinic/doctors";

const DOCTORS_PERMS = ["clinic.doctors.view", "clinic.doctors.manage_services"];
const ROLES = ["CONSULTANT", "SURGEON", "ASSISTANT", "REVIEWER"] as const;

export default function StaffClinicDoctorsServiceAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const memberIdFromUrl = useMemo(() => {
    const m = searchParams?.get("memberId");
    if (m == null || m === "") return null;
    const n = parseInt(m, 10);
    return Number.isNaN(n) ? null : n;
  }, [searchParams]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const [data, setData] = useState<{ doctors: any[]; services: any[]; matrix: any[] }>({ doctors: [], services: [], matrix: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<{ memberId: number; serviceId: number } | null>(null);
  const [drawerMemberId, setDrawerMemberId] = useState<number | null>(null);
  const hasAppliedUrlMemberId = useRef(false);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = DOCTORS_PERMS.some((p) => permissions.includes(p));
  const canEdit = permissions.includes("clinic.doctors.manage_services");

  const load = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    setLoading(true);
    setError("");
    try {
      const res = await staffDoctorsServiceMatrix(branchId);
      setData(res ?? { doctors: [], services: [], matrix: [] });
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load");
      setData({ doctors: [], services: [], matrix: [] });
    } finally {
      setLoading(false);
    }
  }, [branchId, hasAccess]);

  useEffect(() => {
    load();
  }, [load]);

  // Open drawer for doctor when arriving with ?memberId= (e.g. from Doctors list dropdown "Assign services")
  useEffect(() => {
    if (
      memberIdFromUrl != null &&
      !hasAppliedUrlMemberId.current &&
      !loading &&
      (data.matrix ?? []).some((row: any) => row.doctorId === memberIdFromUrl)
    ) {
      hasAppliedUrlMemberId.current = true;
      setDrawerMemberId(memberIdFromUrl);
    }
  }, [memberIdFromUrl, loading, data.matrix]);

  const updateCell = useCallback(
    async (memberId: number, serviceId: number, isAllowed: boolean, role?: string) => {
      if (!branchId || !canEdit) return;
      setSaving({ memberId, serviceId });
      setError("");
      try {
        await staffDoctorsPutServiceMatrix(branchId, {
          bulkAssign: true,
          assignments: [{ memberId, serviceId, isAllowed, role: role ?? undefined }],
        });
        await load();
      } catch (e) {
        setError((e as Error)?.message ?? "Failed to update");
      } finally {
        setSaving(null);
      }
    },
    [branchId, canEdit, load]
  );

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
        missingPerm="clinic.doctors.view"
        onBack={() => router.push(doctors(branchId))}
      />
    );
  }

  const services = data.services ?? [];
  const matrix = data.matrix ?? [];

  return (
    <PageWorkspace>
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <PageHeader title="Service Assignment" subtitle="Map doctors to clinic services and roles" />
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Link href={doctors(branchId)} className="btn btn-outline-secondary btn-sm radius-8">← Doctors</Link>
      </div>
      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}

      {loading ? (
        <SectionCard><div className="text-center py-5"><div className="spinner-border text-primary" role="status" /><p className="text-muted mt-2 mb-0">Loading...</p></div></SectionCard>
      ) : matrix.length === 0 || services.length === 0 ? (
        <SectionCard>
          <EmptyState
            title={matrix.length === 0 ? "No doctors assigned to this branch yet" : "No services in catalog"}
            description={matrix.length === 0 ? "Assign doctors to this branch from the Doctors page, then map them to services here or from their profiles." : "Add clinic services from the Catalog, then assign doctors to them."}
            icon="ri:list-check-2"
            action={<Link href={doctors(branchId)} className="btn btn-outline-primary btn-sm radius-8">Doctors</Link>}
          />
        </SectionCard>
      ) : (
        <SectionCard
          title="Doctors × Services matrix"
          subtitle={canEdit ? "Toggle checkboxes to assign; set role when assigned." : "Read-only view."}
        >
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Doctor</th>
                  {services.map((s: any) => (
                    <th key={s.id} className="text-nowrap" style={{ minWidth: 120 }}>
                      <div className="small">{s.name}</div>
                      <div className="text-muted small fw-normal">Assign / Role</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row: any, i: number) => (
                  <tr key={i}>
                    <td className="align-middle">
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 text-start fw-medium text-body text-decoration-none"
                        onClick={() => setDrawerMemberId(row.doctorId)}
                      >
                        {row.doctorName}
                      </button>
                    </td>
                    {(row.services ?? []).map((svc: any, j: number) => {
                      const isSaving = saving?.memberId === row.doctorId && saving?.serviceId === svc.serviceId;
                      return (
                        <td key={j} className="align-middle">
                          <div className="d-flex align-items-center gap-1 flex-wrap">
                            {canEdit ? (
                              <>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={!!svc.assigned}
                                  disabled={!!isSaving}
                                  onChange={(e) =>
                                    updateCell(row.doctorId, svc.serviceId, e.target.checked, svc.role ?? "CONSULTANT")
                                  }
                                  aria-label={`Assign ${svc.serviceName} to ${row.doctorName}`}
                                />
                                {svc.assigned && (
                                  <select
                                    className="form-select form-select-sm"
                                    style={{ width: "auto", minWidth: 90 }}
                                    value={svc.role ?? "CONSULTANT"}
                                    disabled={!!isSaving}
                                    onChange={(e) =>
                                      updateCell(row.doctorId, svc.serviceId, true, e.target.value)
                                    }
                                  >
                                    {ROLES.map((r) => (
                                      <option key={r} value={r}>{r}</option>
                                    ))}
                                  </select>
                                )}
                              </>
                            ) : (
                              svc.assigned ? (
                                <span className="badge bg-success-subtle text-success-emphasis radius-8">
                                  {svc.role ?? "Yes"}
                                </span>
                              ) : (
                                <span className="text-muted">—</span>
                              )
                            )}
                            {isSaving && <span className="spinner-border spinner-border-sm text-primary" role="status" />}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
