/**
 * Client-side label template preferences (persisted locally until backend template store exists).
 */

export type LabelSizePresetId = "25x15" | "30x20" | "40x25" | "50x30" | "60x40" | "80x50" | "a4";

export type LabelCodeMode =
  | "BARCODE_ONLY"
  | "QR_ONLY"
  | "BARCODE_AND_QR"
  | "BARCODE"
  | "QR"
  | "BARCODE_QR";

export type FontScaleOption = "small" | "normal" | "large";
export type BarcodeHeightOption = "small" | "normal" | "tall";
export type QrSizeOption = "small" | "normal" | "large";
export type TextAlignOption = "left" | "center";

export type LabelFieldKey =
  | "productName"
  | "variantTitle"
  | "brand"
  | "sku"
  | "barcodeText"
  | "mrp"
  | "sellingPrice"
  | "batchNo"
  | "mfgDate"
  | "expiryDate"
  | "producerName"
  | "importerName"
  | "supplierName"
  | "manufacturerName"
  | "originCountry"
  | "packSize"
  | "branchName"
  | "orgName"
  | "printDate"
  | "customText1"
  | "customText2";

export type LabelFieldsVisibility = Record<LabelFieldKey, boolean>;

export type LabelTemplateConfig = {
  sizePreset: LabelSizePresetId;
  codeMode: LabelCodeMode;
  fields: LabelFieldsVisibility;
  fontScale: FontScaleOption | number;
  compactMode: boolean;
  productNameBold: boolean;
  showBorder: boolean;
  textAlign: TextAlignOption;
  barcodeHeight: BarcodeHeightOption;
  qrSize: QrSizeOption;
  customText1: string;
  customText2: string;
  selectedTemplate: string;
};

export const ALL_LABEL_FIELDS: LabelFieldKey[] = [
  "productName",
  "variantTitle",
  "brand",
  "sku",
  "barcodeText",
  "mrp",
  "sellingPrice",
  "batchNo",
  "mfgDate",
  "expiryDate",
  "producerName",
  "importerName",
  "supplierName",
  "manufacturerName",
  "originCountry",
  "packSize",
  "branchName",
  "orgName",
  "printDate",
  "customText1",
  "customText2",
];

const BATCH_DEFAULT_KEYS: LabelFieldKey[] = ["productName", "sku", "barcodeText", "mrp", "batchNo", "expiryDate"];
const SKU_DEFAULT_KEYS: LabelFieldKey[] = ["productName", "sku", "barcodeText", "mrp"];

export function makeFields(enabled: LabelFieldKey[]): LabelFieldsVisibility {
  return ALL_LABEL_FIELDS.reduce((acc, k) => {
    acc[k] = enabled.includes(k);
    return acc;
  }, {} as LabelFieldsVisibility);
}

export const DEFAULT_BATCH_LABEL_FIELDS: LabelFieldsVisibility = makeFields(BATCH_DEFAULT_KEYS);
export const DEFAULT_SKU_LABEL_FIELDS: LabelFieldsVisibility = makeFields(SKU_DEFAULT_KEYS);
export const DEFAULT_LABEL_FIELDS: LabelFieldsVisibility = { ...DEFAULT_BATCH_LABEL_FIELDS };

export const DEFAULT_LABEL_TEMPLATE: LabelTemplateConfig = {
  sizePreset: "50x30",
  codeMode: "BARCODE_ONLY",
  fields: { ...DEFAULT_LABEL_FIELDS },
  fontScale: "normal",
  compactMode: false,
  productNameBold: true,
  showBorder: true,
  textAlign: "center",
  barcodeHeight: "normal",
  qrSize: "normal",
  customText1: "",
  customText2: "",
  selectedTemplate: "retail-mrp",
};

export type LabelDesignerPreset = {
  id: string;
  name: string;
  config: Partial<LabelTemplateConfig> & { fields: LabelFieldsVisibility };
};

