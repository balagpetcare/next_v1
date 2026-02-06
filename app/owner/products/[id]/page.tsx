"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/src/lib/apiFetch";
import ImageUploadField from "../../_components/branch/ImageUploadField";
import { notify } from "../../_components/Notification";

const API_BASE = String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

async function uploadBlobAsMedia(blob: Blob): Promise<{ id: number; url: string }> {
  const fd = new FormData();
  fd.append("file", blob, "image.jpg");
  const res = await fetch(`${API_BASE}/api/v1/media/upload`, {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.message || "Upload failed");
  }
  const json = await res.json();
  const m = json?.data ?? json;
  return { id: m.id, url: m.url };
}

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = (await apiFetch(`/api/v1/products/${productId}`)) as { success?: boolean; data?: any };
      setProduct(res?.data ?? res);
    } catch (e: any) {
      setError(e?.message || "Failed to load product");
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const handleSubmitForApproval = async () => {
    notify.confirm(
      "Submit for Approval",
      "Are you sure you want to submit this product for approval?",
      async () => {
        try {
          await apiFetch(`/api/v1/products/${productId}/submit-for-approval`, { method: "POST" });
          notify.success("Success", "Product submitted for approval");
          loadProduct();
        } catch (e: any) {
          notify.error("Error", e?.message || "Failed to submit for approval");
        }
      }
    );
  };

  const handlePublish = async () => {
    notify.confirm(
      "Publish Product",
      "Are you sure you want to publish this product?",
      async () => {
        try {
          await apiFetch(`/api/v1/products/${productId}/publish`, { method: "POST" });
          notify.success("Success", "Product published successfully");
          loadProduct();
        } catch (e: any) {
          notify.error("Error", e?.message || "Failed to publish");
        }
      }
    );
  };

  const handleAddImage = async (blob: Blob) => {
    try {
      const media = await uploadBlobAsMedia(blob);
      await apiFetch(`/api/v1/products/${productId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: media.id, sortOrder: (product?.media?.length ?? 0) }),
      });
      notify.success("Success", "Image added successfully");
      loadProduct();
    } catch (e: any) {
      notify.error("Error", e?.message || "Failed to add image");
    }
  };

  const handleRemoveImage = async (mediaId: number) => {
    notify.confirm(
      "Remove Image",
      "Are you sure you want to remove this image?",
      async () => {
        try {
          await apiFetch(`/api/v1/products/${productId}/media`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mediaId }),
          });
          notify.success("Success", "Image removed successfully");
          loadProduct();
        } catch (e: any) {
          notify.error("Error", e?.message || "Failed to remove image");
        }
      }
    );
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

  const mediaList = product.media ?? [];

  return (
    <div className="dashboard-main-body">
      <div className="row g-3">
        <div className="col-12">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h5 className="mb-0">{product.name}</h5>
            <Link href="/owner/products" className="btn btn-sm btn-outline-primary radius-12">
              ← Back to Products
            </Link>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card radius-12 mb-3">
            <div className="card-body">
              <h6 className="fw-semibold mb-3">Product Details</h6>
              <dl className="row mb-0">
                <dt className="col-sm-3 text-muted">Slug</dt>
                <dd className="col-sm-9">{product.slug}</dd>
                <dt className="col-sm-3 text-muted">Status</dt>
                <dd className="col-sm-9">
                  <span className={`badge radius-12 ${product.status === "ACTIVE" ? "bg-success-focus text-success-main" : "bg-secondary-focus text-secondary-main"}`}>
                    {product.status}
                  </span>
                </dd>
                <dt className="col-sm-3 text-muted">Approval</dt>
                <dd className="col-sm-9">{product.approvalStatus ?? "DRAFT"}</dd>
                {product.category && (
                  <>
                    <dt className="col-sm-3 text-muted">Category</dt>
                    <dd className="col-sm-9">{product.category.name}</dd>
                  </>
                )}
                {product.brand && (
                  <>
                    <dt className="col-sm-3 text-muted">Brand</dt>
                    <dd className="col-sm-9">{product.brand.name}</dd>
                  </>
                )}
                {product.description && (
                  <>
                    <dt className="col-sm-3 text-muted">Description</dt>
                    <dd className="col-sm-9">{product.description}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>

          <div className="card radius-12 mb-3">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="fw-semibold mb-0">Images</h6>
                <Link href={`/owner/products/${productId}/edit`} className="btn btn-sm btn-outline-primary radius-12">
                  Edit Product
                </Link>
              </div>
              <div className="row g-2 mb-3">
                {mediaList.map((pm: any) => (
                  <div key={pm.id} className="col-auto">
                    <div className="position-relative border radius-12 overflow-hidden" style={{ width: 100, height: 100 }}>
                      <img
                        src={pm.media?.url}
                        alt=""
                        className="w-100 h-100"
                        style={{ objectFit: "cover" }}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 radius-12"
                        onClick={() => handleRemoveImage(pm.media?.id ?? pm.mediaId)}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <ImageUploadField
                label="Add image"
                valueUrl=""
                onUploadCroppedBlob={handleAddImage}
                canDelete={false}
                aspect={1}
              />
            </div>
          </div>

          <div className="card radius-12">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="fw-semibold mb-0">Variants</h6>
                <Link href={`/owner/products/${productId}/variants`} className="btn btn-sm btn-outline-primary radius-12">
                  Manage Variants
                </Link>
              </div>
              {product.variants?.length ? (
                <ul className="list-group list-group-flush">
                  {product.variants.map((v: any) => (
                    <li key={v.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <span>{v.title} <small className="text-muted">SKU: {v.sku}</small></span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted mb-0">No variants yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card radius-12">
            <div className="card-body">
              <h6 className="fw-semibold mb-3">Actions</h6>
              <div className="d-flex flex-column gap-2">
                <Link
                  href={`/owner/products/${productId}/edit`}
                  className="btn btn-primary radius-12"
                >
                  Edit Product
                </Link>
                {product.approvalStatus === "DRAFT" && (
                  <button type="button" className="btn btn-success radius-12" onClick={handleSubmitForApproval}>
                    Submit for Approval
                  </button>
                )}
                {product.approvalStatus === "APPROVED" && (
                  <button type="button" className="btn btn-primary radius-12" onClick={handlePublish}>
                    Publish
                  </button>
                )}
                <Link href={`/owner/products/${productId}/locations`} className="btn btn-outline-secondary radius-12">
                  Manage Locations
                </Link>
                <Link href={`/owner/products/${productId}/pricing`} className="btn btn-outline-secondary radius-12">
                  Manage Pricing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
