"use client";

import Link from "next/link";
import Card from "@/src/bpa/components/ui/Card";

/**
 * BranchAlertsPanel – low stock, expiry, suspicious. Permission-aware; hide section if no permission for any alert type.
 */
export default function BranchAlertsPanel({ alerts = {}, permissions = [], branchId }) {
  const perms = Array.isArray(permissions) ? permissions : [];
  const bid = String(branchId ?? "");

  const lowStockItems = Array.isArray(alerts.lowStockItems) ? alerts.lowStockItems : [];
  const expiryWarnings = Array.isArray(alerts.expiryWarnings) ? alerts.expiryWarnings : [];
  const suspiciousFlags = Array.isArray(alerts.suspiciousFlags) ? alerts.suspiciousFlags : [];

  const canInventory = perms.includes("inventory.read");
  const canApprovals = perms.includes("approvals.manage") || perms.includes("approvals.view");

  const showLowStock = canInventory && lowStockItems.length > 0;
  const showExpiry = expiryWarnings.length > 0;
  const showSuspicious = canApprovals && suspiciousFlags.length > 0;

  if (!showLowStock && !showExpiry && !showSuspicious) {
    if (!canInventory && !canApprovals) return null;
    return (
      <Card title="Alerts & Risks" subtitle="Low stock, expiry, flags">
        <p className="text-secondary-light text-sm mb-0">No alerts right now.</p>
      </Card>
    );
  }

  const list = [];
  if (showLowStock) {
    lowStockItems.slice(0, 10).forEach((item, i) => {
      list.push({
        key: `low-${i}`,
        severity: "warning",
        text: item.productName ?? item.name ?? item.sku ?? "Low stock",
        meta: item.quantity != null ? `Qty: ${item.quantity}` : null,
      });
    });
  }
  if (showExpiry) {
    expiryWarnings.slice(0, 5).forEach((item, i) => {
      list.push({
        key: `exp-${i}`,
        severity: "info",
        text: item.productName ?? item.name ?? "Expiring soon",
        meta: item.expiryDate ?? item.expiresAt ?? null,
      });
    });
  }
  if (showSuspicious) {
    suspiciousFlags.slice(0, 5).forEach((item, i) => {
      list.push({
        key: `flag-${i}`,
        severity: "danger",
        text: item.reason ?? item.description ?? "Flag",
        meta: item.createdAt ?? null,
      });
    });
  }

  return (
    <Card
      title="Alerts & Risks"
      subtitle="Low stock, expiry, flags"
      className="h-100"
    >
      <ul className="list-unstyled mb-0">
        {list.map((a) => (
          <li key={a.key} className="d-flex align-items-start gap-8 py-8 border-bottom border-secondary-200 last-border-0">
            <span
              className={`badge flex-shrink-0 ${
                a.severity === "danger" ? "bg-danger" : a.severity === "warning" ? "bg-warning text-dark" : "bg-info"
              }`}
            >
              {a.severity === "danger" ? "Flag" : a.severity === "warning" ? "Low" : "Expiry"}
            </span>
            <div className="flex-grow-1 min-w-0">
              <span className="text-sm">{a.text}</span>
              {a.meta && <span className="text-secondary-light text-xs d-block">{a.meta}</span>}
            </div>
          </li>
        ))}
      </ul>
      {canInventory && (lowStockItems.length > 0 || expiryWarnings.length > 0) && bid && (
        <div className="mt-12 pt-12 border-top">
          <Link href={`/staff/branch/${bid}/inventory`} className="text-primary-600 text-sm">
            View inventory
          </Link>
        </div>
      )}
    </Card>
  );
}
