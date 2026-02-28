"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { useToast } from "@/src/hooks/useToast";
import { producerProductGet } from "../../../../_lib/producerApi";
import { normalizeApiError, useApiErrorPopup } from "../../../../_lib/apiErrorPopup";
import ProducerPageShell from "../../../../_components/ProducerPageShell";
import ProducerSectionCard from "../../../../_components/ProducerSectionCard";
import ProductForm from "../../_components/ProductForm";

/** Backend only allows PATCH when status === DRAFT. REJECTED cannot be updated (gap). */
const CAN_EDIT_FULL = ["DRAFT"];
const CAN_EDIT_AFTER_REJECT = ["REJECTED"];

export default function ProducerProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const toast = useToast();
  const { showApiErrorPopup, ApiErrorModal } = useApiErrorPopup();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect -- loading flag before async fetch
    producerProductGet(id)
      .then((p) => {
        if (!p) {
          setProduct(null);
          return;
        }
        setProduct(p);
      })
      .catch((e) => {
        if (e?.status === 401) {
          router.replace(`/producer/login?from=/producer/products/${id}/edit`);
          return;
        }
        setProduct(null);
        showApiErrorPopup(normalizeApiError(e));
      })
      .finally(() => setLoading(false));
  }, [id, router, toast, showApiErrorPopup]);

  const status = product?.status || "DRAFT";
  const allowEdit = CAN_EDIT_FULL.includes(status) || CAN_EDIT_AFTER_REJECT.includes(status);
  const backendAllowsUpdate = CAN_EDIT_FULL.includes(status);
  const readOnly = !allowEdit || !backendAllowsUpdate;
  const productName = product?.productName || "Product";

  const handleSuccess = () => {
    router.push(`/producer/products/${id}`);
    router.refresh();
  };

  if (loading) {
    return (
      <ProducerPageShell
        title="Edit product"
        breadcrumbs={[
          { label: "Products", href: "/producer/products" },
          { label: "…" },
        ]}
      >
        <div className="placeholder-glow">
          <div className="card radius-12">
            <div className="card-body">
              <span className="placeholder col-6" />
            </div>
          </div>
        </div>
      </ProducerPageShell>
    );
  }

  if (!product) {
    return (
      <ProducerPageShell
        title="Product not found"
        breadcrumbs={[
          { label: "Products", href: "/producer/products" },
          { label: "Edit" },
        ]}
      >
        <ProducerSectionCard title="Not found">
          <p className="text-muted mb-0">
            Product not found or you don&apos;t have access.
          </p>
          <Link
            href="/producer/products"
            className="btn btn-outline-primary btn-sm mt-3 radius-12"
          >
            Back to products
          </Link>
        </ProducerSectionCard>
      </ProducerPageShell>
    );
  }

  return (
    <>
      <ApiErrorModal />
      <ProducerPageShell
        title={`Edit: ${productName}`}
        breadcrumbs={[
        { label: "Products", href: "/producer/products" },
        { label: productName, href: `/producer/products/${id}` },
        { label: "Edit" },
      ]}
      actions={
        <div className="d-flex gap-2">
          <Link
            href={`/producer/products/${id}`}
            className="btn btn-outline-primary btn-sm radius-12"
          >
            <Icon icon="solar:eye-outline" className="me-1" /> View
          </Link>
          <Link
            href="/producer/products"
            className="btn btn-outline-secondary btn-sm radius-12"
          >
            <Icon icon="solar:arrow-left-outline" className="me-1" /> Back to
            products
          </Link>
        </div>
      }
    >
      {status !== "DRAFT" && status !== "REJECTED" && (
        <div className="alert alert-info radius-12 mb-3">
          <strong>Editing restricted.</strong> This product is{" "}
          {status.replace(/_/g, " ").toLowerCase()}. Core fields cannot be
          changed. Backend allows updates only for Draft (and does not yet
          support resubmission after Rejection).
        </div>
      )}
      {status === "REJECTED" && (
        <div className="alert alert-warning radius-12 mb-3">
          You can fix and resubmit. Note: the backend currently only allows
          saving when status is Draft. If Save fails, request backend support
          for &quot;update when Rejected&quot; to enable resubmission.
        </div>
      )}

      <ProductForm
        mode="edit"
        productId={id}
        initialProduct={product}
        readOnly={readOnly}
        backendAllowsUpdate={backendAllowsUpdate}
        toast={toast}
        onSuccess={handleSuccess}
        showApiErrorPopup={showApiErrorPopup}
      />
    </ProducerPageShell>
    </>
  );
}
