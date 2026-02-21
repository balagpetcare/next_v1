"use client";

type Props = {
  title?: string;
  message?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  resetLabel?: string;
  onReset?: () => void;
  icon?: React.ReactNode;
  className?: string;
};

export function ProductsEmptyState({
  title = "No products found",
  message = "Create your first product or browse the master catalog to add pre-configured products.",
  primaryLabel = "Create product",
  onPrimary,
  secondaryLabel = "Browse catalog",
  secondaryHref,
  resetLabel = "Reset filters",
  onReset,
  icon,
  className = "",
}: Props) {
  return (
    <div className={`text-center py-5 px-3 ${className}`}>
      <div className="mb-3 text-muted">
        {icon ?? <i className="ri-box-3-line display-4" aria-hidden />}
      </div>
      <h6 className="fw-semibold mb-2">{title}</h6>
      <p className="text-muted small mb-4">{message}</p>
      <div className="d-flex flex-wrap justify-content-center gap-2">
        {onPrimary && (
          <button type="button" className="btn btn-primary radius-12" onClick={onPrimary}>
            <i className="ri-add-line me-1" aria-hidden />
            {primaryLabel}
          </button>
        )}
        {secondaryHref && (
          <a href={secondaryHref} className="btn btn-outline-success radius-12">
            <i className="ri-book-open-line me-1" aria-hidden />
            {secondaryLabel}
          </a>
        )}
        {onReset && (
          <button type="button" className="btn btn-outline-secondary radius-12" onClick={onReset}>
            {resetLabel}
          </button>
        )}
      </div>
    </div>
  );
}
