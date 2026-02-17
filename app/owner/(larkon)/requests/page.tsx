"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import StatusBadge from "@/app/owner/_components/StatusBadge";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

type InboxItem = {
  id: string;
  ref?: string;
  kind: string;
  title?: string;
  summary?: string;
  status?: string;
  branch?: { id?: number | string; name?: string };
  requestedBy?: string;
  createdAt?: string;
  href?: string;
  meta?: Record<string, any>;
};

type PendingCounts = {
  inbox?: number;
  productRequests?: number;
  transfers?: number;
  adjustments?: number;
  returns?: number;
  cancellations?: number;
  notifications?: number;
};

const KIND_OPTIONS = [
  { value: "ALL", label: "All types" },
  { value: "PRODUCT_REQUEST", label: "Product Requests" },
  { value: "STOCK_REQUEST", label: "Stock Requests" },
  { value: "TRANSFER", label: "Inventory Transfers" },
  { value: "ADJUSTMENT", label: "Inventory Adjustments" },
  { value: "RETURN", label: "Returns & Damages" },
  { value: "CANCELLATION", label: "Cancellations" },
  { value: "NOTIFICATION", label: "Notifications" },
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "REVIEW", label: "In Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" });
}

function kindLabel(kind?: string) {
  const k = String(kind || "").toUpperCase();
  const match = KIND_OPTIONS.find((o) => o.value === k);
  return match?.label || k || "Request";
}

function resolveHref(item: InboxItem) {
  if (item.href) return item.href;
  const kind = String(item.kind || "").toUpperCase();
  const refId = item.id?.replace(/^PR-/, "").replace(/^SR-/, "").replace(/^TR-/, "").replace(/^ADJ-/, "") || item.id;
  if (kind === "PRODUCT_REQUEST") return `/owner/product-requests/${refId}`;
  if (kind === "STOCK_REQUEST") return `/owner/inventory/stock-requests/${refId}`;
  if (kind === "TRANSFER") return `/owner/inventory/transfers/${refId}`;
  if (kind === "ADJUSTMENT") return `/owner/inventory/adjustments`;
  if (kind === "RETURN") return `/owner/returns/${refId}`;
  if (kind === "CANCELLATION") return `/owner/cancellations/${refId}`;
  if (kind === "NOTIFICATION") return `/owner/notifications`;
  return "/owner/requests";
}

export default function OwnerRequestsPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [kindFilter, setKindFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await ownerGet<any>("/api/v1/owner/requests");
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      const metaCounts: PendingCounts = res?.meta?.pendingCounts || res?.pendingCounts || {};
      setItems(list as InboxItem[]);
      setPendingCounts(metaCounts || {});
    } catch (e: any) {
      setError(e?.message || "Failed to load requests inbox");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = items;
    if (kindFilter !== "ALL") {
      list = list.filter((r) => String(r.kind || "").toUpperCase() === kindFilter);
    }
    if (statusFilter !== "ALL") {
      list = list.filter((r) => String(r.status || "").toUpperCase() === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => {
        return (
          (r.title || "").toLowerCase().includes(q) ||
          (r.summary || "").toLowerCase().includes(q) ||
          (r.ref || "").toLowerCase().includes(q) ||
          (r.branch?.name || "").toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [items, kindFilter, statusFilter, search]);

  const totalPending = useMemo(() => {
    return (
      pendingCounts.inbox ||
      pendingCounts.productRequests ||
      pendingCounts.transfers ||
      pendingCounts.returns ||
      pendingCounts.cancellations ||
      pendingCounts.adjustments ||
      0
    );
  }, [pendingCounts]);

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Requests Inbox"
        subtitle="Unified Owner queue for requests and approvals"
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Requests", href: "/owner/requests" },
        ]}
      />

      <div className="row g-3 mb-3">
        <div className="col-12 col-md-3">
          <div className="card radius-12 h-100">
            <div className="card-body">
              <div className="text-muted small">Pending</div>
              <div className="h4 mb-0">{totalPending || 0}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="card radius-12 h-100">
            <div className="card-body">
              <div className="text-muted small">Product Requests</div>
              <div className="h5 mb-0">{pendingCounts.productRequests ?? 0} pending</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="card radius-12 h-100">
            <div className="card-body">
              <div className="text-muted small">Transfers</div>
              <div className="h5 mb-0">{pendingCounts.transfers ?? 0} pending</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="card radius-12 h-100">
            <div className="card-body">
              <div className="text-muted small">Returns / Cancellations</div>
              <div className="h6 mb-0">
                {(pendingCounts.returns ?? 0) + (pendingCounts.cancellations ?? 0)} pending
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card radius-12 mb-3">
        <div className="card-body p-24">
          <div className="row g-3">
            <div className="col-12 col-md-3">
              <label className="form-label small text-muted">Type</label>
              <select
                className="form-select form-select-sm"
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
              >
                {KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label small text-muted">Status</label>
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small text-muted">Search</label>
              <input
                className="form-control form-control-sm"
                placeholder="Ref, branch, title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-2 d-flex align-items-end gap-2">
              <button className="btn btn-primary btn-sm w-100" onClick={load} disabled={loading}>
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="card radius-12">
        <div className="card-body p-24">
          {loading ? (
            <div className="text-center text-muted py-5">Loading requests…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted py-5">
              No requests found. Try changing filters or refresh.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Branch</th>
                    <th>Created</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const href = resolveHref(item);
                    return (
                      <tr key={item.id}>
                        <td className="fw-semibold">{item.ref || item.id}</td>
                        <td>
                          <div className="fw-semibold">{item.title || "Request"}</div>
                          {item.summary ? <div className="text-muted small">{item.summary}</div> : null}
                        </td>
                        <td>
                          <StatusBadge status={kindLabel(item.kind)} />
                        </td>
                        <td>
                          <StatusBadge status={item.status || "PENDING"} />
                        </td>
                        <td>{item.branch?.name || "—"}</td>
                        <td className="text-muted small">{formatDate(item.createdAt)}</td>
                        <td className="text-end">
                          <Link href={href} className="btn btn-sm btn-outline-primary">
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mt-3">
        <Link href="/owner/product-requests" className="btn btn-outline-primary btn-sm">
          Product Requests
        </Link>
        <Link href="/owner/inventory/transfers" className="btn btn-outline-primary btn-sm">
          Inventory Transfers
        </Link>
        <Link href="/owner/notifications" className="btn btn-outline-secondary btn-sm">
          Notifications
        </Link>
      </div>
    </div>
  );
}
