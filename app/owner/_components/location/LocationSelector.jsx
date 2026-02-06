"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    cache: "no-store",
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.success) throw new Error(j?.message || `Request failed (${res.status})`);
  return j.data;
}

export default function LocationSelector({
  value,
  onChange,
  lang = "en",
  title = "Business Location",
}) {
  const v = value || {};

  const [divisions, setDivisions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [upazilas, setUpazilas] = useState([]);
  const [areas, setAreas] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const divisionId = v.divisionId ? String(v.divisionId) : "";
  const districtId = v.districtId ? String(v.districtId) : "";
  const upazilaId = v.upazilaId ? String(v.upazilaId) : "";
  const bdAreaId = v.bdAreaId ? String(v.bdAreaId) : "";

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    fetchJson(`/api/v1/locations/divisions?lang=${lang}`)
      .then((data) => alive && setDivisions(Array.isArray(data) ? data : []))
      .catch((e) => alive && setError(e?.message || "Failed to load divisions"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [lang]);

  useEffect(() => {
    if (!divisionId) {
      setDistricts([]);
      return;
    }
    let alive = true;
    setLoading(true);
    setError("");
    fetchJson(`/api/v1/locations/districts?divisionId=${divisionId}&lang=${lang}`)
      .then((data) => alive && setDistricts(Array.isArray(data) ? data : []))
      .catch((e) => alive && setError(e?.message || "Failed to load districts"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [divisionId, lang]);

  useEffect(() => {
    if (!districtId) {
      setUpazilas([]);
      return;
    }
    let alive = true;
    setLoading(true);
    setError("");
    fetchJson(`/api/v1/locations/upazilas?districtId=${districtId}&lang=${lang}`)
      .then((data) => alive && setUpazilas(Array.isArray(data) ? data : []))
      .catch((e) => alive && setError(e?.message || "Failed to load upazilas"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [districtId, lang]);

  useEffect(() => {
    if (!upazilaId) {
      setAreas([]);
      return;
    }
    let alive = true;
    setLoading(true);
    setError("");
    // National BD areas under upazila
    fetchJson(`/api/v1/locations/bd-areas?upazilaId=${upazilaId}&lang=${lang}`)
      .then((data) => alive && setAreas(Array.isArray(data) ? data : []))
      .catch((e) => alive && setError(e?.message || "Failed to load areas"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [upazilaId, lang]);

  const divisionName = useMemo(
    () => divisions.find((d) => String(d.id) === divisionId)?.nameEn || "",
    [divisions, divisionId]
  );
  const districtName = useMemo(
    () => districts.find((d) => String(d.id) === districtId)?.nameEn || "",
    [districts, districtId]
  );
  const upazilaName = useMemo(
    () => upazilas.find((u) => String(u.id) === upazilaId)?.nameEn || "",
    [upazilas, upazilaId]
  );
  const areaName = useMemo(
    () => areas.find((a) => String(a.id) === bdAreaId)?.nameEn || "",
    [areas, bdAreaId]
  );

  const fullPathText = useMemo(() => {
    // Required: Division > District > Upazila > Area
    const parts = [divisionName, districtName, upazilaName, areaName].filter(Boolean);
    return parts.join(" > ");
  }, [divisionName, districtName, upazilaName, areaName]);

  function emit(nextPatch) {
    const next = {
      ...v,
      kind: "BD_AREA",
      ...nextPatch,
    };
    // Keep both names to be safe with existing pages
    next.fullPathText = fullPathText;
    next.text = fullPathText;
    onChange?.(next);
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h6 className="mb-0">{title}</h6>
          {loading ? (
            <span className="text-secondary" style={{ fontSize: 12 }}>
              Loading...
            </span>
          ) : null}
        </div>

        {error ? (
          <div className="alert alert-warning py-2" style={{ fontSize: 13 }}>
            {error}
          </div>
        ) : null}

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Division</label>
            <select
              className="form-select"
              value={divisionId}
              onChange={(e) => {
                const id = e.target.value;
                onChange?.({ kind: "BD_AREA", divisionId: id ? Number(id) : null, districtId: null, upazilaId: null, bdAreaId: null, fullPathText: "", text: "" });
              }}
            >
              <option value="">Select division</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-6">
            <label className="form-label">District</label>
            <select
              className="form-select"
              value={districtId}
              onChange={(e) => {
                const id = e.target.value;
                emit({ districtId: id ? Number(id) : null, upazilaId: null, bdAreaId: null });
              }}
              disabled={!divisionId}
            >
              <option value="">Select district</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-6">
            <label className="form-label">Upazila</label>
            <select
              className="form-select"
              value={upazilaId}
              onChange={(e) => {
                const id = e.target.value;
                emit({ upazilaId: id ? Number(id) : null, bdAreaId: null });
              }}
              disabled={!districtId}
            >
              <option value="">Select upazila</option>
              {upazilas.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-6">
            <label className="form-label">Area</label>
            <select
              className="form-select"
              value={bdAreaId}
              onChange={(e) => {
                const id = e.target.value;
                emit({ bdAreaId: id ? Number(id) : null });
              }}
              disabled={!upazilaId}
            >
              <option value="">Select area</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12">
            <label className="form-label">Selected Location</label>
            <input className="form-control" value={fullPathText} readOnly placeholder="Division > District > Upazila > Area" />
          </div>
        </div>
      </div>
    </div>
  );
}
