"use client";

import { useMemo, useState } from "react";
import { validateCentralBand } from "../_lib/centralPricingValidation";

type CsvRow = {
  line: number;
  variantId: number;
  basePrice: number | null;
  markupPercent: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  mrp: number | null;
  errors: string[];
};

function parseNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : NaN;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const out: CsvRow[] = [];
  const start = lines[0].toLowerCase().includes("variant") ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const line = i + 1;
    const parts = lines[i].split(",").map((c) => c.trim());
    const variantId = parseInt(parts[0] || "", 10);
    const errors: string[] = [];
    if (!Number.isFinite(variantId)) errors.push("Invalid variantId");
    const basePrice = parts[1] != null ? parseNum(parts[1]) : null;
    const markupPercent = parts[2] != null ? parseNum(parts[2]) : null;
    const minPrice = parts[3] != null ? parseNum(parts[3]) : null;
    const maxPrice = parts[4] != null ? parseNum(parts[4]) : null;
    const mrp = parts[5] != null ? parseNum(parts[5]) : null;
    [basePrice, markupPercent, minPrice, maxPrice, mrp].forEach((v, idx) => {
      const labels = ["basePrice", "markupPercent", "minPrice", "maxPrice", "mrp"];
      if (v !== null && Number.isNaN(v)) errors.push(`Invalid number: ${labels[idx]}`);
    });
    const band = validateCentralBand({ basePrice, markupPercent, minPrice, maxPrice, mrp });
    for (const b of band) errors.push(b.message);
    out.push({ line, variantId, basePrice, markupPercent, minPrice, maxPrice, mrp, errors });
  }
  return out;
}

type Props = {
  show: boolean;
  onClose: () => void;
  orgId: number | null;
  canImport: boolean;
  onCommitted: () => void;
  ownerPost: (path: string, body: unknown) => Promise<unknown>;
};

export function PriceMasterCsvModal({ show, onClose, orgId, canImport, onCommitted, ownerPost }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const parsed = useMemo(() => parseCsv(text), [text]);
  const validRows = useMemo(() => parsed.filter((r) => r.errors.length === 0), [parsed]);
  const invalidRows = useMemo(() => parsed.filter((r) => r.errors.length > 0), [parsed]);

  if (!show) return null;

  async function commit() {
    if (!orgId || !canImport || !validRows.length) return;
    setBusy(true);
    setMsg(null);
    try {
      await ownerPost("/api/v1/pricing/org/bulk", {
        orgId,
        rows: validRows.map((r) => ({
          variantId: r.variantId,
          basePrice: r.basePrice,
          markupPercent: r.markupPercent,
          minPrice: r.minPrice,
          maxPrice: r.maxPrice,
          mrp: r.mrp,
        })),
      });
      setMsg(`Imported ${validRows.length} row(s) successfully.`);
      setText("");
      onCommitted();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const header = "variantId,basePrice,markupPercent,minPrice,maxPrice,mrp\n";
    const example = "123,199.00,12.5,150.00,249.00,249.00\n";
    const blob = new Blob([header + example], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "price-master-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="modal d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content radius-12">
          <div className="modal-header">
            <h5 className="modal-title">Bulk import (CSV)</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <p className="small text-muted">
              Columns: <code>variantId</code>, <code>basePrice</code>, <code>markupPercent</code>, <code>minPrice</code>,{" "}
              <code>maxPrice</code>, <code>mrp</code>. Header row optional. Rows are validated against the same central band
              rules as single edits (floor ≤ base ≤ effective cap).
            </p>
            <div className="d-flex gap-2 mb-2">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={downloadTemplate}>
                Download template
              </button>
            </div>
            <textarea
              className="form-control font-monospace small"
              rows={10}
              value={text}
              disabled={!canImport}
              placeholder="Paste CSV here…"
              onChange={(e) => setText(e.target.value)}
            />
            {msg && <div className="alert alert-info small py-2 mt-2 mb-0">{msg}</div>}
            <div className="row mt-3 g-2 small">
              <div className="col-md-4">
                <div className="border rounded p-2">
                  <div className="text-muted">Ready to import</div>
                  <div className="fs-5 fw-semibold text-success">{validRows.length}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="border rounded p-2">
                  <div className="text-muted">Blocked rows</div>
                  <div className="fs-5 fw-semibold text-danger">{invalidRows.length}</div>
                </div>
              </div>
            </div>
            {invalidRows.length > 0 && (
              <div className="table-responsive mt-2" style={{ maxHeight: 180 }}>
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>Variant</th>
                      <th>Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invalidRows.slice(0, 50).map((r) => (
                      <tr key={r.line}>
                        <td>{r.line}</td>
                        <td>{r.variantId}</td>
                        <td className="text-danger small">{r.errors.join("; ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
              Close
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={!canImport || busy || !validRows.length} onClick={() => void commit()}>
              {busy ? "Importing…" : `Import ${validRows.length} valid row(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
