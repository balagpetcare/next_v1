"use client";

import Link from "next/link";
import ActionDropdown from "@/app/owner/_components/shared/ActionDropdown";
import { DOMAIN_BADGE } from "./catalogConstants";
import type { ClinicalItemRow } from "./catalogConstants";

type CatalogItemsTableProps = {
  branchId: string;
  items: ClinicalItemRow[];
  onRowClick: (row: ClinicalItemRow) => void;
  onActionSuccess: () => void;
  onDuplicate: (row: ClinicalItemRow) => void;
  onActivate: (row: ClinicalItemRow) => void;
  onDeactivate: (row: ClinicalItemRow) => void;
};

function formatDate(s: string | undefined): string {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function CatalogItemsTable({
  branchId,
  items,
  onRowClick,
  onActionSuccess,
  onDuplicate,
  onActivate,
  onDeactivate,
}: CatalogItemsTableProps) {
  const base = `/owner/clinic/${branchId}/catalog`;

  return (
    <div className="table-responsive" role="region" aria-label="Catalog items table">
      <table className="table table-sm table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Domain</th>
            <th>Category</th>
            <th>Base unit</th>
            <th>Issue unit</th>
            <th>Consumable type</th>
            <th className="text-center">Flags</th>
            <th className="text-center">Where used</th>
            <th>Status</th>
            <th>Updated</th>
            <th className="text-end" style={{ width: 100 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick(row)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <td><code className="small">{row.itemCode}</code></td>
              <td className="fw-medium">{row.name}</td>
              <td>
                <span className={`badge radius-8 ${DOMAIN_BADGE[row.domainType] ?? "bg-secondary"}`}>{row.domainType}</span>
              </td>
              <td>{row.category?.name ?? "—"}</td>
              <td>{row.baseUnit ?? "—"}</td>
              <td>{row.consumableProfile?.issueUnit ?? "—"}</td>
              <td>{row.consumableProfile?.consumableType ?? "—"}</td>
              <td className="text-center">
                <div className="d-flex flex-wrap gap-1 justify-content-center">
                  {row.consumableProfile?.sterileRequired && <span className="badge bg-info-subtle text-info-emphasis radius-8" title="Sterile">S</span>}
                  {row.consumableProfile?.wastageTrackRequired && <span className="badge bg-warning-subtle text-warning-emphasis radius-8" title="Wastage tracked">W</span>}
                  {row.consumableProfile?.procedureLinked && <span className="badge bg-primary-subtle text-primary-emphasis radius-8" title="Procedure-linked">P</span>}
                  {row.instrumentProfile?.sterilizationRequired && <span className="badge bg-secondary radius-8" title="Sterilization required">St</span>}
                  {!row.consumableProfile && !row.instrumentProfile?.sterilizationRequired && "—"}
                </div>
              </td>
              <td className="text-center">{row._count?.packageItems ?? 0}</td>
              <td>
                <span className={`badge radius-8 ${row.isActive !== false ? "bg-success" : "bg-secondary"}`}>
                  {row.isActive !== false ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="small text-muted">{formatDate(row.updatedAt)}</td>
              <td className="text-end" onClick={(e) => e.stopPropagation()}>
                <ActionDropdown
                  item={row}
                  actions={[
                    { label: "View details", onClick: () => onRowClick(row), icon: "ri-eye-line" },
                    { label: "Full edit", href: `${base}/${row.id}`, icon: "ri-edit-line", onClick: () => onActionSuccess() },
                    { divider: true },
                    { label: "Duplicate", onClick: (_e, it) => it && onDuplicate(it as ClinicalItemRow), icon: "ri-file-copy-line" },
                    row.isActive !== false
                      ? { label: "Deactivate", onClick: (_e, it) => it && onDeactivate(it as ClinicalItemRow), icon: "ri-close-circle-line", variant: "warning" }
                      : { label: "Activate", onClick: (_e, it) => it && onActivate(it as ClinicalItemRow), icon: "ri-checkbox-circle-line" },
                    { label: "Archive", onClick: (_e, it) => it && onDeactivate(it as ClinicalItemRow), icon: "ri-archive-line", variant: "danger" },
                    { divider: true },
                    { label: "Link to package", href: `${base.replace(/\/catalog\/?$/, "")}/packages`, icon: "ri-link" },
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
