"use client";

import { memo } from "react";
import Link from "next/link";
import { Dropdown } from "react-bootstrap";
import type { ProductListItem } from "./products.types";

const APPROVAL_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Submitted",
  APPROVED: "Approved",
  PUBLISHED: "Published",
};

type Props = {
  products: ProductListItem[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onSelectAll: (checked: boolean) => void;
  onOpenQuickView: (id: number) => void;
  onDelete: (id: number) => void;
  isMobile?: boolean;
};

function ProductRow({
  product,
  selected,
  onToggleSelect,
  onOpenQuickView,
  onDelete,
  isMobile,
}: {
  product: ProductListItem;
  selected: boolean;
  onToggleSelect: (id: number) => void;
  onOpenQuickView: (id: number) => void;
  onDelete: (id: number) => void;
  isMobile?: boolean;
}) {
  const approvalStatus = product.approvalStatus ?? "DRAFT";
  const mediaCount = product.media?.length ?? 0;
  const firstMedia = product.media?.[0]?.media?.url;
  const variantCount = product.variants?.length ?? 0;
  const firstSku = product.variants?.[0]?.sku ?? "—";

  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a, button, [role='button'], input")) return;
    onOpenQuickView(product.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpenQuickView(product.id);
    }
  };

  if (isMobile) {
    return (
      <div
        className="card radius-12 mb-2"
        role="button"
        tabIndex={0}
        onClick={handleRowClick}
        onKeyDown={handleKeyDown}
        aria-label={`View ${product.name}`}
      >
        <div className="card-body p-3">
          <div className="d-flex align-items-start gap-2">
            <input
              type="checkbox"
              className="form-check-input mt-1"
              checked={selected}
              onChange={() => onToggleSelect(product.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select ${product.name}`}
            />
            {firstMedia ? (
              <img
                src={firstMedia}
                alt=""
                className="rounded flex-shrink-0"
                style={{ width: 48, height: 48, objectFit: "cover" }}
              />
            ) : (
              <div
                className="rounded bg-light flex-shrink-0 d-flex align-items-center justify-content-center text-muted"
                style={{ width: 48, height: 48 }}
              >
                <i className="ri-image-line" aria-hidden />
              </div>
            )}
            <div className="min-w-0 flex-grow-1">
              <div className="fw-semibold">{product.name}</div>
              <div className="small text-muted">
                {variantCount} variant{variantCount !== 1 ? "s" : ""}
                {product.category && ` · ${product.category.name}`}
              </div>
              <div className="d-flex flex-wrap gap-1 mt-1">
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
            <div className="d-flex flex-column gap-1" onClick={(e) => e.stopPropagation()}>
              <Link
                href={`/owner/products/${product.id}`}
                className="btn btn-sm btn-outline-primary radius-12"
              >
                View
              </Link>
              <Link
                href={`/owner/products/${product.id}/edit`}
                className="btn btn-sm btn-outline-secondary radius-12"
              >
                Edit
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <tr
      className="table-row-clickable"
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View ${product.name}`}
    >
      <td onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          className="form-check-input"
          checked={selected}
          onChange={() => onToggleSelect(product.id)}
          aria-label={`Select ${product.name}`}
        />
      </td>
      <td>
        <div className="d-flex align-items-center gap-2">
          {firstMedia ? (
            <img
              src={firstMedia}
              alt=""
              className="flex-shrink-0"
              style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8 }}
            />
          ) : (
            <div
              className="flex-shrink-0 d-flex align-items-center justify-content-center text-muted"
              style={{ width: 40, height: 40, borderRadius: 8, background: "var(--bs-light, #f8f9fa)" }}
            >
              <i className="ri-image-line" aria-hidden />
            </div>
          )}
          <div className="min-w-0">
            <div className="fw-semibold text-truncate">{product.name}</div>
            <div className="small text-muted text-truncate">
              {firstSku !== "—" ? firstSku : product.category?.name ?? "—"}
            </div>
          </div>
        </div>
      </td>
      <td><code className="small">{firstSku}</code></td>
      <td>
        <span className="badge bg-info-focus text-info-main radius-12">
          {variantCount}
        </span>
      </td>
      <td className="text-muted">—</td>
      <td className="text-muted">—</td>
      <td>
        <span
          className={`badge radius-12 ${
            product.status === "ACTIVE" ? "bg-success-focus text-success-main" : "bg-secondary-focus text-secondary-main"
          }`}
        >
          {product.status}
        </span>
        <span className="badge bg-info-focus text-info-main radius-12 ms-1">
          {APPROVAL_LABELS[approvalStatus] ?? approvalStatus}
        </span>
      </td>
      <td className="small text-muted">
        {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : "—"}
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        <Dropdown align="end">
          <Dropdown.Toggle
            variant="light"
            size="sm"
            className="btn-icon-more radius-12"
            style={{ width: 32, height: 32, padding: 0 }}
            aria-label={`Actions for ${product.name}`}
          >
            <i className="ri-more-2-fill" aria-hidden />
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item
              as="button"
              onClick={() => onOpenQuickView(product.id)}
            >
              <i className="ri-eye-line me-2" aria-hidden />
              View
            </Dropdown.Item>
            <Dropdown.Item as={Link} href={`/owner/products/${product.id}/edit`}>
              <i className="ri-edit-line me-2" aria-hidden />
              Edit
            </Dropdown.Item>
            <Dropdown.Item as={Link} href={`/owner/products/${product.id}/variants`}>
              <i className="ri-list-check-2 me-2" aria-hidden />
              Variants
            </Dropdown.Item>
            <Dropdown.Item
              as="a"
              href={`/owner/products/${product.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="ri-external-link-line me-2" aria-hidden />
              Open in new tab
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item
              as="button"
              className="text-danger"
              onClick={() => onDelete(product.id)}
            >
              <i className="ri-delete-bin-line me-2" aria-hidden />
              Delete
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </td>
    </tr>
  );
}

const MemoRow = memo(ProductRow);

function ProductsTable({
  products,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onOpenQuickView,
  onDelete,
  isMobile = false,
}: Props) {
  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));

  if (isMobile) {
    return (
      <div className="products-table-mobile">
        {products.map((product) => (
          <MemoRow
            key={product.id}
            product={product}
            selected={selectedIds.has(product.id)}
            onToggleSelect={onToggleSelect}
            onOpenQuickView={onOpenQuickView}
            onDelete={onDelete}
            isMobile
          />
        ))}
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th style={{ width: 40 }}>
              <input
                type="checkbox"
                className="form-check-input"
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
                aria-label="Select all"
              />
            </th>
            <th>Product</th>
            <th>SKU</th>
            <th>Variants</th>
            <th>Stock</th>
            <th>Price</th>
            <th>Status</th>
            <th>Updated</th>
            <th className="text-end" style={{ width: 56 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <MemoRow
              key={product.id}
              product={product}
              selected={selectedIds.has(product.id)}
              onToggleSelect={onToggleSelect}
              onOpenQuickView={onOpenQuickView}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(ProductsTable);
