"use client";

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

type SummaryPanelProps = {
  medicineTotal: number;
  injectionFee: number;
  consumables: number;
  grandTotal: number;
};

export function SummaryPanel({ medicineTotal, injectionFee, consumables, grandTotal }: SummaryPanelProps) {
  return (
    <div className="card radius-12 border shadow-sm">
      <div className="card-body py-3">
        <h6 className="small fw-semibold text-muted mb-3">Summary</h6>
        <div className="d-flex justify-content-between small mb-2">
          <span className="text-muted">Medicine total</span>
          <span className="font-monospace">{fmt(medicineTotal)}</span>
        </div>
        <div className="d-flex justify-content-between small mb-2">
          <span className="text-muted">Injection / admin fee</span>
          <span className="font-monospace">{fmt(injectionFee)}</span>
        </div>
        <div className="d-flex justify-content-between small mb-2">
          <span className="text-muted">Consumables</span>
          <span className="font-monospace">{fmt(consumables)}</span>
        </div>
        <hr className="my-2" />
        <div className="d-flex justify-content-between fw-semibold">
          <span>Grand total</span>
          <span className="font-monospace text-primary">{fmt(grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
