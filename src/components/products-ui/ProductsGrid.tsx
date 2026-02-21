"use client";

import { memo } from "react";
import type { ProductListItem } from "./types";

const APPROVAL_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Submitted",
  APPROVED: "Approved",
  PUBLISHED: "Published",
};

type Props = {
  items: ProductListItem[];
  onCardClick: (id: number) => void;
  selectedIds: Set<number>;
  onSelectionChange: (id: number, selected: boolean) => void;
  getProductLink: (id: number) => string;
  getEditLink: (id: number) => string;
  onDelete?: (id: number) => void;
  canDelete?: boolean;
};

function ProductCard({
  product,
  selected,
  onSelect,
  onClick,
  getProductLink,
  getEditLink,
  onDelete,
  canDelete,
}: {
  product: ProductListItem;
  selected: boolean;
  onSelect: (v: boolean) => void;
  onClick: () => void;
  getProductLink: (id: number) => string;
  getEditLink: (id: number) => string;
  onDelete?: (id: number) => void;
  canDelete?: boolean;
}) {
  const approvalStatus = product.approvalStatus ?? "DRAFT";
  const firstMedia = product.media?.[0]?.media?.url;
  const variantCount = product.variants?.length ?? 0;

  return (
    <div
      className="card radius-12 border h-100"
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("input, a, button")) return;
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View ${product.name}`}
    >
      <div className="card-body p-3">
        <div className="d-flex align-items-start gap-2">
          <input
            type="checkbox"
            className="form-check-input mt-1 flex-shrink-0"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${product.name}`}
          />
          {firstMedia ? (
            <img
              src={firstMedia}
              alt=""
              className="rounded flex-shrink-0"
              style={{ width: 56, height: 56, objectFit: "cover" }}
            />
          ) : (
            <div
              className="rounded bg-light flex-shrink-0 d-flex align-items-center justify-content-center text-muted"
              style={{ width: 56, height: 56 }}
            >
              <i className="ri-image-line fs-4" aria-hidden />
            </div>
          )}
          <div className="min-w-0 flex-grow-1">
            <div className="fw-semibold text-truncate">{product.name}</div>
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
        </div>
        <div className="d-flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
          <a href={getProductLink(product.id)} className="btn btn-sm btn-outline-primary radius-12 flex-grow-1">
            View
          </a>
          <a href={getEditLink(product.id)} className="btn btn-sm btn-outline-secondary radius-12">
            Edit
          </a>
          {canDelete && onDelete && (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger radius-12"
              onClick={() => onDelete(product.id)}
              aria-label={`Delete ${product.name}`}
            >
              <i className="ri-delete-bin-line" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const MemoCard = memo(ProductCard);

function ProductsGrid({
  items,
  onCardClick,
  selectedIds,
  onSelectionChange,
  getProductLink,
  getEditLink,
  onDelete,
  canDelete = false,
}: Props) {
  return (
    <div className="row g-3">
      {items.map((product) => (
        <div key={product.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
          <MemoCard
            product={product}
            selected={selectedIds.has(product.id)}
            onSelect={(v) => onSelectionChange(product.id, v)}
            onClick={() => onCardClick(product.id)}
            getProductLink={getProductLink}
            getEditLink={getEditLink}
            onDelete={onDelete}
            canDelete={canDelete}
          />
        </div>
      ))}
    </div>
  );
}

export default memo(ProductsGrid);
