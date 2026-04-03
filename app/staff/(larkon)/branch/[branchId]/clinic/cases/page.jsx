"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffClinicCasesList } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import EmptyState from "@/src/components/dashboard/EmptyState";
import StatusBadge from "@/src/components/dashboard/StatusBadge";
import { PaginationBar } from "@/src/components/common/PaginationBar";

export default function StaffClinicCasesPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = permissions.some((p) => p === "clinic.cases.read" || p === "clinic.cases.write");

  const load = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    staffClinicCasesList(branchId, {
      status: status || undefined,
      from: from || undefined,
      to: to || undefined,
      page: pagination.page,
      limit: pagination.limit,
    })
      .then((r) => {
        setItems(r.items ?? []);
        setPagination((prev) => ({ ...prev, ...(r.pagination ?? {}) }));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [branchId, status, from, to, pagination.page, pagination.limit]);

  useEffect(() => {
    load();
  }, [load]);

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.cases.read"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic`)}
      />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}/clinic`} className="btn btn-outline-secondary btn-sm">
          ← Clinic
        </Link>
        <h5 className="mb-0">Clinical cases</h5>
      </div>

      <div className="card radius-12 mb-4">
        <div className="card-body">
          <div className="row g-2 mb-3">
            <div className="col-auto">
              <label className="form-label small mb-0">Status</label>
              <select
                className="form-select form-select-sm radius-12"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="col-auto">
              <label className="form-label small mb-0">From</label>
              <input type="date" className="form-control form-control-sm radius-12" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="col-auto">
              <label className="form-label small mb-0">To</label>
              <input type="date" className="form-control form-control-sm radius-12" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="col-auto d-flex align-items-end">
              <button type="button" className="btn btn-sm btn-primary radius-12" onClick={load} disabled={loading}>
                {loading ? "Loading…" : "Apply"}
              </button>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-4">
              <span className="spinner-border spinner-border-sm text-primary" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon="ri:folder-open-line"
              title="No cases found"
              description="Try a different status or date range and click Apply, or cases will appear when clinical cases are created from packages."
              action={
                <button type="button" className="btn btn-outline-primary btn-sm radius-8" onClick={load} disabled={loading}>
                  Apply filters
                </button>
              }
            />
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Case #</th>
                    <th>Patient / Pet</th>
                    <th>Package</th>
                    <th>Status</th>
                    <th>Procedures</th>
                    <th>Opened</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td>
                        {c.patient?.profile?.displayName ?? "—"} / {c.pet?.name ?? "—"}
                      </td>
                      <td>{c.surgeryPackage?.packageName ?? "—"}</td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td>{c._count?.procedureOrders ?? 0}</td>
                      <td>{c.openedAt ? new Date(c.openedAt).toLocaleDateString() : "—"}</td>
                      <td>
                        <Link
                          href={`/staff/branch/${branchId}/clinic/cases/${c.id}`}
                          className="btn btn-sm btn-outline-primary radius-8"
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
          {pagination.total > 0 && (
            <PaginationBar
              page={pagination.page}
              pageSize={pagination.limit}
              total={pagination.total}
              totalPages={Math.max(1, pagination.totalPages || 1)}
              disabled={loading}
              onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
              className="mt-3 pt-3 border-top"
              ariaLabel="Clinical cases pages"
            />
          )}
        </div>
      </div>
    </div>
  );
}
