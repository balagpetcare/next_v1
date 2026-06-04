"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { dispatchPrintUrl } from "@/lib/api";
import { staffDispatchPrintPath, staffDispatchReceiveWorkspacePath } from "@/lib/staffInventoryRoutes";

type DocKind =
  | "challan"
  | "delivery-note"
  | "branch-receiving-record"
  | "branch-worksheet"
  | "branch-confirmation"
  | "discrepancy";

function normalizeDoc(raw: string | null): DocKind {
  if (raw === "branch" || raw === "branch-confirmation") return "branch-confirmation";
  if (raw === "discrepancy") return "discrepancy";
  if (raw === "delivery-note" || raw === "carrier") return "delivery-note";
  if (raw === "branch-receiving-record" || raw === "branch-record") return "branch-receiving-record";
  if (raw === "branch-worksheet" || raw === "worksheet") return "branch-worksheet";
  return "challan";
}

export default function DispatchPrintPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const branchId = params?.branchId != null ? String(params.branchId) : "";
  const dispatchIdRaw = params?.id != null ? String(params.id) : "";
  const doc = normalizeDoc(searchParams.get("doc"));
  const dispatchId = Number(dispatchIdRaw);
  const src = useMemo(
    () => (Number.isFinite(dispatchId) && dispatchId > 0 ? dispatchPrintUrl(dispatchId, doc) : ""),
    [dispatchId, doc]
  );

  return (
    <div className="container-fluid py-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <h5 className="mb-0">Print — Dispatch #{Number.isFinite(dispatchId) ? dispatchId : "—"}</h5>
        {branchId && Number.isFinite(dispatchId) && dispatchId > 0 ? (
          <Link href={staffDispatchReceiveWorkspacePath(branchId, dispatchId)} className="btn btn-sm btn-outline-secondary">
            Back to receive dispatch
          </Link>
        ) : null}
      </div>
      <p className="text-muted small mb-3">A4-friendly. Use Ctrl+P to print.</p>
      <div className="d-flex flex-wrap gap-2 mb-3">
        <Link
          href={staffDispatchPrintPath(branchId, dispatchIdRaw, "challan")}
          className={`btn btn-sm ${doc === "challan" ? "btn-primary" : "btn-outline-primary"}`}
        >
          Challan
        </Link>
        <Link
          href={staffDispatchPrintPath(branchId, dispatchIdRaw, "delivery-note")}
          className={`btn btn-sm ${doc === "delivery-note" ? "btn-primary" : "btn-outline-primary"}`}
        >
          Delivery note
        </Link>
        <Link
          href={staffDispatchPrintPath(branchId, dispatchIdRaw, "branch-receiving-record")}
          className={`btn btn-sm ${doc === "branch-receiving-record" ? "btn-primary" : "btn-outline-primary"}`}
        >
          Branch file copy
        </Link>
        <Link
          href={staffDispatchPrintPath(branchId, dispatchIdRaw, "branch-worksheet")}
          className={`btn btn-sm ${doc === "branch-worksheet" ? "btn-primary" : "btn-outline-primary"}`}
        >
          Worksheet
        </Link>
        <Link
          href={staffDispatchPrintPath(branchId, dispatchIdRaw, "branch-confirmation")}
          className={`btn btn-sm ${doc === "branch-confirmation" ? "btn-primary" : "btn-outline-primary"}`}
        >
          Branch receive
        </Link>
        <Link
          href={staffDispatchPrintPath(branchId, dispatchIdRaw, "discrepancy")}
          className={`btn btn-sm ${doc === "discrepancy" ? "btn-primary" : "btn-outline-primary"}`}
        >
          Discrepancy
        </Link>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => window.print()}>
          Print
        </button>
      </div>
      {src ? (
        <iframe
          title="Dispatch print preview"
          src={src}
          className="w-100 border rounded bg-white"
          style={{ minHeight: "70vh" }}
        />
      ) : (
        <p className="text-danger mb-0">Invalid dispatch ID.</p>
      )}
    </div>
  );
}
