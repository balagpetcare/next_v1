"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import type { MenuItemType } from "@larkon/types/menu";
import { useBranchContext } from "@/lib/useBranchContext";
import { getFilteredBranchSidebar, type BranchSummaryCounts } from "@/src/lib/branchSidebarConfig";

/**
 * Returns permission-filtered sidebar menu for /staff/branch/:branchId.
 * Returns null when not in staff branch context (use standard panel menu instead).
 */
export function useStaffBranchMenuItems(basePath: string): MenuItemType[] | null {
  const pathname = usePathname() ?? "";
  const match = pathname.match(/^\/staff\/branch\/(\d+)/);
  const branchId = match?.[1] ?? "";

  const { branch, myAccess, isLoading, kpis, todayBoard } = useBranchContext(branchId);

  return useMemo(() => {
    if (basePath !== "/staff" || !branchId || isLoading) return null;

    const permissions = myAccess?.permissions ?? [];
    const approvalsLen = Array.isArray((todayBoard as { approvalsPending?: unknown[] })?.approvalsPending) ? (todayBoard as { approvalsPending: unknown[] }).approvalsPending.length : undefined;
    const clinicLen = Array.isArray((todayBoard as { appointmentsQueue?: unknown[] })?.appointmentsQueue) ? (todayBoard as { appointmentsQueue: unknown[] }).appointmentsQueue.length : undefined;
    const counts: BranchSummaryCounts = {
      approvals: typeof approvalsLen === "number" ? approvalsLen : (typeof kpis?.approvalsPending === "number" ? kpis.approvalsPending : undefined),
      lowStock: typeof kpis?.lowStockCount === "number" ? kpis.lowStockCount : undefined,
      clinicQueue: typeof clinicLen === "number" ? clinicLen : undefined,
      vendorReceipts: typeof kpis?.vendorReceivePendingCount === "number" ? kpis.vendorReceivePendingCount : undefined,
      warehouseRequests:
        typeof kpis?.pendingWarehouseFulfillmentCount === "number" ? kpis.pendingWarehouseFulfillmentCount : undefined,
    };

    const groups = getFilteredBranchSidebar(branchId, branch as { type?: string; [k: string]: any } | null, permissions, counts);

    const items: MenuItemType[] = [
      {
        key: "staff_branch_selector",
        label: "Switch branch",
        icon: "ri:arrow-left-right-line",
        url: "/staff/branch",
      },
      { key: "staff_branch_divider", label: "Branch", isTitle: true },
    ];

    for (const g of groups) {
      items.push({ key: `group_${g.group}`, label: g.group, isTitle: true });
      for (const it of g.items) {
        items.push({
          key: it.key,
          label: it.label,
          icon: it.icon,
          url: it.href,
          badge: it.badge != null ? { variant: "primary", text: String(it.badge) } : undefined,
        });
      }
    }

    return items;
  }, [basePath, branchId, branch, myAccess?.permissions, isLoading, kpis, todayBoard]);
}
