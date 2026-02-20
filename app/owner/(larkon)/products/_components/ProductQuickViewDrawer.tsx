"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Offcanvas } from "react-bootstrap";
import { apiFetch } from "@/src/lib/apiFetch";
import { notify } from "@/app/owner/_components/Notification";

type ProductDetail = {
  id: number;
  name: string;
  slug: string;
  status: string;
  approvalStatus?: string;
  description?: string | null;
  category?: { id: number; name: string } | null;
  brand?: { id: number; name: string } | null;
  media?: Array<{ id: number; media?: { id: number; url: string; type?: string } }>;
  variants?: Array<{
    id: number;
    sku: string;
    title: string;
    barcode?: string | null;
    isActive?: boolean;
  }>;
};

type Props = {
  productId: number | null;
  show: boolean;
  onHide: () => void;
  onUpdated?: () => void;
};

const APPROVAL_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Submitted",
  APPROVED: "Approved",
  PUBLISHED: "Published",
};

export function ProductQuickViewDrawer({ productId, show, onHide, onUpdated }: Props) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!show || !productId) {
      setProduct(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = (await apiFetch(`/api/v1/products/${productId}`)) as { success?: boolean; data?: ProductDetail };
        const data = (res?.data ?? res ?? null) as ProductDetail | null;
        if (!cancelled) {
          setProduct(data);
        }
      } catch {
        if (!cancelled) setProduct(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [show, productId]);

  const handleSubmitForApproval = () => {
    if (!productId) return;
    notify.confirm(
      "Submit for Approval",
      "Submit this product for approval?",
      async () => {
        setActionLoading(true);
        try {
          await apiFetch(`/api/v1/products/${productId}/submit-for-approval`, { method: "POST" });
          notify.success("Success", "Submitted for approval");
          onUpdated?.();
          const res = (await apiFetch(`/api/v1/products/${productId}`)) as { data?: ProductDetail };
          setProduct((res?.data ?? res ?? null) as ProductDetail | null);
        } catch (e: any) {
          notify.error("Error", e?.message || "Failed to submit");
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const handlePublish = () => {
    if (!productId) return;
    notify.confirm(
      "Publish Product",
      "Publish this product?",
      async () => {
        setActionLoading(true);
        try {
          await apiFetch(`/api/v1/products/${productId}/publish`, { method: "POST" });
          notify.success("Success", "Product published");
          onUpdated?.();
          const res = (await apiFetch(`/api/v1/products/${productId}`)) as { data?: ProductDetail };
          setProduct(res?.data ?? res ?? null);
        } catch (e: any) {
          notify.error("Error", e?.message || "Failed to publish");
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const approvalStatus = product?.approvalStatus ?? "DRAFT";
  const mediaList = product?.media ?? [];
  const variants = product?.variants ?? [];

  return (
    <Offcanvas
      show={show}
      onHide={onHide}
      placement="end"
      className="border-0 shadow-lg"
      style={{ width: "min(100%, 440px)" }}
      aria-labelledby="quick-view-drawer-title"
    >
      <Offcanvas.Header closeButton className="border-bottom">
        <Offcanvas.Title id="quick-view-drawer-title">Product details</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body className="p-0">
        {loading ? (
          <div className="p-4 text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading…</span>
            </div>
          </div>
        ) : !product ? (
          <div className="p-4 text-muted small">Product not found.</div>
        ) : (
          <div className="d-flex flex-column">
            <div className="p-4 border-bottom">
              <div className="d-flex align-items-start gap-3">
                {mediaList[0]?.media?.url ? (
                  <div
                    className="rounded overflow-hidden flex-shrink-0 bg-light"
                    style={{ width: 72, height: 72 }}
                  >
                    <img
                      src={mediaList[0].media.url}
                      alt=""
                      className="w-100 h-100"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                ) : (
                  <div
                    className="rounded bg-light flex-shrink-0 d-flex align-items-center justify-content-center text-muted"
                    style={{ width: 72, height: 72 }}
                  >
                    <i className="ri-image-line fs-4" aria-hidden />
                  </div>
                )}
                <div className="min-w-0">
                  <h6 className="mb-1 fw-semibold">{product.name}</h6>
                  <small className="text-muted d-block">{product.slug}</small>
                  <div className="d-flex flex-wrap gap-1 mt-2">
                    <span
                      className={`badge radius-12 ${
                        product.status === "ACTIVE" ? "bg-success-focus text-success-main" : "bg-secondary-focus text-secondary-main"
                      }`}
                    >
                      {product.status}
                    </span>
                    <span className="badge bg-info-focus text-info-main radius-12">
                      {APPROVAL_LABELS[approvalStatus] ?? approvalStatus}
                    </span>
                  </div>
                </div>
              </div>
              {product.category && (
                <p className="small text-muted mb-0 mt-2">
                  Category: {product.category.name}
                  {product.brand && ` · Brand: ${product.brand.name}`}
                </p>
              )}
            </div>

            <div className="p-4 border-bottom">
              <h6 className="fw-semibold mb-2">Variants</h6>
              {variants.length === 0 ? (
                <p className="text-muted small mb-0">No variants yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0">
                    <thead>
                      <tr>
                        <th>Variant</th>
                        <th>SKU</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v) => (
                        <tr key={v.id}>
                          <td>{v.title}</td>
                          <td><code className="small">{v.sku}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4">
              <div className="d-flex flex-wrap gap-2 mb-3">
                <Link
                  href={`/owner/products/${productId}/variants`}
                  className="btn btn-primary btn-sm radius-12"
                  onClick={onHide}
                >
                  Manage Variants
                </Link>
                <Link
                  href={`/owner/products/${productId}/edit`}
                  className="btn btn-outline-primary btn-sm radius-12"
                  onClick={onHide}
                >
                  Edit
                </Link>
                <Link
                  href={`/owner/products/${productId}/pricing`}
                  className="btn btn-outline-secondary btn-sm radius-12"
                  onClick={onHide}
                >
                  Pricing
                </Link>
                <Link
                  href={`/owner/products/${productId}/locations`}
                  className="btn btn-outline-secondary btn-sm radius-12"
                  onClick={onHide}
                >
                  Stock / Locations
                </Link>
              </div>
              {approvalStatus === "DRAFT" && (
                <button
                  type="button"
                  className="btn btn-success btn-sm radius-12 w-100"
                  onClick={handleSubmitForApproval}
                  disabled={actionLoading}
                >
                  Submit for Approval
                </button>
              )}
              {approvalStatus === "APPROVED" && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm radius-12 w-100"
                  onClick={handlePublish}
                  disabled={actionLoading}
                >
                  Publish
                </button>
              )}
              <Link
                href={`/owner/products/${productId}`}
                className="btn btn-outline-secondary btn-sm radius-12 w-100 mt-2"
                onClick={onHide}
              >
                View full page →
              </Link>
            </div>
          </div>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
}
