"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Modal from "react-bootstrap/Modal";
import { approvalsRequest, doctors } from "@/src/lib/doctorOperationsRoutes";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicApprovalRequestsList,
  staffClinicApprovalRequestsSummary,
  staffApprovalDecide,
} from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import {
  PageWorkspace,
  PageHeader,
  LoadingState,
  SectionCard,
  EmptyState,
  ErrorState,
  StatCard,
} from "@/src/components/dashboard";
import { Doctor360Drawer } from "@/src/components/clinic/doctors";
import { labelForClinicApprovalRequestType } from "@/src/lib/clinicApprovalLabels";
import { useToast } from "@/src/hooks/useToast";
import { PaginationBar } from "@/src/components/common/PaginationBar";

const DOCTORS_PERMS = ["clinic.doctors.view", "approvals.view"];

const PAGE_SIZE = 25;
/** Server fetch cap; show notice when branch has more matching rows. */
const LIST_FETCH_LIMIT = 500;
const SEARCH_DEBOUNCE_MS = 400;

function effectiveFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "—";
  const p = payload as Record<string, unknown>;
  for (const k of ["effectiveFrom", "effectiveDate", "startDate", "validFrom"]) {
    const v = p[k];
    if (v != null && String(v).trim() !== "") {
      try {
        const d = new Date(String(v));
        if (!Number.isNaN(d.getTime())) return d.toLocaleDateString();
      } catch {
        /* ignore */
      }
      return String(v);
    }
  }
  return "—";
}

function slaBadge(row: {
  status?: string;
  slaBreached?: boolean;
  slaWarning?: boolean;
  slaHours?: number;
}): { text: string; className: string } {
  if (row.status !== "PENDING") return { text: "—", className: "badge bg-light text-dark border radius-8" };
  if (row.slaBreached) return { text: `Breached (${row.slaHours ?? "?"}h)`, className: "badge bg-danger radius-8" };
  if (row.slaWarning) return { text: `Warning (${row.slaHours ?? "?"}h)`, className: "badge bg-warning text-dark radius-8" };
  return { text: `${row.slaHours ?? 0}h`, className: "badge bg-success radius-8" };
}

export default function StaffClinicDoctorsApprovalsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const toast = useToast();

  const [items, setItems] = useState<any[]>([]);
  const [totalFromApi, setTotalFromApi] = useState(0);
  const [summary, setSummary] = useState<{
    totalPending: number;
    highPriority: number;
    slaBreached: number;
    approvedToday: number;
    rejectedToday: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [slaFilter, setSlaFilter] = useState<string>("");
  const [searchQ, setSearchQ] = useState("");
  const [debouncedSearchQ, setDebouncedSearchQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [requesterUserId, setRequesterUserId] = useState("");
  const [doctorMemberFilter, setDoctorMemberFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [actingId, setActingId] = useState<number | null>(null);
  const [drawerMemberId, setDrawerMemberId] = useState<number | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: number } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = DOCTORS_PERMS.some((p) => permissions.includes(p));
  const canApprove = permissions.includes("approvals.manage");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQ(searchQ.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQ]);

  const load = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    setLoading(true);
    setError("");
    try {
      const rid =
        requesterUserId.trim() !== "" && Number.isFinite(Number(requesterUserId))
          ? Number(requesterUserId)
          : undefined;
      const mid =
        doctorMemberFilter.trim() !== "" && Number.isFinite(Number(doctorMemberFilter))
          ? Number(doctorMemberFilter)
          : undefined;
      const [sum, list] = await Promise.all([
        staffClinicApprovalRequestsSummary(branchId, { doctorQueue: true }),
        staffClinicApprovalRequestsList(branchId, {
          doctorQueue: true,
          status: statusFilter || undefined,
          requestType: typeFilter || undefined,
          q: debouncedSearchQ || undefined,
          from: dateFrom || undefined,
          to: dateTo || undefined,
          requestedByUserId: rid,
          memberId: mid,
          limit: LIST_FETCH_LIMIT,
          offset: 0,
        }),
      ]);
      setSummary(sum);
      setItems(Array.isArray(list.items) ? list.items : []);
      setTotalFromApi(typeof list.total === "number" ? list.total : list.items?.length ?? 0);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load");
      setItems([]);
      setTotalFromApi(0);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [
    branchId,
    hasAccess,
    statusFilter,
    typeFilter,
    debouncedSearchQ,
    dateFrom,
    dateTo,
    requesterUserId,
    doctorMemberFilter,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPageIndex(0);
  }, [
    statusFilter,
    typeFilter,
    priorityFilter,
    slaFilter,
    debouncedSearchQ,
    dateFrom,
    dateTo,
    requesterUserId,
    doctorMemberFilter,
  ]);

  const filtered = useMemo(() => {
    let rows = [...items];
    if (priorityFilter) {
      rows = rows.filter((r: any) => String(r.priorityLabel ?? "") === priorityFilter);
    }
    if (slaFilter === "breached") {
      rows = rows.filter((r: any) => r.slaBreached === true);
    } else if (slaFilter === "warning") {
      rows = rows.filter((r: any) => r.slaWarning === true && !r.slaBreached);
    } else if (slaFilter === "ok") {
      rows = rows.filter(
        (r: any) => r.status === "PENDING" && !r.slaBreached && !r.slaWarning
      );
    }
    return rows;
  }, [items, priorityFilter, slaFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(pageIndex, pageCount - 1);
  const paged = useMemo(() => {
    const start = safePage * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const openDetail = useCallback(
    (row: { id: number }) => {
      router.push(approvalsRequest(branchId, row.id));
    },
    [branchId, router]
  );

  const handleApprove = useCallback(
    async (requestId: number) => {
      if (!branchId || !canApprove) return;
      if (!window.confirm("Approve this request?")) return;
      setActingId(requestId);
      try {
        await staffApprovalDecide(branchId, requestId, { decision: "APPROVED" });
        toast.success("Request approved");
        await load();
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to approve");
      } finally {
        setActingId(null);
      }
    },
    [branchId, canApprove, load, toast]
  );

  const submitReject = useCallback(async () => {
    if (!branchId || !canApprove || !rejectModal) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("A rejection reason is required");
      return;
    }
    const requestId = rejectModal.id;
    setActingId(requestId);
    try {
      await staffApprovalDecide(branchId, requestId, {
        decision: "REJECTED",
        rejectReason: reason,
      });
      toast.success("Request rejected");
      setRejectModal(null);
      setRejectReason("");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to reject");
    } finally {
      setActingId(null);
    }
  }, [branchId, canApprove, rejectModal, rejectReason, load, toast]);

  const resetFilters = useCallback(() => {
    setTypeFilter("");
    setPriorityFilter("");
    setSlaFilter("");
    setSearchQ("");
    setDateFrom("");
    setDateTo("");
    setRequesterUserId("");
    setDoctorMemberFilter("");
    setStatusFilter("PENDING");
  }, []);

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

  const breadcrumbs = [
    { label: "Doctors", href: doctors(branchId) },
    { label: statusFilter === "PENDING" ? "Pending approvals" : "Doctor approvals" },
  ];

  const headerStats =
    summary != null
      ? [
          { label: "Pending (branch)", value: summary.totalPending, icon: "ri:time-line" as const },
          { label: "High priority", value: summary.highPriority, icon: "ri:alarm-warning-line" as const },
        ]
      : undefined;

  const isFilteredEmpty = filtered.length === 0 && items.length > 0;
  const isTrulyEmpty = !loading && items.length === 0 && !error;

  return (
    <PageWorkspace>
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <PageHeader
        title="Doctor approvals"
        subtitle={`Doctor-related requests for ${(branch as { name?: string }).name ?? "this branch"}`}
        breadcrumbs={breadcrumbs}
        stats={headerStats}
      />

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Link href={doctors(branchId)} className="btn btn-outline-secondary btn-sm radius-8">
          ← Doctors
        </Link>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} className="mb-3" />
      ) : null}

      <div className="row g-3 mb-3">
        <div className="col-6 col-md-4 col-lg">
          <StatCard
            label="Pending"
            value={summary?.totalPending ?? "—"}
            icon="ri:checkbox-line"
            variant="primary"
            loading={loading && !summary}
            onClick={() => {
              setStatusFilter("PENDING");
              setSlaFilter("");
            }}
          />
        </div>
        <div className="col-6 col-md-4 col-lg">
          <StatCard
            label="High priority"
            value={summary?.highPriority ?? "—"}
            icon="ri:alarm-warning-line"
            variant="warning"
            loading={loading && !summary}
            onClick={() => {
              setStatusFilter("PENDING");
              setPriorityFilter("High");
              setSlaFilter("");
            }}
          />
        </div>
        <div className="col-6 col-md-4 col-lg">
          <StatCard
            label="SLA breached"
            value={summary?.slaBreached ?? "—"}
            icon="ri:timer-flash-line"
            variant="danger"
            loading={loading && !summary}
            onClick={() => {
              setStatusFilter("PENDING");
              setSlaFilter("breached");
            }}
          />
        </div>
        <div className="col-6 col-md-4 col-lg">
          <StatCard
            label="Approved today"
            value={summary?.approvedToday ?? "—"}
            icon="ri:check-double-line"
            variant="success"
            loading={loading && !summary}
          />
        </div>
        <div className="col-6 col-md-4 col-lg">
          <StatCard
            label="Rejected today"
            value={summary?.rejectedToday ?? "—"}
            icon="ri:close-circle-line"
            variant="secondary"
            loading={loading && !summary}
          />
        </div>
      </div>

      <SectionCard
        className="mb-3"
        title="Queue filters"
        subtitle="Status, type, dates, and IDs reload from the server. Priority and SLA narrow the loaded rows."
        actions={
          <button type="button" className="btn btn-outline-secondary btn-sm radius-8" onClick={resetFilters}>
            Reset filters
          </button>
        }
        noPadding
      >
        <div className="p-3 p-md-4">
          <div className="mb-3 pb-3 border-bottom border-light">
            <div className="text-uppercase text-muted small fw-semibold mb-2" style={{ letterSpacing: "0.04em" }}>
              Primary
            </div>
            <div className="row g-2 g-md-3 align-items-end">
              <div className="col-12 col-xl-4">
                <label htmlFor="approvals-search" className="form-label small text-muted mb-1">
                  Search
                </label>
                <input
                  id="approvals-search"
                  type="search"
                  className="form-control"
                  placeholder="Request ID, doctor name, or payload text…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  autoComplete="off"
                  aria-label="Search by request ID or payload text"
                />
              </div>
              <div className="col-6 col-md-4 col-xl-2">
                <label htmlFor="approvals-status" className="form-label small text-muted mb-1">
                  Status
                </label>
                <select
                  id="approvals-status"
                  className="form-select form-select-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Status"
                >
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="">All statuses</option>
                </select>
              </div>
              <div className="col-6 col-md-4 col-xl-2">
                <label htmlFor="approvals-type" className="form-label small text-muted mb-1">
                  Request type
                </label>
                <select
                  id="approvals-type"
                  className="form-select form-select-sm"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  aria-label="Request type"
                >
                  <option value="">All types</option>
                  {[
                    "DOCTOR_INVITE",
                    "DOCTOR_SCHEDULE",
                    "DOCTOR_FEE_CHANGE",
                    "DOCTOR_ACTIVATION",
                    "DOCTOR_DEACTIVATION",
                    "DOCTOR_SERVICE_PRIVILEGE",
                    "DOCTOR_PACKAGE_PRIVILEGE",
                    "DOCTOR_LEAVE",
                    "DOCTOR_CREDENTIAL",
                  ].map((k) => (
                    <option key={k} value={k}>
                      {labelForClinicApprovalRequestType(k)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-4 col-xl-2">
                <label htmlFor="approvals-priority" className="form-label small text-muted mb-1">
                  Priority <span className="fw-normal">(client)</span>
                </label>
                <select
                  id="approvals-priority"
                  className="form-select form-select-sm"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  aria-label="Priority"
                >
                  <option value="">All priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div className="col-6 col-md-4 col-xl-2">
                <label htmlFor="approvals-sla" className="form-label small text-muted mb-1">
                  SLA <span className="fw-normal">(client)</span>
                </label>
                <select
                  id="approvals-sla"
                  className="form-select form-select-sm"
                  value={slaFilter}
                  onChange={(e) => setSlaFilter(e.target.value)}
                  aria-label="SLA state"
                >
                  <option value="">All SLA</option>
                  <option value="breached">Breached</option>
                  <option value="warning">Warning</option>
                  <option value="ok">On track</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <div className="text-uppercase text-muted small fw-semibold mb-2" style={{ letterSpacing: "0.04em" }}>
              Date range and identifiers
            </div>
            <div className="row g-2 g-md-3 align-items-end">
              <div className="col-6 col-md-3 col-lg-2">
                <label htmlFor="approvals-date-from" className="form-label small text-muted mb-1">
                  From
                </label>
                <input
                  id="approvals-date-from"
                  type="date"
                  className="form-control form-control-sm"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  aria-label="From date"
                />
              </div>
              <div className="col-6 col-md-3 col-lg-2">
                <label htmlFor="approvals-date-to" className="form-label small text-muted mb-1">
                  To
                </label>
                <input
                  id="approvals-date-to"
                  type="date"
                  className="form-control form-control-sm"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  aria-label="To date"
                />
              </div>
              <div className="col-12 col-md-6 col-lg-4">
                <label htmlFor="approvals-requester" className="form-label small text-muted mb-1">
                  Requester user ID
                </label>
                <input
                  id="approvals-requester"
                  type="number"
                  className="form-control form-control-sm"
                  placeholder="e.g. 1024"
                  value={requesterUserId}
                  onChange={(e) => setRequesterUserId(e.target.value)}
                  min={0}
                  aria-label="Requester user ID"
                />
              </div>
              <div className="col-12 col-md-6 col-lg-4">
                <label htmlFor="approvals-doctor-member" className="form-label small text-muted mb-1">
                  Doctor member ID
                </label>
                <input
                  id="approvals-doctor-member"
                  type="number"
                  className="form-control form-control-sm"
                  placeholder="Branch doctor member id"
                  value={doctorMemberFilter}
                  onChange={(e) => setDoctorMemberFilter(e.target.value)}
                  min={0}
                  aria-label="Doctor member ID"
                />
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="text-muted small mb-2">
        <span>
          {filtered.length} match current view
          {filtered.length !== items.length ? " (after priority/SLA filters)" : ""}
          {items.length > 0 && (
            <>
              {" "}
              · {items.length} loaded
              {totalFromApi > items.length ? ` of ${totalFromApi} total` : ""}
            </>
          )}
        </span>
        {totalFromApi > items.length && (
          <span className="d-block text-warning-emphasis mt-1">
            Results capped at {LIST_FETCH_LIMIT}; narrow server filters (status, type, dates, IDs) to see the rest.
          </span>
        )}
      </div>

      {loading ? (
        <SectionCard>
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" aria-label="Loading" />
            <p className="text-muted mt-2 mb-0">Loading approvals…</p>
          </div>
        </SectionCard>
      ) : items.length === 0 && error ? (
        <SectionCard title="Could not load data">
          <p className="text-muted small mb-0">Use Retry above, or adjust your connection and try again.</p>
        </SectionCard>
      ) : isTrulyEmpty ? (
        <SectionCard>
          <EmptyState
            title="No approvals"
            description="There are no doctor-related approval requests for this branch."
            icon="ri:checkbox-multiple-line"
            action={
              <Link href={doctors(branchId)} className="btn btn-outline-primary btn-sm radius-8">
                Back to Doctors
              </Link>
            }
          />
        </SectionCard>
      ) : isFilteredEmpty ? (
        <SectionCard title="No matching requests">
          <EmptyState
            title="No results"
            description="Try clearing filters or search."
            icon="ri:filter-off-line"
            action={
              <button type="button" className="btn btn-outline-primary btn-sm radius-8" onClick={resetFilters}>
                Clear filters
              </button>
            }
          />
        </SectionCard>
      ) : (
        <SectionCard title="Requests">
          <div className="table-responsive" style={{ maxWidth: "100%" }}>
            <table className="table table-sm table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Type</th>
                  <th scope="col">Doctor</th>
                  <th scope="col">Requested by</th>
                  <th scope="col">Requested at</th>
                  <th scope="col">Effective</th>
                  <th scope="col">Priority</th>
                  <th scope="col">SLA</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r: any) => {
                  const doctorMemberId = r.doctorMemberId ?? r.payload?.memberId ?? r.payload?.doctorId;
                  const sla = slaBadge(r);
                  const eff = effectiveFromPayload(r.payload);
                  return (
                    <tr
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => openDetail(r)}
                      onKeyDown={(e) => e.key === "Enter" && openDetail(r)}
                      tabIndex={0}
                      role="button"
                      aria-label={`View request ${r.id}`}
                    >
                      <td>{r.id}</td>
                      <td className="text-wrap text-break" style={{ maxWidth: "10rem" }}>
                        {labelForClinicApprovalRequestType(r.requestType)}
                      </td>
                      <td className="text-wrap" style={{ maxWidth: "9rem" }} onClick={(e) => e.stopPropagation()}>
                        {doctorMemberId != null ? (
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-start text-body text-decoration-none text-break"
                            onClick={() => setDrawerMemberId(Number(doctorMemberId))}
                            aria-label={`Open doctor quick view for ${String(r.doctorDisplayName ?? doctorMemberId)}`}
                          >
                            {r.doctorDisplayName ?? r.payload?.displayName ?? `Doctor #${doctorMemberId}`}
                          </button>
                        ) : (
                          r.doctorDisplayName ?? "—"
                        )}
                      </td>
                      <td>{r.requestedBy?.profile?.displayName ?? "—"}</td>
                      <td className="small text-muted">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                      </td>
                      <td className="small">{eff}</td>
                      <td className="text-wrap">
                        <span className="badge bg-secondary radius-8 text-wrap text-start">{r.priorityLabel ?? "—"}</span>
                      </td>
                      <td className="text-wrap">
                        <span className={`${sla.className} text-wrap`}>{sla.text}</span>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border radius-8">{r.status ?? "—"}</span>
                      </td>
                      <td className="text-end text-wrap" style={{ minWidth: "11rem" }} onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex gap-1 justify-content-end flex-wrap align-items-center">
                          <Link
                            href={approvalsRequest(branchId, r.id)}
                            className="btn btn-sm btn-outline-primary"
                            aria-label={`View details for request ${r.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            View
                          </Link>
                          {canApprove && r.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-success"
                                disabled={actingId === r.id}
                                onClick={() => handleApprove(r.id)}
                                aria-label={`Approve request ${r.id}`}
                              >
                                {actingId === r.id ? "…" : "Approve"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                disabled={actingId === r.id}
                                onClick={() => {
                                  setRejectModal({ id: r.id });
                                  setRejectReason("");
                                }}
                                aria-label={`Reject request ${r.id}`}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <PaginationBar
              page={safePage + 1}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              totalPages={pageCount}
              disabled={false}
              onPageChange={(p) => setPageIndex(p - 1)}
              className="mt-3 pt-3 border-top px-1"
              ariaLabel="Approval requests pages"
            />
          )}
        </SectionCard>
      )}

      <Doctor360Drawer
        open={drawerMemberId != null}
        onClose={() => setDrawerMemberId(null)}
        branchId={branchId}
        memberId={drawerMemberId}
      />

      <Modal
        show={rejectModal != null}
        onHide={() => (actingId == null ? setRejectModal(null) : undefined)}
        centered
        backdrop={actingId != null ? "static" : true}
        aria-labelledby="doctor-approval-reject-title"
      >
        <Modal.Header closeButton>
          <Modal.Title id="doctor-approval-reject-title" as="h6">
            Reject request #{rejectModal?.id ?? ""}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <label className="form-label small" htmlFor="doctor-approval-reject-reason">
            Reason <span className="text-danger">*</span>
          </label>
          <textarea
            id="doctor-approval-reject-reason"
            className="form-control form-control-sm"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain why this request is rejected"
            required
            aria-required
          />
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm radius-8"
            onClick={() => setRejectModal(null)}
            disabled={actingId != null}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm radius-8"
            disabled={actingId != null || !rejectReason.trim()}
            onClick={() => void submitReject()}
          >
            {actingId != null ? "…" : "Reject"}
          </button>
        </Modal.Footer>
      </Modal>
    </PageWorkspace>
  );
}
