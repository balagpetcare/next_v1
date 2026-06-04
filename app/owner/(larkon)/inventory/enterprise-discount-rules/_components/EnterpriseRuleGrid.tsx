"use client";

import Link from "next/link";
import { useState } from "react";
import { collectRowBadges, scopeSummary } from "../_lib/enterpriseRuleRowSummary";
import type { EnterpriseRuleRow } from "../_lib/enterpriseRulesTypes";
import { formatDiscountValue, labelDiscountMethod, labelScopeKind, labelTargetKind } from "../_lib/enterpriseRuleLabels";

type Props = {
  rows: EnterpriseRuleRow[];
  page: number;
  limit: number;
  total: number;
  loading: boolean;
  overlapById: Record<number, string[]>;
  canManage: boolean;
  onPageChange: (p: number) => void;
  getViewHref: (r: EnterpriseRuleRow) => string;
  getEditHref: (r: EnterpriseRuleRow) => string;
  getDuplicateHref: (r: EnterpriseRuleRow) => string;
  onPreviewRow: (r: EnterpriseRuleRow) => void;
  onStatusPatch: (r: EnterpriseRuleRow, status: string) => void;
  hidePagination?: boolean;
};

function formatWindow(r: EnterpriseRuleRow): string {
  const a = r.validFrom ? new Date(r.validFrom).toLocaleDateString() : "—";
  const b = r.validTo ? new Date(r.validTo).toLocaleDateString() : "Open";
  return `${a} → ${b}`;
}

function createdLabel(r: EnterpriseRuleRow): string {
  const n = r.createdBy?.profile?.displayName;
  return n || "—";
}

export function EnterpriseRuleGrid({
  rows,
  page,
  limit,
  total,
  loading,
  overlapById,
  canManage,
  onPageChange,
  getViewHref,
  getEditHref,
  getDuplicateHref,
  onPreviewRow,
  onStatusPatch,
  hidePagination,
}: Props) {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const now = new Date();
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;

  if (loading && !rows.length) {
    return (
      <div className="card radius-12">
        <div className="card-body">
          <p className="text-muted small mb-0">Loading rules…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card radius-12">
      <div className="table-responsive">
        <table className="table table-hover table-sm align-middle mb-0">
          <thead className="bg-light">
            <tr>
              <th className="text-muted small">#</th>
              <th className="text-muted small">Rule</th>
              <th className="text-muted small">Where</th>
              <th className="text-muted small">Target summary</th>
              <th className="text-muted small">Target type</th>
              <th className="text-muted small">Discount</th>
              <th className="text-muted small">Value</th>
              <th className="text-muted small">Prio</th>
              <th className="text-muted small">Window</th>
              <th className="text-muted small">Flags</th>
              <th className="text-muted small">Created by</th>
              <th className="text-muted small">Updated</th>
              <th className="text-end text-muted small">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const overlaps = overlapById[r.id] ?? [];
              const badges = collectRowBadges(r, now);
              return (
                <tr key={r.id}>
                  <td className="small text-muted">{offset + idx + 1}</td>
                  <td className="small fw-medium">{r.name}</td>
                  <td className="small">{labelScopeKind(r.scopeKind)}</td>
                  <td className="small">{scopeSummary(r)}</td>
                  <td className="small">{labelTargetKind(r.targetKind)}</td>
                  <td className="small">{labelDiscountMethod(r.discountMethod)}</td>
                  <td className="small">{formatDiscountValue(r.discountMethod, r.discountValue)}</td>
                  <td className="small">{r.priority}</td>
                  <td className="small text-nowrap">{formatWindow(r)}</td>
                  <td className="small">
                    <div className="d-flex flex-wrap gap-1">
                      {badges.map((b) => (
                        <span key={b.key} className={`badge ${b.className}`}>
                          {b.text}
                        </span>
                      ))}
                      {r.requiresApproval && <span className="badge bg-light text-dark border">Approval</span>}
                      {overlaps.length > 0 && <span className="badge bg-warning text-dark">Overlap</span>}
                    </div>
                    {overlaps[0] && <div className="text-warning small mt-1">{overlaps[0]}</div>}
                  </td>
                  <td className="small">{createdLabel(r)}</td>
                  <td className="small text-nowrap">{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—"}</td>
                  <td className="text-end position-relative">
                    <div className="d-inline-flex flex-column align-items-end gap-1">
                      <div className="btn-group btn-group-sm">
                        <Link className="btn btn-outline-secondary" title="View" href={getViewHref(r)}>
                          View
                        </Link>
                        {canManage && (
                          <Link className="btn btn-outline-primary" title="Edit" href={getEditHref(r)}>
                            Edit
                          </Link>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setOpenMenu((x) => (x === r.id ? null : r.id))}
                          >
                            ⋯
                          </button>
                        )}
                      </div>
                      {canManage && openMenu === r.id && (
                        <div
                          className="border rounded shadow-sm bg-white text-start p-1"
                          style={{ minWidth: 180, zIndex: 20, position: "absolute", right: 8, top: "100%" }}
                        >
                          <Link className="dropdown-item small rounded" href={getDuplicateHref(r)} onClick={() => setOpenMenu(null)}>
                            Duplicate
                          </Link>
                          <button type="button" className="dropdown-item small rounded" onClick={() => { setOpenMenu(null); onPreviewRow(r); }}>
                            Focus in simulator
                          </button>
                          {r.status === "ACTIVE" && (
                            <button type="button" className="dropdown-item small rounded" onClick={() => { setOpenMenu(null); onStatusPatch(r, "PAUSED"); }}>
                              Pause
                            </button>
                          )}
                          {(r.status === "PAUSED" || r.status === "DRAFT") && (
                            <button type="button" className="dropdown-item small rounded" onClick={() => { setOpenMenu(null); onStatusPatch(r, "ACTIVE"); }}>
                              Activate
                            </button>
                          )}
                          {r.status !== "ARCHIVED" && r.status !== "INACTIVE" && (
                            <button
                              type="button"
                              className="dropdown-item small text-danger rounded"
                              onClick={() => { setOpenMenu(null); onStatusPatch(r, "ARCHIVED"); }}
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && !loading && (
        <div className="card-body text-center py-5">
          <h6 className="mb-2">No discount rules match</h6>
          <p className="small text-muted mb-3">Adjust filters or create a new catalog rule for automated list pricing.</p>
        </div>
      )}
      {!hidePagination && total > limit && (
        <div className="card-footer d-flex justify-content-between align-items-center py-2">
          <span className="small text-muted">
            Page {page} of {totalPages} · {total} rules
          </span>
          <div className="btn-group btn-group-sm">
            <button type="button" className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              Prev
            </button>
            <button type="button" className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
