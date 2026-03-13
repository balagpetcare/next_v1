'use client';

import { ReactNode } from 'react';

/**
 * Wrapper for data tables: consistent card + table-responsive + optional empty/loading.
 */
export default function DataTableWrapper({
  children,
  loading,
  emptyState,
  className = '',
}: {
  children: ReactNode;
  loading?: boolean;
  emptyState?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card radius-12 border shadow-sm overflow-hidden ${className}`.trim()}>
      <div className="card-body p-0">
        {loading && (
          <div className="p-4 text-center">
            <div className="spinner-border text-primary" role="status" />
            <p className="text-muted small mt-2 mb-0">Loading…</p>
          </div>
        )}
        {!loading && emptyState != null && (
          <div className="p-4">{emptyState}</div>
        )}
        {!loading && emptyState == null && (
          <div className="table-responsive">{children}</div>
        )}
      </div>
    </div>
  );
}
