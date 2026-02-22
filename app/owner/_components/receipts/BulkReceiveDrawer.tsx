"use client";

import { Offcanvas } from "react-bootstrap";
import Link from "next/link";

/**
 * Right-side drawer: entry point to bulk receive. Links to full bulk page for the
 * multi-line grid, CSV paste, and template download (single source of truth at /receipts/bulk).
 */
type BulkReceiveDrawerProps = {
  show: boolean;
  onHide: () => void;
};

export function BulkReceiveDrawer({ show, onHide }: BulkReceiveDrawerProps) {
  return (
    <Offcanvas show={show} onHide={onHide} placement="end" className="border-0 shadow-lg" style={{ width: "min(100%, 420px)" }}>
      <Offcanvas.Header closeButton className="border-bottom">
        <Offcanvas.Title>Bulk receive (multi-line)</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <p className="small text-muted mb-3">
          Use the full page for the multi-line grid, add/remove rows, paste from spreadsheet, and CSV template download.
        </p>
        <Link href="/owner/inventory/receipts/bulk" className="btn btn-primary btn-sm" onClick={onHide}>
          Open full Bulk receive page →
        </Link>
      </Offcanvas.Body>
    </Offcanvas>
  );
}
