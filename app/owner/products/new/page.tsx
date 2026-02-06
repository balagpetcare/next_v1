"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/src/lib/apiFetch";
import ProductForm from "../_components/ProductForm";

export default function NewProductPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

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
      const res = await apiFetch("/api/v1/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          slug: data.slug || undefined,
          status: data.status,
          categoryId: data.categoryId,
          brandId: data.brandId,
          description: data.description || undefined,
        }),
      }) as { success?: boolean; data?: { id: number }; message?: string };
      const id = res?.data?.id;
      if (id) {
        router.push(`/owner/products/${id}`);
        return;
      }
      setError("Create succeeded but no product id returned.");
    } catch (e: any) {
      setError(e?.message || "Failed to create product");
      throw e;
    }
  };

  return (
    <div className="dashboard-main-body">
      <div className="row g-3">
        <div className="col-12">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h5 className="mb-0">Create New Product</h5>
            <div className="d-flex gap-2">
              <Link
                href="/owner/products/master-catalog"
                className="btn btn-sm btn-success radius-12"
              >
                <i className="ri-book-open-line me-1" />
                Browse Catalog
              </Link>
              <Link href="/owner/products" className="btn btn-sm btn-outline-primary radius-12">
                ← Back to Products
              </Link>
            </div>
          </div>
          {error && (
            <div className="alert alert-danger radius-12 mb-3" role="alert">
              {error}
            </div>
          )}
          <ProductForm
            onSubmit={handleSubmit}
            submitLabel="Create Product"
            cancelHref="/owner/products"
          />
        </div>
      </div>
    </div>
  );
}
