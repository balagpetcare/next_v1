"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ownerClinicServices, ownerClinicServiceUpdate } from "@/app/owner/_lib/ownerApi";
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

type ServiceItem = {
  id: number;
  name: string;
  description?: string | null;
  category: string;
  price: number | string;
  duration?: number | null;
  isRecurring?: boolean;
  status?: string;
};

function findService(items: unknown[], serviceId: string): ServiceItem | null {
  const id = parseInt(serviceId, 10);
  if (Number.isNaN(id)) return null;
  const list = Array.isArray(items) ? items : [];
  return (list.find((s: unknown) => (s as { id?: number })?.id === id) as ServiceItem) ?? null;
}

export default function EditClinicServicePage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params?.branchId as string | undefined;
  const serviceId = params?.serviceId as string | undefined;
  const [service, setService] = useState<ServiceItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [status, setStatus] = useState("ACTIVE");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (
      typeof branchId !== "string" ||
      branchId === "" ||
      typeof serviceId !== "string" ||
      serviceId === ""
    )
      return;
    const bid = branchId;
    const sid = serviceId;
    async function load() {
      try {
        setLoading(true);
        const res = await ownerClinicServices(bid);
        const data = res as { items?: unknown[] };
        const s = findService(data?.items ?? [], sid);
        setService(s ?? null);
        if (s) {
          setName(s.name ?? "");
          setDescription(s.description ?? "");
          setCategory(s.category ?? "CONSULTATION");
          setPrice(String(s.price ?? ""));
          setDuration(s.duration != null ? String(s.duration) : "");
          setIsRecurring(s.isRecurring ?? false);
          setStatus(s.status ?? "ACTIVE");
        }
      } catch (e) {
        setError((e as Error)?.message || "Failed to load service");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [branchId, serviceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !serviceId || !name.trim() || !category) return;
    const priceNum = parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError("Enter a valid price");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await ownerClinicServiceUpdate(branchId, serviceId, {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        price: priceNum,
        duration: duration ? parseInt(duration, 10) : undefined,
        isRecurring,
        status,
      });
      router.push(`/owner/clinic/${branchId}/services`);
    } catch (e) {
      setError((e as Error)?.message || "Failed to update service");
    } finally {
      setSaving(false);
    }
  };

  if (!branchId || !serviceId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch or service.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Service not found.</div>
        <Link href={`/owner/clinic/${branchId}/services`}>Back to services</Link>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={`Edit: ${service.name}`}
        subtitle={`Branch #${branchId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Services", href: `/owner/clinic/${branchId}/services` },
          { label: "Edit", href: `/owner/clinic/${branchId}/services/${serviceId}/edit` },
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
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Description</label>
              <textarea
                className="form-control radius-12"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
              />
            </div>
            <div className="mb-3 form-check">
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
            <div className="mb-4">
              <label className="form-label">Status</label>
              <select
                className="form-select radius-12"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="d-flex gap-2">
              <button
                type="submit"
                className="btn btn-primary radius-12"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
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
