"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/src/lib/apiFetch";
import ProductForm from "../../_components/ProductForm";

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = (await apiFetch(`/api/v1/products/${productId}`)) as { success?: boolean; data?: any };
        setProduct(res?.data ?? res);
      } catch (e: any) {
        const is403 = e?.status === 403 || e?.data?.code === "ACCESS_DENIED";
        setError(is403 ? "You don’t have permission to view or edit this product." : (e?.message || "Failed to load product"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [productId]);

  const handleSubmit = async (data: {
    name: string;
    slug: string;
    categoryId: number | null;
    brandId: number | null;
    description: string;
    status: string;
  }) => {
    setError(null);
    try {
      await apiFetch(`/api/v1/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          slug: data.slug || undefined,
          status: data.status,
          categoryId: data.categoryId,
          brandId: data.brandId,
          description: data.description || undefined,
        }),
      });
      router.push(`/owner/products/${productId}`);
    } catch (e: any) {
      const msg = e?.message || "Failed to update product";
      const is403 = e?.status === 403 || e?.data?.code === "ACCESS_DENIED";
      setError(is403 ? "You don’t have permission to edit this product. Ask your organization owner for product edit access." : msg);
      throw e;
    }
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

  if (error || !product) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-danger radius-12">{error || "Product not found"}</div>
        <Link href="/owner/products" className="btn btn-outline-primary radius-12">
          ← Back to Products
        </Link>
      </div>
    );
  }

  const catId = product.categoryId ?? product.category?.id;
  const cat = product.category;
  // Resolved for Category (parent) and Sub-category dropdowns: if category has parent, show parent in first dropdown and self in second
  const categoryIdStr = cat?.parentId != null ? String(cat.parentId) : (catId != null ? String(catId) : "");
  const subCategoryIdStr = cat?.parentId != null && catId != null ? String(catId) : "";
  const brandId = product.brandId ?? product.brand?.id;

  return (
    <div className="dashboard-main-body">
      <div className="row g-3">
        <div className="col-12">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h5 className="mb-0">Edit Product</h5>
            <Link href={`/owner/products/${productId}`} className="btn btn-sm btn-outline-primary radius-12">
              ← Back to Product
            </Link>
          </div>
          {error && (
            <div className="alert alert-danger radius-12 mb-3" role="alert">
              {error}
            </div>
          )}
          <ProductForm
            initialData={{
              name: product.name,
              slug: product.slug,
              categoryId: categoryIdStr !== "" && !Number.isNaN(Number(categoryIdStr)) ? Number(categoryIdStr) : undefined,
              subCategoryId: subCategoryIdStr,
              brandId: brandId != null && !Number.isNaN(Number(brandId)) ? Number(brandId) : undefined,
              description: product.description ?? "",
              status: product.status ?? "ACTIVE",
            }}
            onSubmit={handleSubmit}
            submitLabel="Save"
            cancelHref={`/owner/products/${productId}`}
          />
        </div>
      </div>
    </div>
  );
}
