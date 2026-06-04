"use client";

import { useEffect, useState } from "react";
import { validateCentralBand, costWarnings, hasBlockingErrors } from "../_lib/centralPricingValidation";
import type { CostSignal, OrgPricingRow } from "../_lib/priceMasterTypes";

function num(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function parseN(s: string): number | null {
  if (s.trim() === "") return null;
  const x = parseFloat(s);
  return Number.isFinite(x) ? x : null;
}

function RowBadges({
  baseNum,
  markup,
  min,
  max,
  mrp,
  updatedAt,
  refCost,
}: {
  baseNum: number | null;
  markup: number | null;
  min: number | null;
  max: number | null;
  mrp: number | null;
  updatedAt?: string;
  refCost: number | null | undefined;
}) {
  const chips: { key: string; className: string; label: string }[] = [];
  if (baseNum == null || Number.isNaN(baseNum)) {
    chips.push({ key: "missing", className: "bg-secondary", label: "Missing base" });
  }
  const band = validateCentralBand({
    basePrice: baseNum,
    markupPercent: markup,
    minPrice: min,
    maxPrice: max,
    mrp,
  });
  if (hasBlockingErrors(band)) {
    chips.push({ key: "band", className: "bg-light text-danger border", label: "Invalid band" });
  }
  const cw = costWarnings(baseNum, refCost ?? null);
  if (cw.some((c) => c.level === "error")) chips.push({ key: "below", className: "bg-danger text-white", label: "Below cost" });
  else if (cw.some((c) => c.level === "warn")) chips.push({ key: "near", className: "bg-warning text-dark", label: "Tight margin" });

  if (updatedAt) {
    const t = new Date(updatedAt).getTime();
    if (Date.now() - t < 7 * 86400000) {
      chips.push({ key: "recent", className: "bg-light text-primary border", label: "Recent" });
    }
  }
  if (!chips.length) return null;
  return (
    <div className="d-flex flex-wrap gap-1 mt-1">
      {chips.map((c) => (
        <span key={c.key} className={`badge rounded-pill ${c.className}`}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

function InlineRow({
  row,
  disabled,
  selected,
  onToggleSelect,
  onSave,
  onOpen,
  serial,
  refCost,
}: {
  row: OrgPricingRow;
  disabled: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onSave: (draft: Record<string, string>) => void;
  onOpen: () => void;
  serial: number;
  refCost?: number | null;
}) {
  const [base, setBase] = useState(num(row.basePrice));
  const [markup, setMarkup] = useState(num(row.markupPercent));
  const [min, setMin] = useState(num(row.minPrice));
  const [max, setMax] = useState(num(row.maxPrice));
  const [mrp, setMrp] = useState(num(row.mrp));
  useEffect(() => {
    setBase(num(row.basePrice));
    setMarkup(num(row.markupPercent));
    setMin(num(row.minPrice));
    setMax(num(row.maxPrice));
    setMrp(num(row.mrp));
  }, [row.id, row.basePrice, row.markupPercent, row.minPrice, row.maxPrice, row.mrp]);

  const issues = validateCentralBand({
    basePrice: parseN(base),
    markupPercent: parseN(markup),
    minPrice: parseN(min),
    maxPrice: parseN(max),
    mrp: parseN(mrp),
  });
  issues.push(...costWarnings(parseN(base), refCost ?? null));
  const blocked = hasBlockingErrors(issues);

  return (
    <tr className={selected ? "table-active" : undefined}>
      <td className="align-middle">
        <input type="checkbox" className="form-check-input" checked={selected} disabled={disabled} onChange={onToggleSelect} />
      </td>
      <td className="small text-muted align-middle">{serial}</td>
      <td className="align-middle">
        <div className="fw-medium small font-monospace">{row.variant?.sku}</div>
        <div className="small">{row.variant?.title}</div>
        <div className="text-muted small">{row.variant?.product?.name}</div>
        <RowBadges
          baseNum={parseN(base)}
          markup={parseN(markup)}
          min={parseN(min)}
          max={parseN(max)}
          mrp={parseN(mrp)}
          updatedAt={row.updatedAt}
          refCost={refCost}
        />
      </td>
      <td className="small align-middle">{row.variant?.product?.category?.name ?? "—"}</td>
      <td className="small align-middle">{row.variant?.unit ? `${row.variant.unit.name} (${row.variant.unit.code})` : "—"}</td>
      <td className="small align-middle text-end">{refCost != null && refCost > 0 ? refCost.toFixed(2) : "—"}</td>
      <td className="align-middle" style={{ minWidth: 88 }}>
        <input className="form-control form-control-sm" value={base} disabled={disabled} onChange={(e) => setBase(e.target.value)} />
      </td>
      <td className="align-middle" style={{ minWidth: 72 }}>
        <input className="form-control form-control-sm" value={markup} disabled={disabled} onChange={(e) => setMarkup(e.target.value)} />
      </td>
      <td className="align-middle" style={{ minWidth: 80 }}>
        <input className="form-control form-control-sm" value={min} disabled={disabled} onChange={(e) => setMin(e.target.value)} />
      </td>
      <td className="align-middle" style={{ minWidth: 80 }}>
        <input className="form-control form-control-sm" value={max} disabled={disabled} onChange={(e) => setMax(e.target.value)} />
      </td>
      <td className="align-middle" style={{ minWidth: 80 }}>
        <input className="form-control form-control-sm" value={mrp} disabled={disabled} onChange={(e) => setMrp(e.target.value)} />
      </td>
      <td className="small align-middle text-muted">
        {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "—"}
      </td>
      <td className="text-end align-middle text-nowrap">
        <button type="button" className="btn btn-link btn-sm p-0 me-2" onClick={onOpen}>
          Detail
        </button>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={disabled || blocked}
          title={blocked ? issues.map((i) => i.message).join(" ") : undefined}
          onClick={() => onSave({ base, markup, min, max, mrp })}
        >
          Save
        </button>
      </td>
    </tr>
  );
}

type Props = {
  rows: OrgPricingRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  loading: boolean;
  canWrite: boolean;
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onSelectAllPage: (checked: boolean) => void;
  onPage: (p: number) => void;
  onSaveRow: (row: OrgPricingRow, draft: Record<string, string>) => void;
  onOpenDetail: (row: OrgPricingRow) => void;
  savingId: number | null;
  costByVariant: Record<number, CostSignal | undefined>;
};

export function PriceMasterCatalogSection({
  rows,
  page,
  limit,
  total,
  totalPages,
  loading,
  canWrite,
  selectedIds,
  onToggle,
  onSelectAllPage,
  onPage,
  onSaveRow,
  onOpenDetail,
  savingId,
  costByVariant,
}: Props) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const serial0 = (page - 1) * limit;

  if (loading) {
    return (
      <div className="card radius-12">
        <div className="card-body">
          <div className="placeholder-glow">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="placeholder col-12 rounded mb-2" style={{ height: 36 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card radius-12">
      <div className="table-responsive">
        <table className="table table-hover table-sm align-middle mb-0">
          <thead className="bg-light">
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={allSelected}
                  disabled={!canWrite || !rows.length}
                  onChange={(e) => onSelectAllPage(e.target.checked)}
                />
              </th>
              <th>#</th>
              <th>Product / variant</th>
              <th>Category</th>
              <th>Unit</th>
              <th className="text-end">Ref. cost</th>
              <th>Base</th>
              <th>Markup %</th>
              <th>Min</th>
              <th>Max</th>
              <th>MRP</th>
              <th>Updated</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={13} className="p-4 text-center text-muted">
                  <div className="fw-medium mb-1">No catalog pricing rows match the current filters.</div>
                  <div className="small">Try clearing filters, searching by SKU, or importing prices from CSV.</div>
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <InlineRow
                  key={r.id}
                  row={r}
                  serial={serial0 + idx + 1}
                  selected={selectedIds.has(r.id)}
                  disabled={!canWrite || savingId === r.id}
                  refCost={costByVariant[r.variantId]?.latestUnitCost ?? null}
                  onToggleSelect={() => onToggle(r.id)}
                  onSave={(d) => onSaveRow(r, d)}
                  onOpen={() => onOpenDetail(r)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="card-footer d-flex flex-wrap justify-content-between align-items-center gap-2 small">
        <span className="text-muted">
          Page {page} of {totalPages} · {total} total rows
        </span>
        <div className="btn-group">
          <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            Previous
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
