"use client";

type Dup = Record<string, unknown> | null;

type Props = {
  fingerprint: string | null;
  normalizedPreview: Record<string, unknown> | null;
  duplicateListing: Dup;
};

export default function DuplicateConflictPreview({ fingerprint, normalizedPreview, duplicateListing }: Props) {
  if (!fingerprint && !duplicateListing && !normalizedPreview) return null;

  return (
    <div className="card border-warning radius-12 mb-3">
      <div className="card-header py-2 bg-warning-subtle">
        <span className="fw-semibold small">Fingerprint & duplicate check</span>
      </div>
      <div className="card-body small">
        {fingerprint ? (
          <p className="mb-2">
            <span className="text-muted">Fingerprint:</span> <code className="small">{fingerprint}</code>
          </p>
        ) : null}
        {duplicateListing ? (
          <div className="alert alert-danger py-2 mb-2">
            <strong>Duplicate listing</strong> — id #{String(duplicateListing.id)} already uses this fingerprint for this country.
            Open that record or change package mark / identity.
          </div>
        ) : (
          <p className="text-success mb-2">No duplicate listing for this fingerprint in this country.</p>
        )}
        {normalizedPreview && Object.keys(normalizedPreview).length > 0 ? (
          <details className="mt-2">
            <summary className="text-muted" style={{ cursor: "pointer" }}>
              Normalized preview (import keys)
            </summary>
            <pre className="small bg-light p-2 rounded mt-2 mb-0 overflow-auto" style={{ maxHeight: 160 }}>
              {JSON.stringify(normalizedPreview, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>
    </div>
  );
}
