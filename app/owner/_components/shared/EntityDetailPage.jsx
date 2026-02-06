"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Base detail page wrapper for entities
 * Provides consistent layout with breadcrumbs, header, and actions
 */
export default function EntityDetailPage({
  title,
  subtitle,
  entityId,
  config,
  loading = false,
  error = null,
  onRefresh,
  onEdit,
  onDelete,
  renderCustomHeader,
  renderCustomActions,
  children,
}) {
  const router = useRouter();

  const breadcrumbs = config?.breadcrumbs || [
    { label: "Owner", href: "/owner" },
    {
      label: config?.plural || "Items",
      href: config?.listPath || "/owner",
    },
    { label: "Details" },
  ];

  return (
    <div className="dashboard-main-body">
      {/* Breadcrumbs */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb">
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

      {/* Page Header */}
      {renderCustomHeader ? (
        renderCustomHeader()
      ) : (
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <div>
            <h5 className="mb-1">{title}</h5>
            {subtitle && <p className="text-muted mb-0">{subtitle}</p>}
            {entityId && (
              <small className="text-muted">ID: {entityId}</small>
            )}
          </div>
          <div className="d-flex gap-2 flex-wrap">
            {renderCustomActions && renderCustomActions()}
            {onRefresh && (
              <button
                className="btn btn-outline-secondary radius-12"
                onClick={onRefresh}
                disabled={loading}
              >
                <i className="ri-refresh-line me-1" />
                Refresh
              </button>
            )}
            {onEdit && (
              <button
                className="btn btn-primary radius-12"
                onClick={onEdit}
                disabled={loading}
              >
                <i className="ri-edit-line me-1" />
                Edit
              </button>
            )}
            {onDelete && (
              <button
                className="btn btn-outline-danger radius-12"
                onClick={onDelete}
                disabled={loading}
              >
                <i className="ri-delete-bin-line me-1" />
                Delete
              </button>
            )}
            <button
              className="btn btn-outline-secondary radius-12"
              onClick={() => router.back()}
            >
              <i className="ri-arrow-left-line me-1" />
              Back
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger radius-12 mb-4">{error}</div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="mt-2 text-muted">Loading...</div>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
