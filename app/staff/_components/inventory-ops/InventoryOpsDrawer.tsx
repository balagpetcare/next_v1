"use client";

import { Offcanvas } from "react-bootstrap";
import type { ReactNode } from "react";

type InventoryOpsDrawerProps = {
  show: boolean;
  onHide: () => void;
  title: string;
  subtitle?: string;
  /** Body: show summary from row first, then hydrate with detail. Parent can pass skeleton when loading. */
  children: ReactNode;
  /** Optional print button in header; onPrint typically calls window.print() on a printable region */
  printLabel?: string;
  onPrint?: () => void;
  /** Action buttons (Approve, Reject, etc.) in footer */
  footerActions?: ReactNode;
  /** Width (default min(100%, 420px)) */
  width?: string | number;
  className?: string;
};

export function InventoryOpsDrawer({
  show,
  onHide,
  title,
  subtitle,
  children,
  printLabel = "Print",
  onPrint,
  footerActions,
  width = "min(100%, 420px)",
  className = "",
}: InventoryOpsDrawerProps) {
  return (
    <Offcanvas
      show={show}
      onHide={onHide}
      placement="end"
      className={`border-0 shadow-lg ${className}`}
      style={{ width: typeof width === "number" ? `${width}px` : width }}
    >
      <Offcanvas.Header closeButton className="border-bottom">
        <div className="d-flex flex-column flex-grow-1">
          <Offcanvas.Title className="d-flex align-items-center justify-content-between gap-12">
            <span>{title}</span>
            {onPrint && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={onPrint}
              >
                {printLabel}
              </button>
            )}
          </Offcanvas.Title>
          {subtitle && <span className="small text-secondary-light mt-4">{subtitle}</span>}
        </div>
      </Offcanvas.Header>
      <Offcanvas.Body className="d-flex flex-column">
        <div className="flex-grow-1 overflow-auto">{children}</div>
        {footerActions && (
          <div className="border-top pt-16 mt-16 d-flex flex-wrap gap-8 justify-content-end">
            {footerActions}
          </div>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
}

/** Skeleton block for drawer body while detail is loading */
export function InventoryOpsDrawerSkeleton() {
  return (
    <div className="d-flex flex-column gap-16">
      {[1, 2, 3, 4].map((i) => (
        <div key={i}>
          <span className="placeholder col-6 mb-8 d-block" />
          <span className="placeholder col-12" />
        </div>
      ))}
    </div>
  );
}
