"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useId, useMemo, useRef } from "react";
import JsBarcode from "jsbarcode";
import { QRCodeSVG } from "qrcode.react";
import { getLabelPreset } from "./labelPresets";
import type { LabelTemplateConfig } from "./labelTemplateConfig";
import {
  DEFAULT_LABEL_FIELDS,
  DEFAULT_LABEL_TEMPLATE,
  fontScaleMultiplier,
  normalizeCodeMode,
} from "./labelTemplateConfig";
import "./barcodePrint.css";

export type LabelPayload = {
  barcodeValue?: string | null;
  barcode?: string | null;
  productName?: string | null;
  variantTitle?: string | null;
  sku?: string | null;
  batchNo?: string | null;
  lotCode?: string | null;
  expiryDate?: string | null;
  expDate?: string | null;
  mfgDate?: string | null;
  mrp?: number | string | null;
  sellPrice?: number | string | null;
  sellingPrice?: number | string | null;
  effectiveSellPrice?: number | string | null;
  currency?: string | null;
  kind?: string | null;
  variantId?: number | string | null;
  lotId?: number | string | null;
  brandName?: string | null;
  brand?: string | null;
  packSize?: string | null;
  packDisplay?: string | null;
  netWeight?: string | null;
  branchName?: string | null;
  orgName?: string | null;
  organizationName?: string | null;
  companyName?: string | null;
  producerName?: string | null;
  importerName?: string | null;
  supplierName?: string | null;
  manufacturerName?: string | null;
  originCountry?: string | null;
  availableQty?: number | string | null;
  stockQty?: number | string | null;
  currentStockQty?: number | string | null;
  quantity?: number | string | null;
};

