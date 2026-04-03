"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { notify } from "@/app/owner/_components/Notification";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import {
  buildMedicineRequisitionListParams,
} from "@/app/owner/_lib/ownerMedicineRequisition";
import { pharmacyApiUserMessage, logPharmacyApiError } from "@/src/lib/pharmacyApiMessage";

type RequisitionRow = {
  id: number;
  requisitionNumber?: string;
  branchId?: number;
  orgId?: number;
  note?: string | null;
  branch?: { id?: number; name?: string };
  requestedBy?: { id?: number; profile?: { displayName?: string } };
  status?: string;
  urgency?: string;
  createdAt?: string | null;
  items?: Array<{ id: number }>;
  _count?: { items?: number };
};

type BranchRow = {
  id: number;
  name?: string;
  title?: string;
  code?: string;
  org?: { id?: number; name?: string };
  orgId?: number;
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "SUBMITTED,UNDER_REVIEW", label: "Pending review" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "PARTIALLY_APPROVED", label: "Partially Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "READY_TO_DISPATCH", label: "Ready to Dispatch" },
  { value: "DISPATCHED", label: "Dispatched" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "PARTIALLY_RECEIVED", label: "Partially Received" },
  { value: "RECEIVED", label: "Received" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const URGENCY_OPTIONS = [
  { value: "", label: "All urgency" },
  { value: "NORMAL", label: "Normal" },
  { value: "URGENT", label: "Urgent" },
  { value: "CRITICAL", label: "Critical" },
];

const PAGE_SIZE = 50;

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });
}

function statusClass(s: string) {
  const u = (s || "").toUpperCase();
  if (["DRAFT"].includes(u)) return "bg-secondary";
  if (["SUBMITTED", "UNDER_REVIEW"].includes(u)) return "bg-info";
  if (["APPROVED", "PARTIALLY_APPROVED", "READY_TO_DISPATCH"].includes(u)) return "bg-primary";
  if (["DISPATCHED", "IN_TRANSIT"].includes(u)) return "bg-warning text-dark";
  if (["RECEIVED", "PARTIALLY_RECEIVED", "COMPLETED"].includes(u)) return "bg-success";
  if (["REJECTED", "CANCELLED"].includes(u)) return "bg-danger";
  return "bg-light text-dark";
}

function urgencyBadge(u: string) {
  if (u === "CRITICAL") return "bg-danger";
  if (u === "URGENT") return "bg-warning text-dark";
  return "bg-light text-dark";
}

function pickBranches(resp: unknown): BranchRow[] {
  if (!resp || typeof resp !== "object") return [];
  const r = resp as { data?: unknown; success?: boolean };
  const raw = r.data;
  if (!Array.isArray(raw)) return [];
  return raw as BranchRow[];
}

