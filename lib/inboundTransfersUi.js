/**
 * Staff branch inbound transfers — permission helpers and display labels.
 * Pure functions (no React); safe for unit tests.
 */

/**
 * @param {string[]|undefined|null} permissions
 * @param {boolean} isWarehouseHub
 */
export function canViewInboundTransfersQueue(permissions, isWarehouseHub) {
  const p = new Set(Array.isArray(permissions) ? permissions : []);
  if (p.has("inbound.read") || p.has("inventory.read") || p.has("inventory.receive") || p.has("dispatch.view")) {
    return true;
  }
  if (
    isWarehouseHub &&
    (p.has("warehouse.view") || p.has("warehouse.operations") || p.has("warehouse.manage"))
  ) {
    return true;
  }
  return false;
}

/** Posting / verification receive at branch (inbound queue actions). */
export function canReceiveStockAtBranch(permissions) {
  const p = new Set(Array.isArray(permissions) ? permissions : []);
  return p.has("inventory.receive") || p.has("inbound.receive");
}

/** Print URLs are still enforced by API; frontend may show menu when user likely has read/print path. */
export function canSeeDispatchPrintMenu(permissions) {
  const p = new Set(Array.isArray(permissions) ? permissions : []);
  return (
    p.has("inventory.receive") ||
    p.has("inbound.read") ||
    p.has("inventory.read") ||
    p.has("dispatch.view")
  );
}

/** Receive-dispatch page: view summary/prints without posting. */
export function canViewReceiveDispatchWorkspace(permissions) {
  if (canReceiveStockAtBranch(permissions)) return true;
  const p = new Set(Array.isArray(permissions) ? permissions : []);
  return p.has("dispatch.view") || p.has("inventory.read") || p.has("inbound.read");
}

/**
 * Receive Center + Incoming shipments list — same visibility rule as warehouse inbound queue.
 * @param {string[]|undefined|null} permissions
 * @param {boolean} isWarehouseHub
 */
export function canViewReceiveCenterPage(permissions, isWarehouseHub) {
  return canViewInboundTransfersQueue(permissions, isWarehouseHub);
}

/** Pending PO receipt list API (matches typical route guard). */
export function canLoadPendingPoReceipts(permissions) {
  const p = new Set(Array.isArray(permissions) ? permissions : []);
  return (
    p.has("purchase.receive") ||
    p.has("grn.post") ||
    p.has("grn.create") ||
    p.has("inbound.grn") ||
    p.has("inventory.receive")
  );
}

/**
 * @param {string} code — backend nextReceiveAction
 * @returns {string}
 */
export function nextReceiveActionHint(code) {
  const m = {
    START_RECEIVE_DRAFT: "Open receive and save draft quantities",
    SUBMIT_FOR_MANAGER_CONFIRMATION: "Submit for manager confirmation",
    MANAGER_CONFIRM_AND_POST: "Manager: confirm and post stock",
    SAVE_RECEIVE_DRAFT_OR_AWAIT_IN_TRANSIT: "Save draft or wait until shipment is in transit",
    SAVE_VERIFY_OR_WAIT_IN_TRANSIT: "Draft on file; post when IN_TRANSIT",
    MANAGER_CONFIRM_WHEN_IN_TRANSIT: "Awaiting IN_TRANSIT before manager can post",
    COMPLETED: "Posted / complete",
    OPEN_LEGACY_TRANSFER_RECEIVE: "Use Transfers → incoming (legacy receive)",
    REVIEW_INBOUND: "Review status",
  };
  return m[code] || code || "—";
}

/**
 * Primary button label for a dispatch row on the inbound list.
 * @param {{ nextReceiveAction: string, kind: string, dispatchReceiveSession?: { status?: string } | null }} row
 * @param {boolean} canReceive
 */
export function inboundDispatchPrimaryLabel(row, canReceive) {
  if (row.kind !== "DISPATCH") return "Open transfers";
  if (row.nextReceiveAction === "COMPLETED") return "View";
  if (!canReceive) return "View";
  if (
    row.nextReceiveAction === "SUBMIT_FOR_MANAGER_CONFIRMATION" ||
    row.dispatchReceiveSession?.status === "DRAFT" ||
    row.nextReceiveAction === "SAVE_VERIFY_OR_WAIT_IN_TRANSIT" ||
    row.nextReceiveAction === "SAVE_RECEIVE_DRAFT_OR_AWAIT_IN_TRANSIT"
  ) {
    return "Continue receive";
  }
  if (row.nextReceiveAction === "MANAGER_CONFIRM_AND_POST") return "Open receive";
  if (row.nextReceiveAction === "START_RECEIVE_DRAFT") return "Receive";
  return "Open receive";
}

/**
 * @param {string|undefined} status
 * @returns {string} Bootstrap badge class (without bg- prefix for flexibility — returns full class)
 */
export function dispatchStatusBadgeClass(status) {
  const map = {
    IN_TRANSIT: "bg-info",
    SENT: "bg-info",
    DELIVERED: "bg-success",
    CREATED: "bg-secondary",
    PACKED: "bg-warning text-dark",
  };
  return map[status] ?? "bg-secondary";
}

/** DispatchReceiveSession.status — badge class aligned with inbound list + receive workspace. */
export function receiveSessionStatusBadgeClass(status) {
  if (!status) return "bg-secondary";
  const s = String(status);
  if (s === "POSTED") return "bg-success";
  if (s === "AWAITING_CONFIRMATION") return "bg-warning text-dark";
  if (s === "DRAFT") return "bg-info text-dark";
  if (s === "CANCELLED") return "bg-secondary";
  return "bg-secondary";
}

/** Human-readable session status (underscores → spaces). */
export function receiveSessionStatusLabel(status) {
  if (status == null || status === "") return "—";
  return String(status).replace(/_/g, " ");
}

/**
 * @param {string|undefined|null} iso
 * @returns {string}
 */
export function formatInboundTimestamp(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString(undefined, { dateStyle: "medium" })} ${d.toLocaleTimeString(undefined, { timeStyle: "short" })}`;
}
