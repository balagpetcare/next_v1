'use client';

import { ReactNode } from 'react';

/**
 * Full-width workspace wrapper for dashboard pages.
 * Replaces container py-24; provides consistent padding and 12-column grid context.
 * Use inside LarkonDashboardShell (which already provides container-fluid).
 */
export default function PageWorkspace({
  children,
  className = '',
  noPadding = false,
}: {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div
      className={`bpa-workspace ${noPadding ? 'bpa-workspace--no-padding' : ''} ${className}`.trim()}
      data-testid="page-workspace"
    >
      {children}
    </div>
  );
}
