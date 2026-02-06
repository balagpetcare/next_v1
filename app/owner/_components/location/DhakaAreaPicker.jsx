"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const j = await res.json().catch(() => null);
  // Support both {success,data} and raw array responses
  const ok = res.ok && (j?.success === undefined || j?.success === true);
  if (!ok) throw new Error(j?.message || `Request failed (${res.status})`);
  return j?.data ?? j;
}

function pickArray(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (Array.isArray(x.data)) return x.data;
  if (Array.isArray(x.items)) return x.items;
  if (Array.isArray(x.data?.items)) return x.data.items;
  return [];
}

export default function DhakaAreaPicker({
  value,
  onChange,
  title = "Location (Dhaka City)",
  placeholder = "Search area (e.g., Banasree, Rampura, Mirpur 10)",
}) {
  const v = value || {};

  const [corps, setCorps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);

  const cityCorporationId = v.cityCorporationId || "";
  const cityCorporationCode = v.cityCorporationCode || "";
  // Normalize: prefer dhakaAreaId, but keep areaId backward-compatible
  const dhakaAreaId = v.dhakaAreaId || v.areaId || "";

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    fetchJson(`/api/v1/locations/city-corporations`)
      .then((data) => {
        if (!alive) return;
        const arr = pickArray(data);
        setCorps(arr);
        // auto select DNCC if empty
        if (!cityCorporationId && !cityCorporationCode) {
          const dncc = arr.find((x) => String(x.code || "").toUpperCase() === "DNCC");
          if (dncc) {
            onChange?.({
              ...v,
              cityCorporationId: dncc.id,
              cityCorporationCode: dncc.code,
            });
          }
        }
      })
      .catch((e) => alive && setError(e?.message || "Failed to load city corporations"))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const corp = cityCorporationCode || (corps.find((x) => String(x.id) === String(cityCorporationId))?.code || "");
    if (!corp) {
      setResults([]);
      return;
    }
    const qq = q.trim();
    if (!qq) {
      setResults([]);
      return;
    }

    let alive = true;
    const t = setTimeout(() => {
      fetchJson(`/api/v1/locations/areas?corp=${encodeURIComponent(corp)}&q=${encodeURIComponent(qq)}&limit=20`)
        .then((data) => alive && setResults(pickArray(data)))
        .catch(() => alive && setResults([]));
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, cityCorporationId, cityCorporationCode, corps]);

  const selectedCorp = useMemo(() => {
    return corps.find((x) => String(x.id) === String(cityCorporationId)) || corps.find((x) => String(x.code) === String(cityCorporationCode));
  }, [corps, cityCorporationId, cityCorporationCode]);

  const selectedArea = useMemo(() => {
    return results.find((x) => String(x.id) === String(dhakaAreaId)) || v.area;
  }, [results, dhakaAreaId, v.area]);

  const text = useMemo(() => {
    const corpName = selectedCorp ? (selectedCorp.nameEn || selectedCorp.nameBn || selectedCorp.code) : "";
    const areaName = selectedArea ? (selectedArea.nameEn || selectedArea.nameBn || selectedArea.name) : (v.areaName || "");
    const parts = [areaName, corpName].filter(Boolean);
    return parts.join(", ");
  }, [selectedCorp, selectedArea, v.areaName]);

  function setVal(patch) {
    const next = { ...v, ...patch };
    next.kind = "DHAKA_AREA";
    next.text = text;
    onChange?.(next);
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h6 className="mb-0">{title}</h6>
          {loading ? <span className="text-secondary" style={{ fontSize: 12 }}>Loading…</span> : null}
        </div>

        {error ? <div className="alert alert-warning py-2" style={{ fontSize: 13 }}>{error}</div> : null}

        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">City Corporation</label>
            <select
              className="form-select"
              value={selectedCorp?.id || ""}
              onChange={(e) => {
                const id = e.target.value;
                const corp = corps.find((x) => String(x.id) === String(id));
                setQ("");
                setResults([]);
                onChange?.({
                  ...v,
                  kind: "DHAKA_AREA",
                  cityCorporationId: corp?.id || null,
                  cityCorporationCode: corp?.code || null,
                  dhakaAreaId: null,
                  areaId: null,
                  areaName: "",
                  area: null,
                  text: "",
                });
              }}
            >
              <option value="">Select</option>
              {corps.map((c) => (
                <option key={c.id} value={c.id}>{c.nameEn || c.nameBn || c.code}</option>
              ))}
            </select>
          </div>

          <div className="col-md-8">
            <label className="form-label">Area</label>
            <input
              className="form-control"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder}
              disabled={!selectedCorp}
            />
            {selectedCorp && results.length ? (
              <div className="border rounded mt-2" style={{ maxHeight: 240, overflow: "auto" }}>
                {results.map((a) => {
                  const name = a.nameEn || a.nameBn || a.name;
                  const active = String(a.id) === String(dhakaAreaId);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={"list-group-item list-group-item-action d-flex justify-content-between align-items-center " + (active ? "active" : "")}
                      style={{ width: "100%", border: 0, borderBottom: "1px solid #eee", textAlign: "left" }}
                      onClick={() => {
                        setVal({
                          cityCorporationId: selectedCorp.id,
                          cityCorporationCode: selectedCorp.code,
                          dhakaAreaId: a.id,
                          areaId: a.id, // backward-compatible
                          areaName: name,
                          area: a,
                          text,
                        });
                        setQ(name);
                        setResults([]);
                      }}
                    >
                      <span>{name}</span>
                      <span className="badge text-bg-light">Select</span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {v.dhakaAreaId || v.areaId ? (
              <div className="mt-2 text-secondary" style={{ fontSize: 13 }}>
                Selected: <b>{v.areaName || selectedArea?.nameEn || selectedArea?.nameBn || ""}</b>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
