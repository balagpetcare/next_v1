"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { listPackages } from "./catalogApi";
import CatalogStatusBadge from "./CatalogStatusBadge";
import { DataTableWrapper, EmptyState, ErrorState, LoadingState } from "@/src/components/dashboard";
import type { SurgeryPackage } from "./catalogTypes";

export default function PackagesTab({
  branchId,
  canManage,
  canEdit,
}: {
  branchId: string;
  canManage: boolean;
  canEdit?: boolean;
}) {
  const [packages, setPackages] = useState<SurgeryPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    listPackages(branchId)
      .then((r) => setPackages(r.items ?? []))
      .catch((e) => setError((e as Error)?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [branchId]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loading && packages.length === 0) {
    return (
      <div className="card radius-12">
        <div className="card-body">
          <LoadingState message="Loading packages…" />
        </div>
      </div>
    );
  }

  if (error && packages.length === 0) {
    return (
      <div className="card radius-12">
        <div className="card-body">
          <ErrorState message={error} onRetry={reload} />
        </div>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="card radius-12">
        <div className="card-body">
          {canManage && (
            <div className="d-flex justify-content-end mb-3">
              <Link
                href={`/staff/branch/${branchId}/clinic/catalog?tab=packages&action=create-package`}
                className="btn btn-primary btn-sm radius-8"
              >
                Create package
              </Link>
            </div>
          )}
          <EmptyState
            title="No packages yet"
            description="Create a package draft and submit for approval."
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {canManage && (
        <div className="d-flex justify-content-end mb-3">
          <Link
            href={`/staff/branch/${branchId}/clinic/catalog?tab=packages&action=create-package`}
            className="btn btn-primary btn-sm radius-8"
          >
            Create package
          </Link>
        </div>
      )}
      <DataTableWrapper emptyState={null}>
      <div className="table-responsive">
        <table className="table table-hover mb-0">
          <thead className="table-light">
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => (
              <tr key={pkg.id}>
                <td><code className="small">{pkg.packageCode}</code></td>
                <td>{pkg.packageName}</td>
                <td>{pkg.packageType ?? "—"}</td>
                <td><CatalogStatusBadge status={pkg.status} /></td>
                {canManage && (
                  <td>
                    <Link
                      href={`/staff/branch/${branchId}/clinic/catalog/packages/${pkg.id}`}
                      className="btn btn-sm btn-outline-primary radius-8 me-1"
                    >
                      View
                    </Link>
                    {canEdit && (
                      <Link
                        href={`/staff/branch/${branchId}/clinic/catalog/packages/${pkg.id}/edit`}
                        className="btn btn-sm btn-outline-secondary radius-8"
                      >
                        Edit
                      </Link>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DataTableWrapper>
    </>
  );
}
