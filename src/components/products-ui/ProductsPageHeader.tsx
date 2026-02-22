"use client";

import styles from "./ProductsPageHeader.module.css";

type Props = {
  title?: string;
  total: number;
  visibleCount: number;
  onAdd?: () => void;
  addLabel?: string;
  importHref?: string;
  importLabel?: string;
  exportOnClick?: () => void;
  exportLabel?: string;
  className?: string;
};

export function ProductsPageHeader({
  title = "Products",
  total,
  visibleCount,
  onAdd,
  addLabel = "+ Add Product",
  importHref,
  importLabel = "Import",
  exportOnClick,
  exportLabel = "Export",
  className = "",
}: Props) {
  return (
    <header className={`${styles.header} ${className}`}>
      <div className={styles.rowInner}>
        <div className={styles.titleBlock}>
          <h4 className="mb-0 fw-semibold">{title}</h4>
          <small className="text-muted">Showing {visibleCount} of {total}</small>
        </div>

        <div className={styles.controls}>
          {exportOnClick && (
            <button
              type="button"
              className={`btn btn-outline-secondary radius-12 ${styles.ctrlBtn}`}
              onClick={exportOnClick}
            >
              {exportLabel}
            </button>
          )}
          {importHref && (
            <a href={importHref} className={`btn btn-outline-secondary radius-12 ${styles.ctrlBtn}`}>
              {importLabel}
            </a>
          )}
          {onAdd && (
            <button type="button" className={`btn btn-primary radius-12 ${styles.addBtn}`} onClick={onAdd}>
              {addLabel}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
