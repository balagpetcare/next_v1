"use client";

import { useCallback, useEffect, useState } from "react";
import { DetailDrawer } from "@/src/components/dashboard";
import { getPackageById, listPackageItems } from "./catalogApi";
import { formatPackageType } from "./catalogFormatters";
import CatalogStatusBadge from "./CatalogStatusBadge";
import type { SurgeryPackage, PackageItem } from "./catalogTypes";

export default function PackageDetailDrawer({
  branchId,
  packageId,
  open,
  onClose,
  onUpdated,
}: {
  branchId: string;
  packageId: number | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [pkg, setPkg] = useState<SurgeryPackage | null>(null);
  const [items, setItems] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!packageId || !open) return;
    setLoading(true);
    Promise.all([
      getPackageById(branchId, packageId),
      listPackageItems(branchId, packageId),
    ])
      .then(([p, i]) => {
        setPkg(p ?? null);
        setItems(i ?? []);
      })
      .catch(() => {
        setPkg(null);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [branchId, packageId, open]);

  useEffect(() => {
    load();
  }, [load]);

  if (!packageId) return null;

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={pkg?.packageName ?? "Package"}
      subtitle={pkg ? `${pkg.packageCode} · ${formatPackageType(pkg.packageType)}` : "Loading…"}
    >
      <div className="p-3">
        {loading && !pkg && <p className="text-muted small">Loading…</p>}
        {pkg && (
          <>
            <div className="mb-3">
              <span className="me-2"><CatalogStatusBadge status={pkg.status} /></span>
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
                  const name = item.itemName ?? (item as { product?: { name?: string }; clinicalItem?: { name?: string } }).product?.name ?? (item as { clinicalItem?: { name?: string } }).clinicalItem?.name ?? `Item #${item.id}`;
                  return (
                    <li key={item.id}>
                      {name}
                      {item.quantity != null && ` × ${item.quantity}`}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </DetailDrawer>
  );
}
