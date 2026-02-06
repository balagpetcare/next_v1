"use client";

import { useEffect, useMemo, useState } from "react";
import { LocationValue, withLegacyLocationFields } from "@/src/lib/location/normalizeLocation";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

type Option = { id: string; nameEn?: string; name?: string };

function pickArray<T = any>(x: unknown): T[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (Array.isArray((x as any).data)) return (x as any).data;
  if (Array.isArray((x as any).items)) return (x as any).items;
  return [];
}

async function fetchJson(path: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const j = await res.json().catch(() => null);
  const ok = res.ok && (j?.success === undefined || j?.success === true);
  if (!ok) throw new Error(j?.message || `Request failed (${res.status})`);
  return j?.data ?? j;
}

export type BdHierarchyPickerProps = {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  disabled?: boolean;
};

/**
 * Bangladesh hierarchy picker: Division → District → Upazila → Area/Ward
 * SOURCE: org location flow from components/LocationPicker.jsx
 */
export default function BdHierarchyPicker({
  value,
  onChange,
  disabled = false,
}: BdHierarchyPickerProps) {
  const [divisions, setDivisions] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [upazilas, setUpazilas] = useState<Option[]>([]);
  const [areas, setAreas] = useState<Option[]>([]);

  const divisionId = value.divisionId || "";
  const districtId = value.districtId || "";
  const upazilaId = value.upazilaId || "";
  const areaId = value.areaId || "";

  // Fetch cascades
  useEffect(() => {
    let alive = true;
    fetchJson(`/api/v1/locations/divisions?lang=en`)
      .then((d) => alive && setDivisions(pickArray(d)))
      .catch(() => alive && setDivisions([]));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!divisionId) {
      setDistricts([]);
      return;
    }
    let alive = true;
    fetchJson(`/api/v1/locations/districts?divisionId=${divisionId}&lang=en`)
      .then((d) => alive && setDistricts(pickArray(d)))
      .catch(() => alive && setDistricts([]));
    return () => {
      alive = false;
    };
  }, [divisionId]);

  useEffect(() => {
    if (!districtId) {
      setUpazilas([]);
      return;
    }
    let alive = true;
    fetchJson(`/api/v1/locations/upazilas?districtId=${districtId}&lang=en`)
      .then((d) => alive && setUpazilas(pickArray(d)))
      .catch(() => alive && setUpazilas([]));
    return () => {
      alive = false;
    };
  }, [districtId]);

  useEffect(() => {
    if (!upazilaId) {
      setAreas([]);
      return;
    }
    let alive = true;
    fetchJson(`/api/v1/locations/bd-areas?upazilaId=${upazilaId}&lang=en`)
      .then((d) => alive && setAreas(pickArray(d)))
      .catch(() => alive && setAreas([]));
    return () => {
      alive = false;
    };
  }, [upazilaId]);

  const divisionName = useMemo(
    () => divisions.find((d) => String(d.id) === String(divisionId))?.nameEn || "",
    [divisions, divisionId]
  );
  const districtName = useMemo(
    () => districts.find((d) => String(d.id) === String(districtId))?.nameEn || "",
    [districts, districtId]
  );
  const upazilaName = useMemo(
    () => upazilas.find((u) => String(u.id) === String(upazilaId))?.nameEn || "",
    [upazilas, upazilaId]
  );
  const areaName = useMemo(
    () => areas.find((a) => String(a.id) === String(areaId))?.nameEn || "",
    [areas, areaId]
  );

  const fullPath = [divisionName, districtName, upazilaName, areaName]
    .filter(Boolean)
    .join(" > ");

  const emit = (patch: Partial<LocationValue>) => {
    onChange(
      withLegacyLocationFields({
        ...value,
        ...patch,
        formattedAddress: patch.formattedAddress ?? value.formattedAddress ?? (fullPath || undefined),
        fullPathText: patch.formattedAddress ?? value.formattedAddress ?? (fullPath || undefined),
        text: patch.formattedAddress ?? value.formattedAddress ?? (fullPath || undefined),
      })
    );
  };

  return (
    <div className="row g-3">
      <div className="col-md-6">
        <label className="form-label small fw-medium">Division</label>
        <select
          className="form-select form-select-sm h-42px"
          value={divisionId}
          onChange={(e) =>
            emit({
              divisionId: e.target.value || undefined,
              districtId: undefined,
              upazilaId: undefined,
              areaId: undefined,
              formattedAddress: fullPath || undefined,
            })
          }
          disabled={disabled}
        >
          <option value="">Select...</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nameEn || d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="col-md-6">
        <label className="form-label small fw-medium">District</label>
        <select
          className="form-select form-select-sm h-42px"
          value={districtId}
          onChange={(e) =>
            emit({
              districtId: e.target.value || undefined,
              upazilaId: undefined,
              areaId: undefined,
              formattedAddress: fullPath || undefined,
            })
          }
          disabled={disabled || !divisionId}
        >
          <option value="">Select...</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nameEn || d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="col-md-6">
        <label className="form-label small fw-medium">Upazila</label>
        <select
          className="form-select form-select-sm h-42px"
          value={upazilaId}
          onChange={(e) =>
            emit({
              upazilaId: e.target.value || undefined,
              areaId: undefined,
              formattedAddress: fullPath || undefined,
            })
          }
          disabled={disabled || !districtId}
        >
          <option value="">Select...</option>
          {upazilas.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nameEn || u.name}
            </option>
          ))}
        </select>
      </div>

      <div className="col-md-6">
        <label className="form-label small fw-medium">Area / Ward</label>
        <select
          className="form-select form-select-sm h-42px"
          value={areaId}
          onChange={(e) =>
            emit({
              areaId: e.target.value || undefined,
              formattedAddress: fullPath || undefined,
            })
          }
          disabled={disabled || !upazilaId}
        >
          <option value="">Select...</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nameEn || a.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
