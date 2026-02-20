"use client";

import { useState, useEffect, useCallback } from "react";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

/**
 * Lightweight vendor dropdown/search for use in purchase forms, GRN, etc.
 * Requires orgId (number). Optional: value (id), onChange({ id, name, code, phone }), placeholder, disabled.
 */
export default function VendorLookup({
  orgId,
  value = null,
  onChange,
  placeholder = "Select vendor…",
  disabled = false,
  statusFilter = "ACTIVE",
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const fetchOptions = useCallback(async (search = "") => {
    if (orgId == null || !Number(orgId)) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ orgId: String(orgId), limit: "30" });
      if (search?.trim()) params.set("q", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      const res = await ownerGet(`/api/v1/vendors/lookup?${params}`);
      const list = res?.data ?? [];
      setOptions(Array.isArray(list) ? list : []);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, statusFilter]);

  useEffect(() => {
    fetchOptions(q);
  }, [orgId, q, fetchOptions]);

  const selected = options.find((o) => o.id === value) || (value && { id: value, name: `Vendor #${value}` });

  return (
    <div className="position-relative">
      <input
        type="text"
        className="form-control"
        placeholder={placeholder}
        value={open ? q : (selected?.name ?? (value ? `Vendor #${value}` : ""))}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        disabled={disabled}
      />
      {open && (
        <ul
          className="list-group position-absolute w-100 mt-1 shadow"
          style={{ zIndex: 1050, maxHeight: 200, overflowY: "auto" }}
        >
          {loading && <li className="list-group-item text-muted">Loading…</li>}
          {!loading && options.length === 0 && <li className="list-group-item text-muted">No vendors found</li>}
          {!loading && options.map((v) => (
            <li
              key={v.id}
              className="list-group-item list-group-item-action cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange?.({ id: v.id, name: v.name, code: v.code, phone: v.phone });
                setQ("");
                setOpen(false);
              }}
            >
              <span className="fw-semibold">{v.name}</span>
              {v.code && <span className="text-muted small ms-2">{v.code}</span>}
              {v.phone && <span className="text-muted small ms-2">{v.phone}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
