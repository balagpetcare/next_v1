"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { staffDoctorsEnriched } from "@/lib/api";

export type DoctorOption = {
  memberId: number;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  speciality?: string | null;
};

type Props = {
  branchId: string;
  value: number | undefined;
  onChange: (memberId: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  /** When true, fetches doctors; requires hasAccess. */
  enabled?: boolean;
  className?: string;
};

function buildSearchText(d: DoctorOption): string {
  const parts = [
    d.displayName ?? "",
    d.email ?? "",
    d.phone ?? "",
    d.speciality ?? "",
  ].filter(Boolean);
  return parts.join(" ").toLowerCase();
}

export default function DoctorSelector({
  branchId,
  value,
  onChange,
  placeholder = "Select doctor",
  disabled = false,
  enabled = true,
  className = "",
}: Props) {
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const loadDoctors = useCallback(async () => {
    if (!branchId || !enabled) return;
    setLoading(true);
    try {
      const data = await staffDoctorsEnriched(branchId, { limit: 100, offset: 0 });
      const raw = Array.isArray(data?.items) ? data.items : [];
      setDoctors(
        raw.map((d: any) => ({
          memberId: d.memberId ?? d.branchMemberId ?? 0,
          displayName: d.displayName ?? `Doctor #${d.memberId ?? 0}`,
          email: d.email ?? null,
          phone: d.phone ?? null,
          speciality: d.speciality ?? d.specialization ?? null,
        }))
      );
    } catch {
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, enabled]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const filtered = useMemo(() => {
    if (!search.trim()) return doctors;
    const q = search.trim().toLowerCase();
    return doctors.filter((d) => buildSearchText(d).includes(q));
  }, [doctors, search]);

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.memberId === value),
    [doctors, value]
  );

  const handleSelect = useCallback(
    (memberId: number | undefined) => {
      onChange(memberId);
      setOpen(false);
      setSearch("");
    },
    [onChange]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayLabel = value != null ? selectedDoctor?.displayName ?? `Doctor #${value}` : "";

  return (
    <div ref={containerRef} className={`position-relative ${className}`.trim()}>
      <div className="d-flex flex-wrap align-items-center gap-2">
        <div className="dropdown" style={{ minWidth: 220 }}>
          <button
            type="button"
            className="form-select form-select-sm text-start d-flex align-items-center justify-content-between"
            style={{ minHeight: 38 }}
            onClick={() => !disabled && setOpen((o) => !o)}
            disabled={disabled || !enabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={placeholder}
          >
            <span className="text-truncate">
              {loading ? "Loading…" : displayLabel || placeholder}
            </span>
            <i className="ri-arrow-down-s-line ms-1" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} aria-hidden />
          </button>
          {open && (
            <div
              className="dropdown-menu show w-100 mt-1 border shadow-sm p-0"
              style={{ maxHeight: 280 }}
              role="listbox"
            >
              <div className="p-2 border-bottom bg-light">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search by name, email, phone, specialization…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  aria-label="Search doctors"
                />
              </div>
              <div className="overflow-auto" style={{ maxHeight: 240 }}>
                <button
                  type="button"
                  className={`dropdown-item text-start w-100 border-0 rounded-0 ${value == null ? "active" : ""}`}
                  onClick={() => handleSelect(undefined)}
                >
                  <span className="text-muted">{placeholder}</span>
                </button>
                {filtered.length === 0 ? (
                  <div className="px-3 py-2 text-muted small">No doctors match.</div>
                ) : (
                  filtered.map((d) => (
                    <button
                      key={d.memberId}
                      type="button"
                      className={`dropdown-item text-start w-100 border-0 rounded-0 ${value === d.memberId ? "active" : ""}`}
                      onClick={() => handleSelect(d.memberId)}
                      role="option"
                      aria-selected={value === d.memberId}
                    >
                      <div className="fw-medium">{d.displayName}</div>
                      {(d.speciality || d.email || d.phone) && (
                        <div className="small text-muted">
                          {[d.speciality, d.email, d.phone].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        {value != null && (
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => handleSelect(undefined)}
            aria-label="Clear selection"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
