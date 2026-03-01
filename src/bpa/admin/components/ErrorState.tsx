'use client'

import { ReactNode } from 'react'

/** Error message with optional retry. Use with backend envelope message/code. */
export default function ErrorState({
  message = 'Something went wrong.',
  code,
  onRetry,
  className = '',
}: {
  message?: string
  code?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div className={`alert alert-danger d-flex align-items-center justify-content-between flex-wrap gap-2 ${className}`} role="alert">
      <div>
        <span className="fw-semibold">{message}</span>
        {code ? <span className="text-muted small ms-2">({code})</span> : null}
      </div>
      {onRetry ? (
        <button type="button" className="btn btn-outline-danger btn-sm" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  )
}
