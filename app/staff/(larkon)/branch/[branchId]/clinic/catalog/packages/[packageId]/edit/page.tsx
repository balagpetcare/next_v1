"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace, PageHeader, LoadingState, ErrorState } from "@/src/components/dashboard";
import {
  getPackageById,
  updatePackage,
  listServices,
} from "../../../_components/catalogApi";
import {
  PACKAGE_TYPE_LABELS,
  formatPackageType,
} from "../../../_components/catalogFormatters";
import type { SurgeryPackage, ClinicService } from "../../../_components/catalogTypes";

const PACKAGE_TYPES = Object.keys(PACKAGE_TYPE_LABELS);
const PACKAGE_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_APPROVAL", label: "Pending approval" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export default function StaffPackageEditPage() {
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
  const canEditPackages = permissions.includes("clinic.packages.write");

  const [pkg, setPkg] = useState<SurgeryPackage | null>(null);
  const [services, setServices] = useState<ClinicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Form state
  const [packageName, setPackageName] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [packageType, setPackageType] = useState("STANDARD");
  const [baseSellingPrice, setBaseSellingPrice] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("DRAFT");

  const loadPackage = useCallback(() => {
    if (!branchId || !packageId) return;
    setLoading(true);
    setError("");
    getPackageById(branchId, packageId)
      .then((data) => {
        setPkg(data ?? null);
        if (data) {
          setPackageName(data.packageName ?? "");
          setServiceId(String(data.serviceId ?? ""));
          setPackageType(data.packageType ?? "STANDARD");
          setBaseSellingPrice(
            typeof data.baseSellingPrice === "number"
              ? String(data.baseSellingPrice)
              : String(data.baseSellingPrice ?? "")
          );
          setDescription(data.description ?? "");
          setStatus(data.status ?? "DRAFT");
        }
      })
      .catch((e) => {
        setError((e as Error)?.message ?? "Failed to load package");
        setPkg(null);
      })
      .finally(() => setLoading(false));
  }, [branchId, packageId]);

  const loadServices = useCallback(() => {
    if (!branchId) return;
    listServices(branchId, { status: "ACTIVE", limit: 200 })
      .then((r) => setServices(r.items ?? []))
      .catch(() => setServices([]));
  }, [branchId]);

  useEffect(() => {
    loadPackage();
    loadServices();
  }, [loadPackage, loadServices]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageId || !branchId) return;
    setError("");
    const priceNum = parseFloat(baseSellingPrice);
    if (!packageName.trim()) {
      setError("Package name is required");
      return;
    }
    const sid = serviceId ? parseInt(serviceId, 10) : NaN;
    if (!Number.isInteger(sid) || sid <= 0) {
      setError("Please select a service");
      return;
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError("Valid base selling price is required");
      return;
    }
    setSaving(true);
    updatePackage(branchId, packageId, {
      packageName: packageName.trim(),
      serviceId: sid,
      packageType: packageType || "STANDARD",
      baseSellingPrice: priceNum,
      description: description.trim() || undefined,
      status,
    })
      .then(() => {
        router.push(
          `/staff/branch/${branchId}/clinic/catalog/packages/${packageId}`
        );
      })
      .catch((err) =>
        setError((err as Error)?.message ?? "Failed to update package")
      )
      .finally(() => setSaving(false));
  };

  const viewUrl = `/staff/branch/${branchId}/clinic/catalog/packages/${packageId}`;
  const catalogUrl = `/staff/branch/${branchId}/clinic/catalog?tab=packages`;

  if (ctxLoading) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading..." />
      </PageWorkspace>
    );
  }

  if (!canEditPackages) {
    return (
      <AccessDenied
        missingPerm="clinic.packages.write"
        onBack={() => router.push(catalogUrl)}
      />
    );
  }

  return (
    <PageWorkspace>
      <div className="row g-0">
        <div className="col-12">
          <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
          <PageHeader
            title="Edit package"
            subtitle={pkg ? `${pkg.packageCode} · ${formatPackageType(pkg.packageType)}` : "Update package details"}
            breadcrumbs={[
              { label: "Clinic", href: `/staff/branch/${branchId}/clinic` },
              { label: "Catalog", href: catalogUrl },
              { label: "Packages", href: catalogUrl },
              { label: pkg?.packageName ?? "Package", href: viewUrl },
              { label: "Edit" },
            ]}
            actions={
              <>
                <Link
                  href={viewUrl}
                  className="btn btn-outline-secondary btn-sm radius-8"
                >
                  Cancel
                </Link>
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

          {error && !pkg && !loading && (
            <div className="card radius-12">
              <div className="card-body">
                <ErrorState message={error} onRetry={loadPackage} />
              </div>
            </div>
          )}

          {pkg && !loading && (
            <div className="card radius-12">
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div className="alert alert-danger radius-12 mb-3">
                      {error}
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="form-label">Package code</label>
                    <input
                      type="text"
                      className="form-control radius-8 bg-light"
                      value={pkg.packageCode}
                      readOnly
                      disabled
                      aria-label="Package code (read-only)"
                    />
                    <small className="text-muted">Package code cannot be changed.</small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Package name</label>
                    <input
                      type="text"
                      className="form-control radius-8"
                      value={packageName}
                      onChange={(e) => setPackageName(e.target.value)}
                      placeholder="e.g. Standard Spay Package"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Service</label>
                    <select
                      className="form-select radius-8"
                      value={serviceId}
                      onChange={(e) => setServiceId(e.target.value)}
                      required
                      aria-label="Service"
                    >
                      <option value="">Select service</option>
                      {services.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.name} {s.serviceCode ? `(${s.serviceCode})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Package type</label>
                    <select
                      className="form-select radius-8"
                      value={packageType}
                      onChange={(e) => setPackageType(e.target.value)}
                      aria-label="Package type"
                    >
                      {PACKAGE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {formatPackageType(t)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Base selling price (৳)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control radius-8"
                      value={baseSellingPrice}
                      onChange={(e) => setBaseSellingPrice(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select radius-8"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      aria-label="Status"
                    >
                      {PACKAGE_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description (optional)</label>
                    <textarea
                      className="form-control radius-8"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary radius-8"
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                    <Link
                      href={viewUrl}
                      className="btn btn-outline-secondary radius-8"
                    >
                      Cancel
                    </Link>
                    <Link
                      href={catalogUrl}
                      className="btn btn-outline-secondary radius-8"
                    >
                      Back to packages
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWorkspace>
  );
}
