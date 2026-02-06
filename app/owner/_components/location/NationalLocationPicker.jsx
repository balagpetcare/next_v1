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

/**
 * National Location picker (Bangladesh-wide).
 * Uses backend: GET /api/v1/locations/search?q=...
 * Supports BD_AREA + DHAKA_AREA (if you keep Dhaka fast tree).
 */
export default function NationalLocationPicker({
  value,
  onChange,
  title = "Business Location (Bangladesh)",
  placeholder = "Type area name (e.g., Banasree, Rampura, Mirpur 10, Beanibazar)",
}) {
  const v = value || {};
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);

  const selectedText = v.fullPathText || v.text || "";

  useEffect(() => {
    const qq = q.trim();
    if (!qq) {
      setResults([]);
      return;
    }
    let alive = true;
    setLoading(true);
    setError("");
    const t = setTimeout(() => {
      fetchJson(`/api/v1/locations/search?q=${encodeURIComponent(qq)}&limit=20`)
        .then((data) => alive && setResults(pickArray(data)))
        .catch((e) => alive && setError(e?.message || "Failed to search locations"))
        .finally(() => alive && setLoading(false));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const selected = useMemo(() => {
    if (v.kind === "BD_AREA" && v.bdAreaId) return { kind: "BD_AREA", bdAreaId: v.bdAreaId };
    if (v.kind === "DHAKA_AREA" && v.dhakaAreaId) return { kind: "DHAKA_AREA", dhakaAreaId: v.dhakaAreaId };
    return null;
  }, [v.kind, v.bdAreaId, v.dhakaAreaId]);

  function applySelection(item) {
    const next = {
      kind: item.kind,
      bdAreaId: item.bdAreaId || null,
      dhakaAreaId: item.dhakaAreaId || null,
      cityCorporationId: item.cityCorporationId || null,
      cityCorporationCode: item.cityCorporationCode || null,
      fullPathText: item.fullPathText || "",
      text: item.fullPathText || "",
      nameEn: item.nameEn || "",
      nameBn: item.nameBn || "",
      type: item.type || null,
    };
    onChange?.(next);
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h6 className="mb-0">{title}</h6>
          {loading ? (
            <span className="text-secondary" style={{ fontSize: 12 }}>
              Searching…
            </span>
          ) : null}
        </div>

        {error ? (
          <div className="alert alert-warning py-2" style={{ fontSize: 13 }}>
            {error}
          </div>
        ) : null}

        <label className="form-label">Area / Locality</label>
        <input
          className="form-control"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
        />

        <div className="form-text">Tip: type and select from the list. It shows full path like: Division &gt; District &gt; Upazila &gt; Area.</div>

        {results.length ? (
          <div className="border rounded mt-2" style={{ maxHeight: 280, overflow: "auto" }}>
            {results.map((it, idx) => {
              const key = `${it.kind || "X"}-${it.bdAreaId || it.dhakaAreaId || idx}`;
              const active =
                (selected?.kind === "BD_AREA" && String(selected.bdAreaId) === String(it.bdAreaId)) ||
                (selected?.kind === "DHAKA_AREA" && String(selected.dhakaAreaId) === String(it.dhakaAreaId));
              return (
                <button
                  key={key}
                  type="button"
                  className={
                    "list-group-item list-group-item-action" + (active ? " active" : "")
                  }
                  style={{ width: "100%", border: 0, borderBottom: "1px solid #eee", textAlign: "left" }}
                  onClick={() => {
                    applySelection(it);
                    setQ(it.fullPathText || "");
                    setResults([]);
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{it.fullPathText || it.nameEn || it.nameBn}</div>
                      {it.kind ? (
                        <div className="text-secondary" style={{ fontSize: 12 }}>
                          {it.kind === "BD_AREA" ? "Bangladesh" : "Dhaka City"}
                        </div>
                      ) : null}
                    </div>
                    <span className="badge text-bg-light">Select</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        {selectedText ? (
          <div className="mt-2 text-secondary" style={{ fontSize: 13 }}>
            Selected: <b>{selectedText}</b>
          </div>
        ) : null}
      </div>
    </div>
  );
}
