"use client";

import type { PricePreview } from "@/src/types/appointment";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "BDT", minimumFractionDigits: 0 }).format(
    amount
  );
}

export interface PriceSummaryCardProps {
  preview: PricePreview | null | undefined;
  loading?: boolean;
  error?: string | null;
}

export default function PriceSummaryCard({ preview, loading, error }: PriceSummaryCardProps) {
  if (loading) return <div className="card"><div className="card-body text-muted">Loading price…</div></div>;
  if (error) return <div className="alert alert-warning">{error}</div>;
  if (!preview || (preview.totalPrice === 0 && !preview.breakdown?.length)) {
    return <div className="card"><div className="card-body text-muted">Select a service or package to see price.</div></div>;
  }

  return (
    <div className="card">
      <div className="card-header small fw-semibold">Price summary</div>
      <div className="card-body">
        {preview.breakdown?.length > 0 && (
          <ul className="list-unstyled small mb-2">
            {preview.breakdown.map((item, i) => (
              <li key={i} className="d-flex justify-content-between">
                <span>{item.label}</span>
                <span>{formatCurrency(item.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        {preview.discountAmount > 0 && (
          <div className="d-flex justify-content-between small text-muted mb-1">
            <span>Discount</span>
            <span>-{formatCurrency(preview.discountAmount)}</span>
          </div>
        )}
        <hr className="my-2" />
        <div className="d-flex justify-content-between fw-semibold">
          <span>Total</span>
          <span>{formatCurrency(preview.totalPrice)}</span>
        </div>
      </div>
    </div>
  );
}
