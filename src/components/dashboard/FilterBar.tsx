'use client';

import { ReactNode } from 'react';

export default function FilterBar({
  children,
  onReset,
  resetLabel = 'Reset filters',
  className = '',
}: {
  children: ReactNode;
  onReset?: () => void;
  resetLabel?: string;
  className?: string;
}) {
  return (
    <div className={`bpa-filter-bar d-flex flex-wrap align-items-center gap-2 mb-3 ${className}`.trim()}>
      {children}
      {onReset != null && (
        <button type="button" className="btn btn-outline-secondary btn-sm radius-8" onClick={onReset}>
          {resetLabel}
        </button>
      )}
    </div>
  );
}
