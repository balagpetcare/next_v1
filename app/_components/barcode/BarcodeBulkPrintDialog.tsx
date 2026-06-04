"use client";

import { useCallback, type ReactNode } from "react";
import { saveBulkLabelSession } from "@/lib/barcodeLabelsApi";

export default function BarcodeBulkPrintDialog({
  branchId,
  items,
  href,
  children = "Print labels",
  className = "btn btn-sm btn-outline-primary",
}: {
  branchId: number;
  items: Array<{ type: string; variantId?: number; lotId?: number; copies?: number }>;
  href: string;
  children?: ReactNode;
  className?: string;
}) {
  const onClick = useCallback(() => {
    saveBulkLabelSession({ branchId, items });
    window.open(href, "_blank", "noopener,noreferrer");
  }, [branchId, items, href]);

  return (
    <button type="button" className={className} onClick={onClick} disabled={!branchId || !items?.length}>
      <i className="ri-printer-line me-1" aria-hidden />
      {children}
    </button>
  );
}
