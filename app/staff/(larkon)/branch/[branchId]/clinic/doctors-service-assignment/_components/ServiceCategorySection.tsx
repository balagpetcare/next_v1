"use client";

import { useMemo, useState } from "react";
import type { ServiceAssignmentCategoryGroup, ServiceAssignmentServiceRow } from "@/src/types/doctorServiceAssignment";
import ServiceAssignmentCard from "./ServiceAssignmentCard";

type Props = {
  group: ServiceAssignmentCategoryGroup;
  allowedRolesByCategory: Record<string, string[]>;
  serviceFilter: string;
  canEdit: boolean;
  bulkMode: boolean;
  selectedIds: Set<number>;
  onToggleBulk: (serviceId: number, next: boolean) => void;
  onAssignChange: (serviceId: number, nextAssigned: boolean, role?: string) => void;
  onRoleChange: (serviceId: number, role: string) => void;
  savingServiceId: number | null;
  showFees: boolean;
};

function filterServices(services: ServiceAssignmentServiceRow[], q: string): ServiceAssignmentServiceRow[] {
  const t = q.trim().toLowerCase();
  if (!t) return services;
  return services.filter((s) => s.name.toLowerCase().includes(t) || String(s.serviceId).includes(t));
}

export default function ServiceCategorySection({
  group,
  allowedRolesByCategory,
  serviceFilter,
  canEdit,
  bulkMode,
  selectedIds,
  onToggleBulk,
  onAssignChange,
  onRoleChange,
  savingServiceId,
  showFees,
}: Props) {
  const [open, setOpen] = useState(true);
  const rows = useMemo(
    () => filterServices(group.services, serviceFilter),
    [group.services, serviceFilter]
  );
  const allowed = allowedRolesByCategory[group.category] ?? ["CONSULTANT", "SURGEON", "ASSISTANT", "REVIEWER"];
  const assignedCount = group.services.filter((s) => s.mapping?.effectiveAssigned).length;

  if (rows.length === 0) return null;

  return (
    <div className="mb-3">
      <button
        type="button"
        className="btn btn-light w-100 text-start d-flex justify-content-between align-items-center radius-12 py-2 px-3 mb-2"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="fw-semibold">
          {group.category.replace(/_/g, " ")}
          <span className="text-muted fw-normal ms-2 small">
            {assignedCount}/{group.services.length} assigned
          </span>
        </span>
        <span className="text-muted small">{open ? "▼" : "▶"}</span>
      </button>
      {open &&
        rows.map((row) => (
          <ServiceAssignmentCard
            key={row.serviceId}
            row={row}
            allowedRoles={allowed}
            canEdit={canEdit}
            bulkMode={bulkMode}
            selected={selectedIds.has(row.serviceId)}
            onToggleBulk={onToggleBulk}
            onAssignChange={onAssignChange}
            onRoleChange={onRoleChange}
            saving={savingServiceId === row.serviceId}
            showFees={showFees}
          />
        ))}
    </div>
  );
}
