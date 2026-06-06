 
"use client";

import Card from "@/src/bpa/components/ui/Card";

export default function PosCheckoutPanel({
  canSell,
  busy,
  saleLoading,
  paymentMethods,
  paymentMethod,
  onPaymentMethodChange,
  receivedAmount,
  onReceivedAmountChange,
  changeAmount,
  grandTotal,
  onSubmit,
  onHoldCart,
  holdDisabled,
  cardClassName,
  showHoldButton = true,
}) {
  const methods = Array.isArray(paymentMethods) ? paymentMethods : [];

  return (
    <Card title="Payment" className={cardClassName || ""}>
      <form onSubmit={onSubmit}>
        <div className="mb-7">
          <label className="form-label small text-secondary text-uppercase fw-semibold mb-4" style={{ fontSize: "10px" }}>
            Method
          </label>
          <div className="d-grid gap-5 pos-payment-method-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            {methods.map((method) => (
              <button
                key={method.value}
                type="button"
                className={`btn btn-sm fw-semibold rounded-3 ${
                  paymentMethod === method.value ? "btn-primary shadow-sm" : "btn-light border text-secondary"
                }`}
                onClick={() => onPaymentMethodChange?.(method.value)}
                disabled={busy || saleLoading}
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-7">
          <label className="form-label small text-secondary text-uppercase fw-semibold mb-4" style={{ fontSize: "10px" }}>
            Received
          </label>
          <div className="input-group input-group-sm">
            <span className="input-group-text text-secondary small">Tk</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control fw-medium"
              placeholder="0.00"
              value={receivedAmount}
              onChange={(e) => onReceivedAmountChange?.(e.target.value)}
              disabled={busy || saleLoading}
            />
          </div>
        </div>

        <div className="d-flex align-items-center justify-content-between border rounded-3 px-10 py-6 mb-8 bg-success bg-opacity-10 border-success border-opacity-25">
          <span className="small text-secondary fw-medium">Change</span>
          <span className="fw-bold text-success" style={{ fontSize: "1.05rem" }}>
            Tk {Number(changeAmount || 0).toFixed(2)}
          </span>
        </div>

        <button
          type="submit"
          className="btn btn-success w-100 fw-bold py-8 rounded-3 shadow-sm"
          style={{ fontSize: "0.92rem" }}
          disabled={!canSell || busy || saleLoading || grandTotal <= 0}
        >
          {saleLoading ? "Processing..." : `Complete Payment - Tk ${Number(grandTotal || 0).toFixed(2)}`}
        </button>

        {showHoldButton ? (
          <button
            type="button"
            className="btn btn-light w-100 mt-8 btn-sm"
            disabled={holdDisabled || busy || saleLoading}
            onClick={onHoldCart}
          >
            Hold cart
          </button>
        ) : null}
      </form>
    </Card>
  );
}
