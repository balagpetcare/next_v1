"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { LabelPayload } from "@/app/_components/barcode/BarcodeLabelPreview";
import SingleLabelDesignerPrintPage from "@/app/_components/barcode/SingleLabelDesignerPrintPage";
import { singleLabelDesignerStorageKey } from "@/app/_components/barcode/labelTemplateConfig";
import { fetchBatchBarcodeLabel } from "@/lib/barcodeLabelsApi";

function Inner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const lotId = String(params?.lotId ?? "");
  const branchId = searchParams.get("branchId");
  const [labels, setLabels] = useState<LabelPayload[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!lotId || !branchId) return;
    setError("");
    try {
      const data = await fetchBatchBarcodeLabel(Number(lotId), Number(branchId));
      setLabels(data ? [data as LabelPayload] : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setLabels([]);
    }
  }, [lotId, branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!branchId) {
    return (
      <div className="p-4">
        <p className="text-danger">Missing branchId query parameter.</p>
        <Link href="/owner/inventory/batches">Batches</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-danger m-3" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!labels.length) return <p className="p-4 text-muted">Loading...</p>;

  return (
    <SingleLabelDesignerPrintPage
      label={labels[0]}
      labelType="BATCH"
      title={`Batch label - lot #${lotId}`}
      backHref="/owner/inventory/batches"
      backLabel="Batches"
      storageKey={singleLabelDesignerStorageKey(`owner_branch_${branchId}`, "BATCH", lotId)}
    />
  );
}

export default function OwnerPrintBatchLabelPage() {
  return (
    <Suspense fallback={<p className="p-4 text-muted">Loading...</p>}>
      <Inner />
    </Suspense>
  );
}
