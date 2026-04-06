"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { dispatchPrintUrl } from "@/lib/api";

type DocKind = "challan" | "branch-confirmation" | "discrepancy";

function normalizeDoc(raw: string | null): DocKind {
  if (raw === "branch" || raw === "branch-confirmation") return "branch-confirmation";
  if (raw === "discrepancy") return "discrepancy";
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

  const base = `/staff/branch/${branchId}/inventory/dispatch-print/${dispatchIdRaw}`;

  return (
    <div className="container-fluid py-3">
      <h5 className="mb-2">Print — Dispatch #{Number.isFinite(dispatchId) ? dispatchId : "—"}</h5>
      <p className="text-muted small mb-3">A4-friendly. Use Ctrl+P to print.</p>
      <div className="d-flex flex-wrap gap-2 mb-3">
        <Link
          href={`${base}?doc=challan`}
          className={`btn btn-sm ${doc === "challan" ? "btn-primary" : "btn-outline-primary"}`}
        >
          Challan
        </Link>
        <Link
          href={`${base}?doc=branch-confirmation`}
          className={`btn btn-sm ${doc === "branch-confirmation" ? "btn-primary" : "btn-outline-primary"}`}
        >
          Branch receive
        </Link>
        <Link
          href={`${base}?doc=discrepancy`}
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
        <p className="text-danger">Invalid dispatch id</p>
      )}
    </div>
  );
}
