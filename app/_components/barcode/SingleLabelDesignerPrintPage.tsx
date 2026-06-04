"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BarcodeLabelPreview, { getLabelStockQuantity, type LabelPayload } from "./BarcodeLabelPreview";
import { BARCODE_LABEL_PRESETS } from "./labelPresets";
import type { LabelCodeMode, LabelFieldKey, LabelTemplateConfig } from "./labelTemplateConfig";
import {
  ALL_LABEL_FIELDS,
  LABEL_DESIGNER_PRESETS,
  defaultTemplateForType,
  labelFieldDensityWarning,
  loadLabelTemplate,
  normalizeCodeMode,
  saveLabelTemplate,
} from "./labelTemplateConfig";
import "./barcodePrint.css";

const FIELD_LABELS: Record<LabelFieldKey, string> = {
  productName: "Product Name",
  variantTitle: "Variant",
  brand: "Brand",
  sku: "SKU",
  barcodeText: "Barcode Text",
  mrp: "MRP",
  sellingPrice: "Selling Price",
  batchNo: "Lot / Batch No",
  mfgDate: "MFG Date",
  expiryDate: "EXP Date",
  producerName: "Producer Name",
  importerName: "Importer Name",
  supplierName: "Supplier Name",
  manufacturerName: "Manufacturer Name",
  originCountry: "Origin Country",
  packSize: "Pack Size / Net Weight",
  branchName: "Branch Name",
  orgName: "Company / Org Name",
  printDate: "Print Date",
  customText1: "Custom Text Line 1",
  customText2: "Custom Text Line 2",
};

function clampCopies(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(500, Math.max(1, Math.floor(value)));
}

function repeatedLabels(label: LabelPayload, copies: number): LabelPayload[] {
  return Array.from({ length: clampCopies(copies) }, () => label);
}

