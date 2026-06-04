"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import BarcodePrintPage from "@/app/_components/barcode/BarcodePrintPage";
import type { LabelPayload } from "@/app/_components/barcode/BarcodeLabelPreview";
import { clearStaffBulkLabelSession, fetchBulkBarcodeLabels, readStaffBulkLabelSession } from "@/lib/barcodeLabelsApi";

function StaffBulkLabelsInner() {
  const params = useParams();
  const branchId = String(params?.branchId ?? "");
  const [presetId, setPresetId] = useState("50x30");
  const [labels, setLabels] = useState<LabelPayload[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const bid = Number(branchId);
      const session = readStaffBulkLabelSession(bid);
      const items = session?.items;
      if (!bid || !Array.isArray(items) || items.length === 0) {
        setError("No bulk label session. Go back to Barcode Printing (or Batch Pricing) and select labels.");
        return;
      }
      try {
        const data = await fetchBulkBarcodeLabels({ branchId: bid, items });
        if (cancelled) return;
        setLabels(Array.isArray(data?.labels) ? (data.labels as LabelPayload[]) : []);
        clearStaffBulkLabelSession(bid);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Bulk load failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  return (
    <div className="dashboard-main-body">
      <div className="no-print px-3 pt-3">
        <Link href={`/staff/branch/${branchId}/inventory/barcode-printing`} className="small">
          &larr; Barcode Printing
        </Link>
      </div>
      {error ? (
        <div className="alert alert-warning m-3" role="alert">
          <div className="mb-2">{error}</div>
          <Link href={`/staff/branch/${branchId}/inventory/barcode-printing`} className="btn btn-sm btn-outline-secondary">
            Back to Barcode Printing
          </Link>
        </div>
      ) : null}
      {labels.length ? (
        <BarcodePrintPage labels={labels} presetId={presetId} onPresetChange={setPresetId} title="Bulk labels" />
      ) : !error ? (
        <p className="p-4 text-muted">Loading…</p>
      ) : null}
    </div>
  );
}

export default function StaffBulkLabelsPage() {
  return (
    <Suspense fallback={<p className="p-4 text-muted">Loading…</p>}>
      <StaffBulkLabelsInner />
    </Suspense>
  );
}
