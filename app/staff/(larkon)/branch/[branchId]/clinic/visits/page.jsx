"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicVisitsList,
  staffClinicVisitsSummary,
  staffClinicVisitsExportCsv,
  staffClinicVisitQueueEvents,
  staffClinicVisitGet,
  staffClinicDoctors,
} from "@/lib/api";
import { formatVisitDateTime } from "./_lib/formatVisitDateTime";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import EmptyState from "@/src/components/dashboard/EmptyState";
import StatusBadge from "@/src/components/dashboard/StatusBadge";
import { PageWorkspace } from "@/src/components/dashboard";
import VisitSummaryCards from "./_components/VisitSummaryCards";
import VisitFilterBar from "./_components/VisitFilterBar";
import VisitDetailDrawer from "./_components/VisitDetailDrawer";
import VisitRowActions from "./_components/VisitRowActions";
import { PaginationBar } from "@/src/components/common/PaginationBar";

const VISITS_PERMS = ["clinic.visits.read", "clinic.visits.manage", "clinic.emr.read", "clinic.emr.write"];
const PAGE_SIZE = 25;

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthStartYMD() {
  const d = new Date();
  d.setDate(1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function StaffBranchClinicVisitsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const [visits, setVisits] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [doctors, setDoctors] = useState([]);

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [fromDate, setFromDate] = useState(() => monthStartYMD());
  const [toDate, setToDate] = useState(() => todayYMD());
  const [doctorId, setDoctorId] = useState("");
  const [hasAppointment, setHasAppointment] = useState("");
  const [treatmentCode, setTreatmentCode] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [statusFilters, setStatusFilters] = useState([]);
  const [unpaidOnly, setUnpaidOnly] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVisit, setDrawerVisit] = useState(null);
  const [drawerQueue, setDrawerQueue] = useState(null);

  const [exporting, setExporting] = useState(false);

  const [drawerDetailLoading, setDrawerDetailLoading] = useState(false);
  const drawerQueueVisitIdRef = useRef(null);
  const loadVisitsRef = useRef(() => {});
  const loadSummaryRef = useRef(() => {});

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = VISITS_PERMS.some((p) => permissions.includes(p));
  const canBilling = permissions.some((p) =>
    ["clinic.billing.view", "manager.billing.create_invoice", "manager.billing.collect_payment"].includes(p)
  );

  const listParams = useMemo(() => {
    const ha =
      hasAppointment === "yes" ? true : hasAppointment === "no" ? false : undefined;
    return {
      search: appliedSearch.trim() || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      doctorId: doctorId ? Number(doctorId) : undefined,
      hasAppointment: ha,
      treatmentCode: treatmentCode.trim() || undefined,
      sortField,
      sortDir,
      status: statusFilters.length ? statusFilters : undefined,
      unpaidOnly: unpaidOnly || undefined,
    };
  }, [appliedSearch, fromDate, toDate, doctorId, hasAppointment, treatmentCode, sortField, sortDir, statusFilters, unpaidOnly]);

  const loadVisits = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    setError("");
    const offset = (page - 1) * PAGE_SIZE;
    staffClinicVisitsList(branchId, {
      ...listParams,
      limit: PAGE_SIZE,
      offset,
    })
      .then((data) => {
        setVisits(data?.visits ?? []);
        setTotal(data?.total ?? 0);
      })
      .catch((e) => {
        setError(e?.message || "Failed to load visits.");
        setVisits([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [branchId, page, listParams]);

  loadVisitsRef.current = loadVisits;

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  const loadSummary = useCallback(() => {
    if (!branchId) return;
    setSummaryLoading(true);
    staffClinicVisitsSummary(branchId, { fromDate: fromDate || undefined, toDate: toDate || undefined })
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  }, [branchId, fromDate, toDate]);

  loadSummaryRef.current = loadSummary;

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (!branchId) return;
    staffClinicDoctors(branchId).then(setDoctors);
  }, [branchId]);

  /** Soft refresh when returning to the tab (e.g. after completing a visit in another window). Throttled. */
  const lastVisibilityRefreshRef = useRef(0);
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible" || !branchId) return;
      const n = Date.now();
      if (n - lastVisibilityRefreshRef.current < 4000) return;
      lastVisibilityRefreshRef.current = n;
      loadVisitsRef.current?.();
      loadSummaryRef.current?.();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [branchId]);

  const openDrawer = useCallback(
    (v) => {
      const raw = v?.id ?? v?.visitId ?? v?.visit_id;
      const vid = raw != null && raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : null;
      const normalized = v && typeof v === "object" && vid != null ? { ...v, id: vid } : v;
      drawerQueueVisitIdRef.current = vid;
      setDrawerVisit(normalized);
      setDrawerQueue(null);
      setDrawerOpen(true);
      if (!vid) {
        setDrawerDetailLoading(false);
        return;
      }
      setDrawerDetailLoading(true);
      staffClinicVisitGet(branchId, vid)
        .then((full) => {
          if (drawerQueueVisitIdRef.current !== vid) return;
          if (full && typeof full === "object") setDrawerVisit({ ...full, id: full.id != null ? Number(full.id) : vid });
        })
        .catch(() => {})
        .finally(() => {
          if (drawerQueueVisitIdRef.current === vid) setDrawerDetailLoading(false);
        });
      staffClinicVisitQueueEvents(branchId, vid)
        .then((payload) => {
          if (drawerQueueVisitIdRef.current === vid) setDrawerQueue(payload);
        })
        .catch(() => {
          if (drawerQueueVisitIdRef.current === vid) setDrawerQueue({ tickets: [], events: [] });
        });
    },
    [branchId]
  );

  const toggleStatusFilter = useCallback((k) => {
    setPage(1);
    setUnpaidOnly(false);
    setStatusFilters((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }, []);

  const handleShowUnpaid = useCallback(() => {
    setPage(1);
    setStatusFilters([]);
    setUnpaidOnly(true);
  }, []);

  const handleExport = useCallback(async () => {
    if (!branchId) return;
    setExporting(true);
    try {
      const csv = await staffClinicVisitsExportCsv(branchId, { ...listParams, limit: 3000 });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clinic-visits-${branchId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  }, [branchId, listParams]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

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
        missingPerm="clinic.visits.read"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic`)}
      />
    );
  }

  return (
    <PageWorkspace>
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-24">
          <div className="d-flex align-items-center gap-12 flex-wrap">
            <Link href={`/staff/branch/${branchId}/clinic`} className="btn btn-outline-secondary btn-sm">
              ← Clinic
            </Link>
            <h5 className="mb-0">Visits</h5>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <Link href={`/staff/branch/${branchId}/clinic/appointments`} className="btn btn-outline-primary btn-sm">
              Appointments
            </Link>
            <Link href={`/staff/branch/${branchId}/clinic/queue`} className="btn btn-outline-primary btn-sm">
              Queue
            </Link>
          </div>
        </div>

        <VisitSummaryCards
          summary={summary}
          loading={summaryLoading}
          activeStatuses={statusFilters}
          onToggleStatus={toggleStatusFilter}
          onShowUnpaid={handleShowUnpaid}
        />

        {unpaidOnly && (
          <div className="alert alert-info py-2 small mb-2 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <span>Showing visits with at least one unpaid order.</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setPage(1);
                setUnpaidOnly(false);
              }}
            >
              Clear
            </button>
          </div>
        )}

        <VisitFilterBar
          search={searchInput}
          onSearchChange={setSearchInput}
          fromDate={fromDate}
          toDate={toDate}
          onFromChange={(v) => {
            setPage(1);
            setFromDate(v);
          }}
          onToChange={(v) => {
            setPage(1);
            setToDate(v);
          }}
          doctorId={doctorId}
          doctors={doctors}
          onDoctorChange={(v) => {
            setPage(1);
            setDoctorId(v);
          }}
          hasAppointment={hasAppointment}
          onHasAppointmentChange={(v) => {
            setPage(1);
            setHasAppointment(v);
          }}
          treatmentCode={treatmentCode}
          onTreatmentCodeChange={(v) => {
            setPage(1);
            setTreatmentCode(v);
          }}
          sortField={sortField}
          sortDir={sortDir}
          onSortFieldChange={(v) => {
            setPage(1);
            setSortField(v);
          }}
          onSortDirChange={(v) => {
            setPage(1);
            setSortDir(v);
          }}
          onApply={() => {
            setAppliedSearch(searchInput);
            setPage(1);
            loadSummary();
          }}
          onExportCsv={handleExport}
          exporting={exporting}
        />

        <Card title="Visit operations" subtitle="Encounters linked to queue, billing, and settlement.">
          {error && (
            <div className="alert alert-danger py-2 mb-16 d-flex flex-wrap align-items-center justify-content-between gap-2">
              <span className="flex-grow-1" style={{ whiteSpace: "pre-wrap" }}>
                {error}
              </span>
              <button type="button" className="btn btn-sm btn-outline-danger flex-shrink-0" disabled={loading} onClick={() => loadVisits()}>
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-24 text-center text-secondary-light">Loading visits...</div>
          ) : visits.length === 0 ? (
            <EmptyState
              title={error ? "Could not load visits" : "No visits match filters"}
              description={
                error
                  ? "Check your connection or permissions, then retry. You can also adjust filters and try again."
                  : "Adjust filters or start from appointments and the queue to create visits."
              }
              icon="ri:calendar-check-line"
              action={
                <div className="d-flex flex-wrap justify-content-center gap-2">
                  {error ? (
                    <button type="button" className="btn btn-primary btn-sm radius-8" onClick={() => loadVisits()}>
                      Retry
                    </button>
                  ) : null}
                  <Link href={`/staff/branch/${branchId}/clinic/appointments`} className="btn btn-primary btn-sm radius-8">
                    Appointments
                  </Link>
                  <Link href={`/staff/branch/${branchId}/clinic/queue`} className="btn btn-outline-primary btn-sm radius-8">
                    Queue
                  </Link>
                </div>
              }
            />
          ) : (
            <>
              <div className="table-responsive d-none d-md-block">
                <table className="table table-sm table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Treatment #</th>
                      <th>Pet</th>
                      <th>Owner</th>
                      <th>Doctor</th>
                      <th>Queue</th>
                      <th>Billing</th>
                      <th>Settlement</th>
                      <th>Started</th>
                      <th>Status</th>
                      <th className="text-end text-nowrap" style={{ minWidth: 140 }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map((v) => {
                      const petName = v.pet?.name ?? `Pet #${v.petId ?? ""}`;
                      const ownerName = v.patient?.profile?.displayName ?? `Patient #${v.patientId ?? ""}`;
                      const doctorName = v.doctor?.user?.profile?.displayName ?? "—";
                      const started = formatVisitDateTime(v.startedAt);
                      return (
                        <tr
                          key={v.id}
                          role="button"
                          tabIndex={0}
                          style={{ cursor: "pointer" }}
                          onClick={() => openDrawer(v)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openDrawer(v);
                            }
                          }}
                        >
                          <td>{v.treatmentCode ?? v.id}</td>
                          <td>{petName}</td>
                          <td>{ownerName}</td>
                          <td>{doctorName}</td>
                          <td className="small">
                            {v.queueTicket ? (
                              <>
                                <span className="text-muted">{v.queueTicket.tokenNo}</span>
                                <br />
                                <StatusBadge status={v.queueTicket.status} subtle />
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="small">
                            {v.billing ? (
                              <>
                                {v.billing.orderCount} ord
                                {v.billing.unpaidOrderCount > 0 ? (
                                  <span className="text-warning"> · {v.billing.unpaidOrderCount} unpaid</span>
                                ) : null}
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="small">
                            {v.settlement ? (
                              <span title={`Ledger #${v.settlement.ledgerId ?? "—"}`}>
                                {v.settlement.settlementStatus}
                                {v.settlement.doctorShare != null && Number.isFinite(Number(v.settlement.doctorShare))
                                  ? ` · ${Number(v.settlement.doctorShare).toFixed(0)}`
                                  : ""}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>{started}</td>
                          <td>
                            <StatusBadge status={v.status} />
                          </td>
                          <td
                            className="text-end text-nowrap align-middle"
                            style={{ minWidth: 140 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <VisitRowActions branchId={branchId} visit={v} onOpenDrawer={openDrawer} permissions={{ canBilling }} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="d-md-none">
                {visits.map((v) => {
                  const petName = v.pet?.name ?? `Pet #${v.petId ?? ""}`;
                  const ownerName = v.patient?.profile?.displayName ?? `Patient #${v.patientId ?? ""}`;
                  const doctorName = v.doctor?.user?.profile?.displayName ?? "—";
                  const started = formatVisitDateTime(v.startedAt);
                  return (
                    <div
                      key={v.id}
                      className="card radius-12 mb-2"
                      role="button"
                      tabIndex={0}
                      onClick={() => openDrawer(v)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openDrawer(v);
                        }
                      }}
                    >
                      <div className="card-body py-2 px-3">
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <div>
                            <div className="fw-semibold">{v.treatmentCode ?? `#${v.id}`}</div>
                            <div className="small text-muted">{petName}</div>
                            <div className="small text-muted">
                              {ownerName} · {doctorName}
                            </div>
                          </div>
                          <StatusBadge status={v.status} />
                        </div>
                        <div className="small mt-2 text-muted">
                          {v.queueTicket ? (
                            <>
                              Q {v.queueTicket.tokenNo ?? "—"} · <StatusBadge status={v.queueTicket.status} subtle />
                            </>
                          ) : (
                            "No queue ticket"
                          )}
                        </div>
                        <div className="small">
                          {v.billing ? (
                            <>
                              {v.billing.orderCount} order(s)
                              {v.billing.unpaidOrderCount > 0 ? (
                                <span className="text-warning"> · {v.billing.unpaidOrderCount} unpaid</span>
                              ) : null}
                            </>
                          ) : (
                            "—"
                          )}
                          {" · "}
                          {v.settlement ? (
                            <span>
                              {v.settlement.settlementStatus}
                              {v.settlement.doctorShare != null && Number.isFinite(Number(v.settlement.doctorShare))
                                ? ` (${Number(v.settlement.doctorShare).toFixed(0)})`
                                : ""}
                            </span>
                          ) : (
                            "No settlement"
                          )}
                        </div>
                        <div className="small text-muted mt-1">Started: {started}</div>
                        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                          <VisitRowActions branchId={branchId} visit={v} onOpenDrawer={openDrawer} permissions={{ canBilling }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {!loading && total > 0 && (
            <PaginationBar
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              totalPages={totalPages}
              disabled={loading}
              onPageChange={setPage}
              className="mt-16 pt-16 border-top"
              ariaLabel="Visits list pages"
            />
          )}
        </Card>
      </div>

      <VisitDetailDrawer
        show={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        visit={drawerVisit}
        loading={drawerDetailLoading}
        branchId={branchId}
        queueEvents={drawerQueue}
        canBilling={canBilling}
      />
    </PageWorkspace>
  );
}
