"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { LabelPayload } from "@/app/_components/barcode/BarcodeLabelPreview";
import SingleLabelDesignerPrintPage from "@/app/_components/barcode/SingleLabelDesignerPrintPage";
import { singleLabelDesignerStorageKey } from "@/app/_components/barcode/labelTemplateConfig";
import { fetchProductBarcodeLabel } from "@/lib/barcodeLabelsApi";

function Inner() {
  const params = useParams();
  const branchId = String(params?.branchId ?? "");
  const variantId = String(params?.variantId ?? "");
  const [labels, setLabels] = useState<LabelPayload[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const bid = Number(branchId);
    const vid = Number(variantId);
    if (!bid || !vid) return;
    setError("");
    try {
      const data = await fetchProductBarcodeLabel(vid, bid);
      setLabels(data ? [data as LabelPayload] : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setLabels([]);
    }
  }, [branchId, variantId]);

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

  if (!labels.length) return <p className="p-4 text-muted">Loading...</p>;

  return (
    <SingleLabelDesignerPrintPage
      label={labels[0]}
      labelType="SKU"
      title={`SKU label - variant #${variantId}`}
      backHref={`/staff/branch/${branchId}/inventory/barcode-printing`}
      backLabel="Barcode Printing"
      storageKey={singleLabelDesignerStorageKey(`staff_branch_${branchId}`, "SKU", variantId)}
    />
  );
}

export default function StaffPrintProductLabelPage() {
  return (
    <Suspense fallback={<p className="p-4 text-muted">Loading...</p>}>
      <Inner />
    </Suspense>
  );
}
