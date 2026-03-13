"use client";

import LoadingState from "@/src/components/dashboard/LoadingState";
import EmptyState from "@/src/components/dashboard/EmptyState";

export interface PackageItem {
  id: number;
  packageCode: string;
  packageName: string;
  baseSellingPrice: number;
  status?: string;
  description?: string | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "BDT", minimumFractionDigits: 0 }).format(
    amount
  );
}

export interface PackageSelectorProps {
  packages: PackageItem[];
  selectedId?: number | null;
  onSelect: (pkg: PackageItem) => void;
  loading?: boolean;
  error?: string | null;
}

export default function PackageSelector({
  packages,
  selectedId,
  onSelect,
  loading,
  error,
}: PackageSelectorProps) {
  if (loading) return <LoadingState message="Loading packages…" />;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!packages?.length) return <EmptyState title="No packages" description="No packages available for this branch." />;

  return (
    <div className="package-selector d-flex flex-column gap-2">
      {packages.map((pkg) => (
        <button
          key={pkg.id}
          type="button"
          className={`card text-start ${selectedId === pkg.id ? "border-primary border-2" : ""}`}
          onClick={() => onSelect(pkg)}
        >
          <div className="card-body py-2 px-3">
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-semibold">{pkg.packageName}</span>
              <span className="text-primary fw-semibold">{formatCurrency(pkg.baseSellingPrice)}</span>
            </div>
            {pkg.packageCode && <div className="small text-muted">{pkg.packageCode}</div>}
            {pkg.description && <div className="small mt-1">{pkg.description}</div>}
          </div>
        </button>
      ))}
    </div>
  );
}
