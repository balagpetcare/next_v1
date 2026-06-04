"use client";

import type { MembershipTierRow, SortDir, SortKey } from "../_lib/membershipTierTypes";

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function benefitSummary(t: MembershipTierRow): string {
  const p = num(t.discountPercent);
  if (p == null) return "—";
  const cap = num(t.maxDiscountPerItem);
  if (cap != null && cap > 0) return `${p}% (capped ${cap}/unit)`;
  return `${p}% off list`;
}

function exclusionsSummary(t: MembershipTierRow): string {
  const n = (t.exclusions ?? []).length;
  if (!n) return "None";
  const kinds = new Set((t.exclusions ?? []).map((e) => e.excludeKind));
  return `${n} rule${n === 1 ? "" : "s"} (${[...kinds].join(", ")})`;
}

function branchSummary(t: MembershipTierRow): string {
  const scopes = t.branchScopes ?? [];
  if (!scopes.length) return "All branches";
  const names = scopes.map((s) => s.branch?.name || `#${s.branchId}`);
  return names.slice(0, 2).join(", ") + (names.length > 2 ? ` +${names.length - 2}` : "");
}

function cardsSummary(t: MembershipTierRow): string {
  const c = t.ownerDiscountCards ?? [];
  if (!c.length) return "—";
  return c.map((x) => x.cardNumber).join(", ");
}

function statusBadgeClass(st: string): string {
  const s = st.toUpperCase();
  if (s === "ACTIVE") return "bg-success-subtle text-success-emphasis border border-success-subtle";
  if (s === "DRAFT") return "bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle";
  if (s === "PAUSED") return "bg-warning-subtle text-warning-emphasis border border-warning-subtle";
  if (s === "ARCHIVED" || s === "EXPIRED") return "bg-light text-muted border";
  return "bg-light text-dark border";
}

type Props = {
  rows: MembershipTierRow[];
  loading: boolean;
  page: number;
  pageSize: number;
  totalFiltered: number;
  onPageChange: (p: number) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  canManage: boolean;
  onView: (t: MembershipTierRow) => void;
  onEdit: (t: MembershipTierRow) => void;
  onDuplicate: (t: MembershipTierRow) => void;
  onPreview: (t: MembershipTierRow) => void;
  onSetStatus: (t: MembershipTierRow, status: string) => void;
};

