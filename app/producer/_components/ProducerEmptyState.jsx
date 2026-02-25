"use client";

import Link from "next/link";

export default function ProducerEmptyState({
  title,
  message,
  icon,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}) {
  return (
    <div className="text-center py-5 px-3">
      {icon && <div className="mb-3">{icon}</div>}
      <h3 className="h5 mb-2">{title}</h3>
      <p className="text-muted mb-4">{message}</p>
      <div className="d-flex gap-2 justify-content-center flex-wrap">
        {primaryLabel && primaryHref && (
          <Link href={primaryHref} className="btn btn-primary radius-12">
            {primaryLabel}
          </Link>
        )}
        {secondaryLabel && secondaryHref && (
          <Link href={secondaryHref} className="btn btn-outline-secondary radius-12">
            {secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
