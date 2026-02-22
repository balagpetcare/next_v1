"use client";

import { useMemo, useRef, useState } from "react";
import Select from "react-select";

/**
 * Searchable multi-select for branches. Options show name + code/city + #id.
 * Used on /owner/teams/[teamId] invite form.
 */
function branchOptionLabel(b) {
  const name = b.name || `Branch #${b.id}`;
  const city = b.location?.city ?? b.org?.name ?? "";
  const extra = [city, `#${b.id}`].filter(Boolean).join(" · ");
  return extra ? `${name} (${extra})` : `${name} · #${b.id}`;
}

export function BranchMultiSelect({
  branches = [],
  value = [],
  onChange,
  placeholder = "Select branches…",
  disabled,
  id,
  "aria-label": ariaLabel,
}) {
  const options = useMemo(
    () =>
      branches.map((b) => ({
        value: b.id,
        label: branchOptionLabel(b),
        branch: b,
      })),
    [branches]
  );

  const selectedValues = useMemo(
    () => options.filter((o) => value.includes(o.value)),
    [options, value]
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const selectRef = useRef(null);

  const handleChange = (selected) => {
    onChange(selected ? selected.map((s) => s.value) : []);
  };

  const allSelected = branches.length > 0 && value.length >= branches.length;
  const handleSelectAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(branches.map((b) => b.id));
    }
  };

  const handleClear = () => {
    onChange([]);
    setMenuOpen(false);
  };

  const customStyles = {
    control: (base) => ({
      ...base,
      minHeight: 38,
      borderRadius: 12,
      borderColor: "var(--bs-border-color, #dee2e6)",
    }),
    menu: (base) => ({
      ...base,
      borderRadius: 12,
      zIndex: 1060,
    }),
  };

  return (
    <div className="d-flex flex-column gap-1">
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <div className="flex-grow-1" style={{ minWidth: 200 }}>
          <Select
            ref={selectRef}
            inputId={id}
            aria-label={ariaLabel}
            isMulti
            isSearchable
            options={options}
            value={selectedValues}
            onChange={handleChange}
            placeholder={placeholder}
            isDisabled={disabled}
            menuIsOpen={menuOpen}
            onMenuOpen={() => setMenuOpen(true)}
            onMenuClose={() => setMenuOpen(false)}
            styles={customStyles}
            classNamePrefix="react-select"
          />
        </div>
        {branches.length > 0 && (
          <>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm radius-8"
              onClick={handleSelectAll}
              disabled={disabled}
            >
              {allSelected ? "Deselect all" : "Select all branches"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm radius-8"
              onClick={handleClear}
              disabled={disabled || value.length === 0}
            >
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default BranchMultiSelect;
