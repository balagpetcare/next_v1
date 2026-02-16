"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COUNTRIES } from "@/lib/location/countries";
import { getFlagEmoji } from "@/src/shared/flags/getFlagEmoji";

export interface CountryOption {
  code: string;
  name: string;
}

export interface CountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  countries?: CountryOption[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  onBlur?: () => void;
}

const DEFAULT_COUNTRIES: CountryOption[] = COUNTRIES.map((c) => ({
  code: c.code,
  name: c.name,
}));

/**
 * Searchable country select with flag emoji on every option.
 * Value is ISO 3166-1 alpha-2 code. Uses lib/location/countries by default.
 */
export default function CountrySelect({
  value,
  onChange,
  countries = DEFAULT_COUNTRIES,
  label,
  placeholder = "Select country...",
  disabled = false,
  error,
  onBlur,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countries, search]);

  const selected = useMemo(
    () => countries.find((c) => c.code.toUpperCase() === value?.toUpperCase()),
    [countries, value]
  );

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
    (code: string) => {
      onChange(code);
      setOpen(false);
      setSearch("");
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, code: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelect(code);
      }
    },
    [handleSelect]
  );

  const displayText = selected
    ? `${getFlagEmoji(selected.code)} ${selected.name}`
    : "";

  return (
    <div ref={containerRef} className="position-relative">
      {label && (
        <label className="form-label small text-muted mb-1 d-block">
          {label}
        </label>
      )}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="country-listbox"
        aria-label={label || "Country"}
        tabIndex={disabled ? -1 : 0}
        className={`form-control radius-12 d-flex align-items-center justify-content-between gap-2 text-start ${
          error ? "is-invalid border-danger" : ""
        }`}
        style={{
          minHeight: 38,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
      >
        <span className="text-truncate flex-grow-1">
          {displayText || (
            <span className="text-muted">{placeholder}</span>
          )}
        </span>
        <span className="text-muted flex-shrink-0" style={{ fontSize: 10 }}>
          ▼
        </span>
      </div>
      {error && (
        <div className="invalid-feedback d-block">{error}</div>
      )}
      {open && (
        <div
          id="country-listbox"
          role="listbox"
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
              onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
              onClick={(e) => e.stopPropagation()}
              aria-label="Search country"
            />
          </div>
          <div style={{ maxHeight: 220, overflow: "auto" }}>
            {filtered.length === 0 ? (
              <div className="p-3 text-muted small">No countries found</div>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.code}
                  role="option"
                  aria-selected={c.code === value}
                  tabIndex={0}
                  className={`list-group-item list-group-item-action border-0 w-100 text-start py-2 d-flex align-items-center gap-2 ${
                    c.code === value ? "active" : ""
                  }`}
                  onClick={() => handleSelect(c.code)}
                  onKeyDown={(e) => handleKeyDown(e, c.code)}
                >
                  <span aria-hidden="true">{getFlagEmoji(c.code)}</span>
                  <span>{c.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
