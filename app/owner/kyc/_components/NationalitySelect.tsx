"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NATIONALITIES } from "../_data/nationalities";
import type { NationalityOption } from "../_data/nationalities";
import { getFlagEmoji } from "@/src/shared/flags/getFlagEmoji";

export interface NationalitySelectProps {
  value: string;
  onChange: (code: string, option?: NationalityOption) => void;
  placeholder?: string;
  disabled?: boolean;
  /** For react-hook-form Controller: passes (code) only */
  onBlur?: () => void;
}

/**
 * Searchable nationality combobox.
 * Value stored is ISO countryCode (2-letter). Display: "Bangladeshi — Bangladesh".
 * Compatible with react-hook-form Controller: value/onChange/onBlur.
 */
export default function NationalitySelect({
  value,
  onChange,
  placeholder = "Select nationality...",
  disabled = false,
  onBlur,
}: NationalitySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => NATIONALITIES.find((n) => n.countryCode === value || n.code === value),
    [value]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return NATIONALITIES;
    return NATIONALITIES.filter((n) => {
      const demo = n.demonym.toLowerCase();
      const label = n.label.toLowerCase();
      const code = n.countryCode.toLowerCase();
      return demo.includes(q) || label.includes(q) || code.includes(q);
    });
  }, [search]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    };
    document.addEventListener("click", fn);
    return () => document.removeEventListener("click", fn);
  }, [onBlur]);

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleSelect = useCallback(
    (opt: NationalityOption) => {
      onChange(opt.countryCode, opt);
      setOpen(false);
      setSearch("");
    },
    [onChange]
  );

  const displayText = selected
    ? `${getFlagEmoji(selected.countryCode)} ${selected.demonym} — ${selected.label}`
    : "";

  return (
    <div ref={containerRef} className="position-relative">
      <div
        className="form-control radius-12 d-flex align-items-center justify-content-between gap-2 text-start"
        style={{
          minHeight: 38,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className="text-truncate flex-grow-1">
          {displayText || <span className="text-muted">{placeholder}</span>}
        </span>
        <span className="text-muted flex-shrink-0" style={{ fontSize: 10 }}>
          ▼
        </span>
      </div>
      {open && (
        <div
          className="border rounded bg-white shadow position-absolute start-0 end-0 mt-1"
          style={{ zIndex: 1050, maxHeight: 300, overflow: "hidden" }}
        >
          <div className="p-2 border-bottom">
            <input
              ref={inputRef}
              type="text"
              className="form-control form-control-sm"
              placeholder="Type to search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
              onClick={(e) => e.stopPropagation()}
              aria-label="Search nationality"
            />
          </div>
          <div style={{ maxHeight: 240, overflow: "auto" }}>
            {filtered.length === 0 ? (
              <div className="p-3 text-muted small">No nationalities found</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.countryCode}
                  type="button"
                  className={`list-group-item list-group-item-action border-0 w-100 text-start py-2 d-flex align-items-center gap-2 ${opt.countryCode === value ? "active" : ""}`}
                  onClick={() => handleSelect(opt)}
                >
                  <span aria-hidden="true">{getFlagEmoji(opt.countryCode)}</span>
                  <span className="fw-medium">{opt.demonym}</span>
                  <span className="text-muted">— {opt.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
