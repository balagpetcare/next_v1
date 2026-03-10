"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ownerClinicServiceCreate } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

const SERVICE_CATEGORIES = [
  "CONSULTATION",
  "VACCINATION",
  "SURGERY",
  "GROOMING",
  "BOARDING",
  "DIAGNOSTICS",
  "EMERGENCY",
  "OTHER",
] as const;

export default function NewClinicServicePage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params?.branchId as string | undefined;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(SERVICE_CATEGORIES[0]);
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !name.trim() || !category) return;
    const priceNum = parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError("Enter a valid price");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await ownerClinicServiceCreate(branchId, {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        price: priceNum,
        duration: duration ? parseInt(duration, 10) : undefined,
        isRecurring,
        status: "ACTIVE",
      });
      router.push(`/owner/clinic/${branchId}/services`);
    } catch (e) {
      setError((e as Error)?.message || "Failed to create service");
    } finally {
      setSaving(false);
    }
  };

  if (!branchId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Add service"
        subtitle={`Branch #${branchId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Services", href: `/owner/clinic/${branchId}/services` },
          { label: "New", href: `/owner/clinic/${branchId}/services/new` },
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      <div className="card radius-12">
        <div className="card-body p-24">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Name *</label>
              <input
                type="text"
                className="form-control radius-12"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. General consultation"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Description</label>
              <textarea
                className="form-control radius-12"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Category *</label>
              <select
                className="form-select radius-12"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Price *</label>
              <input
                type="number"
                step="0.01"
                min={0}
                className="form-control radius-12"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                placeholder="0.00"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Duration (minutes)</label>
              <input
                type="number"
                min={1}
                className="form-control radius-12"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
              />
            </div>
            <div className="mb-4 form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="isRecurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="isRecurring">
                Recurring service
              </label>
            </div>
            <div className="d-flex gap-2">
              <button
                type="submit"
                className="btn btn-primary radius-12"
                disabled={saving}
              >
                {saving ? "Creating..." : "Create service"}
              </button>
              <Link
                href={`/owner/clinic/${branchId}/services`}
                className="btn btn-outline-secondary radius-12"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
