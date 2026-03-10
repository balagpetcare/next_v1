"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { vetReferenceCountries } from "@/lib/api";

type Country = { id: number; code: string; name: string; region: string | null };

export default function CountrySelector({
  value,
  onChange,
  disabled,
  placeholder = "Select country",
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    vetReferenceCountries()
      .then(setCountries)
      .catch(() => setCountries([]))
      .finally(() => setLoading(false));
  }, []);

  const byRegion = countries.reduce<Record<string, Country[]>>((acc, c) => {
    const r = c.region || "Other";
    if (!acc[r]) acc[r] = [];
    acc[r].push(c);
    return acc;
  }, {});
  const regions = Object.keys(byRegion).sort();
  const searchLower = search.trim().toLowerCase();
  const filtered =
    searchLower === ""
      ? byRegion
      : regions.reduce<Record<string, Country[]>>((acc, r) => {
          const list = (byRegion[r] || []).filter(
            (c) =>
              c.name.toLowerCase().includes(searchLower) ||
              c.code.toLowerCase().includes(searchLower)
          );
          if (list.length) acc[r] = list;
          return acc;
        }, {});

  const selectedCountry = countries.find((c) => c.code === value);

  return (
    <div className="mb-0">
      <label className="form-label d-flex align-items-center gap-1">
        <Globe size={16} className="text-muted" />
        Primary country of practice
      </label>
      {loading ? (
        <p className="text-muted small mb-0">Loading countries...</p>
      ) : (
        <>
          {selectedCountry && (
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill px-3 py-2">
                {selectedCountry.name}
                {selectedCountry.region && (
                  <span className="text-muted fw-normal ms-1">· {selectedCountry.region}</span>
                )}
              </span>
            </div>
          )}
          <input
            type="text"
            className="form-control mb-2"
            placeholder="Search country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
          />
          <select
            className="form-select"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          >
            <option value="">{placeholder}</option>
            {Object.keys(filtered).map((region) => (
              <optgroup key={region} label={region}>
                {(filtered[region] || []).map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {selectedCountry?.region && (
            <p className="text-muted small mt-1 mb-0">Region: {selectedCountry.region}</p>
          )}
        </>
      )}
    </div>
  );
}
