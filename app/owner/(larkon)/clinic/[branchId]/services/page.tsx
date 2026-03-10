"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicServices,
  ownerClinicServiceDelete,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

const DEPARTMENT_LABELS: Record<string, string> = {
  DOCTOR_DESK: "Doctor",
  LAB: "Lab",
  PHARMACY: "Pharmacy",
  PROCEDURE_ROOM: "Procedure",
  GROOMING_UNIT: "Grooming",
};

type ServiceItem = {
  id: number;
  name: string;
  category: string;
  price: number | string;
  duration?: number | null;
  status?: string;
  description?: string | null;
  department?: string;
  paymentGateRule?: string;
  serviceCode?: string | null;
  pricingVariants?: { id: number; species: string; price: number }[];
};

function pickItems(res: { items?: unknown[] } | null): ServiceItem[] {
  if (!res?.items || !Array.isArray(res.items)) return [];
  return res.items as ServiceItem[];
}

export default function ClinicServicesPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterDept, setFilterDept] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");

  const load = async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const res = await ownerClinicServices(branchId);
      setItems(pickItems(res as { items?: unknown[] }));
    } catch (e) {
      setError((e as Error)?.message || "Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [branchId]);

  const handleDelete = async (serviceId: number) => {
    if (!branchId || !confirm("Deactivate this service?")) return;
    try {
      await ownerClinicServiceDelete(branchId, serviceId);
      setItems((prev) => prev.filter((s) => s.id !== serviceId));
    } catch (e) {
      setError((e as Error)?.message || "Failed to delete");
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
        title="Clinic services"
        subtitle={`Branch #${branchId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Services", href: `/owner/clinic/${branchId}/services` },
        ]}
        actions={[
          <Link
            key="proposals"
            href={`/owner/clinic/${branchId}/service-proposals`}
            className="btn btn-outline-secondary radius-12"
          >
            <i className="ri-file-list-3-line me-1" />
            Service proposals
          </Link>,
          <Link
            key="new"
            href={`/owner/clinic/${branchId}/services/new`}
            className="btn btn-primary radius-12"
          >
            <i className="ri-add-line me-1" />
            Add service
          </Link>,
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <i className="ri-stethoscope-line fs-1 text-muted mb-3 d-block" />
            <h5 className="mb-3">No services yet</h5>
            <Link
              href={`/owner/clinic/${branchId}/services/new`}
              className="btn btn-primary radius-12"
            >
              <i className="ri-add-line me-1" />
              Add first service
            </Link>
          </div>
        </div>
      ) : (
        <div className="card radius-12">
          <div className="card-body p-24">
            <div className="d-flex gap-3 mb-3 flex-wrap">
              <select
                className="form-select form-select-sm w-auto"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {["CONSULTATION", "TEST", "PROCEDURE", "VACCINATION", "SURGERY", "GROOMING", "OTHER"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                className="form-select form-select-sm w-auto"
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
              >
                <option value="">All departments</option>
                {Object.entries(DEPARTMENT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Category</th>
                    <th>Department</th>
                    <th>Price</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items
                    .filter((s) => !filterCategory || s.category === filterCategory)
                    .filter((s) => !filterDept || (s.department || "DOCTOR_DESK") === filterDept)
                    .map((s) => (
                    <tr key={s.id}>
                      <td className="fw-semibold">{s.name}</td>
                      <td><code className="small">{s.serviceCode ?? "—"}</code></td>
                      <td>{s.category}</td>
                      <td>
                        <span className="badge bg-primary-subtle text-primary radius-8">
                          {DEPARTMENT_LABELS[s.department || "DOCTOR_DESK"] ?? s.department ?? "—"}
                        </span>
                      </td>
                      <td>{typeof s.price === "number" ? s.price : Number(s.price)}</td>
                      <td>{s.duration != null ? `${s.duration} min` : "—"}</td>
                      <td>
                        <span
                          className={`badge radius-8 ${
                            s.status === "ACTIVE" ? "bg-success" : "bg-secondary"
                          }`}
                        >
                          {s.status ?? "ACTIVE"}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Link
                            href={`/owner/clinic/${branchId}/services/${s.id}/edit`}
                            className="btn btn-sm btn-outline-primary radius-12"
                          >
                            Edit
                          </Link>
                          {s.status === "ACTIVE" && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger radius-12"
                              onClick={() => handleDelete(s.id)}
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
