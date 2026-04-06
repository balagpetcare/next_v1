"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Select, {
  type FilterOptionOption,
  type SingleValue,
  type StylesConfig,
} from "react-select";
import { inventoryLocationsList, type InventoryLocationRow } from "@/lib/api";

export type HandoffDestinationOption = {
  value: number;
  label: string;
  location: InventoryLocationRow;
};

function branchTypeCode(branch: InventoryLocationRow["branch"]): string {
  const links = branch?.typeLinks;
  if (!links?.length) return "BRANCH";
  const primary = links.find((t) => t.isPrimary);
  const bt = primary?.branchType ?? links[0]?.branchType;
  return bt?.code ?? "BRANCH";
}

export function formatHandoffLocationLabel(loc: InventoryLocationRow): string {
  const b = loc.branch;
  const branchName = b?.name ?? "Branch";
  const typeCode = branchTypeCode(b);
  return `${loc.name} — ${branchName} (${typeCode})`;
}

type Props = {
  orgId: number | null | undefined;
  sourceLocationId: number | null | undefined;
  value: number | null;
  onChange: (locationId: number | null) => void;
  disabled?: boolean;
  id?: string;
};

const selectStyles: StylesConfig<HandoffDestinationOption, false> = {
  control: (base) => ({ ...base, minHeight: 38 }),
  menu: (base) => ({ ...base, zIndex: 20 }),
};

export function HandoffDestinationSelect({
  orgId,
  sourceLocationId,
  value,
  onChange,
  disabled,
  id,
}: Props) {
  const [rows, setRows] = useState<InventoryLocationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (orgId == null || orgId <= 0) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    inventoryLocationsList(orgId)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load locations");
          setRows([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const options: HandoffDestinationOption[] = useMemo(() => {
    return rows
      .filter((loc) => loc.id !== sourceLocationId)
      .map((loc) => ({
        value: loc.id,
        label: formatHandoffLocationLabel(loc),
        location: loc,
      }));
  }, [rows, sourceLocationId]);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  const filterOption = useCallback((candidate: FilterOptionOption<HandoffDestinationOption>, input: string) => {
    if (!input) return true;
    const q = input.trim().toLowerCase();
    const loc = candidate.data.location;
    const hay = [
      loc.name,
      loc.branch?.name,
      branchTypeCode(loc.branch),
      loc.type,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  }, []);

  if (orgId == null || orgId <= 0) {
    return (
      <div className="small text-muted">Organization context is required to load branch locations.</div>
    );
  }

  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2 text-muted small">
        <div className="spinner-border spinner-border-sm" role="status" />
        Loading locations…
      </div>
    );
  }

  if (loadError) {
    return <div className="alert alert-warning py-2 mb-0 small">{loadError}</div>;
  }

  if (options.length === 0) {
    return (
      <div className="text-muted small">
        No destination locations available for this organization (or all are filtered). Ensure branches have active
        inventory locations.
      </div>
    );
  }

  return (
    <Select<HandoffDestinationOption, false>
      inputId={id}
      instanceId={id ?? "handoff-destination"}
      classNamePrefix="react-select"
      styles={selectStyles}
      isDisabled={disabled}
      isClearable
      placeholder="Search destination location…"
      options={options}
      value={selectedOption}
      onChange={(opt: SingleValue<HandoffDestinationOption>) => onChange(opt?.value ?? null)}
      filterOption={filterOption}
      noOptionsMessage={({ inputValue }) =>
        inputValue ? `No locations match “${inputValue}”` : "No locations"
      }
    />
  );
}
