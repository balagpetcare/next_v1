'use client'

/** Placeholder skeleton for loading states (e.g. table rows, cards). */
export default function LoadingSkeleton({
  rows = 5,
  className = '',
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={className}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="placeholder-glow d-flex align-items-center gap-3 py-3 border-bottom"
          style={{ minHeight: 48 }}
        >
          <span className="placeholder col-2" />
          <span className="placeholder col-3" />
          <span className="placeholder col-2" />
          <span className="placeholder col-1" />
        </div>
      ))}
    </div>
  )
}
