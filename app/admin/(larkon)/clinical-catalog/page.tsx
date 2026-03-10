"use client";

import { useEffect, useState } from "react";
import { adminClinicalCatalogApi } from "@/lib/adminApi";

type ApprovalRow = {
  id: number;
  itemId: number;
  requestType: string;
  status: string;
  createdAt: string;
  item?: { id: number; name: string; itemCode: string; domainType: string };
};

type ItemRow = {
  id: number;
  itemCode: string;
  name: string;
  domainType: string;
  isActive?: boolean;
  category?: { id: number; name: string };
  _count?: { variants: number };
};

type AuditRow = {
  id: number;
  itemId: number;
  branchId: number | null;
  actionType: string;
  oldDataJson: unknown;
  newDataJson: unknown;
  performedAt: string;
  item?: { id: number; itemCode: string; name: string; orgId: number; domainType: string };
};

type TabKey = "approvals" | "items" | "audit";

export default function AdminClinicalCatalogPage() {
  const [tab, setTab] = useState<TabKey>("approvals");
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [error, setError] = useState("");

  const [items, setItems] = useState<ItemRow[]>([]);
  const [itemsPagination, setItemsPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsOrgId, setItemsOrgId] = useState("");
  const [itemsDomainType, setItemsDomainType] = useState("");
  const [itemsSearch, setItemsSearch] = useState("");

  const [auditItems, setAuditItems] = useState<AuditRow[]>([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditOrgId, setAuditOrgId] = useState("");
  const [auditItemId, setAuditItemId] = useState("");

  const loadApprovals = async () => {
    try {
      setApprovalsLoading(true);
      setError("");
      const res = await adminClinicalCatalogApi.approvals();
      setApprovals((res?.data ?? []) as ApprovalRow[]);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load");
    } finally {
      setApprovalsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "approvals") loadApprovals();
  }, [tab]);

  const loadItems = async () => {
    const orgId = parseInt(itemsOrgId, 10);
    if (Number.isNaN(orgId)) {
      setError("Enter a valid organization ID");
      return;
    }
    try {
      setItemsLoading(true);
      setError("");
      const res = await adminClinicalCatalogApi.items({
        orgId,
        domainType: itemsDomainType || undefined,
        search: itemsSearch.trim() || undefined,
        page: 1,
        limit: 50,
      });
      const data = res?.data as { items?: ItemRow[]; pagination?: typeof itemsPagination };
      setItems(data?.items ?? []);
      setItemsPagination(data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (e) {
      setError((e as Error)?.message || "Failed to load items");
    } finally {
      setItemsLoading(false);
    }
  };

  const loadAudit = async () => {
    try {
      setAuditLoading(true);
      setError("");
      const res = await adminClinicalCatalogApi.auditLogs({
        orgId: auditOrgId ? parseInt(auditOrgId, 10) : undefined,
        itemId: auditItemId ? parseInt(auditItemId, 10) : undefined,
        page: 1,
        limit: 50,
      });
      const data = res?.data as { items?: AuditRow[]; pagination?: typeof auditPagination };
      setAuditItems(data?.items ?? []);
      setAuditPagination(data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (e) {
      setError((e as Error)?.message || "Failed to load audit logs");
    } finally {
      setAuditLoading(false);
    }
  };

  const handleApprove = async (logId: number) => {
    try {
      await adminClinicalCatalogApi.approve(logId);
      await loadApprovals();
    } catch (e) {
      setError((e as Error)?.message || "Approve failed");
    }
  };

  const handleReject = async (logId: number) => {
    try {
      await adminClinicalCatalogApi.reject(logId);
      await loadApprovals();
    } catch (e) {
      setError((e as Error)?.message || "Reject failed");
    }
  };

  return (
    <div className="dashboard-main-body">
      <h1 className="h4 mb-4">Clinical catalog governance</h1>
      <p className="text-muted small mb-4">Review approvals, browse items by organization, and view audit logs.</p>

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button type="button" className={`nav-link ${tab === "approvals" ? "active" : ""}`} onClick={() => setTab("approvals")}>
            Pending approvals
          </button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${tab === "items" ? "active" : ""}`} onClick={() => setTab("items")}>
            Items by org
          </button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${tab === "audit" ? "active" : ""}`} onClick={() => setTab("audit")}>
            Audit logs
          </button>
        </li>
      </ul>

      {tab === "approvals" && (
        <div className="card radius-12">
          <div className="card-header bg-transparent p-24">
            <h6 className="mb-0 fw-semibold">Pending approvals</h6>
          </div>
          <div className="card-body p-24">
            {approvalsLoading ? (
              <div className="text-center py-4"><div className="spinner-border text-primary" /><p className="text-muted mt-2 mb-0">Loading…</p></div>
            ) : approvals.length === 0 ? (
              <p className="text-muted mb-0">No pending approval requests.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Item</th>
                      <th>Code</th>
                      <th>Type</th>
                      <th>Request</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvals.map((row) => (
                      <tr key={row.id}>
                        <td>{row.item?.name ?? row.itemId}</td>
                        <td><code className="small">{row.item?.itemCode ?? "—"}</code></td>
                        <td>{row.item?.domainType ?? "—"}</td>
                        <td>{row.requestType}</td>
                        <td className="text-end">
                          <button type="button" className="btn btn-sm btn-success radius-8 me-1" onClick={() => handleApprove(row.id)}>Approve</button>
                          <button type="button" className="btn btn-sm btn-outline-danger radius-8" onClick={() => handleReject(row.id)}>Reject</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "items" && (
        <div className="card radius-12">
          <div className="card-header bg-transparent p-24">
            <h6 className="mb-0 fw-semibold">Items by organization</h6>
          </div>
          <div className="card-body p-24">
            <div className="row g-2 mb-3">
              <div className="col-auto">
                <input type="number" className="form-control form-control-sm" placeholder="Org ID" value={itemsOrgId} onChange={(e) => setItemsOrgId(e.target.value)} />
              </div>
              <div className="col-auto">
                <select className="form-select form-select-sm" value={itemsDomainType} onChange={(e) => setItemsDomainType(e.target.value)}>
                  <option value="">All types</option>
                  <option value="MEDICINE">Medicine</option>
                  <option value="SURGICAL_CONSUMABLE">Surgical consumable</option>
                  <option value="INSTRUMENT">Instrument</option>
                  <option value="CLINIC_SUPPLY">Clinic supply</option>
                </select>
              </div>
              <div className="col-auto">
                <input type="text" className="form-control form-control-sm" placeholder="Search" value={itemsSearch} onChange={(e) => setItemsSearch(e.target.value)} />
              </div>
              <div className="col-auto">
                <button type="button" className="btn btn-sm btn-primary" onClick={loadItems} disabled={itemsLoading}>Load</button>
              </div>
            </div>
            {itemsLoading ? (
              <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
            ) : items.length === 0 && itemsPagination.total === 0 ? (
              <p className="text-muted mb-0">Enter an organization ID and click Load to list clinical items.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Variants</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => (
                      <tr key={row.id}>
                        <td><code className="small">{row.itemCode}</code></td>
                        <td>{row.name}</td>
                        <td>{row.domainType}</td>
                        <td>{row.category?.name ?? "—"}</td>
                        <td>{row._count?.variants ?? 0}</td>
                        <td><span className={`badge ${row.isActive ? "bg-success" : "bg-secondary"}`}>{row.isActive ? "Active" : "Inactive"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div className="card radius-12">
          <div className="card-header bg-transparent p-24">
            <h6 className="mb-0 fw-semibold">Catalog audit logs</h6>
          </div>
          <div className="card-body p-24">
            <div className="row g-2 mb-3">
              <div className="col-auto">
                <input type="number" className="form-control form-control-sm" placeholder="Org ID (optional)" value={auditOrgId} onChange={(e) => setAuditOrgId(e.target.value)} />
              </div>
              <div className="col-auto">
                <input type="number" className="form-control form-control-sm" placeholder="Item ID (optional)" value={auditItemId} onChange={(e) => setAuditItemId(e.target.value)} />
              </div>
              <div className="col-auto">
                <button type="button" className="btn btn-sm btn-primary" onClick={loadAudit} disabled={auditLoading}>Load</button>
              </div>
            </div>
            {auditLoading ? (
              <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
            ) : auditItems.length === 0 && auditPagination.total === 0 ? (
              <p className="text-muted mb-0">Optionally filter by org or item and click Load to view audit history.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Time</th>
                      <th>Item</th>
                      <th>Code</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditItems.map((row) => (
                      <tr key={row.id}>
                        <td className="small">{new Date(row.performedAt).toLocaleString()}</td>
                        <td>{row.item?.name ?? row.itemId}</td>
                        <td><code className="small">{row.item?.itemCode ?? "—"}</code></td>
                        <td>{row.actionType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