export const LABEL_DESIGNER_PRESETS: LabelDesignerPreset[] = [
  {
    id: "compact-barcode",
    name: "Compact Barcode",
    config: {
      sizePreset: "30x20",
      codeMode: "BARCODE_ONLY",
      fields: makeFields(["productName", "barcodeText", "mrp"]),
      fontScale: "small",
      compactMode: true,
      barcodeHeight: "small",
      qrSize: "small",
      textAlign: "center",
      productNameBold: true,
      showBorder: true,
      selectedTemplate: "compact-barcode",
    },
  },
  {
    id: "retail-mrp",
    name: "Retail MRP",
    config: {
      sizePreset: "50x30",
      codeMode: "BARCODE_ONLY",
      fields: makeFields(["productName", "sku", "barcodeText", "mrp", "sellingPrice"]),
      fontScale: "normal",
      compactMode: false,
      barcodeHeight: "normal",
      qrSize: "normal",
      textAlign: "center",
      productNameBold: true,
      showBorder: true,
      selectedTemplate: "retail-mrp",
    },
  },
  {
    id: "medicine-expiry",
    name: "Medicine / Expiry",
    config: {
      sizePreset: "50x30",
      codeMode: "BARCODE_ONLY",
      fields: makeFields(["productName", "sku", "barcodeText", "mrp", "batchNo", "mfgDate", "expiryDate"]),
      fontScale: "normal",
      compactMode: true,
      barcodeHeight: "normal",
      qrSize: "normal",
      textAlign: "center",
      productNameBold: true,
      showBorder: true,
      selectedTemplate: "medicine-expiry",
    },
  },
  {
    id: "importer-label",
    name: "Importer Label",
    config: {
      sizePreset: "60x40",
      codeMode: "BARCODE_ONLY",
      fields: makeFields(["productName", "sku", "barcodeText", "mrp", "importerName", "manufacturerName", "originCountry", "customText1"]),
      fontScale: "normal",
      compactMode: false,
      barcodeHeight: "normal",
      qrSize: "normal",
      textAlign: "left",
      productNameBold: true,
      showBorder: true,
      selectedTemplate: "importer-label",
    },
  },
  {
    id: "qr-detail",
    name: "QR Detail",
    config: {
      sizePreset: "40x25",
      codeMode: "QR_ONLY",
      fields: makeFields(["productName", "sku", "barcodeText", "mrp", "expiryDate"]),
      fontScale: "small",
      compactMode: true,
      barcodeHeight: "small",
      qrSize: "normal",
      textAlign: "center",
      productNameBold: true,
      showBorder: true,
      selectedTemplate: "qr-detail",
    },
  },
  {
    id: "barcode-qr",
    name: "Barcode + QR",
    config: {
      sizePreset: "60x40",
      codeMode: "BARCODE_AND_QR",
      fields: makeFields(["productName", "sku", "barcodeText", "mrp", "batchNo", "expiryDate"]),
      fontScale: "normal",
      compactMode: false,
      barcodeHeight: "small",
      qrSize: "normal",
      textAlign: "center",
      productNameBold: true,
      showBorder: true,
      selectedTemplate: "barcode-qr",
    },
  },
];

const OWNER_KEY = "bpa_owner_label_template_v2";

export function staffLabelTemplateKey(branchId: string | number): string {
  return `bpa_staff_label_template_branch_${String(branchId)}_v2`;
}

export function singleLabelDesignerStorageKey(scope: string, type: "BATCH" | "SKU", id: string | number): string {
  return `bpa_single_label_designer_${scope}_${type}_${String(id)}_v1`;
}

export function normalizeCodeMode(mode: LabelCodeMode | string | undefined): "BARCODE_ONLY" | "QR_ONLY" | "BARCODE_AND_QR" {
  if (mode === "QR" || mode === "QR_ONLY") return "QR_ONLY";
  if (mode === "BARCODE_QR" || mode === "BARCODE_AND_QR") return "BARCODE_AND_QR";
  return "BARCODE_ONLY";
}

export function fontScaleMultiplier(value: LabelTemplateConfig["fontScale"]): number {
  if (typeof value === "number") {
    if (value <= 0) return 1;
    return Math.min(1.25, Math.max(0.85, value));
  }
  if (value === "small") return 0.9;
  if (value === "large") return 1.12;
  return 1;
}

