"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type Location = {
  id: number;
  name: string;
  type?: string;
  branch?: { id: number; name: string; orgId?: number };
};

type Vendor = { id: number; name: string };

type VariantOption = {
  id: number;
  sku: string;
  title: string;
  barcode?: string | null;
  productId: number;
  requiresLot?: boolean;
  requiresExpiry?: boolean;
  requiresMfg?: boolean;
  product?: { id: number; name: string; slug: string };
};

type Row = {
  id: string;
  variantId: number | null;
  sku: string;
  productName: string;
  quantity: string;
  unitCost: string;
  lotCode: string;
  mfgDate: string;
  expDate: string;
  requiresLot?: boolean;
  requiresExpiry?: boolean;
  requiresMfg?: boolean;
  error?: string;
};

const emptyRow = (): Row => ({
  id: Math.random().toString(36).slice(2),
  variantId: null,
  sku: "",
  productName: "",
  quantity: "",
  unitCost: "",
  lotCode: "",
  mfgDate: "",
  expDate: "",
});

export default function OwnerInventoryReceiptsBulkPage() {
  const toast = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<string>("");
  const [vendorId, setVendorId] = useState<string>("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorOptions, setVendorOptions] = useState<Vendor[]>([]);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [variantSearch, setVariantSearch] = useState("");
  const [variantSearchRowId, setVariantSearchRowId] = useState<string | null>(null);
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<{ grnId: number; lineCount: number; totalQty: number } | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vendorSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadLocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ownerGet<{ data: Location[] }>("/api/v1/inventory/locations");
      setLocations(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      toast.error(getMessageFromApiError(e as Error));
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const selectedLocation = locations.find((l) => String(l.id) === locationId);
  const orgId = selectedLocation?.branch?.orgId;

  useEffect(() => {
    if (!variantSearchRowId || variantSearch.length < 2) {
      setVariantOptions([]);
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await ownerGet<{ data: VariantOption[] }>(
          `/api/v1/inventory/variants/search?q=${encodeURIComponent(variantSearch)}&limit=25`
        );
        setVariantOptions(Array.isArray(res?.data) ? res.data : []);
      } catch {
        setVariantOptions([]);
      }
    }, 200);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [variantSearch, variantSearchRowId]);

  useEffect(() => {
    if (!orgId || vendorSearch.length < 2) {
      setVendorOptions([]);
      return;
    }
    if (vendorSearchTimeoutRef.current) clearTimeout(vendorSearchTimeoutRef.current);
    vendorSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await ownerGet<{ data: Vendor[] }>(
          `/api/v1/vendors/lookup?orgId=${orgId}&q=${encodeURIComponent(vendorSearch)}&limit=15`
        );
        setVendorOptions(Array.isArray(res?.data) ? res.data : []);
      } catch {
        setVendorOptions([]);
      }
    }, 200);
    return () => {
      if (vendorSearchTimeoutRef.current) clearTimeout(vendorSearchTimeoutRef.current);
    };
  }, [orgId, vendorSearch]);

  const selectVariant = (rowId: string, v: VariantOption) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              variantId: v.id,
              sku: v.sku,
              productName: v.product?.name ?? v.title,
              requiresLot: v.requiresLot,
              requiresExpiry: v.requiresExpiry,
              requiresMfg: v.requiresMfg,
              error: undefined,
            }
          : r
      )
    );
    setVariantSearchRowId(null);
    setVariantSearch("");
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const duplicateRow = (rowId: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    setRows((prev) => [...prev, { ...row, id: Math.random().toString(36).slice(2) }]);
  };
  const removeRow = (rowId: string) => {
    setRows((prev) => (prev.length <= 1 ? [emptyRow()] : prev.filter((r) => r.id !== rowId)));
  };

  const handlePaste = (e: React.ClipboardEvent, startRowId: string) => {
    const text = e.clipboardData.getData("text");
    const lines = text.split(/\r?\n/).filter((s) => s.trim());
    if (lines.length <= 1) return;
    e.preventDefault();
    const sep = text.includes("\t") ? "\t" : ",";
    const newRows: Row[] = [];
    const rowIndex = rows.findIndex((r) => r.id === startRowId);
    lines.forEach((line, i) => {
      const parts = line.split(sep).map((s) => s.trim());
      const [variantIdOrSku, qty, cost, lot, mfg, exp] = parts;
      if (i === 0 && /^variantId|sku|quantity/i.test(parts[0])) return;
      const row: Row = {
        id: Math.random().toString(36).slice(2),
        variantId: /^\d+$/.test(String(variantIdOrSku || "")) ? parseInt(String(variantIdOrSku), 10) : null,
        sku: String(variantIdOrSku || ""),
        productName: "",
        quantity: String(qty ?? ""),
        unitCost: String(cost ?? ""),
        lotCode: String(lot ?? ""),
        mfgDate: String(mfg ?? ""),
        expDate: String(exp ?? ""),
      };
      newRows.push(row);
    });
    if (newRows.length === 0) return;
    setRows((prev) => {
      const before = prev.slice(0, rowIndex);
      const after = prev.slice(rowIndex + 1);
      return [...before, ...newRows, ...after];
    });
    toast.success(`Pasted ${newRows.length} row(s)`);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowId: string) => {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e as any);
      return;
    }
    if (e.altKey && e.key === "n") {
      e.preventDefault();
      addRow();
      return;
    }
    if (e.ctrlKey && e.key === "d") {
      e.preventDefault();
      duplicateRow(rowId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId) {
      toast.warning("Select a location.");
      return;
    }
    const locId = parseInt(locationId, 10);
    const lines = rows
      .map((r) => ({
        variantId: r.variantId,
        quantity: parseInt(r.quantity, 10),
        unitCost: r.unitCost ? parseFloat(r.unitCost) : undefined,
        lotCode: r.lotCode.trim() || undefined,
        mfgDate: r.mfgDate || undefined,
        expDate: r.expDate || undefined,
      }))
      .filter((l) => l.variantId != null && Number.isInteger(l.quantity) && l.quantity > 0);
    if (lines.length === 0) {
      toast.warning("Add at least one line with variant and quantity.");
      return;
    }
    setSubmitting(true);
    setLastReceipt(null);
    try {
      const res = await ownerPost<{
        success: boolean;
        data: { id: number; lines?: { length: number } };
        errors?: { rowIndex: number; message: string }[];
      }>("/api/v1/inventory/receipts/bulk", {
        locationId: locId,
        vendorId: vendorId || undefined,
        invoiceNo: invoiceNo.trim() || undefined,
        invoiceDate: invoiceDate || undefined,
        notes: notes.trim() || undefined,
        lines,
      });
      const grn = res?.data;
      const lineCount = Array.isArray(grn?.lines) ? grn.lines.length : lines.length;
      const totalQty = lines.reduce((s, l) => s + (l.quantity || 0), 0);
      setLastReceipt(grn?.id != null ? { grnId: grn.id, lineCount, totalQty } : null);
      toast.success(`Bulk receipt saved. GRN #${grn?.id ?? "—"}, ${lineCount} line(s), ${totalQty} units.`);
      setRows([emptyRow()]);
      setInvoiceNo("");
      setInvoiceDate("");
      setNotes("");
    } catch (err: any) {
      const j = (err as any)?.response;
      if (j?.errors?.length) {
        toast.error(`Validation: ${j.errors.map((e: any) => `Row ${e.rowIndex + 1}: ${e.message}`).join("; ")}`);
      } else {
        toast.error(getMessageFromApiError(err as Error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const hasNoLocations = !loading && locations.length === 0;

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Bulk receive"
        subtitle="Multi-line purchase receive. Location required; vendor optional. Use product search, paste from spreadsheet, or CSV import."
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Receipts", href: "/owner/inventory/receipts" },
          { label: "Bulk", href: "/owner/inventory/receipts/bulk" },
        ]}
      />

      {hasNoLocations && (
        <div className="alert alert-info radius-12 mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <span>No locations found. Create locations first so you can receive stock.</span>
          <Link href="/owner/inventory/locations" className="btn btn-primary btn-sm">
            Inventory → Locations
          </Link>
        </div>
      )}

      {lastReceipt && (
        <div className="alert alert-success radius-12 mb-3">
          Last receipt: GRN #{lastReceipt.grnId} — {lastReceipt.lineCount} line(s), {lastReceipt.totalQty} units.
        </div>
      )}

      <div className="card radius-12 mb-3">
        <div className="card-body p-24">
          <form onSubmit={handleSubmit}>
            <div className="row g-3 mb-3">
              <div className="col-12 col-md-3">
                <label className="form-label small">Location *</label>
                <select
                  className="form-select form-select-sm"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  required
                  disabled={hasNoLocations}
                >
                  <option value="">Select location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.branch ? `(${loc.branch.name})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small">Vendor (optional)</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search vendor"
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  onFocus={() => orgId && setVendorSearch("")}
                />
                {vendorOptions.length > 0 && (
                  <ul className="list-group list-group-flush position-absolute mt-1 shadow-sm" style={{ zIndex: 10, maxHeight: 200, overflow: "auto" }}>
                    {vendorOptions.map((v) => (
                      <li
                        key={v.id}
                        className="list-group-item list-group-item-action py-1 small"
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          setVendorId(String(v.id));
                          setVendorSearch(v.name);
                          setVendorOptions([]);
                        }}
                      >
                        {v.name}
                      </li>
                    ))}
                  </ul>
                )}
                {vendorId && (
                  <button type="button" className="btn btn-link btn-sm p-0 mt-1" onClick={() => { setVendorId(""); setVendorSearch(""); }}>
                    Clear
                  </button>
                )}
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label small">Invoice No</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label small">Invoice Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label small">Notes</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small text-muted">Lines (paste tab/comma delimited data; Alt+N add row, Ctrl+D duplicate, Ctrl+Enter submit)</span>
              <div>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm me-1"
                  onClick={async () => {
                    try {
                      const base = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000");
                      const res = await fetch(`${base}/api/v1/inventory/receipts/bulk-template`, { credentials: "include" });
                      const blob = await res.blob();
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = "bulk-receive-template.csv";
                      a.click();
                      URL.revokeObjectURL(a.href);
                    } catch (e) {
                      toast.error(getMessageFromApiError(e as Error));
                    }
                  }}
                >
                  Download CSV template
                </button>
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={addRow}>
                  + Add row
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-sm table-bordered">
                <thead>
                  <tr>
                    <th>Product / Variant</th>
                    <th style={{ width: 90 }}>Qty *</th>
                    <th style={{ width: 90 }}>Unit cost</th>
                    <th>Lot code</th>
                    <th>Mfg date</th>
                    <th>Expiry date</th>
                    <th style={{ width: 90 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className={row.error ? "table-danger" : ""} onKeyDown={(e) => handleKeyDown(e, row.id)}>
                      <td onPaste={(e) => handlePaste(e, row.id)}>
                        {variantSearchRowId === row.id ? (
                          <div className="position-relative">
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Search SKU, name, barcode..."
                              value={variantSearch}
                              onChange={(e) => setVariantSearch(e.target.value)}
                              onBlur={() => setTimeout(() => setVariantSearchRowId(null), 150)}
                              autoFocus
                            />
                            {variantOptions.length > 0 && (
                              <ul className="list-group position-absolute mt-0 shadow" style={{ zIndex: 20, maxHeight: 220, overflow: "auto" }}>
                                {variantOptions.map((v) => (
                                  <li
                                    key={v.id}
                                    className="list-group-item list-group-item-action py-1 small"
                                    style={{ cursor: "pointer" }}
                                    onMouseDown={() => selectVariant(row.id, v)}
                                  >
                                    {v.product?.name} — {v.sku} {v.title}
                                    {(v.requiresLot || v.requiresExpiry) && (
                                      <span className="badge bg-secondary ms-1">Lot/Exp</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm text-start w-100"
                            onClick={() => setVariantSearchRowId(row.id)}
                          >
                            {row.sku || row.productName ? `${row.productName || ""} ${row.sku}`.trim() || "Select variant" : "Select variant (Ctrl+K)"}
                          </button>
                        )}
                        {row.error && <div className="small text-danger mt-0">{row.error}</div>}
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          min={1}
                          value={row.quantity}
                          onChange={(e) => setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, quantity: e.target.value } : r)))}
                          placeholder="0"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control form-control-sm"
                          value={row.unitCost}
                          onChange={(e) => setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, unitCost: e.target.value } : r)))}
                          placeholder="0"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={row.lotCode}
                          onChange={(e) => setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, lotCode: e.target.value } : r)))}
                          placeholder={row.requiresLot ? "Required" : "Optional"}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={row.mfgDate}
                          onChange={(e) => setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, mfgDate: e.target.value } : r)))}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={row.expDate}
                          onChange={(e) => setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, expDate: e.target.value } : r)))}
                        />
                      </td>
                      <td>
                        <button type="button" className="btn btn-outline-secondary btn-sm me-0" title="Duplicate row (Ctrl+D)" onClick={() => duplicateRow(row.id)}>
                          Copy
                        </button>
                        <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeRow(row.id)}>
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3">
              <button type="submit" className="btn btn-primary" disabled={submitting || hasNoLocations}>
                {submitting ? "Submitting…" : "Submit bulk receive (Ctrl+Enter)"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="d-flex gap-2">
        <Link href="/owner/inventory/receipts" className="btn btn-outline-secondary btn-sm">
          ← Single receipt
        </Link>
        <Link href="/owner/inventory/locations" className="btn btn-outline-secondary btn-sm">
          Locations
        </Link>
      </div>
    </div>
  );
}
