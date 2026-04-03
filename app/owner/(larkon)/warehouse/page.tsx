"use client";

// PHASE 2 FINAL CLEANUP: This warehouse list page shows branch-backed warehouses
// The backend warehouseList API now primarily queries branches with WAREHOUSE_DC type
// Legacy warehouses included only for backward compatibility during transition

import { useEffect, useState } from "react";
import Link from "next/link";
import { warehouseList, warehouseEnsureDefault } from "@/lib/api";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

type WarehouseRow = {
  id: number;
  name: string;
  code?: string | null;
  type?: string;
  isActive?: boolean;
  manager?: {
    id: number;
    profile?: { displayName?: string } | null;
    auth?: { email?: string | null } | null;
  } | null;
  _count?: { locations?: number; staff?: number };
  createdAt?: string;
};

function typeBadge(t?: string) {
  if (t === "CENTRAL") return "bg-primary";
  if (t === "REGIONAL") return "bg-info";
  if (t === "TRANSIT") return "bg-warning text-dark";
  return "bg-secondary";
}

function pickArray(resp: unknown): unknown[] {
  if (!resp) return [];
  const r = resp as Record<string, unknown>;
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(r.data)) return r.data as unknown[];
  if (Array.isArray(r.items)) return r.items as unknown[];
  const d = r.data as Record<string, unknown> | undefined;
  if (d && Array.isArray(d.items)) return d.items as unknown[];
  return [];
}

export default function OwnerWarehouseListPage() {
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [ensuring, setEnsuring] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // owner/me does not include organizations — use org list (same as warehouse/new, stock-requests).
        const orgsRes = await ownerGet("/api/v1/owner/organizations").catch(() => ({ data: [] }));
        if (cancelled) return;
        const orgRows = pickArray(orgsRes) as { id?: number }[];
        const oid = orgRows[0]?.id != null ? Number(orgRows[0].id) : null;
        if (!oid || !Number.isFinite(oid)) {
          setError("No organization found");
          setLoading(false);
          return;
        }
        setOrgId(oid);
        const data = await warehouseList(oid);
        if (cancelled) return;
        setWarehouses(data as WarehouseRow[]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load warehouses");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function ensureDefault() {
    if (!orgId) return;
    setEnsuring(true);
    try {
      await warehouseEnsureDefault(orgId);
      const data = await warehouseList(orgId);
      setWarehouses(data as WarehouseRow[]);
    } catch (e: any) {
      alert(e?.message || "Failed to ensure default warehouse");
    } finally {
      setEnsuring(false);
    }
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">Warehouses</h4>
          <p className="text-muted mb-0">Manage your central and regional warehouses</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {orgId != null && (
            <button type="button" className="btn btn-outline-secondary" onClick={ensureDefault} disabled={ensuring}>
              {ensuring ? "Working…" : "Link central locations"}
            </button>
          )}
          <Link href="/owner/warehouse/new" className="btn btn-primary">
            <i className="ti ti-plus me-1" /> New Warehouse
          </Link>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted">Loading warehouses…</p>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {!loading && !error && warehouses.length === 0 && (
        <div className="text-center py-5">
          <i className="ti ti-building-warehouse fs-1 text-muted" />
          <p className="mt-2 text-muted">No warehouses found. Create your first warehouse to get started.</p>
        </div>
      )}

      {!loading && warehouses.length > 0 && (
        <div className="row g-3">
          {warehouses.map((wh) => (
            <div key={wh.id} className="col-md-6 col-xl-4">
              <div className="card h-100 border">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-0">
                        <Link href={`/owner/warehouse/${wh.id}`} className="text-decoration-none">
                          {wh.name}
                        </Link>
                      </h6>
                      {wh.code && <small className="text-muted">Code: {wh.code}</small>}
                    </div>
                    <span className={`badge ${typeBadge(wh.type)} rounded-pill`}>
                      {wh.type || "CENTRAL"}
                    </span>
                  </div>

                  <div className="d-flex gap-3 mt-3 text-muted small">
                    <span><i className="ti ti-map-pin me-1" />{wh._count?.locations ?? 0} locations</span>
                    <span><i className="ti ti-users me-1" />{wh._count?.staff ?? 0} staff</span>
                  </div>

                  {wh.manager && (
                    <div className="mt-2 small text-muted">
                      <i className="ti ti-user-check me-1" />Manager:{" "}
                      {wh.manager.profile?.displayName || wh.manager.auth?.email || "—"}
                    </div>
                  )}

                  <div className="mt-3 d-flex gap-2">
                    <span className={`badge ${wh.isActive !== false ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}>
                      {wh.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="card-footer bg-transparent border-top-0 pt-0">
                  <div className="d-flex gap-2">
                    <Link href={`/owner/warehouse/${wh.id}`} className="btn btn-sm btn-outline-primary flex-fill">
                      <i className="ti ti-eye me-1" />View
                    </Link>
                    <Link href={`/owner/warehouse/${wh.id}/staff`} className="btn btn-sm btn-outline-secondary flex-fill">
                      <i className="ti ti-users me-1" />Staff
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
