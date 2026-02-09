"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

export type SearchableSelectProps = {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  /** Optional: allow clearing selection */
  clearable?: boolean;
};

/**
 * Searchable dropdown: type to filter, click to select. Value must be one of the options (no free text).
 */
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  label,
  clearable = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, search]);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value || o.label === value),
    [options, value]
  );
  const displayValue = selectedOption ? selectedOption.label : value || "";

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", fn);
    return () => document.removeEventListener("click", fn);
  }, []);

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleSelect = useCallback(
    (option: SearchableSelectOption) => {
      onChange(option.value);
      setOpen(false);
      setSearch("");
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange("");
      setOpen(false);
    },
    [onChange]
  );

  return (
    <div ref={containerRef} className="position-relative">
      {label ? (
        <label className="form-label small text-muted mb-1 d-block">{label}</label>
      ) : null}
      <div
        className="form-control radius-12 d-flex align-items-center justify-content-between gap-2 text-start"
        style={{
          minHeight: 38,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className="text-truncate flex-grow-1">
          {displayValue || <span className="text-muted">{placeholder}</span>}
        </span>
        <span className="d-flex align-items-center gap-1 flex-shrink-0">
          {clearable && value ? (
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-muted"
              onClick={handleClear}
              aria-label="Clear"
            >
              ×
            </button>
          ) : null}
          <span className="text-muted" style={{ fontSize: 10 }}>
            ▼
          </span>
        </span>
      </div>
      {open && (
        <div
          className="border rounded bg-white shadow position-absolute start-0 end-0 mt-1"
          style={{ zIndex: 1050, maxHeight: 280, overflow: "hidden" }}
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
            />
          </div>
          <div style={{ maxHeight: 220, overflow: "auto" }}>
            {filtered.length === 0 ? (
              <div className="p-3 text-muted small">No options found</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`list-group-item list-group-item-action border-0 w-100 text-start ${opt.value === value || opt.label === value ? "active" : ""}`}
                  onClick={() => handleSelect(opt)}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
