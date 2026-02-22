"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Offcanvas } from "react-bootstrap";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";
import type { Location, SelectedRow, VariantOption } from "./types";
import { emptyRow } from "./types";
import { ProductBrowserPanel } from "./ProductBrowserPanel";
import { SelectedReceiveGrid } from "./SelectedReceiveGrid";
import { SpreadsheetGrid } from "./SpreadsheetGrid";

type Vendor = { id: number; name: string };

export default function BulkReceivePage() {
  const toast = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<string>("");
  const [vendorId, setVendorId] = useState<string>("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorOptions, setVendorOptions] = useState<Vendor[]>([]);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<SelectedRow[]>([emptyRow()]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<{ grnId: number; lineCount: number; totalQty: number } | null>(null);
  const [mode, setMode] = useState<"visual" | "spreadsheet">("visual");
  const [showBrowserDrawer, setShowBrowserDrawer] = useState(false);
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [flashRowId, setFlashRowId] = useState<string | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vendorSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLocationIdRef = useRef<string>("");

  const selectedLocation = locations.find((l) => String(l.id) === locationId);
  const orgId = selectedLocation?.branch?.orgId;

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

  const selectedVariantIds = new Set(rows.filter((r) => r.variantId != null).map((r) => r.variantId as number));

  /** Dedupe: if same variant already in grid, focus that row and flash highlight instead of adding duplicate */
  const addVariant = useCallback(
    (v: VariantOption) => {
      setRows((prev) => {
        const existing = prev.find((r) => r.variantId === v.id);
        if (existing) {
          setFocusedRowId(existing.id);
          setFlashRowId(existing.id);
          if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
          flashTimeoutRef.current = setTimeout(() => {
            setFlashRowId(null);
            flashTimeoutRef.current = null;
          }, 1200);
          toast.info("Variant already in grid. Row highlighted.");
          return prev;
        }
        const validRows = prev.filter((r) => r.variantId != null || r.sku || r.quantity);
        const newRow: SelectedRow = {
          id: Math.random().toString(36).slice(2),
          variantId: v.id,
          sku: v.sku,
          productName: v.product?.name ?? v.title ?? "",
          quantity: "1",
          unitCost: "",
          lotCode: "",
          mfgDate: "",
          expDate: "",
          requiresLot: v.requiresLot,
          requiresExpiry: v.requiresExpiry,
          requiresMfg: v.requiresMfg,
        };
        return prev.length === 1 && !prev[0].variantId ? [newRow] : [...validRows, newRow];
      });
    },
    [toast]
  );

  const removeVariantFromGrid = useCallback((variantId: number) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.variantId !== variantId);
      return next.length === 0 ? [emptyRow()] : next;
    });
  }, []);

  const duplicateRow = useCallback((rowId: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    setRows((prev) => [...prev, { ...row, id: Math.random().toString(36).slice(2) }]);
  }, [rows]);

  const removeRow = useCallback((rowId: string) => {
    setRows((prev) => (prev.length <= 1 ? [emptyRow()] : prev.filter((r) => r.id !== rowId)));
  }, []);

  /** Location reset: if lines exist, confirm before clearing */
  const handleLocationChange = (newLocId: string) => {
    const hasLines = rows.some((r) => r.variantId != null || r.quantity || r.sku);
    if (hasLines && prevLocationIdRef.current && prevLocationIdRef.current !== newLocId) {
      if (window.confirm("Changing location will reset selected lines. Continue?")) {
        setLocationId(newLocId);
        setRows([emptyRow()]);
        prevLocationIdRef.current = newLocId;
      }
    } else {
      setLocationId(newLocId);
      prevLocationIdRef.current = newLocId;
    }
  };

  useEffect(() => {
    prevLocationIdRef.current = locationId;
  }, [locationId]);

  const handlePaste = (e: React.ClipboardEvent, startRowId: string) => {
    const text = e.clipboardData.getData("text");
    const lines = text.split(/\r?\n/).filter((s) => s.trim());
    if (lines.length <= 1) return;
    e.preventDefault();
    const sep = text.includes("\t") ? "\t" : ",";
    const newRows: SelectedRow[] = [];
    const rowIndex = rows.findIndex((r) => r.id === startRowId);
    lines.forEach((line, i) => {
      const parts = line.split(sep).map((s) => s.trim());
      const [variantIdOrSku, qty, cost, lot, mfg, exp] = parts;
      if (i === 0 && /^variantId|sku|quantity/i.test(parts[0])) return;
      const row: SelectedRow = {
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

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const handleSubmit = async () => {
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
        data: { id: number; lines?: unknown[] };
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
    } catch (err: unknown) {
      const j = (err as { response?: { errors?: { rowIndex: number; message: string }[] } })?.response;
      if (j?.errors?.length) {
        toast.error(`Validation: ${j.errors.map((e) => `Row ${e.rowIndex + 1}: ${e.message}`).join("; ")}`);
      } else {
        toast.error(getMessageFromApiError(err as Error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const validRows = rows.filter((r) => r.variantId != null);
  const totalQty = validRows.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0);
  const estimatedCost = validRows.reduce(
    (s, r) => s + (parseFloat(r.quantity) || 0) * (parseFloat(r.unitCost) || 0),
    0
  );

  const hasNoLocations = !loading && locations.length === 0;

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Bulk receive"
        subtitle="Product browser + multi-select. Location required; vendor optional."
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
          {/* Mode toggle */}
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div className="btn-group" role="group">
              <button
                type="button"
                className={`btn btn-sm ${mode === "visual" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setMode("visual")}
              >
                Visual Select
              </button>
              <button
                type="button"
                className={`btn btn-sm ${mode === "spreadsheet" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setMode("spreadsheet")}
              >
                Spreadsheet
              </button>
            </div>
            <div className="d-flex gap-1">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
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
              {mode === "spreadsheet" && (
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={addRow}>
                  + Add row
                </button>
              )}
            </div>
          </div>

          {/* Sticky header section */}
          <div
            className="row g-3 mb-3 position-sticky top-0 bg-white z-1 py-2 border-bottom"
            style={{ zIndex: 2 }}
          >
            <div className="col-12 col-md-3">
              <label className="form-label small">Location *</label>
              <select
                className="form-select form-select-sm"
                value={locationId}
                onChange={(e) => handleLocationChange(e.target.value)}
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
                <ul
                  className="list-group list-group-flush position-absolute mt-1 shadow-sm"
                  style={{ zIndex: 10, maxHeight: 200, overflow: "auto" }}
                >
                  {vendorOptions.map((v) => (
                    <li
                      key={v.id}
                      className="list-group-item list-group-item-action py-1 small"
                      style={{ cursor: "pointer" }}
                      onMouseDown={() => {
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
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 mt-1"
                  onClick={() => {
                    setVendorId("");
                    setVendorSearch("");
                  }}
                >
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

          {mode === "visual" ? (
            /* Split view: Product Browser (left) + Selected Grid (right) */
            <div className="row g-3">
              {/* Product Browser — desktop: col-lg-4; mobile: drawer */}
              <div className="col-12 col-lg-4 d-none d-lg-block">
                <div className="border rounded p-3 bg-light">
                  <h6 className="mb-2 small fw-bold">Product Browser</h6>
                  <ProductBrowserPanel
                    selectedVariantIds={selectedVariantIds}
                    onAddVariant={addVariant}
                    onRemoveVariant={removeVariantFromGrid}
                    disabled={hasNoLocations}
                  />
                </div>
              </div>
              <div className="d-lg-none mb-2">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => setShowBrowserDrawer(true)}
                >
                  Open Product Browser
                </button>
              </div>
              <div className="col-12 col-lg-8">
                <h6 className="mb-2 small fw-bold">Selected Items</h6>
                <SelectedReceiveGrid
                  rows={rows}
                  onRowsChange={setRows}
                  onFocusRow={setFocusedRowId}
                  focusedRowId={focusedRowId}
                  flashRowId={flashRowId}
                  disabled={hasNoLocations}
                  onDuplicateRow={duplicateRow}
                  onRemoveRow={removeRow}
                  onSubmit={handleSubmit}
                />
              </div>
            </div>
          ) : (
            /* Spreadsheet mode: paste/import UI (original grid with per-row variant search) */
            <div>
              <p className="small text-muted mb-2">
                Paste tab/comma delimited data; Ctrl+D duplicate, Ctrl+Enter submit
              </p>
              <SpreadsheetGrid
                rows={rows}
                onRowsChange={setRows}
                disabled={hasNoLocations}
                onDuplicateRow={duplicateRow}
                onRemoveRow={removeRow}
                onPaste={handlePaste}
                onSubmit={handleSubmit}
              />
            </div>
          )}

          {/* Sticky summary bar */}
          <div
            className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top position-sticky bottom-0 bg-white"
            style={{ zIndex: 2 }}
          >
            <div className="small text-muted">
              <span className="me-3">Items: {validRows.length}</span>
              <span className="me-3">Total qty: {totalQty}</span>
              <span>Est. cost: {estimatedCost.toFixed(2)}</span>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting || hasNoLocations}
            >
              {submitting ? "Submitting…" : "Submit bulk receive (Ctrl+Enter)"}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile: Product Browser drawer */}
      <Offcanvas
        show={showBrowserDrawer}
        onHide={() => setShowBrowserDrawer(false)}
        placement="start"
        className="border-0 shadow-lg"
        style={{ width: "min(100%, 380px)" }}
      >
        <Offcanvas.Header closeButton className="border-bottom">
          <Offcanvas.Title>Product Browser</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <ProductBrowserPanel
            selectedVariantIds={selectedVariantIds}
            onAddVariant={addVariant}
            onRemoveVariant={removeVariantFromGrid}
            onCloseDrawer={() => setShowBrowserDrawer(false)}
            disabled={hasNoLocations}
          />
        </Offcanvas.Body>
      </Offcanvas>

      <div className="d-flex gap-2 mt-2">
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
