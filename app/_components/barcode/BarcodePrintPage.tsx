"use client";

import BarcodeLabelPreview, { type LabelPayload } from "./BarcodeLabelPreview";
import LabelTemplateSelector from "./LabelTemplateSelector";
import type { LabelTemplateConfig } from "./labelTemplateConfig";
import "./barcodePrint.css";

export default function BarcodePrintPage({
  labels,
  presetId,
  onPresetChange,
  title = "Print labels",
  template,
  printDate,
}: {
  labels: LabelPayload[];
  presetId: string;
  onPresetChange: (v: string) => void;
  title?: string;
  template?: LabelTemplateConfig;
  printDate?: string;
}) {
  return (
    <div className="min-h-100">
      <div className="barcode-print-toolbar no-print d-flex flex-wrap align-items-center gap-3 justify-content-between">
        <h6 className="mb-0 fw-semibold">{title}</h6>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <LabelTemplateSelector value={presetId} onChange={onPresetChange} />
          <button type="button" className="btn btn-sm btn-primary" onClick={() => window.print()}>
            <i className="ri-printer-line me-1" aria-hidden />
            Print
          </button>
        </div>
      </div>
      <div className="barcode-print-grid">
        {labels.map((lb, idx) => (
          <BarcodeLabelPreview key={idx} label={lb} presetId={presetId} template={template} printDate={printDate} />
        ))}
      </div>
    </div>
  );
}
