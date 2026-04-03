"use client";

import { useEffect, useState } from "react";

export type TemplateListItem = { id: number; name: string; scope: string; itemCount: number };

type Props = {
  open: boolean;
  onClose: () => void;
  templates: TemplateListItem[];
  loading: boolean;
  onApply: (templateId: number, mode: "merge" | "replace") => void;
  applying: boolean;
};

export default function TemplatePickerModal({
  open,
  onClose,
  templates,
  loading,
  onApply,
  applying,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setMode("merge");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content radius-12">
          <div className="modal-header">
            <h5 className="modal-title">Apply assignment template</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body">
            {loading ? (
              <p className="text-muted mb-0">Loading templates…</p>
            ) : templates.length === 0 ? (
              <p className="text-muted mb-0">No templates yet. Create one via API or future UI.</p>
            ) : (
              <>
                <div className="list-group mb-3">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`list-group-item list-group-item-action ${selectedId === t.id ? "active" : ""}`}
                      onClick={() => setSelectedId(t.id)}
                    >
                      <div className="d-flex justify-content-between">
                        <span>{t.name}</span>
                        <span className="small">{t.itemCount} services</span>
                      </div>
                      <div className="small opacity-75">{t.scope}</div>
                    </button>
                  ))}
                </div>
                <div className="mb-2">
                  <label className="form-label small text-muted mb-1">Mode</label>
                  <select
                    className="form-select form-select-sm"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as "merge" | "replace")}
                  >
                    <option value="merge">Merge (add/update only)</option>
                    <option value="replace">Replace (clear doctor assignments first)</option>
                  </select>
                </div>
                {mode === "replace" && (
                  <div className="alert alert-warning small py-2 mb-0">
                    Replace removes all current service assignments for this doctor, then applies the template.
                  </div>
                )}
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary btn-sm radius-8" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm radius-8"
              disabled={!selectedId || applying || templates.length === 0}
              onClick={() => selectedId != null && onApply(selectedId, mode)}
            >
              {applying ? "Applying…" : "Apply"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
