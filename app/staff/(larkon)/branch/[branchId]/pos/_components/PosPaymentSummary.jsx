 
"use client";

export default function PosPaymentSummary({ subtotal, discountAmount, taxAmount, grandTotal, className }) {
  return (
    <div className={`pos-payment-summary border rounded-3 px-10 py-8 bg-light ${className || ""}`}>
      <div className="text-uppercase text-secondary fw-semibold mb-4" style={{ fontSize: "10px", letterSpacing: "0.04em" }}>
        Sale summary
      </div>
      <div className="d-flex align-items-center justify-content-between py-3 border-bottom border-white">
        <span className="small text-secondary">Subtotal</span>
        <span className="small fw-medium">Tk {Number(subtotal || 0).toFixed(2)}</span>
      </div>
      <div className="d-flex align-items-center justify-content-between py-3 border-bottom border-white">
        <span className="small text-secondary">Discount</span>
        <span className="small fw-medium">Tk {Number(discountAmount || 0).toFixed(2)}</span>
      </div>
      <div className="d-flex align-items-center justify-content-between py-3 border-bottom border-white">
        <span className="small text-secondary">Tax (0%)</span>
        <span className="small fw-medium">Tk {Number(taxAmount || 0).toFixed(2)}</span>
      </div>
      <div className="d-flex align-items-center justify-content-between pt-6">
        <span className="fw-semibold">Total</span>
        <span className="fw-bold text-primary" style={{ fontSize: "1.2rem", lineHeight: 1 }}>
          Tk {Number(grandTotal || 0).toFixed(2)}
        </span>
      </div>
    </div>
  );
}
