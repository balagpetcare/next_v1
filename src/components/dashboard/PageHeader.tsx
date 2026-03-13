'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

export type Breadcrumb = { label: string; href?: string };
export type StatItem = { label: string; value: string | number; icon?: string; variant?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger' };

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs = [],
  stats,
  actions,
  className = '',
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  stats?: StatItem[];
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`bpa-page-header mb-4 ${className}`.trim()} data-testid="page-header">
      <div className="d-flex flex-wrap align-items-flex-start justify-content-between gap-3">
        <div className="flex-grow-1 min-w-0">
          {breadcrumbs.length > 0 && (
            <nav aria-label="breadcrumb" className="mb-2">
              <ol className="breadcrumb mb-0">
                {breadcrumbs.map((crumb, idx) => (
                  <li
                    key={idx}
                    className={`breadcrumb-item ${idx === breadcrumbs.length - 1 ? 'active' : ''}`}
                  >
                    {idx === breadcrumbs.length - 1 ? (
                      crumb.label
                    ) : (
                      <Link href={crumb.href ?? '#'} className="text-decoration-none">
                        {crumb.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <h1 className="h4 mb-1 fw-semibold">{title}</h1>
          {subtitle && <p className="text-muted small mb-0">{subtitle}</p>}
          {stats && stats.length > 0 && (
            <div className="row g-2 mt-2">
              {stats.map((s, i) => (
                <div key={i} className="col-auto">
                  <span className="badge bg-light text-dark border border-secondary-subtle radius-8 px-2 py-1">
                    {s.icon && <i className={`${s.icon} me-1 opacity-75`} aria-hidden />}
                    <span className="fw-semibold">{s.value}</span>
                    <span className="ms-1 text-muted small">{s.label}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        {actions != null && <div className="d-flex gap-2 flex-wrap align-items-center">{actions}</div>}
      </div>
    </header>
  );
}
