"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffDoctorsPackageMatrix } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace, LoadingState } from "@/src/components/dashboard";

const DOCTORS_PERMS = ["clinic.doctors.view", "clinic.doctors.manage_packages"];

export default function StaffClinicDoctorsPackageAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const [data, setData] = useState<{ doctors: any[]; packages: any[]; matrix: any[] }>({ doctors: [], packages: [], matrix: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = DOCTORS_PERMS.some((p) => permissions.includes(p));

  const load = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    setLoading(true);
    setError("");
    try {
      const res = await staffDoctorsPackageMatrix(branchId);
      setData(res ?? { doctors: [], packages: [], matrix: [] });
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load");
      setData({ doctors: [], packages: [], matrix: [] });
    } finally {
      setLoading(false);
    }
  }, [branchId, hasAccess]);

  useEffect(() => {
    load();
  }, [load]);

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
        onBack={() => router.push(`/staff/branch/${branchId}/clinic/doctors`)}
      />
    );
  }

  const rows = data.matrix ?? [];
  const flatPackages = rows.flatMap((r: any) => r.packages ?? []);

  return (
    <PageWorkspace>
      <div className="row g-0">
        <div className="col-12">
          <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <Link href={`/staff/branch/${branchId}/clinic/doctors`} className="btn btn-outline-secondary btn-sm radius-8">← Doctors</Link>
            <h5 className="mb-0">Package Assignment</h5>
          </div>

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}

      {loading ? (
        <div className="card radius-12"><div className="card-body text-center py-5"><div className="spinner-border text-primary" role="status" /><p className="text-muted mt-2 mb-0">Loading...</p></div></div>
      ) : (
        <div className="card radius-12">
          <div className="card-header bg-transparent p-24"><h6 className="mb-0">Doctor × Package roles</h6></div>
          <div className="card-body p-0">
            {flatPackages.length ? (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr><th>Doctor</th><th>Package</th><th>Role</th><th>Primary</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((row: any) =>
                      (row.packages ?? []).map((pkg: any, j: number) => (
                        <tr key={`${row.doctorId}-${j}`}>
                          <td>{row.doctorName}</td>
                          <td>{pkg.packageName ?? pkg.packageCode}</td>
                          <td>{pkg.roleInPackage ?? "—"}</td>
                          <td>{pkg.isPrimary ? "Yes" : "—"}</td>
                          <td><span className="badge radius-8">{pkg.status ?? "ACTIVE"}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card-body text-center py-5 text-muted">No package assignments. Assign packages from doctor profiles.</div>
            )}
          </div>
        </div>
      )}
        </div>
      </div>
    </PageWorkspace>
  );
}
