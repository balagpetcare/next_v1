"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";

/**
 * Dhaka City cascading dropdown (Flutter-style)
 *
 * Uses backend endpoints:
 * - GET /api/v1/locations/city-corporations
 * - GET /api/v1/locations/areas?corp=DNCC&parentId=<id?>&limit=200
 *
 * Output (backward compatible):
 * {
 *   kind: "DHAKA_AREA",
 *   cityCorporationCode: "DNCC"|"DSCC",
 *   dhakaAreaId: number,
 *   areaId: number, // alias
 *   dhakaAreaPath: [{id,nameEn,nameBn,parentId}],
 * }
 */
export default function DhakaCityAreaDropdown({ value, onChange, title = "" }) {
  const v = value || {};

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [corps, setCorps] = useState([]);
  const [corpCode, setCorpCode] = useState(() => String(v.cityCorporationCode || "").toUpperCase());

  // Path of selected area ids by level (e.g., [lvl1Id, lvl2Id, lvl3Id])
  const [pathIds, setPathIds] = useState(() => {
    // If previous selection exists, try to hydrate from dhakaAreaPath.
    const p = Array.isArray(v.dhakaAreaPath) ? v.dhakaAreaPath : [];
    const ids = p.map((x) => x?.id).filter(Boolean);
    if (ids.length) return ids;
    const leaf = v.dhakaAreaId || v.areaId;
    return leaf ? [leaf] : [];
  });

  // Options for each level: levels[i] is list of areas for level i
  const [levels, setLevels] = useState([]);

  const unwrapRows = (res) => {
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res)) return res;
    return [];
  };

  const buildPathText = (code, pathArr) => {
    const parts = [];
    if (code) parts.push(String(code).toUpperCase());
    const names = (Array.isArray(pathArr) ? pathArr : [])
      .map((x) => x?.nameEn || x?.nameBn || x?.code)
      .filter(Boolean);
    parts.push(...names);
    return parts.join(" > ");
  };


  const selectedLeafId = useMemo(() => {
    if (!pathIds.length) return null;
    return pathIds[pathIds.length - 1];
  }, [pathIds]);

  // Load city corporations once
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setError("");
        const res = await apiGet("/api/v1/locations/city-corporations");
        const rows = unwrapRows(res);
        if (!alive) return;
        setCorps(rows);
        // Default: DNCC if exists, else first
        if (!corpCode) {
          const dncc = rows.find((r) => String(r.code).toUpperCase() === "DNCC");
          setCorpCode(String((dncc || rows[0] || {}).code || "").toUpperCase());
        }
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load city corporations");
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When corp changes, load level 1 areas and reset selections
  useEffect(() => {
    if (!corpCode) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await apiGet(
          `/api/v1/locations/areas?corp=${encodeURIComponent(corpCode)}&limit=200`
        );
        const rows = unwrapRows(res);
        if (!alive) return;
        setLevels([rows]);
        setPathIds([]);
        // Clear selection on corp change and notify parent immediately
        onChange?.({
          kind: "DHAKA_AREA",
          cityCorporationCode: corpCode,
          cityCorporationId: null, // Will be set when area is selected
          dhakaAreaId: null,
          areaId: null,
          dhakaAreaPath: [],
          fullPathText: String(corpCode).toUpperCase(),
          text: String(corpCode).toUpperCase(),
        });
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load areas");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corpCode]);

  async function loadChildren(parentId, levelIndex) {
    try {
      setLoading(true);
      setError("");
      const res = await apiGet(
        `/api/v1/locations/areas?corp=${encodeURIComponent(corpCode)}&parentId=${encodeURIComponent(
          String(parentId)
        )}&limit=200`
      );
      const rows = unwrapRows(res);

      setLevels((prev) => {
        const next = prev.slice(0, levelIndex + 1);
        if (rows.length) next.push(rows);
        return next;
      });
      return rows;
    } catch (e) {
      setError(e?.message || "Failed to load sub-areas");
      return [];
    } finally {
      setLoading(false);
    }
  }

  async function onSelectAtLevel(levelIndex, areaIdStr) {
    const areaId = areaIdStr ? parseInt(areaIdStr, 10) : null;

    // Truncate selections after this level
    setPathIds((prev) => {
      const next = prev.slice(0, levelIndex);
      if (areaId) next[levelIndex] = areaId;
      return next.filter(Boolean);
    });

    // Truncate future levels
    setLevels((prev) => prev.slice(0, levelIndex + 1));

    if (!areaId) {
      onChange?.({
        kind: "DHAKA_AREA",
        cityCorporationCode: corpCode,
        dhakaAreaId: null,
        areaId: null,
        dhakaAreaPath: [],
          fullPathText: "",
          text: "",
        });
      return;
    }

    const children = await loadChildren(areaId, levelIndex);

    // Build selected path objects from the levels array
    const nextPathIds = (prev) => {
      const next = prev.slice(0, levelIndex);
      next[levelIndex] = areaId;
      return next;
    };

    // compute path objects using current levels (after potential children load, but ok)
    const chosenIds = nextPathIds(pathIds);
    const pathObjects = [];
    for (let i = 0; i < chosenIds.length; i++) {
      const id = chosenIds[i];
      const opt = (levels[i] || []).find((x) => x.id === id);
      if (opt) pathObjects.push(opt);
    }

    // If no children, leaf is areaId. If children exist, user will pick deeper.
    const leafId = children.length ? null : areaId;
    onChange?.({
      kind: "DHAKA_AREA",
      cityCorporationCode: corpCode,
      dhakaAreaId: leafId || areaId,
      areaId: leafId || areaId,
      dhakaAreaPath: pathObjects,
      fullPathText: buildPathText(corpCode, pathObjects),
      text: buildPathText(corpCode, pathObjects),
    });
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="">
        {title ? <h6 className="mb-3">{title}</h6> : null}

        {error ? <div className="alert alert-danger py-2">{error}</div> : null}

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">City Corporation</label>
            <select
              className="form-select"
              value={corpCode || ""}
              onChange={(e) => setCorpCode(String(e.target.value).toUpperCase())}
              disabled={!corps.length}
            >
              <option value="">Select...</option>
              {corps.map((c) => (
                <option key={c.id} value={String(c.code).toUpperCase()}>
                  {c.nameEn || c.nameBn || c.code}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12">
            <label className="form-label">Area</label>
            {!corpCode ? (
              <div className="text-muted small">Select City Corporation first.</div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {levels.map((opts, idx) => (
                  <select
                    key={idx}
                    className="form-select"
                    value={pathIds[idx] ? String(pathIds[idx]) : ""}
                    onChange={(e) => onSelectAtLevel(idx, e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Select...</option>
                    {opts.map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {a.nameEn || a.nameBn || `Area#${a.id}`}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            )}
          </div>

          <div className="col-12">
            <div className="text-muted small">
              Selected Area ID: <b>{selectedLeafId || "-"}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
