"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import BarcodePrintPage from "@/app/_components/barcode/BarcodePrintPage";
import type { LabelPayload } from "@/app/_components/barcode/BarcodeLabelPreview";
import { clearBulkLabelSession, fetchBulkBarcodeLabels, readBulkLabelSession } from "@/lib/barcodeLabelsApi";

function OwnerBulkLabelsInner() {
  const searchParams = useSearchParams();
  const [presetId, setPresetId] = useState("50x30");
  const [labels, setLabels] = useState<LabelPayload[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fromQueryBranch = searchParams.get("branchId");
      const session = readBulkLabelSession();
      const branchId = Number(fromQueryBranch || session?.branchId);
      const items = session?.items;
      if (!branchId || !Array.isArray(items) || items.length === 0) {
        setError("No bulk label session. Select rows on Batches and choose “Print selected labels”.");
        return;
      }
      try {
        const data = await fetchBulkBarcodeLabels({ branchId, items });
        if (cancelled) return;
        setLabels(Array.isArray(data?.labels) ? (data.labels as LabelPayload[]) : []);
        clearBulkLabelSession();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Bulk load failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="dashboard-main-body">
      <div className="no-print px-3 pt-3">
        <Link href="/owner/inventory/batches" className="small">
          &larr; Batches
        </Link>
      </div>
      {error ? (
        <div className="alert alert-warning m-3" role="alert">
          {error}
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

export default function OwnerBulkLabelsPage() {
  return (
    <Suspense fallback={<p className="p-4 text-muted">Loading…</p>}>
      <OwnerBulkLabelsInner />
    </Suspense>
  );
}
