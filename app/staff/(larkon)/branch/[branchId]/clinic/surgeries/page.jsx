"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffClinicSurgeriesList } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace } from "@/src/components/dashboard";
import { PaginationBar } from "@/src/components/common/PaginationBar";

const SURGERY_PERMS = ["clinic.surgery.read", "clinic.surgery.create", "clinic.surgery.manage"];
const PAGE_SIZE = 25;

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function StaffBranchClinicSurgeriesPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState(todayYMD());
  const [dateTo, setDateTo] = useState(todayYMD());
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = SURGERY_PERMS.some((p) => permissions.includes(p));
  const hasCreate = permissions.includes("clinic.surgery.create");
  const hasManage = permissions.includes("clinic.surgery.manage");

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    const offset = (page - 1) * PAGE_SIZE;
    staffClinicSurgeriesList(branchId, {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: statusFilter || undefined,
      limit: PAGE_SIZE,
      offset,
    })
      .then((result) => {
        if (!cancelled) {
          setData({ items: result?.items ?? [], total: result?.total ?? 0 });
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setData({ items: [], total: 0 });
          setError(e?.message || "Failed to load surgeries.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, dateFrom, dateTo, statusFilter, page]);

  if (ctxLoading) {
    return (
      <div className="py-40 px-3 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.surgery.read"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic`)}
      />
    );
  }

  const items = data.items || [];
  const total = data.total || 0;

  return (
    <PageWorkspace>
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24">
        <Link href={`/staff/branch/${branchId}/clinic`} className="btn btn-outline-secondary btn-sm">
          ← Clinic
        </Link>
        <h5 className="mb-0">Surgeries</h5>
        {hasCreate && (
          <Link
            href={`/staff/branch/${branchId}/clinic/surgeries/new`}
            className="btn btn-primary btn-sm ms-auto"
          >
            New surgery
          </Link>
        )}
      </div>

      <Card title="Surgery list" subtitle="Scheduled and recent surgeries for this branch.">
        <div className="mb-16 d-flex align-items-center gap-2 flex-wrap">
          <label className="mb-0">From</label>
          <input
            type="date"
            className="form-control form-control-sm"
            style={{ width: "140px" }}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <label className="mb-0">To</label>
          <input
            type="date"
            className="form-control form-control-sm"
            style={{ width: "140px" }}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <select
            className="form-select form-select-sm"
            style={{ width: "140px" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="PRE_OP">Pre-op</option>
            <option value="READY_FOR_OT">Ready for OT</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="POST_OP">Post-op</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {error && (
          <div className="alert alert-danger py-2" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-24">
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Case no</th>
                  <th>Patient / Pet</th>
                  <th>Service</th>
                  <th>Scheduled</th>
                  <th>Surgeon</th>
                  <th>OT room</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-24">
                      No surgeries found. {hasCreate && "Create one from New surgery."}
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <code>{row.caseNumber}</code>
                      </td>
                      <td>
                        {row.pet?.name ?? "—"} {row.patient?.id && `(owner #${row.patient.id})`}
                      </td>
                      <td>{row.service?.name ?? "—"}</td>
                      <td>
                        {row.scheduledStartAt
                          ? new Date(row.scheduledStartAt).toLocaleString(undefined, {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "—"}
                      </td>
                      <td>{row.primaryDoctor?.user?.profile?.displayName ?? "—"}</td>
                      <td>{row.room?.name ?? row.room?.code ?? "—"}</td>
                      <td>
                        <span
                          className={`badge ${
                            row.status === "COMPLETED"
                              ? "bg-success"
                              : row.status === "CANCELLED"
                                ? "bg-secondary"
                                : row.status === "IN_PROGRESS"
                                  ? "bg-primary"
                                  : "bg-light text-dark"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/staff/branch/${branchId}/clinic/surgeries/${row.id}`}
                          className="btn btn-outline-primary btn-sm"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && total > 0 && (
          <PaginationBar
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
            disabled={loading}
            onPageChange={setPage}
            className="mt-16 pt-16 border-top"
            ariaLabel="Surgeries list pages"
          />
        )}
      </Card>
    </PageWorkspace>
  );
}
