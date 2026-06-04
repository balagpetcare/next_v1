"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import BarcodePrintButton from "@/app/_components/barcode/BarcodePrintButton";
import { saveBulkLabelSession } from "@/lib/barcodeLabelsApi";
import { lotExpiryBadgeHint, retailSkuLooksLikeVaccine } from "@/app/_lib/vaccineInventoryUi";

type Location = { id: number; name: string; branch?: { id: number; name: string; orgId?: number } };
type ProductRef = { id: number; name: string; slug?: string | null };
type VariantRef = { id: number; sku: string; title: string };
type LotRow = {
  lotId: number;
  lotCode?: string;
  product?: ProductRef | null;
  variant?: VariantRef | null;
  quantity?: number;
  onHandQty?: number;
  availableQty?: number;
  reservedQty?: number;
  expDate?: string;
  mfgDate?: string;
  expiryDate?: string;
  status?: string;
};
type ExpiringRow = {
  variant?: VariantRef | null;
  product?: ProductRef | null;
  lotCode?: string;
  quantity?: number;
  availableQty?: number;
  expDate?: string;
  expiryDate?: string;
  daysUntilExpiry?: number;
};
type BatchSummary = {
  totalLots: number;
  activeLots: number;
  nearExpiry: number;
  expired: number;
  depleted: number;
};

function statusBadgeClass(status: string | undefined) {
  switch (status) {
    case "ACTIVE":
      return "bg-success-subtle text-success";
    case "NEAR_EXPIRY":
      return "bg-warning-subtle text-warning-emphasis";
    case "EXPIRED":
      return "bg-danger-subtle text-danger";
    case "DEPLETED":
      return "bg-secondary-subtle text-secondary";
    default:
      return "bg-light text-muted";
  }
}

function statusLabel(status: string | undefined) {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "NEAR_EXPIRY":
      return "Near expiry";
    case "EXPIRED":
      return "Expired";
    case "DEPLETED":
      return "Depleted";
    default:
      return status || "—";
  }
}

export default function OwnerInventoryBatchesPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<string>("");
  const [lots, setLots] = useState<LotRow[]>([]);
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [expiring, setExpiring] = useState<ExpiringRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState("");
  const [hideZeroQty, setHideZeroQty] = useState(true);
  const [productFilter, setProductFilter] = useState("");
  const [vaccineSkuFilter, setVaccineSkuFilter] = useState<"all" | "vaccine">("all");
  const [selectedLotIds, setSelectedLotIds] = useState<Set<number>>(new Set());

  const loadLocations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await ownerGet<{ data: Location[] }>("/api/v1/inventory/locations");
      const list = Array.isArray(res?.data) ? res.data : [];
      setLocations(list);
      setLocationId((prev) => prev || (list.length ? String(list[0].id) : ""));
    } catch (e) {
      setError((e as Error)?.message || "Failed to load locations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    if (!locationId) {
      setLots([]);
      setExpiring([]);
      setSummary(null);
      return;
    }
    let cancelled = false;
    setDataLoading(true);
    const hideZero = hideZeroQty ? "true" : "false";
    Promise.all([
      ownerGet<{ data: LotRow[]; meta?: { summary?: BatchSummary } }>(
        `/api/v1/inventory/batches?locationId=${locationId}&hideZeroQty=${hideZero}&nearExpiryDays=90`
      ).catch(() => ({ data: [], meta: {} })),
      ownerGet<{ data: ExpiringRow[] }>(
        `/api/v1/inventory/expiring?locationId=${locationId}&daysAhead=90`
      ).catch(() => ({ data: [] })),
    ])
      .then(([lotsRes, expRes]) => {
        if (cancelled) return;
        setLots(Array.isArray(lotsRes?.data) ? lotsRes.data : []);
        const meta = lotsRes?.meta;
        setSummary((meta && 'summary' in meta ? meta.summary : null) ?? null);
        setExpiring(Array.isArray(expRes?.data) ? expRes.data : []);
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locationId, hideZeroQty]);

  const branchIdForLabels = useMemo(() => {
    const loc = locations.find((l) => String(l.id) === locationId);
    const bid = loc?.branch?.id;
    return bid != null && Number.isFinite(Number(bid)) ? Number(bid) : null;
  }, [locations, locationId]);

  useEffect(() => {
    setSelectedLotIds(new Set());
  }, [locationId]);

  const filteredLots = useMemo(() => {
    const q = productFilter.trim().toLowerCase();
    if (!q) return lots;
    return lots.filter((row) => {
      const pn = row.product?.name?.toLowerCase() ?? "";
      const vt = row.variant?.title?.toLowerCase() ?? "";
      const sku = row.variant?.sku?.toLowerCase() ?? "";
      return pn.includes(q) || vt.includes(q) || sku.includes(q);
    });
  }, [lots, productFilter]);

  const displayLots = useMemo(() => {
    if (vaccineSkuFilter !== "vaccine") return filteredLots;
    return filteredLots.filter((row) =>
      retailSkuLooksLikeVaccine(
        row.product?.name ?? "",
        row.variant?.sku ?? "",
        row.variant?.title ?? "",
        undefined
      )
    );
  }, [filteredLots, vaccineSkuFilter]);

  function formatDate(d: string | null | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Batches"
        subtitle="Lot-wise stock and expiring items"
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Batches", href: "/owner/inventory/batches" },
        ]}
      />

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="card radius-12 mb-3">
        <div className="card-body p-24">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-3">
              <label className="form-label small text-muted">Location</label>
              <select
                className="form-select form-select-sm"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                disabled={loading}
              >
                <option value="">Select location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.branch ? `(${loc.branch.name})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label small text-muted">Product / SKU filter</label>
              <input
                type="search"
                className="form-control form-control-sm"
                placeholder="Filter table…"
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                disabled={!locationId || dataLoading}
              />
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label small text-muted">SKU type</label>
              <select
                className="form-select form-select-sm"
                value={vaccineSkuFilter}
                onChange={(e) => setVaccineSkuFilter(e.target.value as "all" | "vaccine")}
                disabled={!locationId || dataLoading}
              >
                <option value="all">All products</option>
                <option value="vaccine">Vaccine-like lots</option>
              </select>
            </div>
            <div className="col-12 col-md-2">
              <div className="form-check mt-4 pt-1">
                <input
                  id="hideZeroQty"
                  className="form-check-input"
                  type="checkbox"
                  checked={hideZeroQty}
                  onChange={(e) => setHideZeroQty(e.target.checked)}
                  disabled={!locationId || dataLoading}
                />
                <label className="form-check-label small" htmlFor="hideZeroQty">
                  Hide zero-qty lots
                </label>
              </div>
            </div>
            <div className="col-12 col-md-2 d-flex justify-content-md-end align-items-end">
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={loadLocations} disabled={loading}>
                {loading ? "Loading…" : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {summary && locationId ? (
        <div className="row g-3 mb-3">
          <div className="col-6 col-md">
            <div className="card radius-12 h-100">
              <div className="card-body p-16">
                <div className="text-muted small">Total lots</div>
                <div className="fs-5 fw-semibold">{summary.totalLots}</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md">
            <div className="card radius-12 h-100">
              <div className="card-body p-16">
                <div className="text-muted small">Active</div>
                <div className="fs-5 fw-semibold text-success">{summary.activeLots}</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md">
            <div className="card radius-12 h-100">
              <div className="card-body p-16">
                <div className="text-muted small">Near expiry</div>
                <div className="fs-5 fw-semibold text-warning">{summary.nearExpiry}</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md">
            <div className="card radius-12 h-100">
              <div className="card-body p-16">
                <div className="text-muted small">Expired (on hand)</div>
                <div className="fs-5 fw-semibold text-danger">{summary.expired}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!locationId ? (
        <div className="card radius-12">
          <div className="card-body p-24 text-center text-muted py-5">
            Select a location to view lots and expiring items.
          </div>
        </div>
      ) : dataLoading ? (
        <div className="card radius-12">
          <div className="card-body p-24 text-center text-muted py-5">
            Loading…
          </div>
        </div>
      ) : (
        <>
          <div className="card radius-12 mb-3">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h6 className="mb-0">Lots at location</h6>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                {branchIdForLabels ? (
                  <Link
                    href={`/owner/clinic/${branchIdForLabels}/catalog/vaccine-mappings`}
                    className="btn btn-sm btn-outline-info"
                  >
                    Vaccine mapping (branch)
                  </Link>
                ) : null}
                {branchIdForLabels && selectedLotIds.size > 0 ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      saveBulkLabelSession({
                        branchId: branchIdForLabels,
                        items: [...selectedLotIds].map((lotId) => ({ type: "BATCH", lotId, copies: 1 })),
                      });
                      window.open("/owner/inventory/labels/bulk", "_blank", "noopener,noreferrer");
                    }}
                  >
                    Print selected ({selectedLotIds.size})
                  </button>
                ) : null}
                <span className="small text-muted">{displayLots.length} row(s)</span>
              </div>
            </div>
            <div className="card-body p-0">
              {filteredLots.length === 0 ? (
                <div className="p-24 text-center text-muted">No lots match this view.</div>
              ) : displayLots.length === 0 ? (
                <div className="p-24 text-center text-muted">No vaccine-like lots match the SKU filter. Clear SKU type or adjust search.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>
                          {branchIdForLabels ? (
                            <input
                              type="checkbox"
                              className="form-check-input"
                              aria-label="Select all"
                              checked={
                                displayLots.length > 0 &&
                                displayLots.every((r) => selectedLotIds.has(r.lotId))
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLotIds(new Set(displayLots.map((r) => r.lotId)));
                                } else {
                                  setSelectedLotIds(new Set());
                                }
                              }}
                            />
                          ) : null}
                        </th>
                        <th>Lot</th>
                        <th>Product</th>
                        <th>Variant</th>
                        <th>Qty</th>
                        <th>Available</th>
                        <th>Status</th>
                        <th>Mfg</th>
                        <th>Expiry</th>
                        <th className="text-end">Label</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayLots.map((row) => {
                        const isVac = retailSkuLooksLikeVaccine(
                          row.product?.name ?? "",
                          row.variant?.sku ?? "",
                          row.variant?.title ?? "",
                          undefined
                        );
                        const expIso = row.expDate ?? row.expiryDate;
                        const expHint = lotExpiryBadgeHint(expIso);
                        return (
                        <tr key={row.lotId}>
                          <td>
                            {branchIdForLabels ? (
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedLotIds.has(row.lotId)}
                                onChange={(e) => {
                                  setSelectedLotIds((prev) => {
                                    const next = new Set(prev);
                                    if (e.target.checked) next.add(row.lotId);
                                    else next.delete(row.lotId);
                                    return next;
                                  });
                                }}
                              />
                            ) : null}
                          </td>
                          <td>{row.lotCode ?? row.lotId}</td>
                          <td className="small">
                            {row.product?.name ?? "—"}
                            {isVac ? (
                              <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle ms-1 small">Vaccine</span>
                            ) : null}
                          </td>
                          <td className="small">{row.variant?.title ?? row.variant?.sku ?? "—"}</td>
                          <td>{row.quantity ?? row.onHandQty ?? 0}</td>
                          <td>{row.availableQty ?? row.quantity ?? 0}</td>
                          <td>
                            <span className={`badge rounded-pill ${statusBadgeClass(row.status)}`}>
                              {statusLabel(row.status)}
                            </span>
                          </td>
                          <td className="text-muted small">{formatDate(row.mfgDate)}</td>
                          <td className={`text-muted small ${expHint === "expired" ? "text-danger fw-semibold" : expHint === "soon" ? "text-warning fw-semibold" : ""}`}>
                            {formatDate(row.expDate ?? row.expiryDate)}
                            {expHint === "expired" ? " · expired" : expHint === "soon" ? " · ≤30d" : ""}
                          </td>
                          <td className="text-end">
                            {branchIdForLabels ? (
                              <BarcodePrintButton
                                href={`/owner/inventory/labels/batch/${row.lotId}/print?branchId=${branchIdForLabels}`}
                                className="btn btn-sm btn-outline-secondary"
                              >
                                Batch
                              </BarcodePrintButton>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card radius-12">
            <div className="card-header">
              <h6 className="mb-0">Expiring (next 90 days)</h6>
            </div>
            <div className="card-body p-0">
              {expiring.length === 0 ? (
                <div className="p-24 text-center text-muted">No expiring items in the next 90 days.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Variant</th>
                        <th>Lot</th>
                        <th>Available</th>
                        <th>Expiry</th>
                        <th>Days left</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiring.map((row, idx) => (
                        <tr key={`${row.lotCode ?? ""}-${idx}`}>
                          <td className="small">{row.product?.name ?? "—"}</td>
                          <td className="small">{row.variant?.title ?? row.variant?.sku ?? "—"}</td>
                          <td>{row.lotCode ?? "—"}</td>
                          <td>{row.availableQty ?? row.quantity ?? 0}</td>
                          <td className="text-muted small">{formatDate(row.expDate ?? row.expiryDate)}</td>
                          <td>{row.daysUntilExpiry ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="mt-3">
        <Link href="/owner/inventory" className="btn btn-outline-secondary btn-sm">
          Inventory overview
        </Link>
      </div>
    </div>
  );
}
