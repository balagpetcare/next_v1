"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import type { MenuItemType } from "@larkon/types/menu";
import { useBranchContext } from "@/lib/useBranchContext";
import { getFilteredBranchSidebar } from "@/src/lib/branchSidebarConfig";

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
    const counts = {
      approvals: todayBoard?.approvalsPending?.length ?? kpis?.approvalsPending ?? undefined,
      lowStock: kpis?.lowStockCount ?? undefined,
      clinicQueue: todayBoard?.appointmentsQueue?.length ?? undefined,
    };

    const groups = getFilteredBranchSidebar(branchId, branch, permissions, counts);

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
