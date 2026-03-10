"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, ExternalLink, Info } from "lucide-react";
import { vetReferenceBodiesByCountry } from "@/lib/api";

type Body = {
  id: number;
  name: string;
  abbreviation?: string | null;
  bodyType: string;
  jurisdiction?: string | null;
  verificationUrl?: string | null;
  licenseFormat?: string | null;
};

export default function RegulatoryBodySelector({
  countryCode,
  value,
  onChange,
  disabled,
  placeholder = "Select regulatory body",
}: {
  countryCode: string;
  value: number | "";
  onChange: (bodyId: number) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [bodies, setBodies] = useState<Body[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!countryCode.trim()) {
      setBodies([]);
      onChange(0 as number);
      return;
    }
    setLoading(true);
    vetReferenceBodiesByCountry(countryCode)
      .then(setBodies)
      .catch(() => setBodies([]))
      .finally(() => setLoading(false));
  }, [countryCode]);

  const selected = bodies.find((b) => b.id === value);

  return (
    <div className="mb-0">
      <label className="form-label d-flex align-items-center gap-1">
        <BadgeCheck size={16} className="text-muted" />
        Regulatory body
      </label>
      {loading ? (
        <p className="text-muted small mb-0">Loading...</p>
      ) : bodies.length === 0 ? (
        <p className="text-muted small mb-0">Select a country first.</p>
      ) : (
        <>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <select
              className="form-select flex-grow-1"
              style={{ minWidth: 200 }}
              value={value === "" || value === 0 ? "" : value}
              onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
              disabled={disabled}
            >
              <option value="">{placeholder}</option>
              {bodies.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.abbreviation ? `${b.abbreviation} – ${b.name}` : b.name}
                  {b.jurisdiction ? ` (${b.jurisdiction})` : ""}
                </option>
              ))}
            </select>
            {selected?.verificationUrl && (
              <a
                href={selected.verificationUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
              >
                <ExternalLink size={14} />
                Verify online
              </a>
            )}
          </div>
          {selected?.licenseFormat && (
            <div className="d-flex align-items-start gap-2 rounded-3 border bg-light bg-opacity-50 px-3 py-2 small">
              <Info size={16} className="text-muted flex-shrink-0 mt-0 pt-1" />
              <span className="text-muted">
                <strong>Format:</strong> {selected.licenseFormat}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
