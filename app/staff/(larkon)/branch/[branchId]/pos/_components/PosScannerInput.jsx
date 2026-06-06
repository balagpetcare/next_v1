 
"use client";

import { forwardRef } from "react";

const STATUS_LABEL = {
  ready: "Ready",
  searching: "Scanning...",
  added: "Added",
  not_found: "Not found",
  no_price: "No price",
};

const PosScannerInput = forwardRef(function PosScannerInputInner(
  {
    canSell,
    barcodeLoading,
    barcodeInput,
    onBarcodeInputChange,
    scanMode,
    onToggleScanMode,
    onSubmit,
    scanLineStatus,
    scanFlash,
  },
  ref
) {
  const status = scanLineStatus || "ready";
  const label = STATUS_LABEL[status] ?? STATUS_LABEL.ready;

  return (
    <div className={`pos-scanner-stack ${scanFlash ? "pos-scanner-flash" : ""}`}>
      <div className="d-flex align-items-center justify-content-between gap-5 flex-wrap mb-2">
        <span
          className={`pos-scanner-status badge rounded-pill px-9 py-3 pos-scanner-status--${status}`}
          role="status"
          aria-live="polite"
        >
          {label}
        </span>
        <details className="small text-secondary mb-0">
          <summary className="cursor-pointer user-select-none" style={{ fontSize: "11px" }}>
            Keyboard
          </summary>
          <ul className="mb-0 mt-6 ps-16 text-start" style={{ fontSize: "11px", lineHeight: 1.45 }}>
            <li>
              <kbd className="px-4">F2</kbd> - focus scan
            </li>
            <li>
              <kbd className="px-4">Ctrl</kbd>+<kbd className="px-4">N</kbd> - new cart
            </li>
            <li>
              <kbd className="px-4">Ctrl</kbd>+<kbd className="px-4">H</kbd> - hold cart
            </li>
            <li>
              <kbd className="px-4">Enter</kbd> - add line
            </li>
            <li>
              <kbd className="px-4">Esc</kbd> - clear scan / close dialog
            </li>
          </ul>
        </details>
      </div>

      <form
        className="d-flex align-items-center gap-5 pos-quick-search"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit?.();
        }}
      >
        <div className="position-relative flex-grow-1 min-w-0">
          <i className="ri-search-line pos-quick-search__icon position-absolute top-50 translate-middle-y text-secondary-light" />
          <input
            ref={ref}
            type="text"
            autoComplete="off"
            className="form-control pos-quick-search__input"
            placeholder="Scan barcode, SKU, or product name..."
            value={barcodeInput}
            onChange={(e) => onBarcodeInputChange?.(e.target.value)}
            disabled={!canSell || barcodeLoading}
          />
        </div>
        <button
          type="button"
          className={`btn ${scanMode ? "btn-primary" : "btn-outline-secondary"}`}
          title="Toggle scan mode"
          onClick={onToggleScanMode}
        >
          <i className="ri-qr-scan-line" />
        </button>
        <button type="submit" className="btn btn-outline-secondary" disabled={!canSell || barcodeLoading}>
          <i className="ri-barcode-line" />
        </button>
      </form>
    </div>
  );
});

PosScannerInput.displayName = "PosScannerInput";

export default PosScannerInput;
