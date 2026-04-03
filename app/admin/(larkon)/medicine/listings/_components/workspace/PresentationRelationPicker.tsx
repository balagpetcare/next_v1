"use client";

import { useEffect, useRef, useState } from "react";
import { adminMedicineWorkspaceApi } from "@/lib/adminApi";
import { useDebouncedValue } from "../../_lib/useDebouncedValue";

export type PresentationOption = { id: number; label: string };

type Props = {
  label: string;
  genericId: number | null;
  dosageFormId: number | null;
  value: PresentationOption | null;
  onChange: (v: PresentationOption | null) => void;
  disabled?: boolean;
};

export default function PresentationRelationPicker({ label, genericId, dosageFormId, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 250);
  const [opts, setOpts] = useState<PresentationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const ready = genericId != null && dosageFormId != null;

  useEffect(() => {
    if (!open || !ready) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await adminMedicineWorkspaceApi.presentationsList({
          genericId: genericId!,
          dosageFormId: dosageFormId!,
          search: debounced.trim() || undefined,
          limit: 40,
          page: 1,
        });
        const items = (r.data?.items ?? []) as Array<{
          id: number;
          strengthDisplay: string;
          generic?: { displayName?: string };
          dosageForm?: { displayName?: string };
        }>;
        if (!cancelled) {
          setOpts(
            items.map((x) => ({
              id: x.id,
              label: `${x.strengthDisplay} · ${x.generic?.displayName ?? ""} / ${x.dosageForm?.displayName ?? ""}`.trim(),
            }))
          );
        }
      } catch {
        if (!cancelled) setOpts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, ready, debounced, genericId, dosageFormId]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="position-relative" ref={wrapRef}>
      <label className="form-label small">{label}</label>
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm w-100 text-start d-flex justify-content-between align-items-center radius-8"
        disabled={disabled || !ready}
        onClick={() => ready && setOpen((v) => !v)}
        aria-expanded={open}
        title={!ready ? "Select generic and dosage form first" : undefined}
      >
        <span className="text-truncate">{value ? value.label : ready ? "Select strength / presentation…" : "—"}</span>
        <i className={`ri-arrow-${open ? "up" : "down"}-s-line flex-shrink-0 ms-1`} aria-hidden />
      </button>
      {open && ready ? (
        <div
          className="border rounded-3 shadow-sm bg-body p-2 mt-1 position-absolute start-0 end-0"
          style={{ zIndex: 60, maxHeight: 280, overflow: "auto" }}
        >
          <input
            className="form-control form-control-sm mb-2"
            placeholder="Filter by strength…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <button type="button" className="btn btn-link btn-sm p-0 mb-2" onClick={() => onChange(null)}>
            Clear selection
          </button>
          {loading ? <div className="small text-muted py-2">Loading…</div> : null}
          {!loading &&
            opts.map((o) => (
              <button
                key={o.id}
                type="button"
                className="btn btn-light btn-sm w-100 text-start text-truncate mb-1"
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            ))}
          {!loading && opts.length === 0 ? <div className="small text-muted">No presentations — create one from strength</div> : null}
        </div>
      ) : null}
    </div>
  );
}
