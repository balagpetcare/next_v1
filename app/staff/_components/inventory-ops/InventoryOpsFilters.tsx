"use client";

import LkInput from "@larkon-ui/components/LkInput";
import LkSelect from "@larkon-ui/components/LkSelect";
import type { ReactNode } from "react";

export type FilterConfig = {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  search?: string;
  typeOrDirection?: string;
};

type InventoryOpsFiltersProps = {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  statusOptions?: { value: string; label: string }[];
  status?: string;
  onStatusChange?: (v: string) => void;
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  extra?: ReactNode;
  className?: string;
};

export function InventoryOpsFilters({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  statusOptions,
  status = "",
  onStatusChange,
  search = "",
  onSearchChange,
  searchPlaceholder = "Search ref, product, SKU…",
  extra,
  className = "",
}: InventoryOpsFiltersProps) {
  return (
    <div className={`d-flex flex-wrap align-items-end gap-16 mb-16 ${className}`}>
      <div className="d-flex align-items-end gap-8">
        <label className="small text-secondary-light mb-0 me-8">From</label>
        <LkInput
          type="date"
          size="sm"
          className="radius-12"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
        />
      </div>
      <div className="d-flex align-items-end gap-8">
        <label className="small text-secondary-light mb-0 me-8">To</label>
        <LkInput
          type="date"
          size="sm"
          className="radius-12"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
        />
      </div>
      {statusOptions?.length && onStatusChange ? (
        <LkSelect
          size="sm"
          className="radius-12"
          style={{ minWidth: 140 }}
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </LkSelect>
      ) : null}
      {onSearchChange ? (
        <LkInput
          type="search"
          size="sm"
          className="radius-12"
          style={{ minWidth: 180 }}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      ) : null}
      {extra}
    </div>
  );
}
