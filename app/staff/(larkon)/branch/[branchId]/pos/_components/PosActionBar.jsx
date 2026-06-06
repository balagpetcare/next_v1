 
"use client";

export default function PosActionBar({
  canSell,
  posCartBusy,
  noteSaving,
  cartNoteDraft,
  onCartNoteDraftChange,
  onPersistCartNote,
  onHoldActivePosCart,
  onAbandonAndNewCart,
  displayLinesLength,
  activeCartId,
  grandTotal,
  onScrollToCheckout,
}) {
  return (
    <div className="pos-action-bar border-top pt-4 flex-shrink-0">
      <div className="d-flex flex-nowrap align-items-center gap-4 mb-4">
        <div className="d-flex align-items-center border rounded-2 px-7 py-3 gap-5 flex-grow-1 min-w-0 bg-white">
          <i className="ri-sticky-note-line text-secondary-light flex-shrink-0" />
          <input
            type="text"
            className="form-control form-control-sm border-0 p-0 shadow-none"
            maxLength={200}
            placeholder="Cart note..."
            value={cartNoteDraft}
            onChange={(e) => onCartNoteDraftChange?.(e.target.value)}
            onBlur={onPersistCartNote}
            disabled={!canSell || posCartBusy || noteSaving}
          />
          <span className="small text-secondary-light flex-shrink-0">{String(cartNoteDraft || "").length}/200</span>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary px-7 flex-shrink-0"
          disabled={!canSell || !activeCartId || posCartBusy || noteSaving}
          onClick={onPersistCartNote}
        >
          {noteSaving ? "..." : "Save"}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary px-7 flex-shrink-0"
          disabled={!canSell || !activeCartId || posCartBusy || displayLinesLength === 0}
          onClick={onHoldActivePosCart}
        >
          Hold
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger px-7 flex-shrink-0"
          disabled={!canSell || !activeCartId || posCartBusy}
          onClick={onAbandonAndNewCart}
        >
          Clear
        </button>
      </div>

      <button
        type="button"
        className="btn btn-primary w-100 py-7 fw-bold rounded-3 shadow-sm"
        style={{ fontSize: "0.92rem" }}
        disabled={!displayLinesLength}
        onClick={onScrollToCheckout}
      >
        Checkout Tk {grandTotal.toFixed(2)} <i className="ri-arrow-right-line ms-6" />
      </button>
    </div>
  );
}
