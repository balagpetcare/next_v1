"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Modal, Button, Offcanvas } from "react-bootstrap";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import { apiPost, inventoryLookupVariantByBarcode } from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";
import type { Location, SelectedRow, VariantOption } from "./types";
import { emptyRow } from "./types";
import { ProductBrowserPanel } from "./ProductBrowserPanel";
import { SelectedReceiveGrid } from "./SelectedReceiveGrid";
import { SpreadsheetGrid } from "./SpreadsheetGrid";

type Vendor = { id: number; name: string };

type PoOpt = { id: number; poNumber: string; status: string; vendor?: { id: number; name: string } };

/** Full PO line including variant details for grid pre-population */
type PoDetailLine = {
  id: number;
  variantId: number;
  orderedQty: number;
  receivedQty: number;
  unitCost?: number | null;
  note?: string | null;
  variant?: { id: number; sku: string; title: string };
};

/** Full PO detail for summary banner */
type PoDetail = {
  id: number;
  poNumber: string;
  status: string;
  vendor?: { id: number; name: string } | null;
  warehouse?: { id: number; name: string; branchId?: number | null } | null;
  expectedDeliveryDate?: string | null;
  currency?: string | null;
  lines: PoDetailLine[];
};

export type BulkReceivePageProps = {
  /** Staff embed: org when GET /api/v1/owner/organizations is unavailable */
  fallbackOrgId?: number | null;
  embedInStaff?: boolean;
  staffBranchId?: string;
};

function resolvePurchaseOrderLineId(
  variantId: number,
  poLines: Array<{ id: number; variantId: number }> | undefined
): number | undefined {
  if (!poLines?.length) return undefined;
  const matches = poLines.filter((l) => l.variantId === variantId);
  if (matches.length === 1) return matches[0].id;
  return undefined;
}

