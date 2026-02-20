"use client";

import { useEffect, useRef, useState } from "react";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

export type VariantOption = {
  id: number;
  sku: string;
  title: string;
  barcode?: string | null;
  productId: number;
  requiresLot?: boolean;
  requiresExpiry?: boolean;
  requiresMfg?: boolean;
  product?: { id: number; name: string; slug: string };
};

type VariantSelectorProps = {
  value: VariantOption | null;
  onChange: (v: VariantOption | null) => void;
  disabled?: boolean;
  placeholder?: string;
  /** When set, fetch balance and show "Current stock: N" */
  locationId?: string;
  /** Optional scan icon (UI only) */
  showScanIcon?: boolean;
};

export function VariantSelector({
  value,
  onChange,
  disabled,
  placeholder = "Search by SKU, name, barcode…",
  locationId,
  showScanIcon = false,
}: VariantSelectorProps) {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<VariantOption[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!search || search.length < 2) {
      setOptions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await ownerGet<{ data?: VariantOption[] }>(
          `/api/v1/inventory/variants/search?q=${encodeURIComponent(search)}&limit=25`
        );
        setOptions(Array.isArray(res?.data) ? res.data : []);
      } catch {
        setOptions([]);
      }
      debounceRef.current = null;
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  useEffect(() => {
    if (!locationId || !value?.id) {
      setBalance(null);
      return;
    }
    setLoadingBalance(true);
    ownerGet<{ data?: { onHandQty?: number } }>(
      `/api/v1/inventory/balance?locationId=${locationId}&variantId=${value.id}`
    )
      .then((res) => {
        const qty = res?.data?.onHandQty;
        setBalance(typeof qty === "number" ? qty : null);
      })
      .catch(() => setBalance(null))
      .finally(() => setLoadingBalance(false));
  }, [locationId, value?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const select = (v: VariantOption) => {
    onChange(v);
    setSearch("");
    setOptions([]);
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setSearch("");
    setOptions([]);
    setBalance(null);
    setOpen(false);
  };

  const isSearching = open && search.length >= 2;

  return (
    <div className="position-relative" ref={containerRef}>
      <div className="d-flex align-items-center gap-1">
        {value ? (
          <div className="flex-grow-1 d-flex align-items-center justify-content-between border rounded px-2 py-1 bg-light">
            <span className="small">
              {value.product?.name ?? value.title} — {value.sku}
              {(value.requiresLot || value.requiresExpiry) && (
                <span className="badge bg-secondary ms-1">Lot/Exp</span>
              )}
            </span>
            <button type="button" className="btn btn-link btn-sm p-0 ms-1" onClick={clear} aria-label="Clear">
              ×
            </button>
          </div>
        ) : (
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder={placeholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            disabled={disabled}
            aria-autocomplete="list"
            aria-expanded={isSearching && options.length > 0}
          />
        )}
        {showScanIcon && (
          <button type="button" className="btn btn-outline-secondary btn-sm" title="Scan (no scanner lib)" disabled>
            <span className="ri-barcode-line" aria-hidden />
          </button>
        )}
      </div>
      {value && locationId && (
        <div className="small text-muted mt-1">
          {loadingBalance ? "Loading stock…" : balance !== null ? `Current stock at location: ${balance} units` : "—"}
        </div>
      )}
      {isSearching && options.length > 0 && (
        <ul
          className="list-group position-absolute mt-0 shadow-sm"
          style={{ zIndex: 20, maxHeight: 220, overflow: "auto" }}
          role="listbox"
        >
          {options.map((v) => (
            <li
              key={v.id}
              className="list-group-item list-group-item-action py-1 small"
              style={{ cursor: "pointer" }}
              role="option"
              onMouseDown={() => select(v)}
            >
              {v.product?.name ?? v.title} — {v.sku}
              {(v.requiresLot || v.requiresExpiry) && <span className="badge bg-secondary ms-1">Lot/Exp</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
