"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { grnPrintUrl } from "@/lib/api";

export default function GrnPrintPreviewPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const kind = searchParams.get("kind") === "discrepancy" ? "discrepancy" : "grn";
  const grnId = Number(params.id);
  const src = useMemo(
    () => (Number.isFinite(grnId) && grnId > 0 ? grnPrintUrl(grnId, kind) : ""),
    [grnId, kind]
  );

  return (
    <>
      <PageHeader
        title={`Print — GRN #${Number.isFinite(grnId) ? grnId : "—"}`}
        subtitle="A4-friendly preview. Use your browser print dialog (Ctrl+P) while focused on the document."
      />
      <div className="card mb-3">
        <div className="card-body d-flex flex-wrap gap-2 align-items-center">
          <Link
            href={`/owner/inventory/receipts/grn-print/${params.id}?kind=grn`}
            className={`btn btn-sm ${kind === "grn" ? "btn-primary" : "btn-outline-primary"}`}
          >
            GRN
          </Link>
          <Link
            href={`/owner/inventory/receipts/grn-print/${params.id}?kind=discrepancy`}
            className={`btn btn-sm ${kind === "discrepancy" ? "btn-primary" : "btn-outline-primary"}`}
          >
            Discrepancy report
          </Link>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>
      {src ? (
        <iframe
          title="GRN print preview"
          src={src}
          className="w-100 border rounded"
          style={{ minHeight: "70vh", background: "#fff" }}
        />
      ) : (
        <p className="text-danger">Invalid GRN id</p>
      )}
    </>
  );
}
