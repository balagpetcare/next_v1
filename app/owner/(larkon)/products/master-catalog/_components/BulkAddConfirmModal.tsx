"use client";

type Props = {
  count: number;
  names: string[];
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
};

export function BulkAddConfirmModal({ count, names, onConfirm, onCancel, loading }: Props) {
  const first10 = names.slice(0, 10);
  const rest = count - first10.length;

  return (
    <div
      className="add-product-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-add-modal-title"
      onClick={loading ? undefined : onCancel}
    >
      <div className="add-product-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="add-product-modal-icon">
          <i className="ri-add-box-line" />
        </div>
        <h5 id="bulk-add-modal-title" className="add-product-modal-title">
          Add {count} product{count !== 1 ? "s" : ""} to your catalog?
        </h5>
        <p className="add-product-modal-message mb-2">
          The following will be added to your product list. Already-added items will be skipped.
        </p>
        {first10.length > 0 && (
          <ul className="list-unstyled small text-start mb-2 ps-2" style={{ maxHeight: 200, overflowY: "auto" }}>
            {first10.map((name, i) => (
              <li key={i} className="text-muted">
                {name}
              </li>
            ))}
          </ul>
        )}
        {rest > 0 && (
          <p className="small text-muted mb-3">… and {rest} more</p>
        )}
        <div className="add-product-modal-actions">
          <button
            type="button"
            className="btn btn-outline-secondary radius-12 add-product-modal-btn"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary radius-12 add-product-modal-btn"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Adding…
              </>
            ) : (
              <>
                <i className="ri-check-line me-2" />
                Add {count} product{count !== 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