function coerceSizePreset(value: unknown): LabelSizePresetId {
  if (["25x15", "30x20", "40x25", "50x30", "60x40", "80x50", "a4"].includes(String(value))) {
    return String(value) as LabelSizePresetId;
  }
  return DEFAULT_LABEL_TEMPLATE.sizePreset;
}

function coerceFontScale(value: unknown): FontScaleOption | number {
  if (value === "small" || value === "normal" || value === "large") return value;
  if (typeof value === "number" && value > 0 && value <= 1.5) return value;
  return DEFAULT_LABEL_TEMPLATE.fontScale;
}

export function mergeLabelTemplate(parsed: Partial<LabelTemplateConfig> | null | undefined): LabelTemplateConfig {
  const fields = { ...DEFAULT_LABEL_FIELDS, ...(parsed?.fields ?? {}) };
  return {
    sizePreset: coerceSizePreset(parsed?.sizePreset),
    codeMode: normalizeCodeMode(parsed?.codeMode) as LabelCodeMode,
    fields,
    fontScale: coerceFontScale(parsed?.fontScale),
    compactMode: Boolean(parsed?.compactMode),
    productNameBold: parsed?.productNameBold !== false,
    showBorder: parsed?.showBorder !== false,
    textAlign: parsed?.textAlign === "left" ? "left" : "center",
    barcodeHeight:
      parsed?.barcodeHeight === "small" || parsed?.barcodeHeight === "tall" ? parsed.barcodeHeight : "normal",
    qrSize: parsed?.qrSize === "small" || parsed?.qrSize === "large" ? parsed.qrSize : "normal",
    customText1: typeof parsed?.customText1 === "string" ? parsed.customText1 : "",
    customText2: typeof parsed?.customText2 === "string" ? parsed.customText2 : "",
    selectedTemplate: typeof parsed?.selectedTemplate === "string" ? parsed.selectedTemplate : DEFAULT_LABEL_TEMPLATE.selectedTemplate,
  };
}

export function defaultTemplateForType(type: "BATCH" | "SKU"): LabelTemplateConfig {
  return {
    ...DEFAULT_LABEL_TEMPLATE,
    fields: type === "BATCH" ? { ...DEFAULT_BATCH_LABEL_FIELDS } : { ...DEFAULT_SKU_LABEL_FIELDS },
    selectedTemplate: type === "BATCH" ? "medicine-expiry" : "retail-mrp",
  };
}

export function loadLabelTemplate(storageKey: string, fallback?: LabelTemplateConfig): LabelTemplateConfig {
  if (typeof window === "undefined") return mergeLabelTemplate(fallback ?? DEFAULT_LABEL_TEMPLATE);
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return mergeLabelTemplate(fallback ?? DEFAULT_LABEL_TEMPLATE);
    return mergeLabelTemplate({ ...(fallback ?? DEFAULT_LABEL_TEMPLATE), ...(JSON.parse(raw) as Partial<LabelTemplateConfig>) });
  } catch {
    return mergeLabelTemplate(fallback ?? DEFAULT_LABEL_TEMPLATE);
  }
}

export function saveLabelTemplate(storageKey: string, cfg: LabelTemplateConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}

export function loadOwnerLabelTemplate(): LabelTemplateConfig {
  return loadLabelTemplate(OWNER_KEY);
}

export function saveOwnerLabelTemplate(cfg: LabelTemplateConfig): void {
  saveLabelTemplate(OWNER_KEY, cfg);
}

export function labelFieldDensityWarning(presetId: string, cfg: LabelTemplateConfig): string | null {
  const visibleCount = Object.entries(cfg.fields).filter(([key, value]) => {
    if (!value) return false;
    if (key === "customText1") return cfg.customText1.trim().length > 0;
    if (key === "customText2") return cfg.customText2.trim().length > 0;
    return true;
  }).length;
  const small = presetId === "25x15" || presetId === "30x20" || presetId === "40x25";
  if (small && visibleCount > 6) {
    return "Too many fields selected for this label size. Some text may be clipped.";
  }
  if (presetId === "50x30" && visibleCount > 10) {
    return "Too many fields selected for this label size. Some text may be clipped.";
  }
  return null;
}

export function mapPresetToLayoutId(sizePreset: LabelSizePresetId): string {
  return sizePreset;
}
