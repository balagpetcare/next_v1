"use client";

import { Fragment, useMemo } from "react";
import type { MedicineSource } from "@/src/types/clinicMedicineControl";
import { CUSTOM_ROUTE_VALUE, INJECTION_ROUTE_OPTIONS, MEDICINE_SOURCE_OPTIONS } from "./constants";
import type { MedLineDraft } from "./types";
import { newMedLineDraft } from "./medicineLineUtils";
import { defaultsFromMedicinePolicyRow, policyVariantId, policyVariantLabel } from "./policyUtils";

type MedicineTableProps = {
  lines: MedLineDraft[];
  onLinesChange: (fn: (prev: MedLineDraft[]) => MedLineDraft[]) => void;
  policies: unknown[];
  catalogFilter: string;
  onCatalogFilterChange: (v: string) => void;
  vialSessionsByVariant: Record<string, unknown[]>;
  /** Step badge for workflow (e.g. "3") */
  stepLabel?: string;
};

export function MedicineTable({
  lines,
  onLinesChange,
  policies,
  catalogFilter,
  onCatalogFilterChange,
  vialSessionsByVariant,
  stepLabel = "3",
}: MedicineTableProps) {
  const filteredPolicies = useMemo(() => {
    const q = catalogFilter.trim().toLowerCase();
    const arr = policies;
    if (!q) return arr;
    return arr.filter((p) => policyVariantLabel(p).toLowerCase().includes(q));
  }, [policies, catalogFilter]);

  const findPolicy = (variantIdStr: string) => {
    const n = Number(variantIdStr);
    if (!Number.isFinite(n) || n <= 0) return null;
    return policies.find((p) => policyVariantId(p) === n) ?? null;
  };

  const patchLine = (key: string, patch: Partial<MedLineDraft>) => {
    onLinesChange((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  };

  return (
    <div className="mb-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <h6 className="small fw-semibold text-muted mb-0">
          {stepLabel ? (
            <span className="badge bg-primary-subtle text-primary-emphasis me-2">{stepLabel}</span>
          ) : null}
          Medicines
        </h6>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary radius-8"
          onClick={() => onLinesChange((p) => [...p, newMedLineDraft()])}
        >
          + Add medicine
        </button>
      </div>
      <div className="mb-2">
        <label className="form-label small">Filter catalog (clinic lines)</label>
        <input
          className="form-control form-control-sm radius-8"
          value={catalogFilter}
          onChange={(e) => onCatalogFilterChange(e.target.value)}
          placeholder="Filter by name, brand, strength…"
        />
      </div>
      <div className="table-responsive border rounded radius-8 min-w-0" style={{ WebkitOverflowScrolling: "touch" }}>
        <table className="table table-sm table-bordered mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th>Source</th>
              <th style={{ minWidth: 200 }}>Medicine</th>
              <th style={{ width: 100 }}>Route</th>
              <th style={{ width: 90 }}>Dose</th>
              <th style={{ width: 80 }}>Unit</th>
              <th style={{ width: 100 }}>Price</th>
              <th style={{ width: 44 }} />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => {
              const routeIsStandard = INJECTION_ROUTE_OPTIONS.includes(
                line.route as (typeof INJECTION_ROUTE_OPTIONS)[number]
              );
              const routeSelectValue = routeIsStandard ? line.route : CUSTOM_ROUTE_VALUE;
              return (
              <Fragment key={line.key}>
                <tr>
                  <td className="text-muted small">{idx + 1}</td>
                  <td>
                    <select
                      className="form-select form-select-sm radius-8"
                      value={line.medicineSource}
                      onChange={(e) => {
                        const v = e.target.value as MedicineSource;
                        onLinesChange((p) =>
                          p.map((d) =>
                            d.key === line.key
                              ? {
                                  ...d,
                                  medicineSource: v,
                                  variantId: v === "OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT" ? "" : d.variantId,
                                  billingUnitPrice: v === "OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT" ? "" : d.billingUnitPrice,
                                  selectedVialSessionId: v === "OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT" ? "" : d.selectedVialSessionId,
                                }
                              : d
                          )
                        );
                      }}
                    >
                      {MEDICINE_SOURCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {line.medicineSource === "OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT" ? (
                      <input
                        className="form-control form-control-sm radius-8"
                        placeholder="Medicine name (required)"
                        value={line.manualMedicineName}
                        onChange={(e) => patchLine(line.key, { manualMedicineName: e.target.value })}
                      />
                    ) : (
                      <select
                        className="form-select form-select-sm radius-8"
                        value={line.variantId}
                        onChange={(e) => {
                          const vid = e.target.value;
                          const pol = findPolicy(vid);
                          const defs = pol ? defaultsFromMedicinePolicyRow(pol) : null;
                          patchLine(line.key, {
                            variantId: vid,
                            selectedVialSessionId: "",
                            ...(defs
                              ? {
                                  unit: defs.unit,
                                  route: defs.route,
                                  billingUnitPrice: defs.price !== "" ? defs.price : line.billingUnitPrice,
                                }
                              : {}),
                          });
                        }}
                      >
                        <option value="">Select variant</option>
                        {filteredPolicies.map((p) => {
                          const id = policyVariantId(p);
                          if (id == null) return null;
                          return (
                            <option key={id} value={String(id)}>
                              {policyVariantLabel(p)}
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </td>
                  <td>
                    <select
                      className="form-select form-select-sm radius-8"
                      value={routeSelectValue}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === CUSTOM_ROUTE_VALUE) patchLine(line.key, { route: "" });
                        else patchLine(line.key, { route: v });
                      }}
                    >
                      {INJECTION_ROUTE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                      <option value={CUSTOM_ROUTE_VALUE}>Custom…</option>
                    </select>
                    {routeSelectValue === CUSTOM_ROUTE_VALUE && (
                      <input
                        className="form-control form-control-sm radius-8 mt-1"
                        placeholder="Enter route"
                        value={line.route}
                        onChange={(e) => patchLine(line.key, { route: e.target.value })}
                      />
                    )}
                  </td>
                  <td>
                    <input
                      type="number"
                      step="any"
                      className="form-control form-control-sm radius-8"
                      value={line.expectedDose}
                      onChange={(e) => patchLine(line.key, { expectedDose: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="form-control form-control-sm radius-8"
                      value={line.unit}
                      onChange={(e) => patchLine(line.key, { unit: e.target.value })}
                    />
                  </td>
                  <td>
                    {line.medicineSource === "OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT" ? (
                      <input
                        className="form-control form-control-sm radius-8"
                        placeholder="Optional"
                        inputMode="decimal"
                        value={line.billingUnitPrice}
                        onChange={(e) => patchLine(line.key, { billingUnitPrice: e.target.value })}
                      />
                    ) : (
                      <input
                        className="form-control form-control-sm radius-8"
                        inputMode="decimal"
                        value={line.billingUnitPrice}
                        onChange={(e) => patchLine(line.key, { billingUnitPrice: e.target.value })}
                        placeholder="0"
                        title="Unit price for checkout (branch catalog default when available)"
                      />
                    )}
                  </td>
                  <td className="text-center">
                    {lines.length > 1 ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger radius-8 p-1"
                        title="Remove line"
                        onClick={() => onLinesChange((p) => p.filter((x) => x.key !== line.key))}
                      >
                        ×
                      </button>
                    ) : null}
                  </td>
                </tr>
                <tr className="bg-body-secondary bg-opacity-25">
                  <td colSpan={8} className="py-2">
                    <details className="small">
                      <summary className="cursor-pointer text-muted user-select-none">Advanced fields</summary>
                      <div className="row g-2 mt-2">
                        {line.medicineSource === "OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT" ? (
                          <>
                            <div className="col-md-3">
                              <label className="form-label small mb-0">Strength</label>
                              <input
                                className="form-control form-control-sm radius-8"
                                value={line.manualStrength}
                                onChange={(e) => patchLine(line.key, { manualStrength: e.target.value })}
                              />
                            </div>
                            <div className="col-md-3">
                              <label className="form-label small mb-0">Batch</label>
                              <input
                                className="form-control form-control-sm radius-8"
                                value={line.manualBatch}
                                onChange={(e) => patchLine(line.key, { manualBatch: e.target.value })}
                              />
                            </div>
                            <div className="col-md-3">
                              <label className="form-label small mb-0">Manufacturer</label>
                              <input
                                className="form-control form-control-sm radius-8"
                                value={line.manualManufacturer}
                                onChange={(e) => patchLine(line.key, { manualManufacturer: e.target.value })}
                              />
                            </div>
                          </>
                        ) : (
                          <div className="col-md-4">
                            <label className="form-label small mb-0">Vial session (optional)</label>
                            <select
                              className="form-select form-select-sm radius-8"
                              value={line.selectedVialSessionId}
                              onChange={(e) => patchLine(line.key, { selectedVialSessionId: e.target.value })}
                            >
                              <option value="">— None —</option>
                              {(vialSessionsByVariant[line.variantId] ?? []).map((v: unknown) => {
                                const vs = v as Record<string, unknown>;
                                return (
                                  <option key={String(vs.id)} value={String(vs.id)}>
                                    #{String(vs.id)} ({String(vs.remainingQty ?? "")} left)
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        )}
                        <div className="col-md-2">
                          <label className="form-label small mb-0">Duration</label>
                          <input
                            className="form-control form-control-sm radius-8"
                            value={line.durationText}
                            onChange={(e) => patchLine(line.key, { durationText: e.target.value })}
                            placeholder="optional"
                          />
                        </div>
                        <div className="col-md-2">
                          <label className="form-label small mb-0">Frequency</label>
                          <input
                            className="form-control form-control-sm radius-8"
                            value={line.frequencyText}
                            onChange={(e) => patchLine(line.key, { frequencyText: e.target.value })}
                            placeholder="optional"
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small mb-0">Effect window / validity</label>
                          <input
                            className="form-control form-control-sm radius-8"
                            value={line.longevityNote}
                            onChange={(e) => patchLine(line.key, { longevityNote: e.target.value })}
                          />
                        </div>
                        <div className="col-md-8">
                          <label className="form-label small mb-0">Line notes</label>
                          <input
                            className="form-control form-control-sm radius-8"
                            value={line.lineNote}
                            onChange={(e) => patchLine(line.key, { lineNote: e.target.value })}
                          />
                        </div>
                      </div>
                    </details>
                  </td>
                </tr>
              </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
