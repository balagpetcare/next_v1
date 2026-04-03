'use client';

import { ReactNode } from 'react';

export default function SectionCard({
  title,
  subtitle,
  actions,
  children,
  className = '',
  noPadding = false,
  /** When false, omit default mb-4 (e.g. stacked cards with gap-* on parent). */
  marginBottom = true,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  marginBottom?: boolean;
}) {
  return (
    <div className={`card radius-12 border shadow-sm ${marginBottom ? 'mb-4' : ''} ${className}`.trim()}>
      {(title != null || subtitle != null || actions != null) && (
        <div className="card-header bg-transparent border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 p-md-4">
          <div>
            {title != null && <h6 className="mb-0 fw-semibold">{title}</h6>}
            {subtitle != null && <span className="text-muted small">{subtitle}</span>}
          </div>
          {actions != null && <div className="d-flex gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? 'card-body p-0' : 'card-body p-3 p-md-4'}>{children}</div>
    </div>
  );
}
