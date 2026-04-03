/**
 * Owner pharmacy medicine requisitions — shared query building (same rules as backend list/summary).
 */

export type MedicineRequisitionDashboardSummary = {
  total: number;
  pending: number;
  approved: number;
  dispatched: number;
};

export function buildMedicineRequisitionListParams(opts: {
  orgId?: number | null;
  branchId?: string;
  status?: string;
  urgency?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): string {
  const sp = new URLSearchParams();
  if (opts.orgId != null && Number.isFinite(opts.orgId) && opts.orgId > 0) {
    sp.set("orgId", String(opts.orgId));
  }
  if (opts.branchId) sp.set("branchId", opts.branchId);
  if (opts.status) sp.set("status", opts.status);
  if (opts.urgency) sp.set("urgency", opts.urgency);
  if (opts.dateFrom) sp.set("dateFrom", opts.dateFrom);
  if (opts.dateTo) sp.set("dateTo", opts.dateTo);
  if (opts.page != null && opts.page > 1) sp.set("page", String(opts.page));
  if (opts.limit != null) sp.set("limit", String(opts.limit));
  return sp.toString();
}

export function buildMedicineRequisitionSummaryParams(opts: { orgId?: number | null; branchId?: string }): string {
  const sp = new URLSearchParams();
  if (opts.orgId != null && Number.isFinite(opts.orgId) && opts.orgId > 0) {
    sp.set("orgId", String(opts.orgId));
  }
  if (opts.branchId) sp.set("branchId", opts.branchId);
  return sp.toString();
}
