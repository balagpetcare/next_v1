"use client";

import Link from "next/link";

export default function Table({ columns = [], rows = [], emptyText = "No data", rowKey = "id" }) {
  return (
    <div className="table-responsive">
      <table className="table bordered-table mb-0">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key || c.label}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows?.length ? (
            rows.map((r, idx) => (
              <tr key={String(r?.[rowKey] ?? idx)}>
                {columns.map((c) => (
                  <td key={c.key || c.label}>
                    {typeof c.render === "function" ? c.render(r) : String(r?.[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={Math.max(1, columns.length)} className="text-center text-secondary-light py-4">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
