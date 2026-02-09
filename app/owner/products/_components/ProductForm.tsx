"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/src/lib/apiFetch";
import type { CategoryNode } from "./CategorySubcategorySelect";
import CategorySubcategorySelect from "./CategorySubcategorySelect";
import BrandSelect, { type Brand } from "./BrandSelect";

type ProductFormData = {
  name: string;
  slug: string;
  categoryId: string;
  subCategoryId: string;
  brandId: string;
  description: string;
  status: string;
};

type SubmitPayload = Omit<ProductFormData, "categoryId" | "brandId"> & {
  categoryId: number | null;
  brandId: number | null;
};

/** initialData: form strings + optional numeric categoryId/brandId for pre-selection */
type InitialData = Omit<Partial<ProductFormData>, "categoryId" | "brandId"> & {
  categoryId?: number;
  brandId?: number;
};

type Props = {
  initialData?: InitialData;
  onSubmit: (data: SubmitPayload) => Promise<void>;
  submitLabel?: string;
  cancelHref?: string;
};

export default function ProductForm({
  initialData,
  onSubmit,
  submitLabel = "Save",
  cancelHref = "/owner/products",
}: Props) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: initialData?.name ?? "",
    slug: initialData?.slug ?? "",
    categoryId: initialData?.categoryId != null ? String(initialData.categoryId) : "",
    subCategoryId: initialData?.subCategoryId ?? "",
    brandId: initialData?.brandId != null ? String(initialData.brandId) : "",
    description: initialData?.description ?? "",
    status: initialData?.status ?? "ACTIVE",
  });
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [catRes, brandRes] = await Promise.all([
          apiFetch("/api/v1/meta/categories"),
          apiFetch("/api/v1/meta/brands"),
        ]);
        
        // Handle different response structures
        let categoriesData: CategoryNode[] = [];
        if (catRes) {
          if (Array.isArray(catRes)) {
            categoriesData = catRes;
          } else if (Array.isArray((catRes as any)?.data)) {
            categoriesData = (catRes as any).data;
          } else if ((catRes as any)?.success && Array.isArray((catRes as any)?.data)) {
            categoriesData = (catRes as any).data;
          }
        }
        
        let brandsData: Brand[] = [];
        if (brandRes) {
          if (Array.isArray(brandRes)) {
            brandsData = brandRes;
          } else if (Array.isArray((brandRes as any)?.data)) {
            brandsData = (brandRes as any).data;
          } else if ((brandRes as any)?.success && Array.isArray((brandRes as any)?.data)) {
            brandsData = (brandRes as any).data;
          }
        }
        
        setCategories(categoriesData);
        setBrands(brandsData);
      } catch (e) {
        console.error("Load meta error:", e);
        setCategories([]);
        setBrands([]);
      } finally {
        setLoadingMeta(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (initialData) {
      const cid = initialData.categoryId != null ? String(initialData.categoryId) : "";
      const bid = initialData.brandId != null ? String(initialData.brandId) : "";
      setFormData((prev) => ({
        ...prev,
        name: initialData.name ?? prev.name,
        slug: initialData.slug ?? prev.slug,
        categoryId: cid || prev.categoryId,
        subCategoryId: initialData.subCategoryId ?? prev.subCategoryId,
        brandId: bid || prev.brandId,
        description: initialData.description ?? prev.description,
        status: initialData.status ?? prev.status,
      }));
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const categoryId = formData.subCategoryId
        ? parseInt(formData.subCategoryId)
        : formData.categoryId
          ? parseInt(formData.categoryId)
          : null;
      const brandId = formData.brandId ? parseInt(formData.brandId) : null;
      await onSubmit({
        ...formData,
        categoryId,
        brandId,
      });
    } catch (err) {
      console.error("Submit error:", err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card radius-12">
      <div className="card-body">
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label">Product Name <span className="text-danger">*</span></label>
            <input
              type="text"
              className="form-control radius-12"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="col-12">
            <label className="form-label">Slug</label>
            <input
              type="text"
              className="form-control radius-12"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="Leave blank to auto-generate from name"
            />
          </div>
          {loadingMeta ? (
            <div className="col-12 text-muted">Loading categories…</div>
          ) : (
            <div className="col-12">
              <CategorySubcategorySelect
                categories={categories}
                categoryId={formData.categoryId}
                subCategoryId={formData.subCategoryId}
                onCategoryChange={(id) => {
                  setFormData((prev) => ({
                    ...prev,
                    categoryId: id,
                    subCategoryId: ""
                  }));
                }}
                onSubCategoryChange={(id) => {
                  setFormData((prev) => ({ ...prev, subCategoryId: id }));
                }}
              />
            </div>
          )}
          <div className="col-12">
            <BrandSelect
              brands={brands}
              value={formData.brandId}
              onChange={(value) => setFormData({ ...formData, brandId: value })}
              disabled={loadingMeta}
              placeholder="Search and select brand (optional)"
            />
          </div>
          <div className="col-12">
            <label className="form-label">Description</label>
            <textarea
              className="form-control radius-12"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="col-12">
            <label className="form-label">Status</label>
            <select
              className="form-select radius-12"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="col-12 d-flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary radius-12"
            >
              {saving ? "Saving…" : submitLabel}
            </button>
            {cancelHref && (
              <Link href={cancelHref} className="btn btn-outline-secondary radius-12">
                Cancel
              </Link>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