export default function SingleLabelDesignerPrintPage({
  label,
  labelType,
  title,
  backHref,
  backLabel,
  storageKey,
}: {
  label: LabelPayload;
  labelType: "BATCH" | "SKU";
  title: string;
  backHref: string;
  backLabel: string;
  storageKey: string;
}) {
  const fallback = useMemo(() => defaultTemplateForType(labelType), [labelType]);
  const [template, setTemplate] = useState<LabelTemplateConfig>(fallback);
  const [copies, setCopies] = useState(1);
  const [previewMode, setPreviewMode] = useState<"real" | "zoom">("zoom");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTemplate(loadLabelTemplate(storageKey, fallback));
    try {
      const raw = localStorage.getItem(`${storageKey}_copies`);
      setCopies(clampCopies(raw ? Number(raw) : 1));
    } catch {
      setCopies(1);
    }
    setLoaded(true);
  }, [fallback, storageKey]);

  const updateTemplate = (next: LabelTemplateConfig) => {
    setTemplate(next);
    if (loaded) saveLabelTemplate(storageKey, next);
  };

  const updateCopies = (next: number) => {
    const clamped = clampCopies(next);
    setCopies(clamped);
    if (loaded) {
      try {
        localStorage.setItem(`${storageKey}_copies`, String(clamped));
      } catch {
        /* ignore */
      }
    }
  };

  const presetId = template.sizePreset;
  const stockQty = getLabelStockQuantity(label);
  const labels = useMemo(() => repeatedLabels(label, copies), [label, copies]);
  const densityWarn = labelFieldDensityWarning(presetId, template);
  const selectedCodeMode = normalizeCodeMode(template.codeMode);
  const isA4 = presetId === "a4";

  const selectPresetTemplate = (presetIdValue: string) => {
    const preset = LABEL_DESIGNER_PRESETS.find((p) => p.id === presetIdValue);
    if (!preset) return;
    updateTemplate({
      ...template,
      ...preset.config,
      fields: { ...preset.config.fields },
      customText1: template.customText1,
      customText2: template.customText2,
      selectedTemplate: preset.id,
    });
  };

  const setField = (key: LabelFieldKey, value: boolean) => {
    updateTemplate({ ...template, fields: { ...template.fields, [key]: value } });
  };

  return (
    <div className="dashboard-main-body barcode-designer-page">
      <div className="barcode-designer-shell no-print">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div>
            <Link href={backHref} className="small">
              &larr; {backLabel}
            </Link>
            <h5 className="fw-semibold mb-0 mt-2">{title}</h5>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
            <i className="ri-printer-line me-1" aria-hidden />
            Print
          </button>
        </div>

        {densityWarn ? (
          <div className="alert alert-warning py-2 small" role="alert">
            {densityWarn}
          </div>
        ) : null}

        <div className="row g-3 align-items-start">
          <main className="col-xl-8">
            <section className="barcode-designer-preview-band border rounded bg-white">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 py-2 border-bottom">
                <div>
                  <div className="fw-semibold small">Live label preview</div>
                  <div className="text-muted small">{isA4 ? "A4 uses 50 x 30 mm labels in a sheet grid." : "Screen preview uses print dimensions in mm."}</div>
                </div>
                <div className="btn-group btn-group-sm" role="group" aria-label="Preview zoom">
                  <button
                    type="button"
                    className={`btn ${previewMode === "real" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setPreviewMode("real")}
                  >
                    Real size
                  </button>
                  <button
                    type="button"
                    className={`btn ${previewMode === "zoom" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setPreviewMode("zoom")}
                  >
                    Zoom
                  </button>
                </div>
              </div>
              <div className={`barcode-designer-live-preview barcode-designer-live-preview--${previewMode}`}>
                <BarcodeLabelPreview label={label} presetId={presetId} template={template} />
              </div>
            </section>

            <section className="barcode-designer-preview-band border rounded bg-white mt-3">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 py-2 border-bottom">
                <div>
                  <div className="fw-semibold small">Print area preview</div>
                  <div className="text-muted small">{copies} {copies === 1 ? "copy" : "copies"}</div>
                </div>
              </div>
              <div className="barcode-print-preview-scroll">
                <div className={`barcode-print-grid ${isA4 ? "barcode-print-grid--a4" : ""}`} id="barcode-print-area">
                  {labels.map((lb, idx) => (
                    <BarcodeLabelPreview key={idx} label={lb} presetId={presetId} template={template} />
                  ))}
                </div>
              </div>
            </section>
          </main>

          <aside className="col-xl-4">
            <div className="barcode-designer-settings border rounded bg-white">
              <div className="px-3 py-2 border-bottom">
                <div className="fw-semibold">Label settings</div>
                <div className="text-muted small">Saved locally for this route.</div>
              </div>

              <div className="barcode-designer-settings__body">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Template preset</label>
                  <select
                    className="form-select form-select-sm"
                    value={template.selectedTemplate}
                    onChange={(e) => selectPresetTemplate(e.target.value)}
                  >
                    {LABEL_DESIGNER_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Label size</label>
                    <select
                      className="form-select form-select-sm"
                      value={template.sizePreset}
                      onChange={(e) =>
                        updateTemplate({ ...template, sizePreset: e.target.value as LabelTemplateConfig["sizePreset"] })
                      }
                    >
                      {BARCODE_LABEL_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Code type</label>
                    <select
                      className="form-select form-select-sm"
                      value={selectedCodeMode}
                      onChange={(e) => updateTemplate({ ...template, codeMode: e.target.value as LabelCodeMode })}
                    >
                      <option value="BARCODE_ONLY">Barcode only</option>
                      <option value="QR_ONLY">QR only</option>
                      <option value="BARCODE_AND_QR">Barcode + QR</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Copies</label>
                  <div className="d-flex gap-2">
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      min={1}
                      max={500}
                      value={copies}
                      onChange={(e) => updateCopies(Number(e.target.value))}
                    />
                    {stockQty != null && stockQty > 0 ? (
                      <button type="button" className="btn btn-outline-secondary btn-sm text-nowrap" onClick={() => updateCopies(stockQty)}>
                        Stock qty
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Custom text</label>
                  <input
                    className="form-control form-control-sm mb-2"
                    value={template.customText1}
                    placeholder="Custom Text Line 1"
                    onChange={(e) => updateTemplate({ ...template, customText1: e.target.value })}
                  />
                  <input
                    className="form-control form-control-sm"
                    value={template.customText2}
                    placeholder="Custom Text Line 2"
                    onChange={(e) => updateTemplate({ ...template, customText2: e.target.value })}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Style</label>
                  <div className="row g-2">
                    <div className="col-6">
                      <select
                        className="form-select form-select-sm"
                        value={template.fontScale}
                        aria-label="Font scale"
                        onChange={(e) =>
                          updateTemplate({ ...template, fontScale: e.target.value as LabelTemplateConfig["fontScale"] })
                        }
                      >
                        <option value="small">Small font</option>
                        <option value="normal">Normal font</option>
                        <option value="large">Large font</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <select
                        className="form-select form-select-sm"
                        value={template.textAlign}
                        aria-label="Text alignment"
                        onChange={(e) =>
                          updateTemplate({ ...template, textAlign: e.target.value as LabelTemplateConfig["textAlign"] })
                        }
                      >
                        <option value="center">Center text</option>
                        <option value="left">Left text</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <select
                        className="form-select form-select-sm"
                        value={template.barcodeHeight}
                        aria-label="Barcode height"
                        onChange={(e) =>
                          updateTemplate({ ...template, barcodeHeight: e.target.value as LabelTemplateConfig["barcodeHeight"] })
                        }
                      >
                        <option value="small">Small barcode</option>
                        <option value="normal">Normal barcode</option>
                        <option value="tall">Tall barcode</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <select
                        className="form-select form-select-sm"
                        value={template.qrSize}
                        aria-label="QR size"
                        onChange={(e) => updateTemplate({ ...template, qrSize: e.target.value as LabelTemplateConfig["qrSize"] })}
                      >
                        <option value="small">Small QR</option>
                        <option value="normal">Normal QR</option>
                        <option value="large">Large QR</option>
                      </select>
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-3 mt-2">
                    <label className="form-check small">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={template.compactMode}
                        onChange={(e) => updateTemplate({ ...template, compactMode: e.target.checked })}
                      />
                      <span className="form-check-label">Compact</span>
                    </label>
                    <label className="form-check small">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={template.productNameBold}
                        onChange={(e) => updateTemplate({ ...template, productNameBold: e.target.checked })}
                      />
                      <span className="form-check-label">Bold name</span>
                    </label>
                    <label className="form-check small">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={template.showBorder}
                        onChange={(e) => updateTemplate({ ...template, showBorder: e.target.checked })}
                      />
                      <span className="form-check-label">Border</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="form-label small fw-semibold">Fields</label>
                  <div className="barcode-designer-field-list">
                    {ALL_LABEL_FIELDS.filter((key) => key !== "variantTitle").map((key) => (
                      <label key={key} className="form-check small mb-1">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={template.fields[key]}
                          onChange={(e) => setField(key, e.target.checked)}
                        />
                        <span className="form-check-label">{FIELD_LABELS[key]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="barcode-print-only">
        <div className={`barcode-print-grid ${isA4 ? "barcode-print-grid--a4" : ""}`} id="barcode-print-area-print">
          {labels.map((lb, idx) => (
            <BarcodeLabelPreview key={idx} label={lb} presetId={presetId} template={template} />
          ))}
        </div>
      </div>
    </div>
  );
}
