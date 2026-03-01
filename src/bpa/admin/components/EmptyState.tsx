'use client'

import { ReactNode } from 'react'

/** Shown when a list or table has no items. */
export default function EmptyState({
  title = 'No items found',
  description,
  action,
  className = '',
}: {
  title?: string
  description?: string | ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`text-center py-5 px-3 ${className}`}>
      <p className="fw-semibold text-secondary mb-1">{title}</p>
      {description ? (typeof description === 'string' ? <p className="text-secondary small mb-3">{description}</p> : <div className="text-secondary small mb-3">{description}</div>) : null}
      {action ? <div>{action}</div> : null}
    </div>
  )
}
