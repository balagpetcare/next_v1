"use client";

import Link from "next/link";

export default function ProducerPageShell({ title, breadcrumbs = [], actions, children }) {
  return (
    <div className="p-4">
      {breadcrumbs?.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="breadcrumb mb-0 small">
            {breadcrumbs.map((b, i) => (
              <li key={i} className="breadcrumb-item">
                {b.href ? (
                  <Link href={b.href} className="text-decoration-none">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-muted">{b.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <h1 className="h4 mb-0">{title}</h1>
        {actions ? <div>{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
