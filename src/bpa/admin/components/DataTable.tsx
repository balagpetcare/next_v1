'use client'

import { ReactNode } from 'react'

/** Simple table wrapper: headers + body. Use with LoadingSkeleton or row map. */
export default function DataTable<R extends Record<string, unknown>>({
  columns,
  rows,
  keyField = 'id',
  loading,
  emptyState,
  className = '',
}: {
  columns: { key: string; label: string; render?: (row: R) => ReactNode }[]
  rows: R[]
  keyField?: string
  loading?: boolean
  emptyState?: ReactNode
  className?: string
}) {
  return (
    <div className={`table-responsive ${className}`}>
      <table className="table align-middle mb-0">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="p-0">
                <div className="placeholder-glow d-flex gap-3 py-3 px-2">
                  {columns.map((c) => (
                    <span key={c.key} className="placeholder col" />
                  ))}
                </div>
              </td>
            </tr>
          ) : !rows.length ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-4 text-secondary">
                {emptyState ?? 'No rows'}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={String(row[keyField] ?? Math.random())}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row as R) : String(row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
