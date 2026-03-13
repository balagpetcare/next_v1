'use client';

import { ReactNode } from 'react';

export default function EmptyState({
  icon = 'ri-inbox-line',
  title = 'No items found',
  description,
  action,
  className = '',
}: {
  icon?: string;
  title?: string;
  description?: string | ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bpa-empty-state text-center py-5 px-4 ${className}`.trim()} data-testid="empty-state">
      <i className={`${icon} fs-1 text-muted d-block mb-3`} aria-hidden />
      <h5 className="mb-2 fw-semibold">{title}</h5>
      {description != null && (
        typeof description === 'string' ? (
          <p className="text-muted small mb-3">{description}</p>
        ) : (
          <div className="text-muted small mb-3">{description}</div>
        )
      )}
      {action != null && <div>{action}</div>}
    </div>
  );
}
