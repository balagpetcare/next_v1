"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getFlagEmoji } from "@/src/shared/flags/getFlagEmoji";

/**
 * Locale -> country code mapping for flag display.
 * en -> US, bn -> BD. Documented in docs/ui-standards.md.
 */
export const LOCALE_TO_FLAG_COUNTRY: Record<string, string> = {
  en: "US",
  bn: "BD",
};

export interface LanguageOption {
  locale: string;
  label: string;
  /** Country code for flag (defaults from LOCALE_TO_FLAG_COUNTRY) */
  countryCode?: string;
}

const DEFAULT_LANGUAGES: LanguageOption[] = [
  { locale: "en", label: "English", countryCode: "US" },
  { locale: "bn", label: "বাংলা", countryCode: "BD" },
];

export interface LanguageSelectProps {
  value: string;
  onChange: (locale: string) => void;
  /** Override default en/bn options */
  options?: LanguageOption[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  onBlur?: () => void;
  /** Compact mode for headers (e.g. PublicHeader) */
  compact?: boolean;
}

/**
 * Language/locale select with flag emoji on every option.
 * Default: en (US flag), bn (BD flag). Value is locale code.
 */
export default function LanguageSelect({
  value,
  onChange,
  options = DEFAULT_LANGUAGES,
  label,
  placeholder = "Select language...",
  disabled = false,
  error,
  onBlur,
  compact = false,
}: LanguageSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.locale === value);
  const flagCode = selected?.countryCode ?? LOCALE_TO_FLAG_COUNTRY[value] ?? value?.toUpperCase().slice(0, 2);

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

  const handleSelect = useCallback(
    (locale: string) => {
      onChange(locale);
      setOpen(false);
    },
    [onChange]
  );

  const displayText = selected
    ? `${getFlagEmoji(selected.countryCode ?? LOCALE_TO_FLAG_COUNTRY[selected.locale])} ${selected.label}`
    : "";

  if (compact) {
    return (
      <div ref={containerRef} className="position-relative d-inline-block">
        <div
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={label || "Language"}
          tabIndex={disabled ? -1 : 0}
          className="d-flex align-items-center gap-1 cursor-pointer"
          style={{ cursor: disabled ? "not-allowed" : "pointer" }}
          onClick={() => !disabled && setOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen((o) => !o);
            }
          }}
        >
          <span>{getFlagEmoji(flagCode)}</span>
          <span className="text-muted" style={{ fontSize: 10 }}>▼</span>
        </div>
        {open && (
          <div
            role="listbox"
            className="border rounded bg-white shadow position-absolute mt-1 end-0"
            style={{ zIndex: 1050, minWidth: 140 }}
          >
            {options.map((opt) => (
              <div
                key={opt.locale}
                role="option"
                aria-selected={opt.locale === value}
                tabIndex={0}
                className={`list-group-item list-group-item-action border-0 w-100 text-start py-2 d-flex align-items-center gap-2 ${
                  opt.locale === value ? "active" : ""
                }`}
                onClick={() => handleSelect(opt.locale)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(opt.locale);
                  }
                }}
              >
                <span aria-hidden="true">
                  {getFlagEmoji(opt.countryCode ?? LOCALE_TO_FLAG_COUNTRY[opt.locale])}
                </span>
                <span>{opt.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

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
        aria-label={label || "Language"}
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
          role="listbox"
          className="border rounded bg-white shadow position-absolute start-0 end-0 mt-1"
          style={{ zIndex: 1050 }}
        >
          {options.map((opt) => (
            <div
              key={opt.locale}
              role="option"
              aria-selected={opt.locale === value}
              tabIndex={0}
              className={`list-group-item list-group-item-action border-0 w-100 text-start py-2 d-flex align-items-center gap-2 ${
                opt.locale === value ? "active" : ""
              }`}
              onClick={() => handleSelect(opt.locale)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(opt.locale);
                }
              }}
            >
              <span aria-hidden="true">
                {getFlagEmoji(opt.countryCode ?? LOCALE_TO_FLAG_COUNTRY[opt.locale])}
              </span>
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
