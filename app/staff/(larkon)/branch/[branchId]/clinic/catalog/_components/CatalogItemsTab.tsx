"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTableWrapper, EmptyState, ErrorState, FilterBar, LoadingState } from "@/src/components/dashboard";
import { listCatalogItems, setCatalogItemStatus } from "./catalogApi";
import { formatDomainType } from "./catalogFormatters";
import CatalogStatusBadge from "./CatalogStatusBadge";
import AddFromMasterDrawer from "./AddFromMasterDrawer";
import type { CatalogItem } from "./catalogTypes";

export default function CatalogItemsTab({
  branchId,
  search,
  domainFilter,
  canBranchAdd,
}: {
  branchId: string;
  search: string;
  domainFilter?: string;
  canBranchAdd?: boolean;
}) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [addMasterOpen, setAddMasterOpen] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    const isActive =
      statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;
    listCatalogItems(branchId, {
      search: search.trim() || undefined,
      domainType: domainFilter,
      isActive,
      limit: 50,
    })
      .then((r) => setItems(r.items))
      .catch((e) => setError((e as Error)?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [branchId, search, domainFilter, statusFilter]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleToggleStatus = useCallback(
    (item: CatalogItem) => {
      const next = !(item.isActive !== false);
      setCatalogItemStatus(branchId, item.id, next)
        .then(() => reload())
        .catch((e) => setError((e as Error)?.message ?? "Failed to update status"));
    },
    [branchId, reload]
  );

  if (loading && items.length === 0) {
    return (
      <div className="card radius-12">
        <div className="card-body">
          <LoadingState message="Loading catalog items…" />
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
      {canBranchAdd && (
        <>
          <div className="d-flex justify-content-end mb-3">
            <button
              type="button"
              className="btn btn-primary btn-sm radius-8"
              onClick={() => setAddMasterOpen(true)}
            >
              Add from Master Catalog
            </button>
          </div>
          <AddFromMasterDrawer
            branchId={branchId}
            open={addMasterOpen}
            onClose={() => setAddMasterOpen(false)}
            onAdded={reload}
          />
        </>
      )}
      <div className="card radius-12">
        <div className="card-body">
          <FilterBar onReset={() => setStatusFilter("all")} resetLabel="Clear filters">
            <select
              className="form-select form-select-sm radius-8"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              aria-label="Status filter"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FilterBar>
          <DataTableWrapper
            loading={loading}
            emptyState={
              items.length === 0 ? (
                <EmptyState
                  title="No catalog items"
                  description="Add items from Master Catalog or ask owner to add to branch."
                />
              ) : undefined
            }
          >
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Status</th>
                    {canBranchAdd && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td><code className="small">{row.itemCode}</code></td>
                      <td>{row.name}</td>
                      <td>
                        <span className="badge bg-secondary-subtle text-secondary-emphasis radius-8">
                          {formatDomainType(row.domainType)}
                        </span>
                      </td>
                      <td>{row.categoryName ?? "—"}</td>
                      <td>
                        <CatalogStatusBadge
                          status={row.isActive !== false ? "ACTIVE" : "INACTIVE"}
                        />
                      </td>
                      {canBranchAdd && (
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary radius-8"
                            onClick={() => handleToggleStatus(row)}
                          >
                            {row.isActive !== false ? "Deactivate" : "Activate"}
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
