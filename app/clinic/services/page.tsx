"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/apiFetch";

interface Service {
  id: number;
  name: string;
  description: string | null;
  category: string;
  price: number;
  duration: number | null;
  isRecurring: boolean;
  status: string;
  branch: { id: number; name: string };
  createdAt: string;
}

export default function ClinicServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "CONSULTATION",
    price: 0,
    duration: 30,
    isRecurring: false,
    status: "ACTIVE",
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  useEffect(() => {
    loadServices();
  }, [selectedCategory]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const url = selectedCategory
        ? `/api/v1/services?category=${selectedCategory}`
        : "/api/v1/services";
      const data = (await apiFetch(url)) as unknown[] | { items?: unknown[]; data?: unknown[] };
      setServices((Array.isArray(data) ? data : (data && typeof data === "object" ? (Array.isArray((data as { items?: unknown[] }).items) ? (data as { items: unknown[] }).items : Array.isArray((data as { data?: unknown[] }).data) ? (data as { data: unknown[] }).data : []) : [])) as Service[]);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load services");
      console.error("Load services error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Get branch ID from user context
      const me = (await apiFetch("/api/v1/auth/me")) as { data?: { branches?: { id: number }[]; organizations?: { id: number }[] }; branches?: { id: number }[]; organizations?: { id: number }[] };
      const branchId = me?.data?.branches?.[0]?.id ?? me?.branches?.[0]?.id;
      const orgId = me?.data?.organizations?.[0]?.id ?? me?.organizations?.[0]?.id;

      if (!branchId || !orgId) {
        alert("You must be assigned to a branch to create services");
        return;
      }

      if (editingService) {
        await apiFetch(`/api/v1/services/${editingService.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            category: formData.category,
            price: formData.price,
            duration: formData.duration,
            isRecurring: formData.isRecurring,
            status: formData.status,
          }),
        });
      } else {
        await apiFetch("/api/v1/services", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orgId: orgId,
            branchId: branchId,
            name: formData.name,
            description: formData.description,
            category: formData.category,
            price: formData.price,
            duration: formData.duration,
            isRecurring: formData.isRecurring,
            status: formData.status,
          }),
        });
      }
      setShowModal(false);
      setEditingService(null);
      setFormData({
        name: "",
        description: "",
        category: "CONSULTATION",
        price: 0,
        duration: 30,
        isRecurring: false,
        status: "ACTIVE",
      });
      loadServices();
    } catch (e: any) {
      alert(e?.message || "Failed to save service");
      console.error("Save service error:", e);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      category: service.category,
      price: parseFloat(service.price.toString()),
      duration: service.duration || 30,
      isRecurring: service.isRecurring,
      status: service.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    try {
      await apiFetch(`/api/v1/services/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      loadServices();
    } catch (e: any) {
      alert(e?.message || "Failed to delete service");
    }
  };

  const categories = [
    "CONSULTATION",
    "VACCINATION",
    "SURGERY",
    "GROOMING",
    "BOARDING",
    "DIAGNOSTICS",
    "EMERGENCY",
    "OTHER",
  ];

  return (
    <div className="dashboard-main-body">
      <div className="row g-3">
        <div className="col-12">
          <div className="card radius-12">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h5 className="mb-1">Services</h5>
                  <small className="text-muted">Manage clinic services</small>
                </div>
                <div className="d-flex gap-2">
                  <select
                    className="form-select form-select-sm radius-12"
                    style={{ width: "200px" }}
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primary radius-12"
                    onClick={() => {
                      setEditingService(null);
                      setFormData({
                        name: "",
                        description: "",
                        category: "CONSULTATION",
                        price: 0,
                        duration: 30,
                        isRecurring: false,
                        status: "ACTIVE",
                      });
                      setShowModal(true);
                    }}
                  >
                    <i className="ri-add-line me-2" />
                    Add Service
                  </button>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger radius-12" role="alert">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <p>No services found. Create your first service!</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((service) => (
                        <tr key={service.id}>
                          <td>
                            <strong>{service.name}</strong>
                            {service.description && (
                              <>
                                <br />
                                <small className="text-muted">{service.description.substring(0, 50)}...</small>
                              </>
                            )}
                          </td>
                          <td>
                            <span className="badge bg-info-focus text-info-main radius-12">
                              {service.category}
                            </span>
                          </td>
                          <td>
                            <strong>৳{parseFloat(service.price.toString()).toFixed(2)}</strong>
                          </td>
                          <td>
                            {service.duration ? `${service.duration} min` : "—"}
                          </td>
                          <td>
                            <span
                              className={`badge radius-12 ${
                                service.status === "ACTIVE"
                                  ? "bg-success-focus text-success-main"
                                  : "bg-secondary-focus text-secondary-main"
                              }`}
                            >
                              {service.status}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-light radius-12"
                                onClick={() => handleEdit(service)}
                              >
                                <i className="ri-edit-line" />
                              </button>
                              <button
                                className="btn btn-sm btn-light radius-12 text-danger"
                                onClick={() => handleDelete(service.id)}
                              >
                                <i className="ri-delete-bin-line" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Service Modal */}
      {showModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowModal(false)}
        >
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h6 className="modal-title">
                  {editingService ? "Edit Service" : "Add Service"}
                </h6>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Service Name *</label>
                    <input
                      type="text"
                      className="form-control radius-12"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control radius-12"
                      rows={3}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Category *</label>
                    <select
                      className="form-select radius-12"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      required
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Price (৳) *</label>
                      <input
                        type="number"
                        className="form-control radius-12"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                        }
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Duration (minutes)</label>
                      <input
                        type="number"
                        className="form-control radius-12"
                        value={formData.duration ?? ""}
                        onChange={(e) =>
                          setFormData({ ...formData, duration: parseInt(e.target.value, 10) || 0 })
                        }
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={formData.isRecurring}
                        onChange={(e) =>
                          setFormData({ ...formData, isRecurring: e.target.checked })
                        }
                      />
                      <label className="form-check-label">
                        Recurring Service
                      </label>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select radius-12"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary radius-12"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary radius-12">
                    {editingService ? "Update" : "Create"} Service
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
