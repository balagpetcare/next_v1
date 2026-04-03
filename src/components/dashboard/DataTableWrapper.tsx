'use client';

import { ReactNode, useMemo, useState } from 'react';
import Form from 'react-bootstrap/Form';

export type DataTableColumn<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
};

type BaseProps = {
  loading?: boolean;
  emptyState?: ReactNode;
  className?: string;
};

type ChildrenModeProps = BaseProps & {
  children: ReactNode;
  columns?: undefined;
  data?: undefined;
  searchPlaceholder?: undefined;
};

type DataModeProps<T> = BaseProps & {
  columns: DataTableColumn<T>[];
  data: T[];
  searchPlaceholder?: string;
  children?: undefined;
};

export type DataTableWrapperProps<T = unknown> = ChildrenModeProps | DataModeProps<T>;

function rowMatchesQuery(row: unknown, q: string): boolean {
  if (!q) return true;
  try {
    return JSON.stringify(row).toLowerCase().includes(q);
  } catch {
    return true;
  }
}

function DeclarativeDataTable<T>({
  columns,
  data,
  loading,
  searchPlaceholder,
  emptyState,
  className = '',
}: DataModeProps<T>) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) => rowMatchesQuery(row, q));
  }, [data, query]);

  const cardClass = `card radius-12 border shadow-sm overflow-hidden ${className}`.trim();

  if (loading) {
    return (
      <div className={cardClass}>
        <div className="card-body p-0">
          <div className="p-4 text-center">
            <div className="spinner-border text-primary" role="status" />
            <p className="text-muted small mt-2 mb-0">Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  const showSearch = Boolean(searchPlaceholder);

  if (filtered.length === 0) {
    const fallback =
      emptyState ??
      (data.length === 0 ? (
        <p className="text-muted small mb-0 text-center">No rows to display.</p>
      ) : (
        <p className="text-muted small mb-0 text-center">No rows match your search.</p>
      ));
    return (
      <div className={cardClass}>
        <div className="card-body p-0">
          {showSearch ? (
            <div className="p-3 border-bottom">
              <Form.Control
                type="search"
                size="sm"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={searchPlaceholder}
              />
            </div>
          ) : null}
          <div className="p-4">{fallback}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cardClass}>
      <div className="card-body p-0">
        {showSearch ? (
          <div className="p-3 border-bottom">
            <Form.Control
              type="search"
              size="sm"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={searchPlaceholder}
            />
          </div>
        ) : null}
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} scope="col">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Wrapper for data tables: consistent card + table-responsive + optional empty/loading.
 * Pass `children` for custom table markup, or `columns` + `data` for a simple declarative grid.
 */
export default function DataTableWrapper<T = unknown>(props: DataTableWrapperProps<T>) {
  if ('columns' in props && props.columns != null && props.data !== undefined) {
    return <DeclarativeDataTable {...props} />;
  }

  const { children, loading, emptyState, className = '' } = props as ChildrenModeProps;

  return (
    <div className={`card radius-12 border shadow-sm overflow-hidden ${className}`.trim()}>
      <div className="card-body p-0">
        {loading && (
          <div className="p-4 text-center">
            <div className="spinner-border text-primary" role="status" />
            <p className="text-muted small mt-2 mb-0">Loading…</p>
          </div>
        )}
        {!loading && emptyState != null && <div className="p-4">{emptyState}</div>}
        {!loading && emptyState == null && <div className="table-responsive">{children}</div>}
      </div>
    </div>
  );
}
