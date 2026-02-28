"use client";

/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import {
  producerProductCreate,
  producerProductUpdate,
  producerProductGet,
  producerProductSubmit,
  producerProductAddProof,
  producerFactoriesList,
  producerFactoryCreate,
  getProducerErrorMessage,
} from "../../../_lib/producerApi";
import { normalizeApiError } from "../../../_lib/apiErrorPopup";
import ProducerSectionCard from "../../../_components/ProducerSectionCard";
import ProofUploader from "./ProofUploader";

const PRODUCT_TYPES = [
  { value: "", label: "Select type (optional)" },
  { value: "PET_FOOD", label: "Pet food" },
  { value: "MEDICINE", label: "Medicine" },
  { value: "SUPPLEMENT", label: "Supplement" },
  { value: "ACCESSORY", label: "Accessory" },
  { value: "LIVE_ANIMAL", label: "Live animal" },
  { value: "OTHER", label: "Other" },
];

/**
 * Shared product form for create and edit.
 * - mode: "create" | "edit"
 * - productId: required in edit mode
 * - initialProduct: required in edit mode (pre-loaded product)
 * - readOnly, backendAllowsUpdate: for edit mode
 * - editId: optional; in create mode, preload this draft
 * - toast, onSuccess (called when submit for approval succeeds)
 * - showApiErrorPopup: optional; when provided, proof upload (and other API) errors show in modal instead of toast
 */
