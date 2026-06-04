/**
 * Staff warehouse fulfillment request queue — display labels, badges, and row actions.
 * Raw statuses come from StockRequest / backend REQUISITION_QUEUE_STATUSES.
 */

export type FulfillmentRequestQueueRow = {
  id: number;
  status?: string;
  urgency?: string | null;
  createdAt?: string;
  updatedAt?: string;
  procurementNote?: string | null;
  requestIntent?: string;
  branch?: { id?: number; name?: string };
  requester?: { profile?: { displayName?: string } } | null;
  warehouseAction?: { openHref: string; nextActionLabel: string } | null;
  _meta?: { lineCount?: number; dispatchCount?: number };
  items?: Array<{ requestedQty?: number }>;
};

export function fulfillmentRequestStatusLabel(raw: string | null | undefined): string {
  const s = String(raw || "")
    .trim()
    .toUpperCase();
  const map: Record<string, string> = {
    SUBMITTED: "Submitted",
    OWNER_REVIEW: "Pending approval",
    APPROVED: "Approved",
    PARTIALLY_DISPATCHED: "Partially dispatched",
    FULFILLED_PARTIAL: "Partially fulfilled",
    FULFILLED_FULL: "Fulfilled",
    CANCELLED: "Cancelled",
    REJECTED: "Rejected",
    DRAFT: "Draft",
  };
  return map[s] || (raw ? String(raw).replace(/_/g, " ") : "—");
}

export function fulfillmentRequestStatusBadgeClass(raw: string | null | undefined): string {
  const s = String(raw || "")
    .trim()
    .toUpperCase();
  if (["SUBMITTED", "OWNER_REVIEW"].includes(s)) return "bg-warning text-dark";
  if (s === "APPROVED") return "bg-primary";
  if (["PARTIALLY_DISPATCHED", "FULFILLED_PARTIAL"].includes(s)) return "bg-info text-dark";
  if (["FULFILLED_FULL", "RECEIVED", "DELIVERED"].includes(s)) return "bg-success";
  if (["CANCELLED", "REJECTED", "FAILED"].includes(s)) return "bg-danger";
  if (s === "DRAFT") return "bg-secondary";
  return "bg-secondary";
}

export function fulfillmentRequestNextStepBadgeClass(label: string): string {
  const u = label.toUpperCase();
  if (u.includes("PICK")) return "bg-primary";
  if (u.includes("DISPATCH")) return "bg-info text-dark";
  if (u.includes("FULFILL")) return "bg-primary";
  if (u.includes("REVIEW")) return "bg-warning text-dark";
  return "bg-light text-dark border";
}

export function sumRequestedQty(row: FulfillmentRequestQueueRow): number {
  const lines = Array.isArray(row.items) ? row.items : [];
  return lines.reduce((a, it) => a + Math.max(0, Math.floor(Number(it.requestedQty ?? 0))), 0);
}

export type FulfillmentQueueTab = "all" | "action" | "approved" | "dispatch" | "partial";

export function queueTabToStatusParam(tab: FulfillmentQueueTab): string | undefined {
  switch (tab) {
    case "action":
      return "SUBMITTED,OWNER_REVIEW";
    case "approved":
      return "APPROVED";
    case "dispatch":
      return "PARTIALLY_DISPATCHED";
    case "partial":
      return "FULFILLED_PARTIAL";
    default:
      return undefined;
  }
}

export function isActionableQueueStatus(status: string | undefined): boolean {
  const s = String(status || "").toUpperCase();
  return ["SUBMITTED", "OWNER_REVIEW", "APPROVED", "PARTIALLY_DISPATCHED", "FULFILLED_PARTIAL"].includes(s);
}

export type RowQuickAction = {
  key: string;
  label: string;
  href?: string;
  external?: boolean;
  variant?: "primary" | "outline-primary" | "outline-secondary" | "outline-dark";
  /** copy id to clipboard */
  copyId?: boolean;
};

export function buildFulfillmentRowQuickActions(
  row: FulfillmentRequestQueueRow,
  branchId: string
): RowQuickAction[] {
  const st = String(row.status || "").toUpperCase();
  const detailHref = `/staff/branch/${branchId}/warehouse/requests/${row.id}`;
  const wa = row.warehouseAction;
  const actions: RowQuickAction[] = [];

  if (wa?.openHref) {
    const isDetail = wa.openHref.includes(`/warehouse/requests/${row.id}`) && !wa.openHref.includes("pick-lists");
    actions.push({
      key: "continue",
      label: isDetail ? "Open details" : "Continue",
      href: wa.openHref,
      variant: "primary",
    });
  } else {
    actions.push({ key: "open", label: "Open details", href: detailHref, variant: "primary" });
  }

  actions.push({
    key: "hub",
    label: "Fulfillment hub",
    href: detailHref,
    variant: "outline-primary",
  });

  if (st === "PARTIALLY_DISPATCHED" || (row._meta?.dispatchCount ?? 0) > 0) {
    actions.push({
      key: "dispatch-focus",
      label: "Review dispatch",
      href: `${detailHref}?focus=dispatch`,
      variant: "outline-secondary",
    });
  }

  actions.push({
    key: "branch-view",
    label: "Branch request",
    href: `/staff/branch/${branchId}/inventory/stock-request-detail/${row.id}`,
    variant: "outline-secondary",
  });

  actions.push({ key: "copy", label: "Copy request #", copyId: true, variant: "outline-dark" });

  return actions;
}

export function formatShortRelative(iso: string | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
