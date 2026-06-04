"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { LabelPayload } from "@/app/_components/barcode/BarcodeLabelPreview";
import SingleLabelDesignerPrintPage from "@/app/_components/barcode/SingleLabelDesignerPrintPage";
import { singleLabelDesignerStorageKey } from "@/app/_components/barcode/labelTemplateConfig";
import { fetchProductBarcodeLabel } from "@/lib/barcodeLabelsApi";

function Inner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const variantId = String(params?.variantId ?? "");
  const branchId = searchParams.get("branchId");
  const [labels, setLabels] = useState<LabelPayload[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!variantId || !branchId) return;
    setError("");
    try {
      const data = await fetchProductBarcodeLabel(Number(variantId), Number(branchId));
      setLabels(data ? [data as LabelPayload] : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setLabels([]);
    }
  }, [variantId, branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!branchId) {
    return (
      <div className="p-4">
        <p className="text-danger">Missing branchId query parameter.</p>
        <Link href="/owner/inventory/batches">Pick a location from Batches</Link>
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
      labelType="SKU"
      title={`SKU label - variant #${variantId}`}
      backHref="/owner/products"
      backLabel="Products"
      storageKey={singleLabelDesignerStorageKey(`owner_branch_${branchId}`, "SKU", variantId)}
    />
  );
}

export default function OwnerPrintProductLabelPage() {
  return (
    <Suspense fallback={<p className="p-4 text-muted">Loading...</p>}>
      <Inner />
    </Suspense>
  );
}
