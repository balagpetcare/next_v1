"use client";

import { useCallback, useEffect, useState } from "react";
import { DetailDrawer } from "@/src/components/dashboard";
import { createPackage, listServices } from "./catalogApi";
import { PACKAGE_TYPE_LABELS, formatPackageType } from "./catalogFormatters";
import type { ClinicService, SurgeryPackage } from "./catalogTypes";

const PACKAGE_TYPES = Object.keys(PACKAGE_TYPE_LABELS);

export default function PackageFormDrawer({
  branchId,
  open,
  onClose,
  onSaved,
}: {
  branchId: string;
  open: boolean;
  onClose: () => void;
  onSaved: (pkg: SurgeryPackage) => void;
}) {
  const [services, setServices] = useState<ClinicService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [packageCode, setPackageCode] = useState("");
  const [packageName, setPackageName] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [packageType, setPackageType] = useState("STANDARD");
  const [baseSellingPrice, setBaseSellingPrice] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadServices = useCallback(() => {
    if (!branchId || !open) return;
    setServicesLoading(true);
    listServices(branchId, { status: "ACTIVE", limit: 200 })
      .then((r) => setServices(r.items ?? []))
      .catch(() => setServices([]))
      .finally(() => setServicesLoading(false));
  }, [branchId, open]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    if (open) {
      setPackageCode("");
      setPackageName("");
      setServiceId("");
      setPackageType("STANDARD");
      setBaseSellingPrice("");
      setDescription("");
      setError("");
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const priceNum = parseFloat(baseSellingPrice);
    if (!packageCode.trim()) {
      setError("Package code is required");
      return;
    }
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
    const body = {
      packageCode: packageCode.trim(),
      packageName: packageName.trim(),
      serviceId: sid,
      packageType: packageType || "STANDARD",
      baseSellingPrice: priceNum,
      description: description.trim() || undefined,
      status: "DRAFT",
    };
    createPackage(branchId, body)
      .then((created) => {
        onSaved(created);
        onClose();
      })
      .catch((err) => setError((err as Error)?.message ?? "Failed to create package"))
      .finally(() => setSaving(false));
  };

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title="Create package"
      subtitle="Add a new surgery package for this branch."
    >
      <form onSubmit={handleSubmit} className="p-3">
        {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
        <div className="mb-3">
          <label className="form-label">Package code</label>
          <input
            type="text"
            className="form-control radius-8"
            value={packageCode}
            onChange={(e) => setPackageCode(e.target.value)}
            placeholder="e.g. PKG-001"
            required
          />
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
            disabled={servicesLoading}
            aria-label="Service"
          >
            <option value="">Select service</option>
            {services.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name} {s.serviceCode ? `(${s.serviceCode})` : ""}
              </option>
            ))}
          </select>
          {servicesLoading && <small className="text-muted">Loading services…</small>}
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
          <label className="form-label">Description (optional)</label>
          <textarea
            className="form-control radius-8"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary radius-8" disabled={saving}>
            {saving ? "Creating…" : "Create package"}
          </button>
          <button type="button" className="btn btn-outline-secondary radius-8" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </DetailDrawer>
  );
}
