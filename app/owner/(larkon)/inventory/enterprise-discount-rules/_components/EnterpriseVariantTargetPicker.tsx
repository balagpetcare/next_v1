"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RuleFormState } from "../_lib/enterpriseRulesTypes";
import { formatVariantSummary, type VariantSearchHit } from "../_lib/enterpriseVariantSearch";

type Props = {
  orgId: number | null;
  readOnly: boolean;
  form: RuleFormState;
  setForm: React.Dispatch<React.SetStateAction<RuleFormState>>;
  ownerGet: <T>(path: string) => Promise<T | null>;
};

function useDebouncedVariantSearch(
  orgId: number | null,
  q: string,
  ownerGet: <T>(path: string) => Promise<T | null>,
  enabled: boolean
) {
  const [hits, setHits] = useState<VariantSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !orgId) {
      setHits([]);
      return;
    }
    const query = q.trim();
    if (query.length < 2) {
      setHits([]);
      return;
    }
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await ownerGet<{ data?: VariantSearchHit[] }>(
          `/api/v1/inventory/variants/search?orgId=${orgId}&q=${encodeURIComponent(query)}&limit=20`
        );
        const data = (res as { data?: VariantSearchHit[] })?.data;
        setHits(Array.isArray(data) ? data : []);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 320);
    return () => {
      if (t.current) clearTimeout(t.current);
    };
  }, [q, orgId, ownerGet, enabled]);

  return { hits, loading };
}

export function EnterpriseVariantTargetPicker({ orgId, readOnly, form, setForm, ownerGet }: Props) {
  const [variantQ, setVariantQ] = useState("");
  const [showAdvancedId, setShowAdvancedId] = useState(false);
  const [selectedHit, setSelectedHit] = useState<VariantSearchHit | null>(null);
  const [hydrateError, setHydrateError] = useState(false);

  const variantSearch = useDebouncedVariantSearch(orgId, variantQ, ownerGet, form.targetKind === "VARIANT");

  const tid = form.targetId.trim() ? parseInt(form.targetId.trim(), 10) : NaN;

  useEffect(() => {
    if (!orgId || form.targetKind !== "VARIANT") {
      setSelectedHit(null);
      setHydrateError(false);
      return;
    }
    if (!Number.isFinite(tid) || tid < 1) {
      setSelectedHit(null);
      setHydrateError(false);
      return;
    }
    if (selectedHit?.id === tid) {
      setHydrateError(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await ownerGet<{ data?: VariantSearchHit[] }>(
          `/api/v1/inventory/variants/search?orgId=${orgId}&variantId=${tid}&limit=1`
        );
        const row = Array.isArray((res as { data?: VariantSearchHit[] })?.data) ? (res as { data?: VariantSearchHit[] }).data![0] : undefined;
        if (cancelled) return;
        if (row) {
          setSelectedHit(row);
          setHydrateError(false);
        } else {
          setSelectedHit(null);
          setHydrateError(true);
        }
      } catch {
        if (!cancelled) {
          setSelectedHit(null);
          setHydrateError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, form.targetKind, tid, ownerGet, selectedHit?.id]);

  const onPick = useCallback(
    (hit: VariantSearchHit) => {
      setForm((f) => ({ ...f, targetId: String(hit.id) }));
      setSelectedHit(hit);
      setVariantQ("");
      setHydrateError(false);
    },
    [setForm]
  );

  useEffect(() => {
    if (form.targetKind !== "VARIANT") {
      setVariantQ("");
      setShowAdvancedId(false);
    }
  }, [form.targetKind]);

  return (
    <div className="mb-2">
      <label className="form-label small mb-1">Catalog variant</label>
      <p className="form-text small mb-2">Search by SKU, barcode, product name, or variant label. Pick one row to attach this rule to that catalog variant.</p>

      <input
        className="form-control form-control-sm mb-2"
        placeholder="Type at least 2 characters…"
        disabled={readOnly}
        value={variantQ}
        onChange={(e) => setVariantQ(e.target.value)}
        autoComplete="off"
      />

      {variantSearch.loading && <div className="small text-muted mb-2">Searching catalog…</div>}

      {!variantSearch.loading && variantQ.trim().length >= 2 && variantSearch.hits.length === 0 && (
        <div className="alert alert-light border py-2 small mb-2">No catalog rows match. Try another keyword or check the advanced reference below.</div>
      )}

      {variantSearch.hits.length > 0 && (
        <div className="list-group border rounded mb-3" style={{ maxHeight: 280, overflow: "auto" }}>
          {variantSearch.hits.map((h) => (
            <button
              key={h.id}
              type="button"
              className="list-group-item list-group-item-action text-start py-2 px-3"
              disabled={readOnly}
              onClick={() => onPick(h)}
            >
              <div className="fw-semibold small">{h.product?.name ?? "Product"}</div>
              <div className="small text-muted">{h.title || "—"}</div>
              <div className="d-flex flex-wrap gap-3 mt-1 small">
                <span>
                  <span className="text-muted">SKU</span> <span className="font-monospace">{h.sku || "—"}</span>
                </span>
                {h.barcode ? (
                  <span>
                    <span className="text-muted">Barcode</span> <span className="font-monospace">{h.barcode}</span>
                  </span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="border rounded p-3 bg-light bg-opacity-50 mb-2">
        <div className="small text-uppercase text-muted fw-bold mb-2">Selected target</div>
        {selectedHit && Number(selectedHit.id) === tid ? (
          <>
            <div className="fw-semibold">{formatVariantSummary(selectedHit)}</div>
            <div className="small mt-1">
              <span className="text-muted">SKU</span> <span className="font-monospace">{selectedHit.sku}</span>
            </div>
            {selectedHit.barcode ? (
              <div className="small">
                <span className="text-muted">Barcode</span> <span className="font-monospace">{selectedHit.barcode}</span>
              </div>
            ) : null}
          </>
        ) : hydrateError && Number.isFinite(tid) ? (
          <div className="small text-warning">
            Could not load catalog details for this reference. It may be inactive or outside your organization. Use search to pick a valid variant, or adjust the
            technical reference below.
          </div>
        ) : (
          <div className="small text-muted">No variant selected yet. Search and pick a row above.</div>
        )}
      </div>

      <div className="mb-0">
        <button
          type="button"
          className="btn btn-link btn-sm p-0 text-decoration-none"
          onClick={() => setShowAdvancedId((x) => !x)}
          disabled={readOnly}
        >
          {showAdvancedId ? "Hide" : "Show"} advanced options (technical fallback)
        </button>
        {showAdvancedId && (
          <div className="mt-2 p-3 border rounded bg-light">
            <label className="form-label small text-muted mb-1">Manual variant reference (admin)</label>
            <input
              className="form-control form-control-sm font-monospace"
              disabled={readOnly}
              placeholder="Numeric catalog variant id"
              value={form.targetId}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, targetId: v }));
                setSelectedHit(null);
              }}
            />
            <div className="form-text small">Use only when search cannot find a row. Prefer catalog search for day-to-day work.</div>
          </div>
        )}
      </div>
    </div>
  );
}