function fmtDateShort(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  const raw = String(value);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function clean(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function barcodeHeightPx(mode: LabelTemplateConfig["barcodeHeight"], heightMm: number, compact: boolean): number {
  const ratio = mode === "small" ? 0.25 : mode === "tall" ? 0.48 : 0.36;
  const max = mode === "tall" ? 42 : 32;
  return Math.min(max, Math.max(compact ? 12 : 16, Math.floor(heightMm * ratio)));
}

function qrSizePx(mode: LabelTemplateConfig["qrSize"], heightMm: number, compact: boolean): number {
  const base = mode === "small" ? 0.9 : mode === "large" ? 1.45 : 1.15;
  return Math.min(mode === "large" ? 74 : 58, Math.max(compact ? 28 : 34, Math.floor(heightMm * base)));
}

export function getLabelStockQuantity(label: LabelPayload | Record<string, unknown>): number | null {
  const l = label as LabelPayload;
  return (
    num(l.availableQty) ??
    num(l.stockQty) ??
    num(l.currentStockQty) ??
    num(l.quantity)
  );
}

export default function BarcodeLabelPreview({
  label,
  presetId = "50x30",
  className = "",
  template,
  printDate,
}: {
  label: LabelPayload | Record<string, unknown>;
  presetId?: string;
  className?: string;
  template?: Partial<LabelTemplateConfig>;
  printDate?: string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const uid = useId().replace(/:/g, "");
  const preset = getLabelPreset(presetId);
  const l = label as LabelPayload;
  const code = clean(l?.barcodeValue || l?.barcode);

  const cfg: LabelTemplateConfig = { ...DEFAULT_LABEL_TEMPLATE, ...(template ?? {}) } as LabelTemplateConfig;
  const fields = { ...DEFAULT_LABEL_FIELDS, ...(cfg.fields ?? {}) };
  const codeMode = normalizeCodeMode(cfg.codeMode);
  const showBarcode = codeMode === "BARCODE_ONLY" || codeMode === "BARCODE_AND_QR";
  const showQr = codeMode === "QR_ONLY" || codeMode === "BARCODE_AND_QR";
  const scale = fontScaleMultiplier(cfg.fontScale);
  const compact = cfg.compactMode === true;
  const textAlign = cfg.textAlign === "left" ? "left" : "center";

  const qrValue = useMemo(() => {
    const kind =
      clean(l?.kind).toUpperCase() === "BATCH" || (l?.lotId != null && Number(l.lotId) > 0)
        ? "BATCH"
        : "SKU";
    const payload = {
      type: kind,
      variantId: l?.variantId ?? undefined,
      lotId: l?.lotId ?? undefined,
      sku: clean(l?.sku) || undefined,
      barcode: code || undefined,
      mrp: num(l?.mrp) ?? undefined,
      expiryDate: fmtDateShort(l?.expiryDate ?? l?.expDate) || undefined,
    };
    try {
      return JSON.stringify(payload);
    } catch {
      return code || clean(l?.sku);
    }
  }, [l, code]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el || !code || !showBarcode) return;
    try {
      JsBarcode(el, code, {
        format: "CODE128",
        lineColor: "#111",
        width: compact || preset.widthMm <= 30 ? 1 : 1.25,
        height: barcodeHeightPx(cfg.barcodeHeight, preset.heightMm, compact),
        displayValue: false,
        margin: 0,
      });
    } catch {
      el.innerHTML = "";
    }
  }, [code, preset.widthMm, preset.heightMm, showBarcode, compact, cfg.barcodeHeight]);

  const name = clean(l?.productName);
  const title = clean(l?.variantTitle);
  const sku = clean(l?.sku);
  const batch = clean(l?.batchNo || l?.lotCode);
  const exp = fmtDateShort(l?.expiryDate ?? l?.expDate);
  const mfg = fmtDateShort(l?.mfgDate);
  const mrp = num(l?.mrp);
  const sell = num(l?.sellPrice ?? l?.sellingPrice ?? l?.effectiveSellPrice);
  const cur = clean(l?.currency) || "BDT";
  const pdate = printDate ?? (typeof window !== "undefined" ? new Date().toISOString().slice(0, 10) : "");
  const pack = clean(l?.packSize || l?.packDisplay || l?.netWeight);
  const orgName = clean(l?.orgName || l?.organizationName || l?.companyName);
  const brand = clean(l?.brandName || l?.brand);

  const tileStyle: CSSProperties = {
    width: `${preset.widthMm}mm`,
    height: `${preset.heightMm}mm`,
    fontSize: `${(compact ? 8.5 : 9.5) * scale}px`,
    textAlign,
  };

  const innerStyle: CSSProperties = {
    fontSize: `${(compact ? 8 : 9) * scale}px`,
    alignItems: textAlign === "center" ? "center" : "stretch",
  };

  const line = (show: boolean, content: ReactNode, classExtra = "barcode-label-tile__line") =>
    show && content ? <div className={classExtra}>{content}</div> : null;

  const nameClass = [
    "barcode-label-tile__name",
    cfg.productNameBold ? "fw-semibold" : "",
    textAlign === "left" ? "text-start" : "text-center",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={[
        "barcode-label-tile",
        compact ? "barcode-label-tile--compact" : "",
        cfg.showBorder === false ? "barcode-label-tile--no-border" : "",
        textAlign === "left" ? "barcode-label-tile--left" : "",
        className,
      ].filter(Boolean).join(" ")}
      style={tileStyle}
    >
      <div className="barcode-label-tile__inner" style={innerStyle}>
        {line(fields.productName, name || "(Product)", nameClass)}
        {line(fields.brand, brand || null, "barcode-label-tile__line text-muted")}
        {line(fields.variantTitle, title || null, "barcode-label-tile__line text-muted")}
        {line(fields.sku, sku ? `SKU ${sku}` : null, "barcode-label-tile__line font-monospace text-muted")}
        <div className="barcode-label-tile__bc-wrap">
          {showBarcode && code ? <svg ref={svgRef} id={`bc-${uid}`} className="barcode-label-tile__svg" /> : null}
          {showQr ? <QRCodeSVG value={qrValue} size={qrSizePx(cfg.qrSize, preset.heightMm, compact)} level="M" /> : null}
        </div>
        {line(fields.barcodeText, code || null, "barcode-label-tile__code font-monospace")}
        {!code && showBarcode ? <div className="barcode-label-tile__code text-warning">Assign barcode</div> : null}
        {line(fields.mrp, mrp != null && mrp > 0 ? `MRP: ${cur} ${mrp.toFixed(2)}` : null, "barcode-label-tile__mrp")}
        {line(fields.sellingPrice, sell != null && sell > 0 ? `Price: ${cur} ${sell.toFixed(2)}` : null)}
        {line(fields.batchNo, batch ? `Lot ${batch}` : null, "barcode-label-tile__line text-muted")}
        {line(fields.mfgDate, mfg ? `MFG ${mfg}` : null, "barcode-label-tile__line text-muted")}
        {line(fields.expiryDate, exp ? `EXP ${exp}` : null, "barcode-label-tile__line text-muted")}
        {line(fields.producerName, clean(l?.producerName) || null, "barcode-label-tile__line text-muted")}
        {line(fields.importerName, clean(l?.importerName) || null, "barcode-label-tile__line text-muted")}
        {line(fields.supplierName, clean(l?.supplierName) || null, "barcode-label-tile__line text-muted")}
        {line(fields.manufacturerName, clean(l?.manufacturerName) || null, "barcode-label-tile__line text-muted")}
        {line(fields.originCountry, clean(l?.originCountry) || null, "barcode-label-tile__line text-muted")}
        {line(fields.packSize, pack || null, "barcode-label-tile__line text-muted")}
        {line(fields.branchName, clean(l?.branchName) || null, "barcode-label-tile__line text-muted")}
        {line(fields.orgName, orgName || null, "barcode-label-tile__line text-muted")}
        {line(fields.printDate, pdate ? `Printed ${pdate}` : null, "barcode-label-tile__line text-muted")}
        {line(fields.customText1, clean(cfg.customText1) || null, "barcode-label-tile__line")}
        {line(fields.customText2, clean(cfg.customText2) || null, "barcode-label-tile__line")}
      </div>
    </div>
  );
}
