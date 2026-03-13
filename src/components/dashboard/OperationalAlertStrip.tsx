"use client";

import Link from "next/link";
import { useBranchContext } from "@/lib/useBranchContext";

export type OperationalAlertStripProps = {
  branchId: string;
  className?: string;
};

/**
 * Lightweight operational alert indicators using existing branch context data
 * (same source as sidebar badges: approvals, lowStock, clinicQueue).
 * Renders only when at least one count > 0; permission-aware.
 */
export default function OperationalAlertStrip({ branchId, className = "" }: OperationalAlertStripProps) {
  const { kpis, todayBoard, myAccess, isLoading } = useBranchContext(branchId);
  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];

  const approvalsLen = Array.isArray((todayBoard as { approvalsPending?: unknown[] })?.approvalsPending)
    ? (todayBoard as { approvalsPending: unknown[] }).approvalsPending.length
    : undefined;
  const approvals = typeof approvalsLen === "number" ? approvalsLen : (typeof kpis?.approvalsPending === "number" ? kpis.approvalsPending : undefined);
  const lowStock = typeof kpis?.lowStockCount === "number" ? kpis.lowStockCount : undefined;
  const clinicLen = Array.isArray((todayBoard as { appointmentsQueue?: unknown[] })?.appointmentsQueue)
    ? (todayBoard as { appointmentsQueue: unknown[] }).appointmentsQueue.length
    : undefined;
  const clinicQueue = typeof clinicLen === "number" ? clinicLen : undefined;

  const canApprovals = permissions.includes("approvals.view") || permissions.includes("approvals.manage");
  const canInventory = permissions.includes("inventory.read");
  const canQueue = permissions.includes("clinic.queue.read") || permissions.includes("clinic.queue.manage");

  if (isLoading || (!approvals && !lowStock && !clinicQueue)) return null;
  if (canApprovals && (approvals ?? 0) <= 0 && canInventory && (lowStock ?? 0) <= 0 && canQueue && (clinicQueue ?? 0) <= 0) return null;

  const items: { label: string; count: number; href: string; show: boolean }[] = [
    { label: "pending approvals", count: canApprovals ? (approvals ?? 0) : 0, href: `/staff/branch/${branchId}/approvals`, show: canApprovals },
    { label: "low stock items", count: canInventory ? (lowStock ?? 0) : 0, href: `/staff/branch/${branchId}/inventory`, show: canInventory },
    { label: "in queue", count: canQueue ? (clinicQueue ?? 0) : 0, href: `/staff/branch/${branchId}/clinic/queue`, show: canQueue },
  ].filter((i) => i.show && i.count > 0);

  if (items.length === 0) return null;

  return (
    <div className={`d-flex flex-wrap align-items-center gap-2 small ${className}`.trim()} role="region" aria-label="Operational alerts">
      <span className="text-muted me-1">Alerts:</span>
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="d-inline-flex align-items-center gap-1 text-decoration-none px-2 py-1 rounded bg-warning bg-opacity-25 text-dark"
        >
          <span className="fw-semibold">{item.count}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </div>
  );
}
