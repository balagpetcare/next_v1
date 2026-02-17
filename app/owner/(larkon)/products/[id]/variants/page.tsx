"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/src/lib/apiFetch";
import { notify } from "@/app/owner/_components/Notification";
import LkInput from "@larkon-ui/components/LkInput";
import LkSelect from "@larkon-ui/components/LkSelect";
import LkButton from "@larkon-ui/components/LkButton";

type Variant = {
  id: number;
  sku: string;
  title: string;
  attributes?: any;
  isActive?: boolean;
};

type AttributePair = {
  key: string;
  value: string;
};

export default function ProductVariantsPage() {
  const params = useParams();
  const productId = params.id as string;
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    sku: "",
    title: "",
    attributes: [] as AttributePair[],
  });

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = (await apiFetch(`/api/v1/products/${productId}`)) as { success?: boolean; data?: any };
      const productData = res?.data ?? res;
      setProduct(productData);
      setVariants(productData?.variants ?? []);
    } catch (e: any) {
      setError(e?.message || "Failed to load product");
      setProduct(null);
      setVariants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      
      // Convert attribute pairs to object
      const attributes: any = {};
      formData.attributes.forEach((attr) => {
        if (attr.key.trim() && attr.value.trim()) {
          attributes[attr.key.trim()] = attr.value.trim();
        }
      });
      
      const attributesObj = Object.keys(attributes).length > 0 ? attributes : undefined;
      
      await apiFetch(`/api/v1/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: formData.sku.trim(),
          title: formData.title.trim(),
          attributes: attributesObj,
        }),
      });
      
      setFormData({ sku: "", title: "", attributes: [] });
      setShowAddForm(false);
      notify.success("Success", "Variant added successfully");
      loadProduct();
    } catch (e: any) {
      const errorMsg = e?.message || "Failed to add variant";
      setError(errorMsg);
      notify.error("Error", errorMsg);
    }
  };

  const handleUpdateVariant = async (variantId: number, data: Partial<Variant>) => {
    try {
      setError(null);
      await apiFetch(`/api/v1/products/variants/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setEditingId(null);
      notify.success("Success", "Variant updated successfully");
      loadProduct();
    } catch (e: any) {
      const errorMsg = e?.message || "Failed to update variant";
      setError(errorMsg);
      notify.error("Error", errorMsg);
    }
  };

  const handleDeleteVariant = async (variantId: number) => {
    notify.confirm(
      "Delete Variant",
      "Are you sure you want to delete this variant? This action cannot be undone.",
      async () => {
        try {
          setError(null);
          await apiFetch(`/api/v1/products/variants/${variantId}`, {
            method: "DELETE",
          });
          notify.success("Success", "Variant deleted successfully");
          loadProduct();
        } catch (e: any) {
          const errorMsg = e?.message || "Failed to delete variant";
          setError(errorMsg);
          notify.error("Error", errorMsg);
        }
      }
    );
  };

  const addAttributeField = () => {
    setFormData({
      ...formData,
      attributes: [...formData.attributes, { key: "", value: "" }],
    });
  };

  const removeAttributeField = (index: number) => {
    setFormData({
      ...formData,
      attributes: formData.attributes.filter((_, i) => i !== index),
    });
  };

  const updateAttributeField = (index: number, field: "key" | "value", value: string) => {
    const newAttributes = [...formData.attributes];
    newAttributes[index] = { ...newAttributes[index], [field]: value };
    setFormData({ ...formData, attributes: newAttributes });
  };

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-danger radius-12">{error}</div>
        <Link href="/owner/products" className="btn btn-outline-primary radius-12">
          ← Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <div className="row g-3">
        <div className="col-12">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div>
              <h5 className="mb-0">Product Variants</h5>
              {product && (
                <small className="text-muted">{product.name}</small>
              )}
            </div>
            <Link href={`/owner/products/${productId}`} className="btn btn-sm btn-outline-primary radius-12">
              ← Back to Product
            </Link>
          </div>
        </div>

        {error && (
          <div className="col-12">
            <div className="alert alert-danger radius-12" role="alert">
              {error}
            </div>
          </div>
        )}

        <div className="col-12">
          <div className="card radius-12">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="fw-semibold mb-0">Variants</h6>
                <button
                  type="button"
                  className="btn btn-sm btn-primary radius-12"
                  onClick={() => {
                    setShowAddForm(!showAddForm);
                    setEditingId(null);
                    if (!showAddForm) {
                      setFormData({ sku: "", title: "", attributes: [] });
                    }
                  }}
                >
                  {showAddForm ? "Cancel" : "+ Add Variant"}
                </button>
              </div>

              {showAddForm && (
                <form onSubmit={handleAddVariant} className="card bg-light radius-12 mb-3">
                  <div className="card-body">
                    <h6 className="fw-semibold mb-3">Add New Variant</h6>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">SKU <span className="text-danger">*</span></label>
                        <LkInput
                          type="text"
                          className="radius-12"
                          value={formData.sku}
                          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                          required
                          placeholder="e.g., PROD-001-RED"
                        />
                        <small className="text-muted">Unique product code</small>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Title <span className="text-danger">*</span></label>
                        <LkInput
                          type="text"
                          className="radius-12"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          required
                          placeholder="e.g., Red - Large"
                        />
                        <small className="text-muted">Variant name</small>
                      </div>
                      <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <label className="form-label mb-0">Attributes (Optional)</label>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary radius-12"
                            onClick={addAttributeField}
                          >
                            + Add Attribute
                          </button>
                        </div>
                        {formData.attributes.length === 0 ? (
                          <div className="text-muted small mb-2">
                            Add attributes like Color, Size, Weight, etc.
                          </div>
                        ) : (
                          <div className="row g-2 mb-2">
                            {formData.attributes.map((attr, index) => (
                              <div key={index} className="col-12">
                                <div className="d-flex gap-2 align-items-start">
                                  <div className="flex-grow-1">
                                    <LkInput
                                      type="text"
                                      size="sm"
                                      className="radius-12"
                                      placeholder="Attribute name (e.g., Color)"
                                      value={attr.key}
                                      onChange={(e) => updateAttributeField(index, "key", e.target.value)}
                                    />
                                  </div>
                                  <div className="flex-grow-1">
                                    <LkInput
                                      type="text"
                                      size="sm"
                                      className="radius-12"
                                      placeholder="Value (e.g., Red)"
                                      value={attr.value}
                                      onChange={(e) => updateAttributeField(index, "value", e.target.value)}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger radius-12"
                                    onClick={() => removeAttributeField(index)}
                                    title="Remove"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <small className="text-muted">Example: Color = Red, Size = Large</small>
                      </div>
                      <div className="col-12">
                        <button type="submit" className="btn btn-primary radius-12">
                          Add Variant
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}

              {variants.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted mb-0">No variants yet.</p>
                  <p className="text-muted small">Click "Add Variant" to create your first variant.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Title</th>
                        <th>Attributes</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((variant) => (
                        <VariantRow
                          key={variant.id}
                          variant={variant}
                          isEditing={editingId === variant.id}
                          onEdit={() => setEditingId(variant.id)}
                          onCancel={() => setEditingId(null)}
                          onSave={handleUpdateVariant}
                          onDelete={handleDeleteVariant}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VariantRow({
  variant,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  variant: Variant;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (id: number, data: Partial<Variant>) => void;
  onDelete: (id: number) => void;
}) {
  const [formData, setFormData] = useState({
    sku: variant.sku,
    title: variant.title,
    attributes: variant.attributes
      ? Object.entries(variant.attributes).map(([key, value]) => ({ key, value: String(value) }))
      : ([] as AttributePair[]),
    isActive: variant.isActive ?? true,
  });

  const addAttributeField = () => {
    setFormData({
      ...formData,
      attributes: [...formData.attributes, { key: "", value: "" }],
    });
  };

  const removeAttributeField = (index: number) => {
    setFormData({
      ...formData,
      attributes: formData.attributes.filter((_, i) => i !== index),
    });
  };

  const updateAttributeField = (index: number, field: "key" | "value", value: string) => {
    const newAttributes = [...formData.attributes];
    newAttributes[index] = { ...newAttributes[index], [field]: value };
    setFormData({ ...formData, attributes: newAttributes });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert attribute pairs to object
    const attributes: any = {};
    formData.attributes.forEach((attr) => {
      if (attr.key.trim() && attr.value.trim()) {
        attributes[attr.key.trim()] = attr.value.trim();
      }
    });
    
    const attributesObj = Object.keys(attributes).length > 0 ? attributes : undefined;
    
    onSave(variant.id, {
      sku: formData.sku.trim(),
      title: formData.title.trim(),
      attributes: attributesObj,
      isActive: formData.isActive,
    });
  };

  if (isEditing) {
    return (
      <tr>
        <td colSpan={5}>
          <form onSubmit={handleSubmit} className="p-3 bg-light radius-12">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">SKU <span className="text-danger">*</span></label>
                <LkInput
                  type="text"
                  size="sm"
                  className="radius-12"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Title <span className="text-danger">*</span></label>
                <LkInput
                  type="text"
                  size="sm"
                  className="radius-12"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Status</label>
                <LkSelect
                  size="sm"
                  className="radius-12"
                  value={formData.isActive ? "true" : "false"}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "true" })}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </LkSelect>
              </div>
              <div className="col-12">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <label className="form-label mb-0">Attributes</label>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary radius-12"
                    onClick={addAttributeField}
                  >
                    + Add
                  </button>
                </div>
                {formData.attributes.length === 0 ? (
                  <div className="text-muted small mb-2">No attributes</div>
                ) : (
                  <div className="row g-2 mb-2">
                    {formData.attributes.map((attr, index) => (
                      <div key={index} className="col-12">
                        <div className="d-flex gap-2 align-items-start">
                          <div className="flex-grow-1">
                            <LkInput
                              type="text"
                              size="sm"
                              className="radius-12"
                              placeholder="Name"
                              value={attr.key}
                              onChange={(e) => updateAttributeField(index, "key", e.target.value)}
                            />
                          </div>
                          <div className="flex-grow-1">
                            <LkInput
                              type="text"
                              size="sm"
                              className="radius-12"
                              placeholder="Value"
                              value={attr.value}
                              onChange={(e) => updateAttributeField(index, "value", e.target.value)}
                            />
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger radius-12"
                            onClick={() => removeAttributeField(index)}
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-sm btn-primary radius-12 me-2">
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary radius-12"
                  onClick={onCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  // Display attributes as badges
  const renderAttributes = () => {
    if (!variant.attributes || Object.keys(variant.attributes).length === 0) {
      return <span className="text-muted">—</span>;
    }
    
    return (
      <div className="d-flex flex-wrap gap-1">
        {Object.entries(variant.attributes).map(([key, value], idx) => (
          <span key={idx} className="badge bg-primary-focus text-primary-main radius-12">
            <strong>{key}:</strong> {String(value)}
          </span>
        ))}
      </div>
    );
  };

  return (
    <tr>
      <td>
        <code className="small">{variant.sku}</code>
      </td>
      <td>{variant.title}</td>
      <td>{renderAttributes()}</td>
      <td>
        <span className={`badge radius-12 ${variant.isActive !== false ? "bg-success-focus text-success-main" : "bg-secondary-focus text-secondary-main"}`}>
          {variant.isActive !== false ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="text-end">
        <button
          type="button"
          className="btn btn-sm btn-outline-primary radius-12 me-2"
          onClick={onEdit}
        >
          Edit
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger radius-12"
          onClick={() => onDelete(variant.id)}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
