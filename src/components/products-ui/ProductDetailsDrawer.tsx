"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Offcanvas } from "react-bootstrap";
import { apiFetch } from "@/src/lib/apiFetch";
import { notify } from "@/app/owner/_components/Notification";
import type { ProductsCapabilities } from "./productsPermissions";

type ProductDetail = {
  id: number;
  name: string;
  slug: string;
  status: string;
  approvalStatus?: string;
  description?: string | null;
  updatedAt?: string;
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

type TabId = "overview" | "pricing" | "inventory" | "variants" | "media" | "activity";

type Props = {
  productId: number | null;
  open: boolean;
  onClose: () => void;
  getProductLink: (id: number) => string;
  getEditLink: (id: number) => string;
  getVariantsLink: (id: number) => string;
  getPricingLink: (id: number) => string;
  getLocationsLink: (id: number) => string;
  permissions: ProductsCapabilities;
  onUpdated?: () => void;
};

const APPROVAL_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Submitted",
  APPROVED: "Approved",
  PUBLISHED: "Published",
};

export function ProductDetailsDrawer({
  productId,
  open,
  onClose,
  getProductLink,
  getEditLink,
  getVariantsLink,
  getPricingLink,
  getLocationsLink,
  permissions,
  onUpdated,
}: Props) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  useEffect(() => {
    if (!open || !productId) {
      setProduct(null);
      setActiveTab("overview");
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = (await apiFetch(`/api/v1/products/${productId}`)) as { success?: boolean; data?: ProductDetail };
        const data = (res?.data ?? res ?? null) as ProductDetail | null;
        if (!cancelled) setProduct(data);
      } catch {
        if (!cancelled) setProduct(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, productId]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );
  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  const handleSubmitForApproval = () => {
    if (!productId) return;
    notify.confirm("Submit for Approval", "Submit this product for approval?", async () => {
      setActionLoading(true);
      try {
        await apiFetch(`/api/v1/products/${productId}/submit-for-approval`, { method: "POST" });
        notify.success("Success", "Submitted for approval");
        onUpdated?.();
        const res = (await apiFetch(`/api/v1/products/${productId}`)) as { data?: ProductDetail };
        setProduct((res?.data ?? res ?? null) as ProductDetail | null);
      } catch (e: unknown) {
        notify.error("Error", (e as Error)?.message || "Failed to submit");
      } finally {
        setActionLoading(false);
      }
    });
  };

  const handlePublish = () => {
    if (!productId) return;
    notify.confirm("Publish Product", "Publish this product?", async () => {
      setActionLoading(true);
      try {
        await apiFetch(`/api/v1/products/${productId}/publish`, { method: "POST" });
        notify.success("Success", "Product published");
        onUpdated?.();
        const res = (await apiFetch(`/api/v1/products/${productId}`)) as { data?: ProductDetail };
        setProduct(res?.data ?? res ?? null);
      } catch (e: unknown) {
        notify.error("Error", (e as Error)?.message || "Failed to publish");
      } finally {
        setActionLoading(false);
      }
    });
  };

  const approvalStatus = product?.approvalStatus ?? "DRAFT";
  const mediaList = product?.media ?? [];
  const variants = product?.variants ?? [];

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "pricing", label: "Pricing" },
    { id: "inventory", label: "Inventory" },
    { id: "variants", label: "Variants" },
    { id: "media", label: "Media" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <Offcanvas
      show={open}
      onHide={onClose}
      placement="end"
      className="border-0 shadow-lg"
      style={{ width: "min(100%, 480px)" }}
      aria-labelledby="product-drawer-title"
    >
      <Offcanvas.Header closeButton className="border-bottom">
        <Offcanvas.Title id="product-drawer-title">Product details</Offcanvas.Title>
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
          <>
            <ul className="nav nav-tabs nav-tabs-sm px-3 pt-2 border-bottom" role="tablist">
              {tabs.map((tab) => (
                <li key={tab.id} className="nav-item">
                  <button
                    type="button"
                    className={`nav-link radius-12 ${activeTab === tab.id ? "active" : ""}`}
                    onClick={() => setActiveTab(tab.id)}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>

            <div className="p-3">
              {activeTab === "overview" && (
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex align-items-start gap-3">
                    {mediaList[0]?.media?.url ? (
                      <div className="rounded overflow-hidden flex-shrink-0 bg-light" style={{ width: 72, height: 72 }}>
                        <img src={mediaList[0].media.url} alt="" className="w-100 h-100" style={{ objectFit: "cover" }} />
                      </div>
                    ) : (
                      <div className="rounded bg-light flex-shrink-0 d-flex align-items-center justify-content-center text-muted" style={{ width: 72, height: 72 }}>
                        <i className="ri-image-line fs-4" aria-hidden />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h6 className="mb-1 fw-semibold">{product.name}</h6>
                      <small className="text-muted d-block">{product.slug}</small>
                      <div className="d-flex flex-wrap gap-1 mt-2">
                        <span className={`badge radius-12 ${product.status === "ACTIVE" ? "bg-success-focus text-success-main" : "bg-secondary-focus text-secondary-main"}`}>
                          {product.status}
                        </span>
                        <span className="badge bg-info-focus text-info-main radius-12">
                          {APPROVAL_LABELS[approvalStatus] ?? approvalStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                  {product.category && (
                    <p className="small text-muted mb-0">
                      Category: {product.category.name}
                      {product.brand && ` · Brand: ${product.brand.name}`}
                    </p>
                  )}
                  <div className="d-flex flex-wrap gap-2">
                    <Link href={getVariantsLink(productId!)} className="btn btn-primary btn-sm radius-12" onClick={onClose}>
                      Manage Variants
                    </Link>
                    <Link href={getEditLink(productId!)} className="btn btn-outline-primary btn-sm radius-12" onClick={onClose}>
                      Edit
                    </Link>
                    <Link href={getPricingLink(productId!)} className="btn btn-outline-secondary btn-sm radius-12" onClick={onClose}>
                      Pricing
                    </Link>
                    <Link href={getLocationsLink(productId!)} className="btn btn-outline-secondary btn-sm radius-12" onClick={onClose}>
                      Stock / Locations
                    </Link>
                  </div>
                  {approvalStatus === "DRAFT" && (
                    <button type="button" className="btn btn-success btn-sm radius-12 w-100" onClick={handleSubmitForApproval} disabled={actionLoading}>
                      Submit for Approval
                    </button>
                  )}
                  {approvalStatus === "APPROVED" && (
                    <button type="button" className="btn btn-primary btn-sm radius-12 w-100" onClick={handlePublish} disabled={actionLoading}>
                      Publish
                    </button>
                  )}
                  <Link href={getProductLink(productId!)} className="btn btn-outline-secondary btn-sm radius-12 w-100" onClick={onClose}>
                    View full page →
                  </Link>
                </div>
              )}

              {activeTab === "pricing" && (
                <div>
                  {permissions.canViewCost || permissions.canViewMargin ? (
                    <p className="small text-muted">View full pricing and margins on the product page.</p>
                  ) : (
                    <p className="small text-muted">Pricing and cost are not visible with your role.</p>
                  )}
                  <Link href={getPricingLink(productId!)} className="btn btn-outline-primary btn-sm radius-12" onClick={onClose}>
                    Open Pricing
                  </Link>
                </div>
              )}

              {activeTab === "inventory" && (
                <div>
                  <p className="small text-muted">Branch stock and locations.</p>
                  <Link href={getLocationsLink(productId!)} className="btn btn-outline-primary btn-sm radius-12" onClick={onClose}>
                    Open Stock / Locations
                  </Link>
                </div>
              )}

              {activeTab === "variants" && (
                <div>
                  {variants.length === 0 ? (
                    <p className="text-muted small mb-2">No variants yet.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm table-hover mb-2">
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
                  <Link href={getVariantsLink(productId!)} className="btn btn-outline-primary btn-sm radius-12" onClick={onClose}>
                    Manage Variants
                  </Link>
                </div>
              )}

              {activeTab === "media" && (
                <div>
                  {mediaList.length === 0 ? (
                    <p className="text-muted small">No media.</p>
                  ) : (
                    <div className="d-flex flex-wrap gap-2">
                      {mediaList.map((m) =>
                      m.media?.url ? (
                        <img key={m.id} src={m.media.url} alt="" className="rounded" style={{ width: 80, height: 80, objectFit: "cover" }} />
                      ) : null
                    )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "activity" && (
                <div className="small text-muted">
                  {product.updatedAt && (
                    <p className="mb-0">Last updated: {new Date(product.updatedAt).toLocaleString()}</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
}
