"use client";

import { useState } from "react";
import Link from "next/link";
import { staffRequestBranchAccess } from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type WarehouseAccessFallbackProps = {
  branchId: string;
  /** When set, scopes the request to this warehouse; backend still validates branch linkage */
  warehouseId?: number | null;
  title?: string;
  message?: string;
};

export default function WarehouseAccessFallback({
  branchId,
  warehouseId,
  title = "Warehouse access is limited",
  message = "You can view the warehouse workspace shell, but your role does not include this feature yet.",
}: WarehouseAccessFallbackProps) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function handleRequestAccess() {
    const bid = Number(branchId);
    if (!Number.isFinite(bid) || bid <= 0) {
      toast.error("Invalid branch");
      return;
    }
    setSubmitting(true);
    try {
      const res = await staffRequestBranchAccess({
        branchId: bid,
        requestScope: "WAREHOUSE",
        role: "WAREHOUSE_MANAGER",
        warehouseId:
          warehouseId != null && Number.isFinite(Number(warehouseId)) ? Number(warehouseId) : undefined,
      });
      toast.success(res?.message || "Request submitted");
    } catch (e: unknown) {
      toast.error(getMessageFromApiError(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card radius-12 border">
      <div className="card-body py-4">
        <div className="d-flex align-items-start gap-3">
          <i className="ri-shield-keyhole-line fs-2 text-warning" />
          <div className="flex-grow-1">
            <h6 className="mb-1">{title}</h6>
            <p className="text-muted mb-3">{message}</p>
            <div className="d-flex flex-wrap gap-2">
              <Link href={`/staff/branch/${branchId}`} className="btn btn-sm btn-outline-secondary radius-12">
                Back to Branch Overview
              </Link>
              <button
                type="button"
                className="btn btn-sm btn-primary radius-12"
                disabled={submitting}
                onClick={handleRequestAccess}
              >
                {submitting ? "Submitting…" : "Request Access"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
