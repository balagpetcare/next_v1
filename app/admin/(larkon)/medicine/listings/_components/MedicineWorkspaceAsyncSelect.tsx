"use client";

import { useEffect, useRef, useState } from "react";
import { adminMedicineWorkspaceApi } from "@/lib/adminApi";
import { useDebouncedValue } from "../_lib/useDebouncedValue";

export type AsyncEntityOption = { id: number; label: string };

type Kind = "generic" | "brand" | "dosageForm" | "manufacturer";

type Props = {
  label: string;
  placeholder?: string;
  value: AsyncEntityOption | null;
  onChange: (v: AsyncEntityOption | null) => void;
  kind: Kind;
  disabled?: boolean;
};

async function fetchOptions(kind: Kind, search: string): Promise<AsyncEntityOption[]> {
  const s = search.trim();
  const limit = 25;
  if (kind === "generic") {
    const r = await adminMedicineWorkspaceApi.genericsList({ search: s || undefined, limit, page: 1 });
    const items = (r.data?.items ?? []) as { id: number; displayName: string }[];
    return items.map((x) => ({ id: x.id, label: x.displayName }));
  }
  if (kind === "brand") {
    const r = await adminMedicineWorkspaceApi.brandsList({ search: s || undefined, limit, page: 1 });
    const items = (r.data?.items ?? []) as { id: number; displayName: string }[];
    return items.map((x) => ({ id: x.id, label: x.displayName }));
  }
  if (kind === "dosageForm") {
    const r = await adminMedicineWorkspaceApi.dosageFormsList({ search: s || undefined, limit, page: 1 });
    const items = (r.data?.items ?? []) as { id: number; displayName: string }[];
    return items.map((x) => ({ id: x.id, label: x.displayName }));
  }
  const r = await adminMedicineWorkspaceApi.manufacturersList({ search: s || undefined, limit, page: 1 });
  const items = (r.data?.items ?? []) as { id: number; displayName: string }[];
  return items.map((x) => ({ id: x.id, label: x.displayName }));
}

/** Searchable picker backed by medicine workspace master lists (generics, brands, dosage forms, manufacturers). */
export default function MedicineWorkspaceAsyncSelect({ label, placeholder, value, onChange, kind, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 250);
  const [opts, setOpts] = useState<AsyncEntityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await fetchOptions(kind, debounced);
        if (!cancelled) setOpts(list);
      } catch {
        if (!cancelled) setOpts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, debounced, kind]);

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
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-truncate">{value ? value.label : placeholder || "Any"}</span>
        <i className={`ri-arrow-${open ? "up" : "down"}-s-line flex-shrink-0 ms-1`} aria-hidden />
      </button>
      {open ? (
        <div
          className="border rounded-3 shadow-sm bg-body p-2 mt-1 position-absolute start-0 end-0"
          style={{ zIndex: 60, maxHeight: 280, overflow: "auto" }}
        >
          <input
            className="form-control form-control-sm mb-2"
            placeholder="Type to search…"
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
          {!loading && opts.length === 0 ? <div className="small text-muted">No matches</div> : null}
        </div>
      ) : null}
    </div>
  );
}
