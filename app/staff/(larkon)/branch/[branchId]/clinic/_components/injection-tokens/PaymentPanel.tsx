"use client";

type PaymentPanelProps = {
  markPaid: boolean;
  onMarkPaidChange: (v: boolean) => void;
  paymentMethod: string;
  onPaymentMethodChange: (v: string) => void;
  /** When total &gt; 0, paid is required for token generation */
  paymentRequired: boolean;
};

export function PaymentPanel({
  markPaid,
  onMarkPaidChange,
  paymentMethod,
  onPaymentMethodChange,
  paymentRequired,
}: PaymentPanelProps) {
  return (
    <div className="card radius-12 border mt-3">
      <div className="card-body py-3">
        <h6 className="small fw-semibold text-muted mb-2">Payment</h6>
        {paymentRequired ? (
          <p className="small text-warning mb-2 mb-md-3">
            Order total is greater than zero — payment must be marked completed before the token can be issued.
          </p>
        ) : (
          <p className="small text-muted mb-2 mb-md-3">No charge in this checkout — a zero-total paid order will still be created when required.</p>
        )}
        <div className="mb-2">
          <label className="form-label small mb-1">Mark paid</label>
          <select
            className="form-select form-select-sm radius-8"
            value={markPaid ? "yes" : "no"}
            onChange={(e) => onMarkPaidChange(e.target.value === "yes")}
          >
            <option value="yes">Yes (completed)</option>
            <option value="no">No (unpaid — blocks if total &gt; 0)</option>
          </select>
        </div>
        <div>
          <label className="form-label small mb-1">Payment method</label>
          <input
            className="form-control form-control-sm radius-8"
            value={paymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value)}
            placeholder="CASH"
          />
        </div>
      </div>
    </div>
  );
}
