'use client';

import { ReactNode } from 'react';

/**
 * Sticky bar at bottom of viewport for primary actions (e.g. Save, Submit).
 * Use on form/detail pages. Responsive: full width on mobile, inline on desktop.
 */
export default function StickyActionBar({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bpa-sticky-action-bar sticky-bottom d-flex flex-wrap align-items-center justify-content-end gap-2 p-3 bg-body border-top shadow-sm ${className}`.trim()}
      data-testid="sticky-action-bar"
    >
      {children}
    </div>
  );
}
