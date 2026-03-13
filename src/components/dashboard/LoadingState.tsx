'use client';

/**
 * Full-block loading state for pages/sections.
 */
export default function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="bpa-loading-state d-flex flex-column align-items-center justify-content-center py-5 px-3" data-testid="loading-state">
      <div className="spinner-border text-primary" role="status" />
      <p className="text-muted small mt-3 mb-0">{message}</p>
    </div>
  );
}
