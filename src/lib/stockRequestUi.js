/**
 * Shared stock-request list/detail UI helpers (derived status, lifecycle buckets, badges).
 * Aligns with backend getStatusDisplay palette: gray | blue | yellow | green | red.
 */

/** @param {Record<string, unknown> | null | undefined} row */
export function getStockRequestDerivedKey(row) {
  return String(row?.derivedStatus || row?.status || "").toUpperCase();
}

/**
 * Branch staff "needs attention": actionable now at this branch (draft, inbound, partial receive).
 * Explicit rule — not the same as "in progress" (waiting on owner/warehouse).
 */
export function stockRequestNeedsAttention(row) {
  return STOCK_REQUEST_ATTENTION_KEYS.has(getStockRequestDerivedKey(row));
}

const STOCK_REQUEST_ATTENTION_KEYS = new Set([
  "DRAFT",
  "DISPATCHED",
  "PARTIALLY_DISPATCHED",
  "PARTIALLY_RECEIVED",
  "RECEIVED_PARTIAL",
]);

const STOCK_REQUEST_RECEIVED_KEYS = new Set(["RECEIVED", "RECEIVED_FULL", "CLOSED"]);

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {"attention"|"progress"|"received"|"cancelled"}
 */
export function stockRequestLifecycleBucket(row) {
  const k = getStockRequestDerivedKey(row);
  if (k === "CANCELLED") return "cancelled";
  if (STOCK_REQUEST_RECEIVED_KEYS.has(k)) return "received";
  if (STOCK_REQUEST_ATTENTION_KEYS.has(k)) return "attention";
  return "progress";
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @param {"attention"|"progress"|"received"|"cancelled"} bucket
 */
export function stockRequestMatchesLifecycleBucket(row, bucket) {
  return stockRequestLifecycleBucket(row) === bucket;
}

/**
 * Normalize display label: prefer API label, else title-case raw codes.
 * @param {Record<string, unknown> | null | undefined} row
 */
export function formatStockRequestStatusLabel(row) {
  const raw = row?.derivedStatusDisplay?.label ?? row?.derivedStatus ?? row?.status;
  if (raw == null || raw === "") return "—";
  if (typeof raw !== "string") return String(raw);
  const t = raw.trim();
  if (!t) return "—";
  if (t.includes(" ")) return t;
  return t
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Bootstrap badge classes for stock request status (pill-friendly).
 * Uses derivedStatusDisplay.color when present; otherwise maps canonical status codes.
 * @param {Record<string, unknown> | null | undefined} row
 */
export function stockRequestStatusBadgeClass(row) {
  const c = row?.derivedStatusDisplay?.color;
  if (c === "gray") return "bg-secondary";
  if (c === "blue") return "bg-info text-dark";
  if (c === "yellow") return "bg-warning text-dark";
  if (c === "green") return "bg-success";
  if (c === "red") return "bg-danger";
  return stockRequestStatusBadgeClassFromCode(getStockRequestDerivedKey(row) || row?.status);
}

/** @param {string} status */
export function stockRequestStatusBadgeClassFromCode(status) {
  const s = String(status || "").toUpperCase();
  if (["DRAFT", "CLOSED"].includes(s)) return "bg-secondary";
  if (["SUBMITTED", "OWNER_REVIEW"].includes(s)) return "bg-info text-dark";
  if (["APPROVED", "PARTIALLY_DISPATCHED"].includes(s)) return "bg-warning text-dark";
  if (["FULFILLED_PARTIAL", "FULFILLED_FULL", "DISPATCHED"].includes(s)) return "bg-primary";
  if (["RECEIVED_PARTIAL", "RECEIVED_FULL", "PARTIALLY_RECEIVED", "RECEIVED"].includes(s)) return "bg-success";
  if (["CANCELLED", "REJECTED"].includes(s)) return "bg-danger";
  return "bg-light text-dark";
}

/**
 * One-line staff hint (keep short for table density).
 * @param {Record<string, unknown> | null | undefined} row
 */
/**
 * Best-effort “finalized / received / closed” timestamp for staff **list** rows
 * (payload includes `transfers[0]` from list API when present).
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {string | null | undefined} ISO date string or null
 */
export function stockRequestListCompletedAt(row) {
  const ds = getStockRequestDerivedKey(row);
  const t = row?.transfers?.[0];
  if (["RECEIVED", "RECEIVED_FULL", "CLOSED", "PARTIALLY_RECEIVED", "RECEIVED_PARTIAL"].includes(ds)) {
    return t?.receivedAt || row?.updatedAt || null;
  }
  if (ds === "CANCELLED") return row?.updatedAt || null;
  return null;
}

export function stockRequestNextStepHint(row) {
  const ds = getStockRequestDerivedKey(row);
  if (ds === "DRAFT") return "Submit when ready";
  if (ds === "SUBMITTED" || ds === "OWNER_REVIEW") return "Awaiting owner / HQ";
  if (ds === "APPROVED") return "Fulfillment running";
  if (ds === "FULFILLED_PARTIAL" || ds === "FULFILLED_FULL") return "Watch dispatch / receive";
  if (ds === "PARTIALLY_DISPATCHED" || ds === "DISPATCHED") return "Receive when delivered";
  if (ds === "PARTIALLY_RECEIVED" || ds === "RECEIVED_PARTIAL") return "Complete receiving";
  if (STOCK_REQUEST_RECEIVED_KEYS.has(ds)) return "Settled";
  if (ds === "CANCELLED") return "Cancelled";
  return "";
}

/** Intent pill — matches staff list styling. */
export function getStockRequestIntentBadgeProps(row) {
  const raw = row?.resolvedRequestIntent || row?.requestIntent || "";
  if (raw === "PROCUREMENT") {
    return {
      label: "Procurement",
      className: "badge bg-primary-subtle text-primary-emphasis border border-primary-subtle",
    };
  }
  if (raw === "INTERNAL_TRANSFER") {
    return {
      label: "Transfer",
      className: "badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle",
    };
  }
  return { label: "—", className: "badge bg-light text-muted border" };
}

/**
 * Branch-facing banner when the request needs branch action (null if not).
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {string | null}
 */
export function stockRequestAttentionMessage(row) {
  if (!stockRequestNeedsAttention(row)) return null;
  const ds = getStockRequestDerivedKey(row);
  if (ds === "DRAFT") {
    return "This request is still a draft. Submit it when lines and quantities are final.";
  }
  if (ds === "DISPATCHED" || ds === "PARTIALLY_DISPATCHED") {
    return "Inbound shipment is in motion. Track the dispatch and receive stock when it arrives at this branch.";
  }
  if (ds === "PARTIALLY_RECEIVED" || ds === "RECEIVED_PARTIAL") {
    return "Receiving is incomplete. Finish receiving so inventory and this request stay accurate.";
  }
  return "This request needs follow-up at your branch.";
}

/**
 * Vertical progress steps for detail / summary UIs (staff-facing).
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {{ key: string, title: string, subtitle: string, state: "complete" | "current" | "pending" | "skipped" }[]}
 */
export function stockRequestProgressSteps(row) {
  if (!row) return [];
  const ds = getStockRequestDerivedKey(row);
  const st = String(row?.status || "").toUpperCase();
  const submitted =
    Boolean(row.submittedAt) ||
    [
      "SUBMITTED",
      "OWNER_REVIEW",
      "APPROVED",
      "FULFILLED_PARTIAL",
      "FULFILLED_FULL",
      "DISPATCHED",
      "PARTIALLY_DISPATCHED",
      "PARTIALLY_RECEIVED",
      "RECEIVED_PARTIAL",
      "RECEIVED",
      "RECEIVED_FULL",
      "CLOSED",
    ].includes(st);
  const cancelled = ds === "CANCELLED" || st === "CANCELLED";
  const doneReceived = STOCK_REQUEST_RECEIVED_KEYS.has(ds);

  const fulfillmentComplete =
    cancelled ||
    doneReceived ||
    ["DISPATCHED", "PARTIALLY_DISPATCHED", "PARTIALLY_RECEIVED", "RECEIVED_PARTIAL", "RECEIVED", "RECEIVED_FULL"].includes(
      ds
    );

  const inboundComplete = cancelled || doneReceived || ["PARTIALLY_RECEIVED", "RECEIVED_PARTIAL", "RECEIVED", "RECEIVED_FULL"].includes(ds);

  const steps = [
    {
      key: "created",
      title: "Request created",
      subtitle: "Recorded on the branch.",
      state: /** @type {const} */ ("complete"),
    },
    {
      key: "submitted",
      title: "Submitted",
      subtitle: submitted ? "Owner / HQ can process." : "Waiting for branch submit.",
      state:
        cancelled && !submitted ? "skipped" : submitted ? "complete" : ds === "DRAFT" ? "current" : "pending",
    },
    {
      key: "fulfillment",
      title: "Fulfillment",
      subtitle: "Allocation, picking, and dispatch from warehouse.",
      state: cancelled
        ? "skipped"
        : !submitted
          ? "pending"
          : fulfillmentComplete
            ? "complete"
            : ["SUBMITTED", "OWNER_REVIEW", "APPROVED", "FULFILLED_PARTIAL", "FULFILLED_FULL"].includes(ds)
              ? "current"
              : "pending",
    },
    {
      key: "inbound",
      title: "Inbound to branch",
      subtitle: "Shipment and receiving at this branch.",
      state: cancelled
        ? "skipped"
        : !fulfillmentComplete
          ? "pending"
          : inboundComplete
            ? "complete"
            : ["DISPATCHED", "PARTIALLY_DISPATCHED", "PARTIALLY_RECEIVED", "RECEIVED_PARTIAL"].includes(ds)
              ? "current"
              : "pending",
    },
    {
      key: "done",
      title: "Settled",
      subtitle: cancelled ? "Request cancelled." : doneReceived ? "Closed or fully received." : "Awaiting completion.",
      state: cancelled || doneReceived ? "complete" : "pending",
    },
  ];

  return steps;
}

/** @param {Record<string, unknown>[]} rows */
export function computeStockRequestListKpis(rows) {
  let attention = 0;
  let progress = 0;
  let received = 0;
  let cancelled = 0;
  for (const r of rows) {
    const b = stockRequestLifecycleBucket(r);
    if (b === "cancelled") cancelled += 1;
    else if (b === "received") received += 1;
    else if (b === "attention") attention += 1;
    else progress += 1;
  }
  return {
    total: rows.length,
    attention,
    progress,
    received,
    cancelled,
  };
}
