"use client";

import Link from "next/link";

/**
 * Consistent page header component with breadcrumbs and actions
 */
export default function PageHeader({
  title,
  subtitle,
  breadcrumbs = [],
  actions = [],
  className = "",
}) {
  return (
    <div className={`d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2 ${className}`}>
      <div>
        {breadcrumbs.length > 0 && (
          <nav aria-label="breadcrumb" className="mb-2">
            <ol className="breadcrumb mb-0">
              {breadcrumbs.map((crumb, idx) => (
                <li
                  key={idx}
                  className={`breadcrumb-item ${
                    idx === breadcrumbs.length - 1 ? "active" : ""
                  }`}
                >
                  {idx === breadcrumbs.length - 1 ? (
                    crumb.label
                  ) : (
                    <Link href={crumb.href} className="text-decoration-none">
                      {crumb.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h5 className="mb-1">{title}</h5>
        {subtitle && <p className="text-muted mb-0">{subtitle}</p>}
      </div>
      {actions.length > 0 && (
        <div className="d-flex gap-2 flex-wrap">
          {actions.map((action, idx) => (
            <div key={idx}>{action}</div>
          ))}
        </div>
      )}
    </div>
  );
}