function BulkReceivePageInner(props?: BulkReceivePageProps) {
  const fallbackOrgId = props?.fallbackOrgId ?? null;
  const embedInStaff = props?.embedInStaff === true;
  const staffBranchId = props?.staffBranchId ?? "";

  const searchParams = useSearchParams();
  const toast = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<string>("");
  const [vendorId, setVendorId] = useState<string>("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorOptions, setVendorOptions] = useState<Vendor[]>([]);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [notes, setNotes] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [poOptions, setPoOptions] = useState<PoOpt[]>([]);
  const [poLoading, setPoLoading] = useState(false);
  /** Full PO header + lines — loaded when purchaseOrderId is set */
  const [poDetail, setPoDetail] = useState<PoDetail | null>(null);
  /** Loaded when purchaseOrderId is set — used to auto-fill purchaseOrderLineId per variant */
  const [poDetailLines, setPoDetailLines] = useState<Array<{ id: number; variantId: number }> | null>(null);
  /** Whether the grid has been auto-populated from PO lines (prevents re-populate on subsequent re-renders) */
  const poGridPopulatedRef = useRef<string>("");
  /** OrgId from the user's first org — used to fetch PO data before a location is selected */
  const [userOrgId, setUserOrgId] = useState<number | null>(null);
  const [rows, setRows] = useState<SelectedRow[]>([emptyRow()]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<{ grnId: number; lineCount: number; totalQty: number; submitted?: boolean; submitting?: boolean } | null>(null);
  const [mode, setMode] = useState<"visual" | "spreadsheet">("visual");
  const [showBrowserDrawer, setShowBrowserDrawer] = useState(false);
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [flashRowId, setFlashRowId] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [showBranchDispatchModal, setShowBranchDispatchModal] = useState(false);
  const [dispatchSourceWarehouseId, setDispatchSourceWarehouseId] = useState<string>("");
  const [creatingDispatch, setCreatingDispatch] = useState(false);
  /** FEFO-eligible available qty at selected dispatch source, per variant (matches direct-dispatch allocation). */
  const [dispatchAvailability, setDispatchAvailability] = useState<Record<number, number>>({});
  const [dispatchAvailLoading, setDispatchAvailLoading] = useState(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vendorSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLocationIdRef = useRef<string>("");

  const selectedLocation = locations.find((l) => String(l.id) === locationId);
  const orgId = selectedLocation?.branch?.orgId;

  const resolvedOrgId = useMemo(() => {
    if (orgId != null) return orgId;
    if (userOrgId != null) return userOrgId;
    if (fallbackOrgId != null && Number.isFinite(Number(fallbackOrgId))) return Number(fallbackOrgId);
    return null;
  }, [orgId, userOrgId, fallbackOrgId]);

  /** Only warehouses in the same org as the selected receive location — avoids defaulting to another org's warehouse (zero stock / wrong allocation). */
  const warehouseLocations = useMemo(
    () =>
      locations.filter(
        (l) => l.type === "CENTRAL_WAREHOUSE" && (orgId == null ? false : Number(l.branch?.orgId) === Number(orgId))
      ),
    [locations, orgId]
  );

  const dispatchVariantIdsKey = useMemo(() => {
    const s = new Set<number>();
    for (const r of rows) {
      if (r.variantId != null && r.variantId > 0) s.add(r.variantId);
    }
    return [...s].sort((a, b) => a - b).join(",");
  }, [rows]);

  const dispatchQtyByVariant = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of rows) {
      if (r.variantId == null) continue;
      const q = parseInt(String(r.quantity), 10);
      if (!Number.isFinite(q) || q <= 0) continue;
      m.set(r.variantId, (m.get(r.variantId) ?? 0) + q);
    }
    return m;
  }, [rows]);

  const dispatchCanSubmit = useMemo(() => {
    if (warehouseLocations.length === 0 || !dispatchSourceWarehouseId || dispatchQtyByVariant.size === 0) return false;
    if (dispatchAvailLoading) return false;
    for (const [vid, need] of dispatchQtyByVariant) {
      const av = dispatchAvailability[vid];
      if (av === undefined || need > av) return false;
    }
    return true;
  }, [
    warehouseLocations.length,
    dispatchSourceWarehouseId,
    dispatchQtyByVariant,
    dispatchAvailability,
    dispatchAvailLoading,
  ]);

  /** Keep selected source valid when org-scoped warehouse list changes */
  useEffect(() => {
    if (!showBranchDispatchModal || warehouseLocations.length === 0) return;
    const valid = warehouseLocations.some((l) => String(l.id) === dispatchSourceWarehouseId);
    if (!valid) setDispatchSourceWarehouseId(String(warehouseLocations[0].id));
  }, [showBranchDispatchModal, warehouseLocations, dispatchSourceWarehouseId]);

  useEffect(() => {
    if (!showBranchDispatchModal || !dispatchSourceWarehouseId || !resolvedOrgId || !dispatchVariantIdsKey) {
      setDispatchAvailability({});
      setDispatchAvailLoading(false);
      return;
    }
    const src = parseInt(dispatchSourceWarehouseId, 10);
    if (!Number.isFinite(src) || src <= 0) {
      setDispatchAvailLoading(false);
      return;
    }
    const variantIds = dispatchVariantIdsKey.split(",").map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n) && n > 0);
    let cancelled = false;
    setDispatchAvailLoading(true);
    (async () => {
      const next: Record<number, number> = {};
      try {
        await Promise.all(
          variantIds.map(async (vid) => {
            try {
              const res = await ownerGet<{ data?: Array<{ availableQty?: number }> }>(
                `/api/v1/inventory/fefo?locationId=${src}&variantId=${vid}`
              );
              const lots = Array.isArray(res?.data) ? res.data : [];
              if (!cancelled) next[vid] = lots.reduce((s, l) => s + (Number(l.availableQty) || 0), 0);
            } catch {
              if (!cancelled) next[vid] = 0;
            }
          })
        );
        if (!cancelled) setDispatchAvailability(next);
      } finally {
        if (!cancelled) setDispatchAvailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      setDispatchAvailLoading(false);
    };
  }, [showBranchDispatchModal, dispatchSourceWarehouseId, resolvedOrgId, dispatchVariantIdsKey]);

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

  // Load user's first org early so PO data can be fetched before location is selected
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await ownerGet<{ data?: { id: number }[] }>("/api/v1/owner/organizations");
        const list = Array.isArray(res?.data) ? res.data : [];
        if (!cancelled && list[0]?.id) setUserOrgId(list[0].id);
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const po = searchParams.get("purchaseOrderId");
    const v = searchParams.get("vendorId");
    if (po) setPurchaseOrderId(po);
    if (v) setVendorId(v);
  }, [searchParams]);

  useEffect(() => {
    if (!resolvedOrgId) {
      setPoOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setPoLoading(true);
      try {
        const res = await ownerGet<{ data?: PoOpt[] }>(`/api/v1/purchase-orders?orgId=${resolvedOrgId}&limit=100`);
        const rows = Array.isArray(res?.data) ? res.data : [];
        const open = rows.filter((r) => ["APPROVED", "PARTIALLY_RECEIVED"].includes(String(r.status || "").toUpperCase()));
        if (!cancelled) setPoOptions(open);
      } catch {
        if (!cancelled) setPoOptions([]);
      } finally {
        if (!cancelled) setPoLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedOrgId]);

  useEffect(() => {
    if (!resolvedOrgId || !purchaseOrderId?.trim()) {
      setPoDetail(null);
      setPoDetailLines(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await ownerGet<{ data?: PoDetail }>(
          `/api/v1/purchase-orders/${purchaseOrderId.trim()}?orgId=${resolvedOrgId}`
        );
        const po = res?.data ?? null;
        if (cancelled) return;
        setPoDetail(po);
        const lines = po?.lines ?? null;
        setPoDetailLines(Array.isArray(lines) ? lines.map((l) => ({ id: l.id, variantId: l.variantId })) : null);

        // Auto-populate grid from PO lines — only once per PO load
        const populateKey = `${purchaseOrderId.trim()}`;
        if (po && Array.isArray(po.lines) && poGridPopulatedRef.current !== populateKey) {
          poGridPopulatedRef.current = populateKey;
          const pendingLines = po.lines.filter((l) => l.orderedQty - l.receivedQty > 0);
          if (pendingLines.length > 0) {
            const newRows: SelectedRow[] = pendingLines.map((l) => {
              const pending = l.orderedQty - l.receivedQty;
              return {
                id: Math.random().toString(36).slice(2),
                variantId: l.variantId,
                sku: l.variant?.sku ?? "",
                productName: l.variant?.title ?? "",
                quantity: String(pending),
                unitCost: l.unitCost != null ? String(l.unitCost) : "",
                lotCode: "",
                mfgDate: "",
                expDate: "",
                purchaseOrderLineId: String(l.id),
                supplierBarcode: "",
                orderedQty: l.orderedQty,
                receivedQty: l.receivedQty,
                pendingQty: pending,
                poUnitCost: l.unitCost ?? null,
              };
            });
            setRows(newRows);
          }
        }
      } catch {
        if (!cancelled) {
          setPoDetail(null);
          setPoDetailLines(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedOrgId, purchaseOrderId]);

  useEffect(() => {
    if (!resolvedOrgId || vendorSearch.length < 2) {
      setVendorOptions([]);
      return;
    }
    if (vendorSearchTimeoutRef.current) clearTimeout(vendorSearchTimeoutRef.current);
    vendorSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await ownerGet<{ data: Vendor[] }>(
          `/api/v1/vendors/lookup?orgId=${resolvedOrgId}&q=${encodeURIComponent(vendorSearch)}&limit=15`
        );
        setVendorOptions(Array.isArray(res?.data) ? res.data : []);
      } catch {
        setVendorOptions([]);
      }
    }, 200);
    return () => {
      if (vendorSearchTimeoutRef.current) clearTimeout(vendorSearchTimeoutRef.current);
    };
  }, [resolvedOrgId, vendorSearch]);

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

  const handleBarcodeLookup = useCallback(async () => {
    const code = barcodeInput.trim();
    if (!code) return;
    if (!resolvedOrgId) {
      toast.error("Select a receiving location first (needed for org-scoped barcode lookup).");
      return;
    }
    setBarcodeLoading(true);
    try {
      const v = await inventoryLookupVariantByBarcode(code, resolvedOrgId);
      if (!v) {
        toast.error("No active variant found for this barcode.");
        return;
      }
      const pol = resolvePurchaseOrderLineId(v.id, poDetailLines ?? undefined);
      const poLine = poDetail?.lines?.find((l) => l.variantId === v.id);
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
        const pendingRemain =
          poLine && poLine.orderedQty - poLine.receivedQty > 0 ? poLine.orderedQty - poLine.receivedQty : null;
        const newRow: SelectedRow = {
          id: Math.random().toString(36).slice(2),
          variantId: v.id,
          sku: v.sku,
          productName: v.product?.name ?? v.title ?? "",
          quantity: pendingRemain != null ? String(pendingRemain) : "1",
          unitCost: poLine?.unitCost != null ? String(poLine.unitCost) : "",
          lotCode: "",
          mfgDate: "",
          expDate: "",
          purchaseOrderLineId: pol != null ? String(pol) : undefined,
          orderedQty: poLine?.orderedQty,
          receivedQty: poLine?.receivedQty,
          pendingQty: poLine ? poLine.orderedQty - poLine.receivedQty : undefined,
          poUnitCost: poLine?.unitCost ?? null,
        };
        return prev.length === 1 && !prev[0].variantId ? [newRow] : [...validRows, newRow];
      });
      setBarcodeInput("");
      toast.success(`Added line for ${v.sku}`);
    } finally {
      setBarcodeLoading(false);
    }
  }, [barcodeInput, resolvedOrgId, poDetail?.lines, poDetailLines, toast]);

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

    // PO mode: validate over-receipt before sending to backend
    if (isPOMode) {
      const overRows = rows.filter((r) => {
        if (r.variantId == null || r.pendingQty == null) return false;
        const q = parseInt(r.quantity, 10);
        return Number.isFinite(q) && q > r.pendingQty;
      });
      if (overRows.length > 0) {
        const labels = overRows.map((r) => `${r.productName || r.sku} (receive ${r.quantity}, pending ${r.pendingQty})`);
        toast.error(`Over-receipt: ${labels.join("; ")}. Reduce qty or clear PO link to allow excess.`);
        return;
      }
    }

    const lines = rows
      .map((r) => {
        if (r.variantId == null) return null;
        const q = parseInt(r.quantity, 10);
        const polFromRow =
          r.purchaseOrderLineId && /^\d+$/.test(String(r.purchaseOrderLineId).trim())
            ? parseInt(String(r.purchaseOrderLineId).trim(), 10)
            : undefined;
        const polResolved = polFromRow ?? resolvePurchaseOrderLineId(r.variantId, poDetailLines ?? undefined);
        return {
          variantId: r.variantId,
          quantity: q,
          unitCost: r.unitCost ? parseFloat(r.unitCost) : undefined,
          lotCode: r.lotCode.trim() || undefined,
          mfgDate: r.mfgDate || undefined,
          expDate: r.expDate || undefined,
          purchaseOrderLineId: polResolved,
          supplierBarcode: r.supplierBarcode?.trim() || undefined,
          quantityDamaged: r.quantityDamaged ? parseInt(r.quantityDamaged, 10) || 0 : undefined,
          quantityShort: r.quantityShort ? parseInt(r.quantityShort, 10) || 0 : undefined,
          lineRemarks: r.lineRemarks?.trim() || undefined,
          lineDiscrepancyNote: r.lineDiscrepancyNote?.trim() || undefined,
        };
      })
      .filter((l): l is NonNullable<typeof l> => l != null && Number.isInteger(l.quantity) && l.quantity > 0);
    if (lines.length === 0) {
      toast.warning("Add at least one line with variant and quantity.");
      return;
    }
    // PO-linked vendor inbound: skip internal dispatch confirmation regardless of location type.
    // The receiving destination is a PO target warehouse/DC — not a branch requiring internal dispatch.
    if (!isPOMode && selectedLocation?.type && selectedLocation.type !== "CENTRAL_WAREHOUSE") {
      setShowBranchDispatchModal(true);
      return;
    }
    setSubmitting(true);
    setLastReceipt(null);
    try {
      // Use staff API when embedded in staff context, owner API otherwise
      const apiCall = embedInStaff ? apiPost : ownerPost;
      const res = await apiCall<{
        success: boolean;
        message?: string;
        requiresManagerConfirmation?: boolean;
        data: { id: number; lines?: unknown[]; vendorReceiveSession?: { status?: string } };
        errors?: { rowIndex: number; message: string }[];
      }>("/api/v1/inventory/receipts/bulk", {
        locationId: locId,
        vendorId: vendorId || undefined,
        purchaseOrderId: purchaseOrderId ? parseInt(purchaseOrderId, 10) : undefined,
        invoiceNo: invoiceNo.trim() || undefined,
        invoiceDate: invoiceDate || undefined,
        notes: notes.trim() || undefined,
        lines,
        /** Omit or false = draft GRN only; true = immediate post (requires manager permission). */
        postImmediately: false,
      });
      const grn = res?.data;
      const lineCount = Array.isArray(grn?.lines) ? grn.lines.length : lines.length;
      const totalQty = lines.reduce((s, l) => s + (l.quantity || 0), 0);
      setLastReceipt(grn?.id != null ? { grnId: grn.id, lineCount, totalQty, submitted: false, submitting: false } : null);
      const toastMsg =
        typeof res?.message === "string" && res.message.trim()
          ? res.message
          : `Bulk receipt saved. GRN #${grn?.id ?? "—"}, ${lineCount} line(s), ${totalQty} units.`;
      toast.success(toastMsg);
      setRows([emptyRow()]);
      setInvoiceNo("");
      setInvoiceDate("");
      setNotes("");
      // In PO mode, reset the populate guard so the grid re-fetches and repopulates with updated pending qtys
      if (isPOMode) {
        poGridPopulatedRef.current = "";
        setPoDetail(null);
        setPoDetailLines(null);
      } else {
        setPurchaseOrderId("");
      }
    } catch (err: unknown) {
      const j = (err as { response?: { code?: string; errors?: { rowIndex: number; message: string }[] } })?.response;
      const errorStatus = (err as { status?: number })?.status;
      
      // Handle permission denied for owner trying to post warehouse stock
      if (errorStatus === 403 && !embedInStaff && isPOMode) {
        toast.error("Warehouse receiving permissions required. This PO should be received by warehouse staff. Use 'Open in warehouse receiving' instead.");
        return;
      }
      
      // Only surface the dispatch modal for non-PO flows — PO inbound should never trigger dispatch creation.
      if (!isPOMode && j?.code === "BRANCH_LOCATION_REQUIRES_DISPATCH") {
        setShowBranchDispatchModal(true);
        return;
      }
      if (j?.errors?.length) {
        toast.error(`Validation: ${j.errors.map((e) => `Row ${e.rowIndex + 1}: ${e.message}`).join("; ")}`);
      } else {
        toast.error(getMessageFromApiError(err as Error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateDispatch = async () => {
    if (creatingDispatch) return;
    if (!locationId || !dispatchSourceWarehouseId) {
      toast.warning(
        warehouseLocations.length === 0
          ? "No central warehouse found for this organization. Create a CENTRAL_WAREHOUSE under Inventory → Locations."
          : "Select source warehouse."
      );
      return;
    }
    const lines = rows
      .map((r) => ({ variantId: r.variantId, quantity: parseInt(String(r.quantity), 10) || 0 }))
      .filter((l) => l.variantId != null && l.quantity > 0);
    if (lines.length === 0) {
      toast.warning("Add at least one line with variant and quantity.");
      return;
    }
    if (!dispatchCanSubmit) {
      toast.warning(
        dispatchAvailLoading
          ? "Still loading availability at the selected source…"
          : "Requested quantity exceeds dispatchable stock at the selected warehouse (FEFO-eligible). Adjust quantities or choose another source."
      );
      return;
    }
    setCreatingDispatch(true);
    try {
      const res = await ownerPost<{ success: boolean; data: { dispatchId: number; stockRequestId?: number } }>(
        "/api/v1/inventory/direct-dispatch",
        {
          fromLocationId: parseInt(dispatchSourceWarehouseId, 10),
          toLocationId: parseInt(locationId, 10),
          lines,
          note: notes.trim() || undefined,
        }
      );
      const dispatchId = res?.data?.dispatchId;
      setShowBranchDispatchModal(false);
      setRows([emptyRow()]);
      setNotes("");
      setDispatchAvailability({});
      toast.success(`Dispatch created (#${dispatchId ?? "—"}). Waiting for branch confirmation.`);
    } catch (err: unknown) {
      const resp = (err as { response?: Record<string, unknown> })?.response;
      if (resp && typeof resp === "object" && resp.code === "INSUFFICIENT_STOCK_AT_SOURCE") {
        const vid = typeof resp.variantId === "number" ? resp.variantId : Number(resp.variantId);
        const row = rows.find((x) => x.variantId === vid);
        const label = row?.productName || row?.sku || `Variant #${vid}`;
        const reqQ = resp.requestedQty;
        const avQ = resp.availableQty;
        toast.error(
          `Cannot dispatch ${label}: requested ${String(reqQ)}, available at source ${String(avQ)} (FEFO-eligible stock). Choose another warehouse or reduce quantity.`
        );
        return;
      }
      if (resp && typeof resp === "object" && resp.code === "DIRECT_DISPATCH_ORG_MISMATCH") {
        toast.error(
          typeof resp.message === "string"
            ? resp.message
            : "Source and destination must belong to the same organization."
        );
        return;
      }
      toast.error(getMessageFromApiError(err as Error));
    } finally {
      setCreatingDispatch(false);
    }
  };

  const validRows = rows.filter((r) => r.variantId != null);
  const totalQty = validRows.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0);
  const estimatedCost = validRows.reduce(
    (s, r) => s + (parseFloat(r.quantity) || 0) * (parseFloat(r.unitCost) || 0),
    0
  );

  const hasNoLocations = !loading && locations.length === 0;
  /** True when a purchase order is linked — changes layout and grid behavior */
  const isPOMode = !!purchaseOrderId && !!poDetail;

  return (
    <div className="dashboard-main-body">
      {!embedInStaff && (
        <PageHeader
          title={isPOMode ? `Receive against ${poDetail!.poNumber}` : "Bulk receive"}
          subtitle={isPOMode ? `Vendor: ${poDetail!.vendor?.name ?? "—"} · Status: ${poDetail!.status}` : "Product browser + multi-select. Location required; vendor optional."}
          breadcrumbs={[
            { label: "Owner", href: "/owner/dashboard" },
            { label: "Inventory", href: "/owner/inventory" },
            { label: "Receipts", href: "/owner/inventory/receipts" },
            isPOMode
              ? { label: "Purchase Orders", href: "/owner/inventory/purchase-orders" }
              : { label: "Bulk", href: "/owner/inventory/receipts/bulk" },
            ...(isPOMode ? [{ label: poDetail!.poNumber, href: `/owner/inventory/purchase-orders/${poDetail!.id}` }] : []),
          ]}
        />
      )}
      {embedInStaff && (
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h5 className="mb-0 fw-semibold">{isPOMode ? `Receive against ${poDetail?.poNumber ?? "PO"}` : "Bulk receive"}</h5>
            <p className="text-muted small mb-0">Warehouse receiving — saves a draft GRN; manager confirms to post stock.</p>
          </div>
          {staffBranchId ? (
            <Link href={`/staff/branch/${staffBranchId}/warehouse`} className="btn btn-sm btn-outline-secondary">
              ← Warehouse
            </Link>
          ) : null}
        </div>
      )}

      {isPOMode && !embedInStaff && (
        <div className="alert alert-info radius-12 mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span>
            <strong>Note:</strong> PO-linked receiving should be performed by warehouse staff. This page remains available when needed;
            use <strong>Open in warehouse receiving</strong> from the PO for the standard path.
          </span>
          <Link href={`/owner/inventory/purchase-orders/${purchaseOrderId}`} className="btn btn-sm btn-outline-secondary shrink-0">
            Back to PO
          </Link>
        </div>
      )}

      {hasNoLocations && (
        <div className="alert alert-info radius-12 mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <span>No locations found. Create locations first so you can receive stock.</span>
          <Link href="/owner/inventory/locations" className="btn btn-primary btn-sm">
            Inventory → Locations
          </Link>
        </div>
      )}

      {/* Loading PO context before location is selected */}
      {purchaseOrderId && !poDetail && !loading && (
        <div className="alert alert-secondary radius-12 mb-3 small">
          Loading PO context for #{purchaseOrderId}… Select a receiving location above to continue.
        </div>
      )}

      {/* PO fully received warning */}
      {isPOMode && poDetail && poDetail.lines.every((l) => l.orderedQty - l.receivedQty <= 0) && (
        <div className="alert alert-warning radius-12 mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span>
            <strong>PO {poDetail.poNumber}</strong> is fully received. All lines have been received in full.
          </span>
          <Link href={`/owner/inventory/purchase-orders/${poDetail.id}`} className="btn btn-sm btn-outline-secondary">
            Back to PO
          </Link>
        </div>
      )}

      {/* PO summary card — shown when receiving against a specific PO */}
      {isPOMode && poDetail && poDetail.lines.some((l) => l.orderedQty - l.receivedQty > 0) && (
        <div className="card border-primary border radius-12 mb-3">
          <div className="card-body p-3">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="badge bg-primary">PO linked</span>
                  <span className="fw-semibold">{poDetail.poNumber}</span>
                  <span className={`badge ${poDetail.status === "APPROVED" ? "bg-success" : "bg-warning text-dark"}`}>
                    {poDetail.status}
                  </span>
                </div>
                <div className="small text-muted d-flex flex-wrap gap-3">
                  <span><strong>Vendor:</strong> {poDetail.vendor?.name ?? "—"}</span>
                  {poDetail.warehouse && <span><strong>Warehouse:</strong> {poDetail.warehouse.name}</span>}
                  {poDetail.expectedDeliveryDate && (
                    <span><strong>Expected:</strong> {new Date(poDetail.expectedDeliveryDate).toLocaleDateString()}</span>
                  )}
                  <span><strong>Lines:</strong> {poDetail.lines.length}</span>
                  <span>
                    <strong>Pending lines:</strong>{" "}
                    {poDetail.lines.filter((l) => l.orderedQty - l.receivedQty > 0).length}
                    {" / "}
                    {poDetail.lines.length}
                  </span>
                </div>
              </div>
              <Link
                href={`/owner/inventory/purchase-orders/${poDetail.id}`}
                className="btn btn-sm btn-outline-secondary"
              >
                View PO
              </Link>
            </div>
            {poDetail.lines.some((l) => l.orderedQty - l.receivedQty <= 0) && (
              <div className="mt-2 small text-muted">
                {poDetail.lines.filter((l) => l.orderedQty - l.receivedQty <= 0).length} line(s) already fully received
                are excluded from the grid below.
              </div>
            )}
          </div>
        </div>
      )}

      {lastReceipt && (
        <div className={`alert ${lastReceipt.submitted ? "alert-info" : "alert-success"} radius-12 mb-3`}>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <span>
              Last receipt:{" "}
              <Link href={`/owner/inventory/grn/${lastReceipt.grnId}`} className="fw-semibold">
                GRN #{lastReceipt.grnId}
              </Link>{" "}
              — {lastReceipt.lineCount} line(s), {lastReceipt.totalQty} units.{" "}
              {lastReceipt.submitted ? (
                <span className="badge bg-warning text-dark">Pending Confirmation</span>
              ) : (
                <span className="badge bg-secondary">DRAFT</span>
              )}
            </span>
            <span className="d-flex gap-2 flex-wrap">
              {!lastReceipt.submitted && (
                <button type="button" className="btn btn-sm btn-warning" disabled={lastReceipt.submitting} onClick={async () => {
                  setLastReceipt((prev) => prev ? { ...prev, submitting: true } : prev);
                  try {
                    const { grnSubmitForConfirmation } = await import("@/lib/api");
                    await grnSubmitForConfirmation(lastReceipt.grnId);
                    toast.success("Submitted for warehouse manager confirmation. Manager will be notified.");
                    setLastReceipt((prev) => prev ? { ...prev, submitted: true, submitting: false } : prev);
                  } catch (e: unknown) {
                    toast.error((e as Error)?.message ?? "Failed");
                    setLastReceipt((prev) => prev ? { ...prev, submitting: false } : prev);
                  }
                }}>{lastReceipt.submitting ? "Submitting…" : "Submit for confirmation"}</button>
              )}
              {lastReceipt.submitted && (
                <span className="text-muted small align-self-center">
                  Warehouse manager has been notified.
                </span>
              )}
              <Link href={`/owner/inventory/grn/${lastReceipt.grnId}`} className="btn btn-sm btn-outline-primary">
                View GRN
              </Link>
              <a href={`/api/v1/grn/${lastReceipt.grnId}/print`} target="_blank" rel="noopener" className="btn btn-sm btn-outline-secondary">Print GRN</a>
              <a href={`/api/v1/grn/${lastReceipt.grnId}/print/discrepancy`} target="_blank" rel="noopener" className="btn btn-sm btn-outline-secondary">Discrepancy report</a>
            </span>
          </div>
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
                onFocus={() => resolvedOrgId && setVendorSearch("")}
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
            {!isPOMode && (
              <div className="col-12 col-md-3">
                <label className="form-label small">Purchase order (optional)</label>
                <select
                  className="form-select form-select-sm"
                  value={purchaseOrderId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPurchaseOrderId(v);
                    if (v) {
                      const p = poOptions.find((x) => String(x.id) === v);
                      if (p?.vendor?.id) {
                        setVendorId(String(p.vendor.id));
                        setVendorSearch(p.vendor.name ?? "");
                      }
                    }
                  }}
                  disabled={!resolvedOrgId || poLoading}
                >
                  <option value="">{poLoading ? "Loading…" : "None"}</option>
                  {poOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.poNumber} ({p.status})
                    </option>
                  ))}
                </select>
                <p className="small text-muted mb-0 mt-1">Vendor is taken from the PO when linked.</p>
              </div>
            )}
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

          {mode === "visual" && (
            <div className="row g-2 mb-2">
              <div className="col-12 col-lg-6">
                <label className="form-label small mb-1">Barcode / scan</label>
                <div className="input-group input-group-sm">
                  <input
                    type="text"
                    className="form-control"
                    autoComplete="off"
                    placeholder="Scan or type barcode, Enter to add line"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleBarcodeLookup();
                      }
                    }}
                    disabled={hasNoLocations || !resolvedOrgId || barcodeLoading}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    disabled={hasNoLocations || !resolvedOrgId || barcodeLoading}
                    onClick={() => void handleBarcodeLookup()}
                  >
                    {barcodeLoading ? "…" : "Add"}
                  </button>
                </div>
                <p className="small text-muted mb-0">Looks up an active catalog variant by barcode for the selected org.</p>
              </div>
            </div>
          )}

          {mode === "visual" ? (
            /* Split view: Product Browser (left) + Selected Grid (right) */
            <div className="row g-3">
              {/* Product Browser — hidden in PO mode (grid is pre-populated from PO lines) */}
              {!isPOMode && (
                <>
                  <div className="col-12 col-lg-4 d-none d-lg-block">
                    <div className="border rounded p-3 bg-light">
                      <h6 className="mb-2 small fw-bold">Product Browser</h6>
                      <ProductBrowserPanel
                        selectedVariantIds={selectedVariantIds}
                        onAddVariant={addVariant}
                        onRemoveVariant={removeVariantFromGrid}
                        disabled={hasNoLocations}
                        orgId={resolvedOrgId ?? null}
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
                </>
              )}
              <div className={isPOMode ? "col-12" : "col-12 col-lg-8"}>
                <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                  <h6 className="mb-0 small fw-bold">
                    {isPOMode ? "Receive items from PO" : "Selected Items"}
                  </h6>
                  {isPOMode && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setShowBrowserDrawer(true)}
                      title="Add a non-PO item to this receipt"
                    >
                      + Add non-PO item
                    </button>
                  )}
                </div>
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
                  isPOMode={isPOMode}
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
              {submitting ? "Submitting…" : isPOMode ? "Post GRN against PO (Ctrl+Enter)" : "Submit bulk receive (Ctrl+Enter)"}
            </button>
          </div>
        </div>
      </div>

      {/* Branch location: Create Dispatch modal */}
      <Modal
        show={showBranchDispatchModal}
        onHide={() => setShowBranchDispatchModal(false)}
        onEnter={() => {
          if (warehouseLocations.length > 0) setDispatchSourceWarehouseId(String(warehouseLocations[0].id));
        }}
        centered
        className="radius-12"
      >
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title>Branch locations require confirmation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3">
            To send products to this location, create a dispatch so the branch manager can receive and confirm quantities.
          </p>
          {warehouseLocations.length === 0 ? (
            <div className="alert alert-warning mb-0">
              No central warehouse for this organization’s branch. Add a CENTRAL_WAREHOUSE location in the same org as the selected receive location (Inventory → Locations).
            </div>
          ) : (
            <>
              <div className="mb-2">
                <label className="form-label small">Source warehouse</label>
                <select
                  className="form-select form-select-sm"
                  value={dispatchSourceWarehouseId}
                  onChange={(e) => setDispatchSourceWarehouseId(e.target.value)}
                >
                  <option value="">Select warehouse</option>
                  {warehouseLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.branch ? `(${loc.branch.name})` : ""}
                    </option>
                  ))}
                </select>
                <p className="small text-muted mb-0 mt-1">
                  Only warehouses in the same organization as the branch you are receiving into are listed.
                </p>
              </div>
              {dispatchAvailLoading && (
                <p className="small text-muted mb-2">Loading availability at source…</p>
              )}
              {!dispatchAvailLoading && dispatchVariantIdsKey && (
                <div className="table-responsive border rounded mb-0" style={{ maxHeight: 220 }}>
                  <table className="table table-sm mb-0 small">
                    <thead className="table-light position-sticky top-0">
                      <tr>
                        <th>Item</th>
                        <th className="text-end">Requested</th>
                        <th className="text-end">Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dispatchVariantIdsKey.split(",").map((idStr) => {
                        const vid = parseInt(idStr, 10);
                        const need = dispatchQtyByVariant.get(vid) ?? 0;
                        const av = dispatchAvailability[vid];
                        const row = rows.find((r) => r.variantId === vid);
                        const label = row?.productName || row?.sku || `#${vid}`;
                        const ok = av !== undefined && need <= av;
                        return (
                          <tr key={vid} className={ok ? undefined : "table-warning"}>
                            <td className="text-break">{label}</td>
                            <td className="text-end">{need}</td>
                            <td className="text-end">{av === undefined ? "—" : av}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {!dispatchAvailLoading && dispatchVariantIdsKey && !dispatchCanSubmit && dispatchQtyByVariant.size > 0 && (
                <p className="small text-danger mb-0 mt-2">
                  Reduce quantities or pick a warehouse with enough dispatchable stock (non-expired, not fully reserved).
                </p>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="border-top">
          <Button variant="outline-secondary" onClick={() => setShowBranchDispatchModal(false)}>
            Change location
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateDispatch}
            disabled={
              creatingDispatch ||
              warehouseLocations.length === 0 ||
              !dispatchSourceWarehouseId ||
              !dispatchCanSubmit
            }
          >
            {creatingDispatch ? "Creating…" : "Create dispatch"}
          </Button>
        </Modal.Footer>
      </Modal>

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
            orgId={resolvedOrgId ?? null}
          />
        </Offcanvas.Body>
      </Offcanvas>

      {!embedInStaff && (
        <div className="d-flex gap-2 mt-2">
          <Link href="/owner/inventory/receipts" className="btn btn-outline-secondary btn-sm">
            ← Single receipt
          </Link>
          <Link href="/owner/inventory/locations" className="btn btn-outline-secondary btn-sm">
            Locations
          </Link>
        </div>
      )}
    </div>
  );
}

export default function BulkReceivePage(props?: BulkReceivePageProps) {
  return <BulkReceivePageInner {...props} />;
}
