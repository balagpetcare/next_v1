"use client";

import { useCallback, useEffect, useState } from "react";
import type { LabelPayload } from "@/app/_components/barcode/BarcodeLabelPreview";
import SingleLabelDesignerPrintPage from "@/app/_components/barcode/SingleLabelDesignerPrintPage";
import { singleLabelDesignerStorageKey } from "@/app/_components/barcode/labelTemplateConfig";
import { fetchBatchBarcodeLabel } from "@/lib/barcodeLabelsApi";

export default function StaffBatchLabelPrintClient({
  branchId,
  lotId,
}: {
  branchId: string;
  lotId: string;
}) {
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

  if (error) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-danger m-3" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!labels.length) {
    return <p className="p-4 text-muted">Loading...</p>;
  }

  return (
    <SingleLabelDesignerPrintPage
      label={labels[0]}
      labelType="BATCH"
      title={`Batch label - lot #${lotId}`}
      backHref={`/staff/branch/${branchId}/inventory/batch-pricing`}
      backLabel="Batch pricing"
      storageKey={singleLabelDesignerStorageKey(`staff_branch_${branchId}`, "BATCH", lotId)}
    />
  );
}
