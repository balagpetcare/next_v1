'use client';

import { ReactNode } from 'react';

export default function ErrorState({
  message,
  onRetry,
  className = '',
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`alert alert-danger radius-12 d-flex align-items-center justify-content-between flex-wrap gap-2 ${className}`} role="alert">
      <span className="d-flex align-items-center gap-2">
        <i className="ri-error-warning-line" aria-hidden />
        {message}
      </span>
      {onRetry != null && (
        <button type="button" className="btn btn-outline-danger btn-sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
