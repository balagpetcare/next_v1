/* eslint-disable react/prop-types */
"use client";

import Card from "@/src/bpa/components/ui/Card";

function getDiscountPercent(line) {
  const listPrice = Number(line.listPrice || 0);
  const sellPrice = Number(line.price || 0);
  if (listPrice <= 0 || sellPrice >= listPrice) return 0;
  return Math.max(0, Math.round(((listPrice - sellPrice) / listPrice) * 100));
}

export default function PosCartTable({
  lines,
  canSell,
  canDiscountOverride,
  busy,
  onIncrementLine,
  onDecrementLine,
  onPersistLineQty,
  onApplyLineDiscount,
  onRemoveLine,
  cardClassName,
}) {
  const hasLines = Array.isArray(lines) && lines.length > 0;

  return (
    <Card className={cardClassName || ""}>
      {!hasLines ? (
        <div className="d-flex flex-column align-items-center justify-content-center text-secondary py-18 px-12 text-center h-100">
          <i className="ri-shopping-cart-2-line mb-4 text-secondary-light" style={{ fontSize: "1.45rem" }} />
          <p className="small mb-0 fw-medium">Cart is empty</p>
          <p className="small text-secondary-light mb-0 mt-2">Scan a barcode or tap a product to add lines.</p>
        </div>
      ) : (
        <div className="table-responsive pos-cart-table-wrap flex-grow-1 min-h-0">
          <table className="table table-sm align-middle mb-0 pos-cart-table">
            <thead>
              <tr>
                <th style={{ width: 28 }}>#</th>
                <th>Item</th>
                <th className="text-end">Price</th>
                <th className="text-center">Qty</th>
                <th className="text-center">Off</th>
                <th className="text-end">Line</th>
                <th style={{ width: 28 }} />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const discountPct = getDiscountPercent(line);
                return (
                  <tr key={line.key}>
                    <td className="text-secondary-light">{index + 1}</td>
                    <td style={{ minWidth: 180, maxWidth: 320 }}>
                      <div className="d-flex align-items-center gap-6">
                        {line.imageUrl ? (
                          <img
                            src={line.imageUrl}
                            alt={line.productName}
                            className="rounded border flex-shrink-0"
                            style={{ width: 24, height: 24, objectFit: "cover" }}
                          />
                        ) : (
                          <div
                            className="rounded border d-flex align-items-center justify-content-center text-secondary-light bg-light flex-shrink-0"
                            style={{ width: 24, height: 24, fontSize: 8 }}
                          >
                            .
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="fw-semibold text-truncate small">{line.productName}</div>
                          <div className="text-secondary-light text-truncate" style={{ fontSize: "10.5px" }}>
                            {line.sku || "-"}
                          </div>
                          {line.lotPreview?.lotCode || line.lotPreview?.expiryDate ? (
                            <div className="text-secondary-light text-truncate" style={{ fontSize: "10px" }}>
                              {line.lotPreview?.lotCode ? line.lotPreview.lotCode : ""}
                              {line.lotPreview?.expiryDate ? ` | ${line.lotPreview.expiryDate}` : ""}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="text-end text-nowrap">Tk {Number(line.price || 0).toFixed(2)}</td>
                    <td className="text-center text-nowrap">
                      <div className="d-inline-flex align-items-center border rounded-pill overflow-hidden bg-white pos-qty-pill">
                        <button
                          type="button"
                          className="btn btn-sm btn-light border-0 rounded-0 px-5 py-1"
                          disabled={!canSell || busy || Number(line.quantity || 0) <= 1}
                          onClick={() => onDecrementLine(line)}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          className="form-control form-control-sm border-0 rounded-0 text-center px-2"
                          style={{ width: 34 }}
                          key={`line-qty-${line.lineId}-${line.quantity}`}
                          defaultValue={line.quantity}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                          }}
                          onBlur={(e) => onPersistLineQty(line.lineId, e.target.value)}
                          disabled={!canSell || busy}
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-light border-0 rounded-0 px-5 py-1"
                          disabled={!canSell || busy}
                          onClick={() => onIncrementLine(line)}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="text-center" style={{ minWidth: 72 }}>
                      <select
                        className="form-select form-select-sm py-1"
                        style={{ fontSize: "11px" }}
                        value={discountPct}
                        disabled={!canSell || !canDiscountOverride || busy}
                        onChange={(e) => onApplyLineDiscount?.(line, e.target.value)}
                      >
                        {[0, 5, 10, 15, 20, 25, 30, 40, 50].map((pct) => (
                          <option key={pct} value={pct}>
                            {pct}%
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="text-end fw-semibold text-nowrap">Tk {Number(line.lineTotal || 0).toFixed(2)}</td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-secondary p-0"
                        disabled={!canSell || busy}
                        onClick={() => onRemoveLine(line.lineId)}
                        title="Remove"
                      >
                        <i className="ri-delete-bin-line" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
