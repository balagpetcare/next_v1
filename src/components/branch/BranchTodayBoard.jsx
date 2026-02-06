"use client";

import Link from "next/link";
import Card from "@/src/bpa/components/ui/Card";

/**
 * BranchTodayBoard – queues from todayBoard (approvals, tasks, transfers, receive, clinic queue).
 * Permission-aware; each section hidden if user lacks required perm. Empty states + "View all" links.
 */
export default function BranchTodayBoard({
  todayBoard = {},
  permissions = [],
  branch = {},
  branchId,
}) {
  const perms = Array.isArray(permissions) ? permissions : [];
  const bid = String(branchId ?? "");
  const isClinic = (branch?.type ?? "").toUpperCase() === "CLINIC";

  const approvalsPending = Array.isArray(todayBoard.approvalsPending) ? todayBoard.approvalsPending : [];
  const tasksAssignedToMe = Array.isArray(todayBoard.tasksAssignedToMe) ? todayBoard.tasksAssignedToMe : [];
  const transfersPending = Array.isArray(todayBoard.transfersPending) ? todayBoard.transfersPending : [];
  const receivePending = Array.isArray(todayBoard.receivePending) ? todayBoard.receivePending : [];
  const appointmentsQueue = Array.isArray(todayBoard.appointmentsQueue) ? todayBoard.appointmentsQueue : [];

  const showApprovals = perms.includes("approvals.view");
  const showTasks = perms.includes("tasks.view");
  const showTransfers = perms.includes("inventory.transfer") || perms.includes("inventory.receive");
  const showReceive = perms.includes("inventory.receive");
  const showClinicQueue = isClinic && perms.includes("appointments.view");

  const sections = [];
  if (showApprovals) {
    sections.push({
      key: "approvals",
      title: "Approvals Pending",
      items: approvalsPending,
      viewAllHref: bid ? `/staff/branch/${bid}/approvals` : null,
      emptyLabel: "No pending approvals",
    });
  }
  if (showTasks) {
    sections.push({
      key: "tasks",
      title: "Tasks Assigned to Me",
      items: tasksAssignedToMe,
      viewAllHref: bid ? `/staff/branch/${bid}/tasks` : null,
      emptyLabel: "No tasks assigned",
    });
  }
  if (showTransfers) {
    sections.push({
      key: "transfers",
      title: "Transfers Pending",
      items: transfersPending,
      viewAllHref: bid ? `/staff/branch/${bid}/inventory/transfers` : null,
      emptyLabel: "No pending transfers",
    });
  }
  if (showReceive) {
    sections.push({
      key: "receive",
      title: "Receive Pending",
      items: receivePending,
      viewAllHref: bid ? `/staff/branch/${bid}/inventory/receive` : null,
      emptyLabel: "Nothing to receive",
    });
  }
  if (showClinicQueue) {
    sections.push({
      key: "clinic",
      title: "Today's Queue",
      items: appointmentsQueue,
      viewAllHref: bid ? `/staff/branch/${bid}/services` : null,
      emptyLabel: "No appointments in queue",
    });
  }

  if (sections.length === 0) return null;

  return (
    <Card title="Today Board" subtitle="Approvals, tasks, transfers, receive queue">
      <div className="d-flex flex-column gap-20">
        {sections.map((sec) => (
          <div key={sec.key}>
            <div className="d-flex align-items-center justify-content-between mb-8">
              <span className="fw-semibold text-sm">{sec.title}</span>
              {sec.viewAllHref && (
                <Link href={sec.viewAllHref} className="text-primary-600 text-sm">
                  View all
                </Link>
              )}
            </div>
            {sec.items.length === 0 ? (
              <p className="text-secondary-light text-sm mb-0">{sec.emptyLabel}</p>
            ) : (
              <ul className="list-unstyled mb-0">
                {sec.items.slice(0, 5).map((item, i) => (
                  <li key={item.id ?? i} className="py-4 border-bottom border-secondary-200 last-border-0">
                    <span className="text-sm">{item.title ?? item.name ?? item.id ?? "Item"}</span>
                    {item.status && (
                      <span className="badge bg-secondary-100 text-secondary-600 ms-2">{item.status}</span>
                    )}
                  </li>
                ))}
                {sec.items.length > 5 && (
                  <li className="py-4">
                    <Link href={sec.viewAllHref} className="text-primary-600 text-sm">
                      +{sec.items.length - 5} more
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