export function MembershipTierGrid({
  rows,
  loading,
  page,
  pageSize,
  totalFiltered,
  onPageChange,
  sortKey,
  sortDir,
  onSort,
  canManage,
  onView,
  onEdit,
  onDuplicate,
  onPreview,
  onSetStatus,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const start = (page - 1) * pageSize;

  const sortBtn = (k: SortKey, label: string) => (
    <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none text-dark fw-semibold" onClick={() => onSort(k)}>
      {label}
      {sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
    </button>
  );

  if (!loading && totalFiltered === 0) {
    return (
      <div className="card radius-12">
        <div className="card-body text-center py-5">
          <h6 className="mb-2">No membership tiers match your filters</h6>
          <p className="text-muted small mb-3">
            Membership tiers control catalog list-price benefits before checkout. Create a tier, link discount cards, and define branch scope and
            exclusions to match how your organization sells to members.
          </p>
          {canManage && (
            <p className="small text-muted mb-0">
              Use <strong>Create tier</strong> above, or clear filters to see the full catalog.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card radius-12">
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover table-sm align-middle mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-3" style={{ width: 48 }}>
                  #
                </th>
                <th>{sortBtn("name", "Tier")}</th>
                <th>Benefit</th>
                <th>{sortBtn("discount", "%")}</th>
                <th>Cap</th>
                <th>Exclusions</th>
                <th>Branches</th>
                <th>Cards</th>
                <th>{sortBtn("status", "Status")}</th>
                <th>{sortBtn("updated", "Updated")}</th>
                <th className="text-end pe-3" style={{ width: 120 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={11} className="text-center text-muted py-4">
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Loading tiers…
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((t, i) => {
                  const st = String(t.status || "").toUpperCase();
                  const cap = num(t.maxDiscountPerItem);
                  const excl = (t.exclusions ?? []).length > 0;
                  const scoped = (t.branchScopes ?? []).length > 0;
                  return (
                    <tr key={t.id}>
                      <td className="ps-3 text-muted small">{start + i + 1}</td>
                      <td className="fw-medium">{t.name}</td>
                      <td className="small">{benefitSummary(t)}</td>
                      <td>{String(t.discountPercent ?? "—")}</td>
                      <td className="small">{cap != null && cap > 0 ? String(t.maxDiscountPerItem) : "—"}</td>
                      <td className="small">{exclusionsSummary(t)}</td>
                      <td className="small">{branchSummary(t)}</td>
                      <td className="small text-truncate" style={{ maxWidth: 120 }} title={cardsSummary(t)}>
                        {cardsSummary(t)}
                      </td>
                      <td>
                        <span className={`badge rounded-pill small ${statusBadgeClass(st)}`}>{st || "—"}</span>
                        <div className="mt-1 d-flex flex-wrap gap-1">
                          {cap != null && cap > 0 && (
                            <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle" style={{ fontSize: "0.65rem" }}>
                              Capped
                            </span>
                          )}
                          {scoped && (
                            <span className="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle" style={{ fontSize: "0.65rem" }}>
                              Scoped
                            </span>
                          )}
                          {excl && (
                            <span className="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle" style={{ fontSize: "0.65rem" }}>
                              Excl.
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="small text-muted">{t.updatedAt ? new Date(t.updatedAt).toLocaleString() : "—"}</td>
                      <td className="text-end pe-3 position-relative">
                        <details className="d-inline-block text-start">
                          <summary className="btn btn-sm btn-outline-secondary py-0 px-2" style={{ listStyle: "none" }}>
                            Actions
                          </summary>
                          <div className="border rounded bg-white shadow-sm py-1 mt-1 position-absolute end-0 z-3" style={{ minWidth: 180 }}>
                            <button className="btn btn-link btn-sm text-dark text-decoration-none w-100 text-start py-1" type="button" onClick={() => onView(t)}>
                              View
                            </button>
                            {canManage && (
                              <button className="btn btn-link btn-sm text-dark text-decoration-none w-100 text-start py-1" type="button" onClick={() => onEdit(t)}>
                                Edit
                              </button>
                            )}
                            {canManage && (
                              <button className="btn btn-link btn-sm text-dark text-decoration-none w-100 text-start py-1" type="button" onClick={() => onDuplicate(t)}>
                                Duplicate
                              </button>
                            )}
                            <button className="btn btn-link btn-sm text-dark text-decoration-none w-100 text-start py-1" type="button" onClick={() => onPreview(t)}>
                              Preview pricing
                            </button>
                            {canManage && st !== "ACTIVE" && (
                              <button className="btn btn-link btn-sm text-dark text-decoration-none w-100 text-start py-1" type="button" onClick={() => onSetStatus(t, "ACTIVE")}>
                                Activate
                              </button>
                            )}
                            {canManage && st === "ACTIVE" && (
                              <button className="btn btn-link btn-sm text-dark text-decoration-none w-100 text-start py-1" type="button" onClick={() => onSetStatus(t, "PAUSED")}>
                                Pause
                              </button>
                            )}
                            {canManage && st !== "ARCHIVED" && (
                              <button className="btn btn-link btn-sm text-danger text-decoration-none w-100 text-start py-1" type="button" onClick={() => onSetStatus(t, "ARCHIVED")}>
                                Archive
                              </button>
                            )}
                          </div>
                        </details>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {!loading && totalFiltered > 0 && (
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-2 border-top small">
            <div className="text-muted">
              Showing {start + 1}–{Math.min(start + pageSize, totalFiltered)} of {totalFiltered}
            </div>
            <div className="btn-group btn-group-sm">
              <button type="button" className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                Prev
              </button>
              <span className="btn btn-outline-secondary disabled">
                {page} / {totalPages}
              </span>
              <button type="button" className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
