"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffClinicTreatmentCoursesList } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const PERMS = ["medicine.dose.record", "medicine.dose.read"];

export default function TreatmentCoursesPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = PERMS.some((p) => permissions.includes(p));

  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [patientIdFilter, setPatientIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    staffClinicTreatmentCoursesList(branchId, {
      patientId: patientIdFilter ? Number(patientIdFilter) : undefined,
      status: statusFilter || undefined,
      take: 50,
    })
      .then((r) => {
        setList(r.list ?? []);
        setTotal(r.total ?? 0);
      })
      .catch(() => {
        setList([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [branchId, patientIdFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" />
      </div>
    );
  }
  if (!hasAccess) {
    return <AccessDenied missingPerm="medicine.dose.read" onBack={() => window.history.back()} />;
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 mb-0">Treatment Courses</h1>
        <Link
          href={`/staff/branch/${branchId}/clinic/treatment-courses/new`}
          className="btn btn-primary"
        >
          New treatment course
        </Link>
      </div>
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-3">
              <label className="form-label small">Patient ID</label>
              <input
                type="number"
                className="form-control form-control-sm"
                placeholder="Filter by patient"
                value={patientIdFilter}
                onChange={(e) => setPatientIdFilter(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Status</label>
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="HOLD">Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="STOPPED">Stopped</option>
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={load}>
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" />
            </div>
          ) : list.length === 0 ? (
            <p className="text-muted mb-0">No treatment courses found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Patient</th>
                    <th>Medicine</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c: any) => (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td>{c.patient?.profile?.displayName ?? `#${c.patientId}`}</td>
                      <td>{c.variant?.title ?? "-"}</td>
                      <td>{c._count?.days ?? c.durationDays ?? "-"}</td>
                      <td>
                        <span className={`badge bg-${c.status === "ACTIVE" ? "success" : c.status === "HOLD" ? "warning" : "secondary"}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/staff/branch/${branchId}/clinic/treatment-courses/${c.id}`}
                          className="btn btn-sm btn-outline-primary"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > 0 && (
            <p className="small text-muted mb-0 mt-2">
              Showing {list.length} of {total}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
