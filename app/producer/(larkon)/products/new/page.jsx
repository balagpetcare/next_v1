"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { useToast } from "@/src/hooks/useToast";
import { useApiErrorPopup } from "../../../_lib/apiErrorPopup";
import ProducerPageShell from "../../../_components/ProducerPageShell";
import ProducerSectionCard from "../../../_components/ProducerSectionCard";
import ProductForm from "../_components/ProductForm";

export default function ProducerProductNewPage() {
  const searchParams = useSearchParams();
  const editId = searchParams?.get("edit") || null;
  const toast = useToast();
  const { showApiErrorPopup, ApiErrorModal } = useApiErrorPopup();
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [productId, setProductId] = useState(null);

  const handleSuccess = (id) => {
    setProductId(id);
    setSubmitSuccess(true);
  };

  if (submitSuccess) {
    return (
      <ProducerPageShell
        title="Submitted for approval"
        breadcrumbs={[
          { label: "Products", href: "/producer/products" },
          { label: "New" },
        ]}
      >
        <ProducerSectionCard title="Status">
          <p className="text-success mb-2">
            Your product has been submitted for verification.
          </p>
          <p className="text-muted small mb-0">
            You will be notified when it is approved or if changes are required.
            After approval, you can generate codes for batches.
          </p>
          <div className="mt-3 d-flex gap-2">
            <Link
              href={productId ? `/producer/products/${productId}` : "/producer/products"}
              className="btn btn-primary radius-12"
            >
              {productId ? "View product" : "View products"}
            </Link>
            <Link
              href="/producer/products"
              className="btn btn-outline-secondary radius-12"
            >
              Back to products
            </Link>
          </div>
        </ProducerSectionCard>
      </ProducerPageShell>
    );
  }

  return (
    <>
      <ApiErrorModal />
      <ProducerPageShell
        title="New Product"
        breadcrumbs={[
          { label: "Products", href: "/producer/products" },
          { label: "New" },
        ]}
        actions={
          <Link
            href="/producer/products"
            className="btn btn-outline-secondary btn-sm radius-12"
          >
            <Icon icon="solar:arrow-left-outline" className="me-1" aria-hidden />
            Back to products
          </Link>
        }
      >
        <ProductForm
          mode="create"
          editId={editId}
          toast={toast}
          onSuccess={handleSuccess}
          showApiErrorPopup={showApiErrorPopup}
        />
      </ProducerPageShell>
    </>
  );
}
