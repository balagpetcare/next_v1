"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchLocationMasterList, type LocationMasterItem } from "./locationMasterClient";
import { useDebouncedValue } from "./useDebouncedValue";

export type LocationSelectionOption = {
  id: number;
  name: string;
};

type Props = {
  endpoint: "divisions" | "districts" | "upazilas" | "unions";
  label: string;
  valueId?: string | number | null;
  onChange: (next: LocationSelectionOption | null) => void;
  parentParamKey?: "divisionId" | "districtId" | "upazilaId";
  parentId?: string | number | null;
  locale?: "en" | "bn";
  disabled?: boolean;
  placeholder?: string;
};

export default function LocationMasterDropdown({
  endpoint,
  label,
  valueId,
  onChange,
  parentParamKey,
  parentId,
  locale = "en",
  disabled = false,
  placeholder = "Select...",
}: Props) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [items, setItems] = useState<LocationMasterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const normalizedParentId = useMemo(() => {
    const n = Number(parentId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [parentId]);

  const selectedValue = valueId == null || valueId === "" ? "" : String(valueId);

  useEffect(() => {
    if (parentParamKey && !normalizedParentId) {
      setItems([]);
      setErrorText("");
      return;
    }
    let active = true;
    setLoading(true);
    setErrorText("");
    const params: Record<string, string | number | undefined> = {
      q: debouncedSearch.trim() || undefined,
      pageSize: 80,
      locale,
    };
    if (parentParamKey && normalizedParentId) params[parentParamKey] = normalizedParentId;

    fetchLocationMasterList(endpoint, params)
      .then((rows) => {
        if (!active) return;
        setItems(rows);
      })
      .catch((e) => {
        if (!active) return;
        setItems([]);
        setErrorText(e instanceof Error ? e.message : "Failed to load options");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [endpoint, debouncedSearch, locale, parentParamKey, normalizedParentId]);

  const effectiveDisabled = disabled || (parentParamKey ? !normalizedParentId : false);

  return (
    <div>
      <label className="form-label small fw-medium">{label}</label>
      <input
        type="text"
        className="form-control form-control-sm radius-12 mb-2"
        placeholder={`Search ${label.toLowerCase()}...`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={effectiveDisabled}
      />
      <select
        className="form-select radius-12"
        value={selectedValue}
        onChange={(e) => {
          const id = Number(e.target.value);
          if (!Number.isFinite(id) || id <= 0) {
            onChange(null);
            return;
          }
          const match = items.find((x) => x.id === id);
          onChange(match ? { id: match.id, name: locale === "bn" ? (match.nameBn || match.nameEn) : match.nameEn } : null);
        }}
        disabled={effectiveDisabled}
      >
        <option value="">{loading ? "Loading..." : placeholder}</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {locale === "bn" ? item.nameBn || item.nameEn : item.nameEn}
          </option>
        ))}
      </select>
      {errorText ? <div className="text-danger small mt-1">{errorText}</div> : null}
    </div>
  );
}

