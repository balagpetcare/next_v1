"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type BadgeTone = "success" | "warning" | "danger" | "primary" | "secondary" | "info";

export function QueueStatusBadge({ label, tone = "secondary" }: { label: string; tone?: BadgeTone }) {
  return <span className={`badge bg-${tone}`}>{label}</span>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const normalized = String(priority || "").toLowerCase();
  const tone = normalized === "critical" || normalized === "high" ? "danger" : normalized === "medium" ? "warning text-dark" : "secondary";
  return <span className={`badge ${tone.startsWith("warning") ? "bg-warning text-dark" : `bg-${tone}`}`}>{priority || "Low"}</span>;
}

export function WarehouseKpiCard({
  title,
  value,
  icon,
  tone = "primary",
}: {
  title: string;
  value: number | string;
  icon: string;
  tone?: BadgeTone;
}) {
  return (
    <div className="card border h-100">
      <div className="card-body py-3">
        <div className="d-flex align-items-center justify-content-between">
          <span className="text-muted small">{title}</span>
          <i className={`${icon} text-${tone}`} />
        </div>
        <div className="fs-4 fw-semibold mt-2">{value}</div>
      </div>
    </div>
  );
}

export function WarehouseEmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string | null;
  actionLabel?: string;
}) {
  return (
    <div className="text-center py-4">
      <i className="ri-inbox-archive-line fs-2 text-secondary" />
      <h6 className="mt-2 mb-1">{title}</h6>
      <p className="text-muted small mb-3">{description}</p>
      {actionHref ? (
        <Link href={actionHref} className="btn btn-sm btn-outline-primary">
          {actionLabel || "Open"}
        </Link>
      ) : null}
    </div>
  );
}

export function SectionHeader({
  title,
  count,
  right,
}: {
  title: string;
  count?: number;
  right?: ReactNode;
}) {
  return (
    <div className="card-header py-2 d-flex align-items-center justify-content-between">
      <h6 className="mb-0">{title}</h6>
      <div className="d-flex align-items-center gap-2">
        {typeof count === "number" ? <span className="badge bg-primary rounded-pill">{count}</span> : null}
        {right}
      </div>
    </div>
  );
}

export function PaginationControls({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (next: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(Number(total || 0) / Math.max(1, pageSize)));
  return (
    <div className="d-flex align-items-center justify-content-between py-2 px-3 border-top">
      <small className="text-muted">
        Page {page} of {totalPages}
      </small>
      <div className="btn-group btn-group-sm">
        <button type="button" className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Prev
        </button>
        <button type="button" className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

export function ConfirmActionModal({
  open,
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal show d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" onClick={onCancel} />
          </div>
          <div className="modal-body">
            <p className="mb-0">{body}</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </div>
  );
}