function truncateNote(n: string | null | undefined, max = 48) {
  if (!n || !n.trim()) return "—";
  const t = n.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

type ListFilters = {
  branchId: string;
  status: string;
  urgency: string;
  dateFrom: string;
  dateTo: string;
  orgId: string;
  page: number;
};

function readFiltersFromSearchParams(sp: URLSearchParams): ListFilters {
  return {
    branchId: sp.get("branchId") || "",
    status: sp.get("status") || "",
    urgency: sp.get("urgency") || "",
    dateFrom: sp.get("dateFrom") || "",
    dateTo: sp.get("dateTo") || "",
    orgId: sp.get("orgId") || "",
    page: Math.max(1, Number(sp.get("page") || "1") || 1),
  };
}

export default function OwnerPharmacyRequisitionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<RequisitionRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapDone, setBootstrapDone] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 });

  const filters = useMemo(
    () => readFiltersFromSearchParams(searchParams),
    [searchParams]
  );

  const orgOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const b of branches) {
      const oid = b.org?.id ?? b.orgId;
      if (oid != null && oid > 0) {
        const label = b.org?.name || `Organization #${oid}`;
        map.set(oid, label);
      }
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [branches]);

  const branchOptions = useMemo(() => {
    return (branches || []).map((b) => ({
      value: String(b.id),
      label: b.name || b.title || b.code || `Branch #${b.id}`,
    }));
  }, [branches]);

  const hasFilters = !!(
    filters.branchId ||
    filters.status ||
    filters.urgency ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.orgId
  );

  const pushFilters = useCallback(
    (patch: Partial<ListFilters>) => {
      const next: ListFilters = { ...filters, ...patch };
      const sp = new URLSearchParams();
      if (next.orgId) sp.set("orgId", next.orgId);
      if (next.branchId) sp.set("branchId", next.branchId);
      if (next.status) sp.set("status", next.status);
      if (next.urgency) sp.set("urgency", next.urgency);
      if (next.dateFrom) sp.set("dateFrom", next.dateFrom);
      if (next.dateTo) sp.set("dateTo", next.dateTo);
      if (next.page > 1) sp.set("page", String(next.page));
      const qs = sp.toString();
      router.replace(qs ? `/owner/pharmacy/requisitions?${qs}` : "/owner/pharmacy/requisitions", { scroll: false });
    },
    [filters, router]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const branchesRes = await ownerGet<{ data?: unknown }>("/api/v1/owner/branches").catch(() => ({ data: [] }));
        if (cancelled) return;
        setBranches(pickBranches(branchesRes));
      } catch (e: unknown) {
        if (!cancelled) {
          logPharmacyApiError("owner pharmacy requisitions bootstrap", e);
          notify.error("Could not load branches", pharmacyApiUserMessage(e, "Please refresh or try again."));
        }
      } finally {
        if (!cancelled) {
          setBootstrapDone(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!bootstrapDone) return;
    let cancelled = false;
    setListLoading(true);
    setError(null);
    (async () => {
      try {
        const orgIdNum =
          filters.orgId && /^\d+$/.test(filters.orgId) ? Number(filters.orgId) : null;
        const q = buildMedicineRequisitionListParams({
          orgId: orgIdNum,
          branchId: filters.branchId || undefined,
          status: filters.status || undefined,
          urgency: filters.urgency || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          page: filters.page,
          limit: PAGE_SIZE,
        });
        const res: any = await ownerGet(`/api/v1/medicine-requisitions?${q}`);
        if (cancelled) return;
        const data = res?.data ?? res?.items ?? (Array.isArray(res) ? res : []);
        setItems(Array.isArray(data) ? data : []);
        const p = res?.pagination;
        if (p && typeof p === "object") {
          setPagination({
            page: Number(p.page) || 1,
            limit: Number(p.limit) || PAGE_SIZE,
            total: Number(p.total) ?? 0,
            totalPages: Number(p.totalPages) ?? 0,
          });
        } else {
          setPagination({
            page: filters.page,
            limit: PAGE_SIZE,
            total: Array.isArray(data) ? data.length : 0,
            totalPages: 1,
          });
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setItems([]);
          const msg = pharmacyApiUserMessage(e, "Could not load requisitions.");
          setError(msg);
          logPharmacyApiError("owner medicine requisitions list", e);
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootstrapDone, filters]);

  function clearFilters() {
    pushFilters({
      branchId: "",
      status: "",
      urgency: "",
      dateFrom: "",
      dateTo: "",
      orgId: "",
      page: 1,
    });
  }

  function retry() {
    pushFilters({ page: filters.page });
  }

  const showTable = bootstrapDone && !listLoading && !error && items.length > 0;
  const showEmpty = bootstrapDone && !listLoading && !error && items.length === 0;
  const showBootstrapSpinner = !bootstrapDone && !error;

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Medicine Requisitions"
        subtitle="Review and manage branch medicine supply requests"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Pharmacy", href: "/owner/pharmacy/requisitions" },
          { label: "Requisitions", href: "/owner/pharmacy/requisitions" },
        ]}
      />

      <div className="card radius-12 mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-sm-6 col-md-2">
              <label className="form-label small">Organization</label>
              <select
                className="form-select form-select-sm"
                value={filters.orgId}
                onChange={(e) => pushFilters({ orgId: e.target.value, page: 1 })}
              >
                <option value="">All organizations</option>
                {orgOptions.map((o) => (
                  <option key={o.id} value={String(o.id)}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-6 col-md-2">
              <label className="form-label small">Branch</label>
              <select
                className="form-select form-select-sm"
                value={filters.branchId}
                onChange={(e) => pushFilters({ branchId: e.target.value, page: 1 })}
              >
                <option value="">All branches</option>
                {branchOptions.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-6 col-md-2">
              <label className="form-label small">Status</label>
              <select
                className="form-select form-select-sm"
                value={filters.status}
                onChange={(e) => pushFilters({ status: e.target.value, page: 1 })}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-6 col-md-2">
              <label className="form-label small">Urgency</label>
              <select
                className="form-select form-select-sm"
                value={filters.urgency}
                onChange={(e) => pushFilters({ urgency: e.target.value, page: 1 })}
              >
                {URGENCY_OPTIONS.map((o) => (
                  <option key={o.value || "all-u"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-6 col-md-2">
              <label className="form-label small">Date from</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.dateFrom}
                onChange={(e) => pushFilters({ dateFrom: e.target.value, page: 1 })}
              />
            </div>
            <div className="col-sm-6 col-md-2">
              <label className="form-label small">Date to</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.dateTo}
                onChange={(e) => pushFilters({ dateTo: e.target.value, page: 1 })}
              />
            </div>
            <div className="col-12 d-flex flex-wrap gap-2 justify-content-end">
              {hasFilters && (
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() => pushFilters({ page: filters.page })}
                disabled={listLoading}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {showBootstrapSpinner && (
        <div className="card radius-12">
          <div className="card-body text-center py-4 text-secondary">Loading…</div>
        </div>
      )}

      {listLoading && bootstrapDone && !error && (
        <div className="card radius-12">
          <div className="card-body text-center py-4 text-secondary">Loading medicine requisitions…</div>
        </div>
      )}

      {error && (
        <div className="card radius-12 border-danger">
          <div className="card-body">
            <div className="text-danger mb-2">{error}</div>
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={retry}>
              Retry
            </button>
          </div>
        </div>
      )}

      {showEmpty && (
        <div className="card radius-12">
          <div className="card-body text-center py-4 text-secondary">
            {hasFilters
              ? "No medicine requisitions match these filters. Try clearing filters or widening the date range."
              : "No medicine requisitions yet. Branches create them from the staff Pharmacy section."}
          </div>
        </div>
      )}

      {showTable && (
        <div className="card radius-12">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Requisition #</th>
                    <th>Date</th>
                    <th>Branch</th>
                    <th>Requested By</th>
                    <th>Urgency</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th>Note</th>
                    <th style={{ width: 120 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id}>
                      <td className="fw-semibold">{r.requisitionNumber || `#${r.id}`}</td>
                      <td className="text-muted small">{formatDate(r.createdAt)}</td>
                      <td>{r.branch?.name ?? r.branchId ?? "—"}</td>
                      <td>{r.requestedBy?.profile?.displayName ?? "—"}</td>
                      <td>
                        {r.urgency && r.urgency !== "NORMAL" && (
                          <span className={`badge ${urgencyBadge(r.urgency)}`}>{r.urgency}</span>
                        )}
                        {(!r.urgency || r.urgency === "NORMAL") && <span className="text-muted small">Normal</span>}
                      </td>
                      <td>
                        <span className={`badge ${statusClass(r.status || "")}`}>{r.status ?? "—"}</span>
                      </td>
                      <td>{r._count?.items ?? r.items?.length ?? 0}</td>
                      <td className="text-muted small" style={{ maxWidth: 200 }}>
                        {truncateNote(r.note)}
                      </td>
                      <td className="text-end">
                        <Link href={`/owner/pharmacy/requisitions/${r.id}`} className="btn btn-outline-primary btn-sm">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.totalPages > 1 && (
              <div className="card-body border-top d-flex justify-content-between align-items-center py-2">
                <span className="text-muted small">
                  Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
                </span>
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={filters.page <= 1 || listLoading}
                    onClick={() => pushFilters({ page: Math.max(1, filters.page - 1) })}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={filters.page >= pagination.totalPages || listLoading}
                    onClick={() => pushFilters({ page: filters.page + 1 })}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
