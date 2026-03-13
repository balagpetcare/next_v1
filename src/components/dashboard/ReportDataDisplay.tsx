"use client";

import { useCallback, useState } from "react";
import { formatValueForDisplay, humanizeFieldLabel, humanizeEnum } from "@/src/lib/displayFormatters";

function objectToCsvRow(obj: Record<string, unknown>, keys: string[]): string {
  return keys
    .map((k) => {
      const v = obj[k];
      const s = v == null ? "" : String(v);
      const escaped = s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
      return escaped;
    })
    .join(",");
}

function dataToCsv(data: unknown): string {
  if (data == null) return "";
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    if (typeof first === "object" && first !== null && !Array.isArray(first)) {
      const keys = Array.from(new Set(data.flatMap((item) => (typeof item === "object" && item != null ? Object.keys(item as Record<string, unknown>) : []))));
      const headers = keys.map((k) => humanizeFieldLabel(k));
      const headerRow = headers.map((h) => (h.includes(",") ? `"${h}"` : h)).join(",");
      const rows = data.map((item) => objectToCsvRow((item as Record<string, unknown>) ?? {}, keys));
      return [headerRow, ...rows].join("\n");
    }
  }
  if (typeof data === "object" && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    const keys = Object.keys(obj).filter((k) => obj[k] !== undefined && obj[k] !== null);
    const headerRow = keys.map((k) => humanizeFieldLabel(k)).map((h) => (h.includes(",") ? `"${h}"` : h)).join(",");
    const valueRow = keys.map((k) => formatValueForDisplay(obj[k])).map((s) => (s.includes(",") ? `"${s}"` : s)).join(",");
    return [headerRow, valueRow].join("\n");
  }
  return String(data);
}

function dataToCopyText(data: unknown): string {
  if (data == null) return "";
  const csv = dataToCsv(data);
  if (csv) return csv;
  return formatValueForDisplay(data);
}

/**
 * Renders report/API payload data in human-readable form (no raw JSON).
 * Use for settlement summary, profitability, doctor contribution, billing summary, etc.
 * Optional: showExport adds Copy and Export CSV; arrays of objects can render as table.
 */
export default function ReportDataDisplay({
  data,
  className = "",
  style,
  maxHeight,
  showExport = false,
  asTable = false,
}: {
  data: unknown;
  className?: string;
  style?: React.CSSProperties;
  maxHeight?: number;
  /** Show Copy and Export CSV buttons (client-side only). */
  showExport?: boolean;
  /** When true and data is array of objects, render as <table>. */
  asTable?: boolean;
}) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "ok" | "fail">("idle");

  const handleCopy = useCallback(() => {
    const text = dataToCopyText(data);
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => {
        setCopyStatus("ok");
        setTimeout(() => setCopyStatus("idle"), 2000);
      },
      () => setCopyStatus("fail")
    );
  }, [data]);

  const handleExportCsv = useCallback(() => {
    const csv = dataToCsv(data);
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  if (data === null || data === undefined) {
    return <p className="text-muted small mb-0">No data.</p>;
  }

  const containerStyle: React.CSSProperties = {
    ...(maxHeight != null ? { maxHeight, overflow: "auto" } : {}),
    ...style,
  };

  const isArrayOfObjects = Array.isArray(data) && data.length > 0 && data.every((item) => typeof item === "object" && item !== null && !Array.isArray(item));
  const useTable = asTable && isArrayOfObjects;

  const exportBar = showExport && (typeof data === "object") && (
    <div className="d-flex align-items-center gap-2 mb-2 small">
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleCopy}>
        {copyStatus === "ok" ? "Copied!" : copyStatus === "fail" ? "Copy failed" : "Copy"}
      </button>
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleExportCsv}>
        Export CSV
      </button>
    </div>
  );

  if (typeof data !== "object") {
    return (
      <div className={`small ${className}`.trim()} style={containerStyle}>
        {exportBar}
        {formatValueForDisplay(data)}
      </div>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div className={`small ${className}`.trim()}>
          {exportBar}
          <p className="text-muted mb-0">No items.</p>
        </div>
      );
    }
    if (useTable) {
      const rows = data as Record<string, unknown>[];
      const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r).filter((k) => r[k] !== undefined && r[k] !== null))));
      return (
        <div className={`small ${className}`.trim()} style={containerStyle}>
          {exportBar}
          <div className="table-responsive">
            <table className="table table-sm table-bordered mb-0">
              <thead className="table-light">
                <tr>
                  {keys.map((k) => (
                    <th key={k} className="text-nowrap">{humanizeFieldLabel(k)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {keys.map((k) => (
                      <td key={k}>{typeof row[k] === "string" ? (humanizeEnum(row[k]) || row[k]) : formatValueForDisplay(row[k])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    return (
      <div className={`small ${className}`.trim()} style={containerStyle}>
        {exportBar}
        {data.map((item, i) => (
          <div key={i} className="mb-2 pb-2 border-bottom border-light">
            {typeof item === "object" && item !== null && !Array.isArray(item) ? (
              <KeyValueList obj={item as Record<string, unknown>} />
            ) : (
              <span>{formatValueForDisplay(item)}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  const obj = data as Record<string, unknown>;
  return (
    <div className={`small ${className}`.trim()} style={containerStyle}>
      {exportBar}
      <KeyValueList obj={obj} />
    </div>
  );
}

function KeyValueList({ obj }: { obj: Record<string, unknown> }) {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return <span className="text-muted">—</span>;
  return (
    <dl className="mb-0 row g-1">
      {entries.map(([key, value]) => (
        <span key={key} className="d-flex flex-wrap">
          <dt className="text-muted me-1 mb-0">{humanizeFieldLabel(key)}:</dt>
          <dd className="mb-0">{typeof value === "string" ? (humanizeEnum(value) || value) : formatValueForDisplay(value)}</dd>
        </span>
      ))}
    </dl>
  );
}
