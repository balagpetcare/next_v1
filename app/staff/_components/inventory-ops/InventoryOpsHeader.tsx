"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type BreadcrumbItem = { label: string; href?: string };

type KpiChip = {
  label: string;
  value: string | number | null | undefined;
  title?: string;
};

type InventoryOpsHeaderProps = {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  branchLabel?: string;
  kpis?: KpiChip[];
  action?: ReactNode;
  className?: string;
};

export function InventoryOpsHeader({
  breadcrumbs,
  title,
  branchLabel,
  kpis,
  action,
  className = "",
}: InventoryOpsHeaderProps) {
  return (
    <div className={`d-flex flex-wrap align-items-center justify-content-between gap-16 mb-24 ${className}`}>
      <div className="d-flex flex-wrap align-items-center gap-12">
        <nav className="d-flex align-items-center gap-8 text-sm text-secondary-light">
          {breadcrumbs.map((b, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-8">/</span>}
              {b.href ? (
                <Link href={b.href} className="text-secondary-light text-decoration-none hover-primary">
                  {b.label}
                </Link>
              ) : (
                <span>{b.label}</span>
              )}
            </span>
          ))}
        </nav>
        <h5 className="mb-0 fw-semibold">{title}</h5>
        {branchLabel && <span className="badge bg-primary-100 text-primary-600">{branchLabel}</span>}
        {kpis?.length ? (
          <div className="d-flex flex-wrap gap-8">
            {kpis.map((k, i) => (
              <span
                key={i}
                className="badge bg-light text-dark border"
                title={k.title}
              >
                {k.label}: {k.value ?? "—"}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
