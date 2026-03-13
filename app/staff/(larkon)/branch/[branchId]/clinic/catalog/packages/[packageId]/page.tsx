"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace, PageHeader, LoadingState, ErrorState } from "@/src/components/dashboard";
import { getPackageById, listPackageItems } from "../../_components/catalogApi";
import { formatPackageType } from "../../_components/catalogFormatters";
import CatalogStatusBadge from "../../_components/CatalogStatusBadge";
import type { SurgeryPackage, PackageItem } from "../../_components/catalogTypes";

const CATALOG_PERMS = ["clinic.catalog.view", "clinic.packages.read"];

export default function StaffPackageViewPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const packageId = useMemo(() => {
    const id = params?.packageId;
    if (id === undefined || id === null) return null;
    const n = Number(id);
    return Number.isNaN(n) ? null : n;
  }, [params?.packageId]);

  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = CATALOG_PERMS.some((p) => permissions.includes(p));
  const canManagePackages = permissions.includes("clinic.packages.write") || permissions.includes("clinic.packages.read");

  const [pkg, setPkg] = useState<SurgeryPackage | null>(null);
  const [items, setItems] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!branchId || !packageId) return;
    setLoading(true);
    setError("");
    Promise.all([
      getPackageById(branchId, packageId),
      listPackageItems(branchId, packageId),
    ])
      .then(([p, i]) => {
        setPkg(p ?? null);
        setItems(i ?? []);
      })
      .catch((e) => {
        setError((e as Error)?.message ?? "Failed to load package");
        setPkg(null);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [branchId, packageId]);

  useEffect(() => {
    load();
  }, [load]);

  if (ctxLoading) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading..." />
      </PageWorkspace>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.catalog.view"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic/catalog?tab=packages`)}
      />
    );
  }

  const catalogUrl = `/staff/branch/${branchId}/clinic/catalog?tab=packages`;
  const editUrl = `/staff/branch/${branchId}/clinic/catalog/packages/${packageId}/edit`;

  return (
    <PageWorkspace>
      <div className="row g-0">
        <div className="col-12">
          <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
          <PageHeader
            title={pkg?.packageName ?? "Package"}
            subtitle={pkg ? `${pkg.packageCode} · ${formatPackageType(pkg.packageType)}` : "View package details"}
            breadcrumbs={[
              { label: "Clinic", href: `/staff/branch/${branchId}/clinic` },
              { label: "Catalog", href: catalogUrl },
              { label: "Packages", href: catalogUrl },
              { label: pkg?.packageName ?? "Package" },
            ]}
            actions={
              <>
                <Link
                  href={catalogUrl}
                  className="btn btn-outline-secondary btn-sm radius-8"
                >
                  Back to packages
                </Link>
                {canManagePackages && (
                  <Link
                    href={editUrl}
                    className="btn btn-primary btn-sm radius-8"
                  >
                    Edit
                  </Link>
                )}
              </>
            }
          />

          {loading && !pkg && (
            <div className="card radius-12">
              <div className="card-body">
                <LoadingState message="Loading package…" />
              </div>
            </div>
          )}

          {error && !pkg && (
            <div className="card radius-12">
              <div className="card-body">
                <ErrorState message={error} onRetry={load} />
              </div>
            </div>
          )}

          {pkg && !loading && (
            <div className="card radius-12">
              <div className="card-body">
                <div className="mb-3">
                  <span className="me-2">
                    <CatalogStatusBadge status={pkg.status} />
                  </span>
                  <span className="text-muted small">
                    Base price: ৳{typeof pkg.baseSellingPrice === "number" ? pkg.baseSellingPrice : pkg.baseSellingPrice}
                  </span>
                </div>
                {pkg.description && (
                  <p className="small text-muted mb-3">{pkg.description}</p>
                )}
                <h6 className="mb-2">Package items</h6>
                {items.length === 0 ? (
                  <p className="text-muted small">No items in this package.</p>
                ) : (
                  <ul className="list-unstyled small">
                    {items.map((item) => {
                      const name =
                        item.itemName ??
                        (item as { product?: { name?: string }; clinicalItem?: { name?: string } }).product?.name ??
                        (item as { clinicalItem?: { name?: string } }).clinicalItem?.name ??
                        `Item #${item.id}`;
                      return (
                        <li key={item.id}>
                          {name}
                          {item.quantity != null && ` × ${item.quantity}`}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWorkspace>
  );
}
