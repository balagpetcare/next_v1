"use client";

import { useCallback, useEffect, useState } from "react";
import { listServices } from "./catalogApi";
import { formatServiceCategory } from "./catalogFormatters";
import CatalogStatusBadge from "./CatalogStatusBadge";
import { DataTableWrapper, EmptyState, ErrorState, FilterBar, LoadingState } from "@/src/components/dashboard";
import ServiceFormDrawer from "./ServiceFormDrawer";
import type { ClinicService } from "./catalogTypes";

export default function ServicesTab({
  branchId,
  canManage,
}: {
  branchId: string;
  canManage: boolean;
}) {
  const [items, setItems] = useState<ClinicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    listServices(branchId, {
      status: statusFilter !== "all" ? statusFilter : undefined,
      limit: 100,
    })
      .then((r) => setItems(r.items))
      .catch((e) => setError((e as Error)?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [branchId, statusFilter]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loading && items.length === 0) {
    return (
      <div className="card radius-12">
        <div className="card-body">
          <LoadingState message="Loading services…" />
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="card radius-12">
        <div className="card-body">
          <ErrorState message={error} onRetry={reload} />
        </div>
      </div>
    );
  }

  return (
    <>
      {canManage && (
        <div className="d-flex justify-content-end mb-3">
          <button
            type="button"
            className="btn btn-primary btn-sm radius-8"
            onClick={() => { setEditingId(null); setDrawerOpen(true); }}
          >
            Add Service
          </button>
        </div>
      )}
      <ServiceFormDrawer
        branchId={branchId}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingId(null); }}
        onSaved={reload}
        serviceId={editingId ?? undefined}
        initialService={editingId ? items.find((s) => s.id === editingId) : undefined}
      />
      <div className="card radius-12">
        <div className="card-body">
          <FilterBar onReset={() => setStatusFilter("all")} resetLabel="Clear">
            <select
              className="form-select form-select-sm radius-8"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Status"
            >
              <option value="all">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </FilterBar>
          <DataTableWrapper
            loading={loading}
            emptyState={items.length === 0 ? <EmptyState title="No services" description="Add a service to get started." /> : undefined}
          >
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Category</th>
                    <th>Base fee</th>
                    <th>Duration</th>
                    <th>Status</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td><code className="small">{s.serviceCode ?? "—"}</code></td>
                      <td>{formatServiceCategory(s.category)}</td>
                      <td>{typeof s.price === "number" ? `৳${s.price}` : s.price}</td>
                      <td>{s.duration != null ? `${s.duration} min` : "—"}</td>
                      <td><CatalogStatusBadge status={s.status} /></td>
                      {canManage && (
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary radius-8"
                            onClick={() => { setEditingId(s.id); setDrawerOpen(true); }}
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataTableWrapper>
        </div>
      </div>
    </>
  );
}