export default function ProductForm({
  mode,
  productId: productIdProp,
  initialProduct,
  readOnly = false,
  backendAllowsUpdate = true,
  editId,
  toast,
  onSuccess,
  step2Ref: step2RefProp,
  showApiErrorPopup,
}) {
  const [productId, setProductId] = useState(mode === "edit" ? productIdProp : initialProduct?.id ?? null);
  const [product, setProduct] = useState(mode === "edit" ? initialProduct : initialProduct ?? null);
  const [form, setForm] = useState({
    brandName: initialProduct?.brandName ?? "",
    productName: initialProduct?.productName ?? "",
    sku: initialProduct?.sku ?? "",
    packSize: initialProduct?.packSize ?? "",
    description: initialProduct?.description ?? "",
    productType: initialProduct?.productType ?? "",
  });
  const [factoryId, setFactoryId] = useState(
    initialProduct?.factoryId ? String(initialProduct.factoryId) : ""
  );
  const [factories, setFactories] = useState([]);
  const [proofs, setProofs] = useState(
    (initialProduct?.proofs || []).map((pr) => ({
      ...pr,
      proofType: pr.proofType,
      file: pr.media ? "Uploaded" : "Uploaded",
    }))
  );
  const [ownershipDeclaration, setOwnershipDeclaration] = useState(false);
  const [step, setStep] = useState(
    mode === "edit" && initialProduct?.status !== "DRAFT" ? 2 : 1
  );
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const step1Ref = useRef(null);
  const step2Ref = useRef(null);
  const ref2 = step2RefProp ?? step2Ref;

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  useEffect(() => {
    producerFactoriesList()
      .then((list) => setFactories(Array.isArray(list) ? list : []))
      .catch(() => setFactories([]));
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !initialProduct) return;
    setProduct(initialProduct);
    setForm({
      brandName: initialProduct.brandName ?? "",
      productName: initialProduct.productName ?? "",
      sku: initialProduct.sku ?? "",
      packSize: initialProduct.packSize ?? "",
      description: initialProduct.description ?? "",
      productType: initialProduct.productType ?? "",
    });
    setFactoryId(initialProduct.factoryId ? String(initialProduct.factoryId) : "");
    setProofs(
      (initialProduct.proofs || []).map((pr) => ({
        ...pr,
        proofType: pr.proofType,
        file: pr.media ? "Uploaded" : "Uploaded",
      }))
    );
    setStep(initialProduct.status === "DRAFT" ? 1 : 2);
  }, [mode, initialProduct]);

  useEffect(() => {
    if (mode !== "create" || !editId) return;
    producerProductGet(editId)
      .then((p) => {
        if (p) {
          setProductId(p.id);
          setProduct(p);
          setForm({
            brandName: p.brandName || "",
            productName: p.productName || "",
            sku: p.sku || "",
            packSize: p.packSize || "",
            description: p.description || "",
            productType: p.productType || "",
          });
          setFactoryId(p.factoryId ? String(p.factoryId) : "");
          setProofs(
            (p.proofs || []).map((pr) => ({
              ...pr,
              proofType: pr.proofType,
              file: pr.media ? "Uploaded" : "Uploaded",
            }))
          );
          setStep(2);
        }
      })
      .catch(() => toast?.error?.(getProducerErrorMessage({}) || "Failed to load product"));
  }, [mode, editId, toast]);

  const errors = {};
  if (touched.productName && !(form.productName || "").trim())
    errors.productName = "Product name is required";
  if (touched.sku && !(form.sku || "").trim()) errors.sku = "SKU is required";
  const canSaveDraft =
    (form.productName || "").trim() && (form.sku || "").trim();
  const currentId = mode === "edit" ? productIdProp : productId;

  const saveDraft = async () => {
    if (!canSaveDraft) {
      setTouched({ productName: true, sku: true });
      toast?.error?.("Product name and SKU are required");
      step1Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (mode === "edit" && !backendAllowsUpdate) {
      toast?.error?.(
        "Only draft products can be updated. Backend does not support editing rejected products yet."
      );
      return;
    }
    setLoading(true);
    try {
      const payload = {
        brandName: form.brandName || "",
        productName: form.productName.trim(),
        sku: form.sku.trim(),
        packSize: form.packSize || undefined,
        description: form.description || undefined,
        productType: form.productType || undefined,
      };
      const result = currentId
        ? await producerProductUpdate(currentId, payload)
        : await producerProductCreate(payload);
      const id = result?.id;
      if (!id) {
        toast?.error?.("Save failed: missing id");
        return;
      }
      if (mode === "create") setProductId(id);
      setProduct((prev) => (prev ? { ...prev, ...result } : result));
      toast?.success?.(currentId ? "Updated" : "Draft saved");
      if (step === 1) setStep(2);
    } catch (e) {
      if (showApiErrorPopup) {
        showApiErrorPopup(normalizeApiError(e));
      } else {
        const msg =
          mode === "create" && Number(e?.status) === 403
            ? "You don't have permission to create products. Ask the owner to grant Product permissions."
            : getProducerErrorMessage(e) || "Failed to save";
        toast?.error?.(msg);
        step1Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } finally {
      setLoading(false);
    }
  };

  const addProof = async (proofType, file) => {
    if (!currentId || !file) return;
    setLoading(true);
    try {
      await producerProductAddProof(currentId, {
        file,
        proofType: proofType && proofType.trim() ? proofType : "OTHER",
      });
      const updated = await producerProductGet(currentId);
      setProofs(
        (updated?.proofs || []).map((pr) => ({
          ...pr,
          file: pr.media ? "Uploaded" : file.name,
        }))
      );
      setProduct(updated);
      toast?.success?.("Proof added");
    } catch (e) {
      if (showApiErrorPopup) {
        showApiErrorPopup(normalizeApiError(e));
      } else {
        toast?.error?.(getProducerErrorMessage(e) || "Failed to add proof");
      }
    } finally {
      setLoading(false);
    }
  };

  const linkFactory = async () => {
    if (!currentId || !factoryId) {
      toast?.error?.("Select a factory");
      return;
    }
    if (mode === "edit" && !backendAllowsUpdate) {
      toast?.error?.("Cannot change factory in current status.");
      return;
    }
    setLoading(true);
    try {
      await producerProductUpdate(currentId, { factoryId: Number(factoryId) });
      setProduct((p) => (p ? { ...p, factoryId: Number(factoryId) } : p));
      toast?.success?.("Factory linked");
    } catch (e) {
      if (showApiErrorPopup) {
        showApiErrorPopup(normalizeApiError(e));
      } else {
        toast?.error?.(getProducerErrorMessage(e) || "Failed to link factory");
      }
    } finally {
      setLoading(false);
    }
  };

  const createFactoryAndLink = async () => {
    const name = window.prompt("Factory name");
    if (!name?.trim()) return;
    setLoading(true);
    try {
      const created = await producerFactoryCreate({ name: name.trim() });
      setFactories((prev) => [...prev, created]);
      setFactoryId(String(created?.id ?? ""));
      if (currentId && (mode === "create" || backendAllowsUpdate)) {
        await producerProductUpdate(currentId, { factoryId: created?.id });
        setProduct((p) => (p ? { ...p, factoryId: created?.id } : p));
      }
      toast?.success?.("Factory created");
    } catch (e) {
      if (showApiErrorPopup) {
        showApiErrorPopup(normalizeApiError(e));
      } else {
        toast?.error?.(getProducerErrorMessage(e) || "Failed to create factory");
      }
    } finally {
      setLoading(false);
    }
  };

  const goToStep3 = async () => {
    if (!currentId) return;
    if (!factoryId) {
      toast?.error?.(
        "Select a factory and click Link (or create one) before continuing."
      );
      ref2.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const fid = Number(factoryId);
    const needsLink = product?.factoryId !== fid;
    if (needsLink) {
      setLoading(true);
      try {
        await producerProductUpdate(currentId, { factoryId: fid });
        setProduct((p) => (p ? { ...p, factoryId: fid } : p));
      } catch (e) {
        if (showApiErrorPopup) {
          showApiErrorPopup(normalizeApiError(e));
        } else {
          toast?.error?.(getProducerErrorMessage(e) || "Failed to link factory");
        }
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    if ((proofs?.length ?? 0) === 0) {
      toast?.error?.(
        "Add at least one proof document before submitting for approval."
      );
      ref2.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setStep(3);
  };

  const submitForApproval = async () => {
    if (!ownershipDeclaration) {
      toast?.error?.("You must accept the ownership declaration");
      return;
    }
    if (!currentId) return;
    if (mode === "edit" && (initialProduct?.status || "") !== "DRAFT") return;
    setLoading(true);
    try {
      const data = await producerProductSubmit(currentId, {
        ownershipDeclarationAccepted: true,
      });
      const autoApproved = data?.autoApproved === true || data?.approval?.status === "APPROVED";
      setProduct((p) =>
        p ? { ...p, status: autoApproved ? "UNDER_REVIEW" : "SUBMITTED" } : p
      );
      if (autoApproved) {
        toast?.success?.("Approved. Sent for platform review.");
      } else {
        toast?.success?.("Submitted for approval");
      }
      onSuccess?.(currentId);
    } catch (e) {
      const code = e?.data?.code;
      if (showApiErrorPopup) {
        showApiErrorPopup(normalizeApiError(e));
      } else {
        toast?.error?.(getProducerErrorMessage(e) || "Submit failed");
      }
      if (
        code &&
        (code === "FACTORY_REQUIRED" || code === "PROOFS_REQUIRED")
      ) {
        setStep(2);
        setTimeout(
          () => ref2.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
          100
        );
      } else if (!showApiErrorPopup) {
        step1Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } finally {
      setLoading(false);
    }
  };

  const status = product?.status || "DRAFT";
  const canAddProof = mode === "create" || status === "DRAFT";
  const showStep3 = step >= 3 && currentId && (mode === "create" || status === "DRAFT");

  return (
    <>
      <div className="d-flex gap-2 mb-4">
        <span className={`badge ${step >= 1 ? "bg-primary" : "bg-secondary"}`}>
          1. Basic info
        </span>
        <span className={`badge ${step >= 2 ? "bg-primary" : "bg-secondary"}`}>
          2. Proof pack
        </span>
        <span className={`badge ${step >= 3 ? "bg-primary" : "bg-secondary"}`}>
          3. Submit
        </span>
      </div>

      <div ref={step1Ref}>
        <ProducerSectionCard title="Step 1 — Basic information" className="mb-4">
          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="productName" className="form-label fw-medium">
                Product name <span className="text-danger">*</span>
              </label>
              <input
                id="productName"
                type="text"
                className={`form-control radius-12 ${errors.productName ? "is-invalid" : ""}`}
                placeholder="e.g. Paracetamol 500mg"
                value={form.productName}
                onChange={(e) => setField("productName", e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, productName: true }))}
                disabled={readOnly}
                aria-invalid={!!errors.productName}
              />
              {errors.productName && (
                <div className="invalid-feedback">{errors.productName}</div>
              )}
            </div>
            <div className="col-md-6">
              <label htmlFor="sku" className="form-label fw-medium">
                SKU <span className="text-danger">*</span>
              </label>
              <input
                id="sku"
                type="text"
                className={`form-control radius-12 ${errors.sku ? "is-invalid" : ""}`}
                placeholder="e.g. PAR-500-10"
                value={form.sku}
                onChange={(e) => setField("sku", e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, sku: true }))}
                disabled={readOnly}
                aria-invalid={!!errors.sku}
              />
              {errors.sku && (
                <div className="invalid-feedback">{errors.sku}</div>
              )}
            </div>
            <div className="col-md-6">
              <label htmlFor="brandName" className="form-label fw-medium">
                Brand name
              </label>
              <input
                id="brandName"
                type="text"
                className="form-control radius-12"
                placeholder="Optional"
                value={form.brandName}
                onChange={(e) => setField("brandName", e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="productType" className="form-label fw-medium">
                Product type
              </label>
              <select
                id="productType"
                className="form-select radius-12"
                value={form.productType}
                onChange={(e) => setField("productType", e.target.value)}
                disabled={readOnly}
              >
                {PRODUCT_TYPES.map((opt) => (
                  <option key={opt.value || "empty"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label htmlFor="packSize" className="form-label fw-medium">
                Pack size
              </label>
              <input
                id="packSize"
                type="text"
                className="form-control radius-12"
                placeholder="e.g. 10 strips"
                value={form.packSize}
                onChange={(e) => setField("packSize", e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="col-12">
              <label htmlFor="description" className="form-label fw-medium">
                Description
              </label>
              <textarea
                id="description"
                className="form-control radius-12"
                rows={3}
                placeholder="Optional product description"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>
          <div className="mt-4 d-flex gap-2">
            <button
              type="button"
              className="btn btn-primary radius-12"
              onClick={saveDraft}
              disabled={loading || !canSaveDraft || readOnly || (mode === "edit" && !backendAllowsUpdate)}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm me-1" aria-hidden />
              ) : (
                <Icon icon="solar:diskette-outline" className="me-1" aria-hidden />
              )}
              {mode === "edit"
                ? backendAllowsUpdate ? "Save" : "Save (disabled)"
                : currentId ? "Update draft" : "Save draft"}
            </button>
            {currentId && (mode === "create" || backendAllowsUpdate) && (
              <button
                type="button"
                className="btn btn-outline-primary radius-12"
                onClick={() => setStep(2)}
              >
                Next: Proof pack
              </button>
            )}
            {mode === "create" && (
              <Link href="/producer/products" className="btn btn-outline-secondary radius-12">
                Cancel
              </Link>
            )}
            {mode === "edit" && (
              <Link
                href={`/producer/products/${currentId}`}
                className="btn btn-outline-secondary radius-12"
              >
                Cancel
              </Link>
            )}
          </div>
        </ProducerSectionCard>
      </div>

      {step >= 2 && currentId && (
        <div ref={ref2}>
          <ProducerSectionCard title="Step 2 — Proof pack" className="mb-4">
            <p className="text-muted small mb-3">
              Link a factory and upload at least one proof document (e.g. label,
              packaging photo, license). Admin may verify the factory during
              product review.
            </p>
            <div className="mb-3">
              <label className="form-label fw-medium">Factory</label>
              <div className="d-flex gap-2 flex-wrap">
                <select
                  className="form-select radius-12"
                  style={{ maxWidth: 280 }}
                  value={factoryId}
                  onChange={(e) => setFactoryId(e.target.value)}
                  disabled={mode === "edit" && !backendAllowsUpdate}
                >
                  <option value="">Select factory</option>
                  {factories.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.isVerified ? "✓ Verified" : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-outline-secondary radius-12"
                  onClick={linkFactory}
                  disabled={loading || (mode === "edit" && !backendAllowsUpdate)}
                >
                  Link
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary radius-12"
                  onClick={createFactoryAndLink}
                  disabled={loading}
                >
                  + New factory
                </button>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-medium">Proof documents</label>
              <ProofUploader
                proofs={proofs}
                onAdd={addProof}
                disabled={loading}
                canAdd={canAddProof}
                requiredMin={1}
                selectId={mode === "edit" ? "proofTypeSelectEdit" : "proofTypeSelect"}
                toast={toast}
                getErrorMessage={getProducerErrorMessage}
                onApiError={showApiErrorPopup ? (e) => showApiErrorPopup(normalizeApiError(e)) : undefined}
              />
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-primary radius-12"
                onClick={goToStep3}
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm me-1" aria-hidden />
                ) : null}
                Next: Submit for approval
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary radius-12"
                onClick={() => setStep(1)}
              >
                Back
              </button>
            </div>
          </ProducerSectionCard>
        </div>
      )}

      {showStep3 && (
        <ProducerSectionCard title="Step 3 — Submit for approval">
          <p className="text-muted small mb-3">
            By submitting, you confirm that your factory is verified and proof
            documents are complete. You will not be able to generate codes until
            the product is approved.
          </p>
          <div className="form-check mb-3">
            <input
              id={mode === "edit" ? "declarationEdit" : "declaration"}
              type="checkbox"
              className="form-check-input"
              checked={ownershipDeclaration}
              onChange={(e) => setOwnershipDeclaration(e.target.checked)}
            />
            <label
              className="form-check-label"
              htmlFor={mode === "edit" ? "declarationEdit" : "declaration"}
            >
              I declare that I have the legal rights to produce this product. I
              understand that false or copied product claims may result in
              account suspension.
            </label>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-primary radius-12"
              onClick={submitForApproval}
              disabled={loading || !ownershipDeclaration}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm me-1" aria-hidden />
              ) : (
                <Icon icon="solar:plain-2-outline" className="me-1" aria-hidden />
              )}
              Submit for approval
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary radius-12"
              onClick={() => setStep(2)}
            >
              Back
            </button>
            <Link
              href={`/producer/products/${currentId}`}
              className="btn btn-outline-secondary radius-12"
            >
              View product
            </Link>
          </div>
        </ProducerSectionCard>
      )}
    </>
  );
}
