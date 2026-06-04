"use client";

import type { EnterpriseRuleRow } from "../_lib/enterpriseRulesTypes";
import {
  formatDiscountValue,
  labelDiscountMethod,
  labelRuleKind,
  labelScopeKind,
  labelTargetKind,
} from "../_lib/enterpriseRuleLabels";
import { collectRowBadges, formatValidityWindow, scopeSummary } from "../_lib/enterpriseRuleRowSummary";

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card radius-12 mb-3 h-100">
      <div className="card-body">
        <h6 className="text-uppercase text-muted small fw-bold mb-2">{title}</h6>
        <div className="small text-body">{children}</div>
      </div>
    </div>
  );
}

function createdByLabel(r: EnterpriseRuleRow): string {
  return r.createdBy?.profile?.displayName ?? "—";
}

export function EnterpriseRuleDetailSummary({ row }: { row: EnterpriseRuleRow }) {
  const now = new Date();
  const badges = collectRowBadges(row, now);
  const cap =
    row.maxCapAmount != null && String(row.maxCapAmount) !== "" ? String(row.maxCapAmount) : null;
  const slab = row.minQtyForSlab != null ? String(row.minQtyForSlab) : null;

  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        {badges.map((b) => (
          <span key={b.key} className={`badge ${b.className}`}>
            {b.text}
          </span>
        ))}
        {row.requiresApproval && <span className="badge bg-light text-dark border">Requires approval</span>}
      </div>

      <div className="row g-3">
        <div className="col-md-6 col-xl-4">
          <DetailCard title="Applies to / scope">
            <div className="fw-semibold mb-1">{labelScopeKind(row.scopeKind)}</div>
            <div className="text-muted">{row.scopeKind === "BRANCH_SPECIFIC" ? row.scopeBranch?.name ?? `Branch #${row.scopeBranchId ?? "?"}` : "All branches in the organization"}</div>
          </DetailCard>
        </div>
        <div className="col-md-6 col-xl-4">
          <DetailCard title="Target type">
            <div className="fw-semibold mb-1">{labelTargetKind(row.targetKind)}</div>
            <div className="text-muted small">{labelRuleKind(row.ruleKind)}</div>
          </DetailCard>
        </div>
        <div className="col-md-6 col-xl-4">
          <DetailCard title="Target summary">
            <div className="fw-semibold text-break">{scopeSummary(row)}</div>
          </DetailCard>
        </div>
        <div className="col-md-6 col-xl-4">
          <DetailCard title="Discount type">
            {labelDiscountMethod(row.discountMethod)}
          </DetailCard>
        </div>
        <div className="col-md-6 col-xl-4">
          <DetailCard title="Discount value">
            <span className="fw-semibold fs-6">{formatDiscountValue(row.discountMethod, row.discountValue)}</span>
          </DetailCard>
        </div>
        <div className="col-md-6 col-xl-4">
          <DetailCard title="Priority">
            <span className="fw-semibold">{row.priority}</span>
            <div className="text-muted small mt-1">Lower numbers are evaluated earlier when priorities tie-break.</div>
          </DetailCard>
        </div>
        <div className="col-md-6 col-xl-4">
          <DetailCard title="Stackable">
            {row.stackable ? "Yes — may combine with other stackable catalog rules in order." : "No — stops further enterprise discounts in the same resolution pass where applicable."}
          </DetailCard>
        </div>
        <div className="col-md-6 col-xl-4">
          <DetailCard title="Effective window">
            {formatValidityWindow(row)}
          </DetailCard>
        </div>
        {(cap || slab) && (
          <div className="col-md-6 col-xl-4">
            <DetailCard title="Discount parameters">
              {slab && (
                <div className="mb-1">
                  <span className="text-muted">Min qty (slab): </span>
                  {slab}
                </div>
              )}
              {cap && (
                <div>
                  <span className="text-muted">Max cap amount: </span>
                  {cap}
                </div>
              )}
            </DetailCard>
          </div>
        )}
        <div className="col-12">
          <div className="card radius-12 mb-3">
            <div className="card-body">
              <h6 className="text-uppercase text-muted small fw-bold mb-3">Record</h6>
              <div className="row g-3 small">
                <div className="col-sm-6 col-lg-4">
                  <div className="text-muted">Created by</div>
                  <div className="fw-medium">{createdByLabel(row)}</div>
                </div>
                <div className="col-sm-6 col-lg-4">
                  <div className="text-muted">Created</div>
                  <div className="fw-medium">{row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}</div>
                </div>
                <div className="col-sm-6 col-lg-4">
                  <div className="text-muted">Last updated</div>
                  <div className="fw-medium">{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "—"}</div>
                </div>
                <div className="col-sm-6 col-lg-4">
                  <div className="text-muted">Rule id</div>
                  <div className="fw-medium font-monospace">{row.id}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
