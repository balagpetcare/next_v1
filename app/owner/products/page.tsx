"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/src/lib/apiFetch";

interface Product {
  id: number;
  name: string;
  slug: string;
  status: string;
  variants: Array<{
    id: number;
    sku: string;
    title: string;
    isActive: boolean;
  }>;
  createdAt: string;
}

export default function OwnerProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    status: "ACTIVE",
    variants: [] as Array<{ sku: string; title: string }>,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = (await apiFetch("/api/v1/products")) as { items?: Product[]; data?: Product[] };
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.items) ? res.items : [];
      setProducts(list as Product[]);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load products");
      console.error("Load products error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await apiFetch(`/api/v1/products/${editingProduct.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            status: formData.status,
          }),
        });
      } else {
        await apiFetch("/api/v1/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            status: formData.status,
            variants: formData.variants.filter((v) => v.sku && v.title),
          }),
        });
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData({ name: "", status: "ACTIVE", variants: [] });
      loadProducts();
    } catch (e: any) {
      alert(e?.message || "Failed to save product");
      console.error("Save product error:", e);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      status: product.status,
      variants: product.variants.map((v) => ({ sku: v.sku, title: v.title })),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await apiFetch(`/api/v1/products/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      loadProducts();
    } catch (e: any) {
      alert(e?.message || "Failed to delete product");
    }
  };

  const addVariant = () => {
    setFormData({
      ...formData,
      variants: [...formData.variants, { sku: "", title: "" }],
    });
  };

  const removeVariant = (index: number) => {
    setFormData({
      ...formData,
      variants: formData.variants.filter((_, i) => i !== index),
    });
  };

  const updateVariant = (index: number, field: string, value: string) => {
    const updated = [...formData.variants];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, variants: updated });
  };

  return (
    <div className="dashboard-main-body">
      <div className="row g-3">
        <div className="col-12">
          <div className="card radius-12">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h5 className="mb-1">Products</h5>
                  <small className="text-muted">Manage your organization products</small>
                </div>
                <div className="d-flex gap-2">
                  <Link href="/owner/products/master-catalog" className="btn btn-success radius-12">
                    <i className="ri-book-open-line me-2" />
                    Browse Catalog
                  </Link>
                  <Link href="/owner/products/new" className="btn btn-primary radius-12">
                    <i className="ri-add-line me-2" />
                    New Product
                  </Link>
                  <button
                    className="btn btn-outline-primary radius-12"
                    onClick={() => {
                      setEditingProduct(null);
                      setFormData({ name: "", status: "ACTIVE", variants: [] });
                      setShowModal(true);
                    }}
                  >
                    Quick Add
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
              ) : products.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <p>No products found. Create your first product!</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Variants</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.id}>
                          <td>{product.id}</td>
                          <td>
                            <Link href={`/owner/products/${product.id}`} className="text-decoration-none fw-semibold">
                              {product.name}
                            </Link>
                            <br />
                            <small className="text-muted">{product.slug}</small>
                          </td>
                          <td>
                            {product.variants?.length > 0 ? (
                              <span className="badge bg-info-focus text-info-main radius-12">
                                {product.variants.length} variant{product.variants.length > 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="text-muted">No variants</span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`badge radius-12 ${
                                product.status === "ACTIVE"
                                  ? "bg-success-focus text-success-main"
                                  : "bg-secondary-focus text-secondary-main"
                              }`}
                            >
                              {product.status}
                            </span>
                          </td>
                          <td>
                            {new Date(product.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <Link
                                href={`/owner/products/${product.id}/edit`}
                                className="btn btn-sm btn-light radius-12"
                              >
                                <i className="ri-edit-line" />
                              </Link>
                              <Link
                                href={`/owner/products/${product.id}`}
                                className="btn btn-sm btn-light radius-12"
                                title="View"
                              >
                                <i className="ri-eye-line" />
                              </Link>
                              <button
                                className="btn btn-sm btn-light radius-12 text-danger"
                                onClick={() => handleDelete(product.id)}
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

      {/* Product Modal */}
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
                  {editingProduct ? "Edit Product" : "Add Product"}
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
                    <label className="form-label">Product Name *</label>
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

                  <div className="mb-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <label className="form-label mb-0">Variants</label>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary radius-12"
                        onClick={addVariant}
                      >
                        <i className="ri-add-line me-1" />
                        Add Variant
                      </button>
                    </div>

                    {formData.variants.map((variant, index) => (
                      <div key={index} className="card radius-12 mb-2">
                        <div className="card-body p-3">
                          <div className="row g-2">
                            <div className="col-5">
                              <input
                                type="text"
                                className="form-control form-control-sm radius-12"
                                placeholder="SKU"
                                value={variant.sku}
                                onChange={(e) =>
                                  updateVariant(index, "sku", e.target.value)
                                }
                              />
                            </div>
                            <div className="col-5">
                              <input
                                type="text"
                                className="form-control form-control-sm radius-12"
                                placeholder="Title (e.g., Small, Red)"
                                value={variant.title}
                                onChange={(e) =>
                                  updateVariant(index, "title", e.target.value)
                                }
                              />
                            </div>
                            <div className="col-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-light radius-12 w-100"
                                onClick={() => removeVariant(index)}
                              >
                                <i className="ri-delete-bin-line" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {formData.variants.length === 0 && (
                      <p className="text-muted small">
                        No variants. Product will be created without variants.
                      </p>
                    )}
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
                    {editingProduct ? "Update" : "Create"} Product
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
