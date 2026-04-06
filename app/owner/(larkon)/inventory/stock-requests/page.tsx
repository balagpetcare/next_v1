"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

type StockRequestRow = {
  id: number;
  branchId?: number;
  branch?: { id?: number; name?: string };
  createdAt?: string | null;
  status?: string;
  requestIntent?: string;
  items?: Array<{ id: number }>;
};

type BranchLite = { id: number; name?: string; title?: string; code?: string };

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "OWNER_REVIEW", label: "Owner review" },
  { value: "FULFILLED_PARTIAL", label: "Fulfilled (partial)" },
  { value: "FULFILLED_FULL", label: "Fulfilled (full)" },
  { value: "DISPATCHED", label: "Dispatched" },
  { value: "RECEIVED_PARTIAL", label: "Received (partial)" },
  { value: "RECEIVED_FULL", label: "Received (full)" },
  { value: "CLOSED", label: "Closed" },
  { value: "DRAFT", label: "Draft" },
  { value: "CANCELLED", label: "Cancelled" },
];

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });
}

function statusClass(s: string) {
  const u = (s || "").toUpperCase();
  if (["DRAFT"].includes(u)) return "bg-secondary";
  if (["SUBMITTED", "OWNER_REVIEW"].includes(u)) return "bg-info";
  if (["FULFILLED_PARTIAL", "FULFILLED_FULL", "DISPATCHED"].includes(u)) return "bg-primary";
  if (["RECEIVED_PARTIAL", "RECEIVED_FULL", "CLOSED"].includes(u)) return "bg-success";
  if (["CANCELLED"].includes(u)) return "bg-danger";
  return "bg-light text-dark";
}

function pickArray(resp: any) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.data)) return resp.data;
  if (Array.isArray(resp.items)) return resp.items;
  if (Array.isArray(resp.data?.items)) return resp.data.items;
  return [];
}

function hasFilters(filters: { branchId: string; status: string; dateFrom: string; dateTo: string }) {
  return !!(filters.branchId || filters.status || filters.dateFrom || filters.dateTo);
}

export default function OwnerStockRequestsPage() {
  const [items, setItems] = useState<StockRequestRow[]>([]);
  const [branches, setBranches] = useState<BranchLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orgId, setOrgId] = useState<number | null>(null);
  const [orgLoaded, setOrgLoaded] = useState(false);
  const [intentTab, setIntentTab] = useState<"" | "INTERNAL_TRANSFER" | "PROCUREMENT">("");
  const [filters, setFilters] = useState({ branchId: "", status: "", dateFrom: "", dateTo: "" });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        setError("");
        // getOwnerMe does not include organizations — use the org list endpoint (same as other owner inventory).
        const [orgsRes, branchesRes] = await Promise.all([
          ownerGet("/api/v1/owner/organizations").catch(() => ({ data: [] })),
          ownerGet("/api/v1/owner/branches").catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const orgRows = pickArray(orgsRes) as { id?: number }[];
        setOrgId(orgRows[0]?.id != null ? Number(orgRows[0].id) : null);
        setBranches(pickArray(branchesRes));
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load stock requests");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setOrgLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!orgLoaded) return;
    if (!orgId) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        setError("");
        const params = new URLSearchParams({ orgId: String(orgId), limit: "100" });
        if (intentTab) params.set("requestIntent", intentTab);
        if (filters.status) params.set("status", filters.status);
        if (filters.branchId) params.set("branchId", filters.branchId);
        if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.set("dateTo", filters.dateTo);
        const res: any = await ownerGet(`/api/v1/stock-requests?${params.toString()}`);
        const data = res?.data ?? res?.items ?? (Array.isArray(res) ? res : []);
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!cancelled) {
          setItems([]);
          setError(e?.message ?? "Failed to load stock requests");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgLoaded, orgId, filters, intentTab]);

  const branchOptions = useMemo(() => {
    return (branches || []).map((b) => ({
      value: String(b.id),
      label: b.name || b.title || b.code || `Branch #${b.id}`,
    }));
  }, [branches]);

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Stock Requests"
        subtitle="Review branch transfer requests and warehouse procurement requests"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Stock Requests", href: "/owner/inventory/stock-requests" },
        ]}
      />

      {/* Intent Tabs */}
      <div className="card radius-12 mb-3">
        <div className="card-body py-2">
          <ul className="nav nav-pills gap-2">
            <li className="nav-item">
              <button
                className={`nav-link ${intentTab === "" ? "active" : ""}`}
                onClick={() => setIntentTab("")}
              >
                All Requests
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${intentTab === "INTERNAL_TRANSFER" ? "active" : ""}`}
                onClick={() => setIntentTab("INTERNAL_TRANSFER")}
              >
                Branch Transfers
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${intentTab === "PROCUREMENT" ? "active" : ""}`}
                onClick={() => setIntentTab("PROCUREMENT")}
              >
                Procurement / Replenishment
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="card radius-12 mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-sm-6 col-md-3">
              <label className="form-label small">Branch</label>
              <select
                className="form-select form-select-sm"
                value={filters.branchId}
                onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}
              >
                <option value="">All branches</option>
                {branchOptions.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-6 col-md-3">
              <label className="form-label small">Status</label>
              <select
                className="form-select form-select-sm"
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-6 col-md-3">
              <label className="form-label small">Date from</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              />
            </div>
            <div className="col-sm-6 col-md-3">
              <label className="form-label small">Date to</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              />
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2 mt-3">
            {hasFilters(filters) && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setFilters({ branchId: "", status: "", dateFrom: "", dateTo: "" })}
              >
                Clear filters
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => setFilters((f) => ({ ...f }))}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger radius-12">{error}</div>}

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-4 text-secondary">Loading stock requests…</div>
        </div>
      ) : !orgId ? (
        <div className="card radius-12">
          <div className="card-body text-center py-4 text-secondary">
            No organization is linked to your account, so stock requests cannot be listed. Complete owner onboarding or
            contact support if this persists.
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="card radius-12">
          <div className="card-body text-center py-4 text-secondary">
            {intentTab === "PROCUREMENT"
              ? "No procurement requests. Warehouse staff create requests from their inventory dashboard."
              : intentTab === "INTERNAL_TRANSFER"
              ? "No branch transfer requests. Branch staff create requests from their inventory → Stock Requests."
              : "No stock requests. Branches and warehouses create requests from their inventory."}
          </div>
        </div>
      ) : (
        <div className="card radius-12">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Branch</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th style={{ width: 140 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id}>
                      <td className="fw-semibold">#{r.id}</td>
                      <td className="text-muted small">{formatDate(r.createdAt)}</td>
                      <td>{r.branch?.name ?? r.branchId ?? "—"}</td>
                      <td>
                        {r.requestIntent === "PROCUREMENT" ? (
                          <span className="badge bg-warning text-dark">Procurement</span>
                        ) : (
                          <span className="badge bg-light text-dark">Transfer</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${statusClass(r.status || "")}`}>{r.status ?? "—"}</span>
                      </td>
                      <td>{r.items?.length ?? 0}</td>
                      <td className="text-end">
                        <Link href={`/owner/inventory/stock-requests/${r.id}`} className="btn btn-outline-primary btn-sm">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
