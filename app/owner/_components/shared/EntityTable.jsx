"use client";

import Link from "next/link";
import StatusBadge from "@/app/owner/_components/StatusBadge";
import ActionDropdown from "./ActionDropdown";

/**
 * Reusable table component for entity lists
 * Supports configurable columns, sorting, and actions
 */
export default function EntityTable({
  data = [],
  config,
  entityType,
  viewMode = "table",
  onRowClick,
  renderCustomCell,
  renderCustomActions,
  actionItems, // Array of action items for dropdown
}) {
  if (!config?.columns || config.columns.length === 0) {
    return (
      <div className="card radius-12">
        <div className="card-body">
          <div className="text-muted">No columns configured</div>
        </div>
      </div>
    );
  }

  const getCellValue = (item, column) => {
    if (renderCustomCell) {
      const custom = renderCustomCell(item, column);
      if (custom !== undefined) return custom;
    }

    // Handle nested keys (e.g., "user.profile.displayName")
    const keys = column.key.split(".");
    let value = item;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined || value === null) break;
    }

    // Format based on column type
    if (column.type === "badge" && value) {
      return <StatusBadge status={value} />;
    }

    if (column.type === "date" && value) {
      try {
        return new Date(value).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      } catch {
        return String(value);
      }
    }

    if (column.type === "link" && value && column.href) {
      const href = typeof column.href === "function"
        ? column.href(item)
        : column.href.replace("[id]", item.id);
      return (
        <Link href={href} className="text-primary text-decoration-none">
          {value}
        </Link>
      );
    }

    return value ?? "—";
  };

  const getDetailHref = (item) => {
    if (config?.detailPath) {
      return typeof config.detailPath === "function"
        ? config.detailPath(item.id)
        : config.detailPath.replace("[id]", item.id);
    }
    return `/${entityType}/${item.id}`;
  };

  // Build default action items if not provided
  const getDefaultActions = (item) => {
    if (actionItems) {
      // If actionItems is a function, call it with item
      if (typeof actionItems === "function") {
        return actionItems(item);
      }
      return actionItems;
    }

    const defaultActions = [
      {
        label: "View",
        href: getDetailHref(item),
        icon: "solar:eye-outline",
      },
    ];

    if (config.editPath) {
      defaultActions.push({
        label: "Edit",
        href:
          typeof config.editPath === "function"
            ? config.editPath(item.id)
            : config.editPath.replace("[id]", item.id),
        icon: "solar:pen-outline",
      });
    }

    return defaultActions;
  };

  return (
    <div className="card radius-12 border-0 shadow-sm">
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table align-middle mb-0 table-hover">
            <thead
              className="table-light"
              style={{
                backgroundColor: "#f8f9fa",
                borderBottom: "2px solid #dee2e6",
              }}
            >
              <tr>
                {config.columns.map((column) => (
                  <th
                    key={column.key}
                    style={{
                      ...(column.width ? { width: column.width } : {}),
                      padding: "16px 20px",
                      fontWeight: 600,
                      fontSize: "13px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "#6b7280",
                      borderBottom: "2px solid #dee2e6",
                    }}
                    className={column.align === "right" ? "text-end" : ""}
                  >
                    {column.label}
                  </th>
                ))}
                <th
                  className="text-end"
                  style={{
                    width: "80px",
                    padding: "16px 20px",
                    fontWeight: 600,
                    fontSize: "13px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "#6b7280",
                    borderBottom: "2px solid #dee2e6",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr
                  key={item.id || idx}
                  onClick={() => onRowClick && onRowClick(item)}
                  style={{
                    ...(onRowClick ? { cursor: "pointer" } : {}),
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9fafb";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "";
                    e.currentTarget.style.boxShadow = "";
                  }}
                >
                  {config.columns.map((column) => (
                    <td
                      key={column.key}
                      className={column.align === "right" ? "text-end" : ""}
                      style={{
                        padding: "16px 20px",
                        borderBottom: "1px solid #f3f4f6",
                        verticalAlign: "middle",
                      }}
                    >
                      {getCellValue(item, column)}
                    </td>
                  ))}
                  <td
                    className="text-end"
                    style={{
                      padding: "16px 20px",
                      borderBottom: "1px solid #f3f4f6",
                      verticalAlign: "middle",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {renderCustomActions ? (
                      renderCustomActions(item)
                    ) : (
                      <ActionDropdown
                        actions={getDefaultActions(item)}
                        item={item}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
