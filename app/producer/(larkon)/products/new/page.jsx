"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { useToast } from "@/src/hooks/useToast";
import {
  producerProductCreate,
  producerProductUpdate,
  producerProductGet,
  producerProductSubmit,
  producerProductAddProof,
  producerFactoriesList,
  producerFactoryCreate,
} from "../../../_lib/producerApi";
import ProducerPageShell from "../../../_components/ProducerPageShell";
import ProducerSectionCard from "../../../_components/ProducerSectionCard";
import ProducerProofUpload from "../../../_components/ProducerProofUpload";

const PRODUCT_TYPES = [
  { value: "", label: "Select type (optional)" },
  { value: "PET_FOOD", label: "Pet food" },
  { value: "MEDICINE", label: "Medicine" },
  { value: "SUPPLEMENT", label: "Supplement" },
  { value: "ACCESSORY", label: "Accessory" },
  { value: "LIVE_ANIMAL", label: "Live animal" },
  { value: "OTHER", label: "Other" },
];

export default function ProducerProductNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get("edit");
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [productId, setProductId] = useState(null);
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState({
    brandName: "",
    productName: "",
    sku: "",
    packSize: "",
    description: "",
    productType: "",
  });
  const [factoryId, setFactoryId] = useState("");
  const [factories, setFactories] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [ownershipDeclaration, setOwnershipDeclaration] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const step2Ref = useRef(null);

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
    if (!editId) return;
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
          setProofs(p.proofs?.map((pr) => ({ ...pr, proofType: pr.proofType, file: "Uploaded" })) ?? []);
          setStep(2);
        }
      })
      .catch(() => toast.error("Failed to load product"));
  }, [editId]);

  const errors = {};
  if (touched.productName && !(form.productName || "").trim()) errors.productName = "Product name is required";
  if (touched.sku && !(form.sku || "").trim()) errors.sku = "SKU is required";
  const canSaveDraft = (form.productName || "").trim() && (form.sku || "").trim();

  const saveDraft = async () => {
    if (!canSaveDraft) {
      setTouched({ productName: true, sku: true });
      toast.error("Product name and SKU are required");
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
      const created = productId
        ? await producerProductUpdate(productId, payload)
        : await producerProductCreate(payload);
      const id = created?.id;
      if (!id) {
        toast.error("Save failed: missing id");
        return;
      }
      setProductId(id);
      setProduct(created);
      if (!productId) toast.success("Draft saved");
      else toast.success("Updated");
      if (step === 1) setStep(2);
    } catch (e) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const addProof = async (proofType, file) => {
    if (!productId || !file) return;
    setLoading(true);
    try {
      await producerProductAddProof(productId, { file, proofType });
      const updated = await producerProductGet(productId);
      setProofs(updated?.proofs?.map((pr) => ({ ...pr, file: pr.media ? "Uploaded" : file.name })) ?? []);
      setProduct(updated);
      toast.success("Proof added");
    } catch (e) {
      toast.error(e?.message || "Failed to add proof");
    } finally {
      setLoading(false);
    }
  };

  const linkFactory = async () => {
    if (!productId || !factoryId) {
      toast.error("Select a factory");
      return;
    }
    setLoading(true);
    try {
      await producerProductUpdate(productId, { factoryId: Number(factoryId) });
      setProduct((p) => (p ? { ...p, factoryId: Number(factoryId) } : p));
      toast.success("Factory linked");
    } catch (e) {
      toast.error(e?.message || "Failed to link factory");
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
      if (productId) {
        await producerProductUpdate(productId, { factoryId: created?.id });
        setProduct((p) => (p ? { ...p, factoryId: created?.id } : p));
      }
      toast.success("Factory created");
    } catch (e) {
      toast.error(e?.message || "Failed to create factory");
    } finally {
      setLoading(false);
    }
  };

  const goToStep3 = async () => {
    if (!productId) return;
    if (!factoryId) {
      toast.error("Select a factory and click Link (or create one) before continuing.");
      return;
    }
    const fid = Number(factoryId);
    const needsLink = product?.factoryId !== fid;
    if (needsLink) {
      setLoading(true);
      try {
        await producerProductUpdate(productId, { factoryId: fid });
        setProduct((p) => (p ? { ...p, factoryId: fid } : p));
      } catch (e) {
        toast.error(e?.message || "Failed to link factory");
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    if (proofs.length === 0) {
      toast.error("Add at least one proof document before submitting for approval.");
      return;
    }
    setStep(3);
  };

  const submitForApproval = async () => {
    if (!ownershipDeclaration) {
      toast.error("You must accept the ownership declaration");
      return;
    }
    if (!productId) return;
    setLoading(true);
    try {
      await producerProductSubmit(productId, { ownershipDeclarationAccepted: true });
      setSubmitSuccess(true);
      setProduct((p) => (p ? { ...p, status: "SUBMITTED" } : p));
      toast.success("Submitted for approval");
    } catch (e) {
      const code = e?.data?.code;
      const msg = e?.message || "Submit failed";
      toast.error(msg);
      if (code && (code === "FACTORY_REQUIRED" || code === "PROOFS_REQUIRED")) {
        setStep(2);
        setTimeout(() => step2Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitSuccess) {
    return (
      <ProducerPageShell
        title="Submitted for approval"
        breadcrumbs={[{ label: "Products", href: "/producer/products" }, { label: "New" }]}
      >
        <ProducerSectionCard title="Status">
          <p className="text-success mb-2">Your product has been submitted for verification.</p>
          <p className="text-muted small mb-0">
            You will be notified when it is approved or if changes are required. After approval, you can generate
            codes for batches.
          </p>
          <div className="mt-3 d-flex gap-2">
            <Link href={`/producer/products/${productId}`} className="btn btn-primary radius-12">
              View product
            </Link>
            <Link href="/producer/products" className="btn btn-outline-secondary radius-12">
              Back to products
            </Link>
          </div>
        </ProducerSectionCard>
      </ProducerPageShell>
    );
  }

  return (
    <ProducerPageShell
      title="New Product"
      breadcrumbs={[
        { label: "Products", href: "/producer/products" },
        { label: "New" },
      ]}
      actions={
        <Link href="/producer/products" className="btn btn-outline-secondary btn-sm radius-12">
          <Icon icon="solar:arrow-left-outline" className="me-1" aria-hidden />
          Back to products
        </Link>
      }
    >
      {/* Step indicator */}
      <div className="d-flex gap-2 mb-4">
        <span className={`badge ${step >= 1 ? "bg-primary" : "bg-secondary"}`}>1. Basic info</span>
        <span className={`badge ${step >= 2 ? "bg-primary" : "bg-secondary"}`}>2. Proof pack</span>
        <span className={`badge ${step >= 3 ? "bg-primary" : "bg-secondary"}`}>3. Submit</span>
      </div>

      {/* Step 1: Basic product info */}
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
              aria-invalid={!!errors.productName}
            />
            {errors.productName && <div className="invalid-feedback">{errors.productName}</div>}
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
              aria-invalid={!!errors.sku}
            />
            {errors.sku && <div className="invalid-feedback">{errors.sku}</div>}
          </div>
          <div className="col-md-6">
            <label htmlFor="brandName" className="form-label fw-medium">Brand name</label>
            <input
              id="brandName"
              type="text"
              className="form-control radius-12"
              placeholder="Optional"
              value={form.brandName}
              onChange={(e) => setField("brandName", e.target.value)}
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="productType" className="form-label fw-medium">Product type</label>
            <select
              id="productType"
              className="form-select radius-12"
              value={form.productType}
              onChange={(e) => setField("productType", e.target.value)}
            >
              {PRODUCT_TYPES.map((opt) => (
                <option key={opt.value || "empty"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label htmlFor="packSize" className="form-label fw-medium">Pack size</label>
            <input
              id="packSize"
              type="text"
              className="form-control radius-12"
              placeholder="e.g. 10 strips"
              value={form.packSize}
              onChange={(e) => setField("packSize", e.target.value)}
            />
          </div>
          <div className="col-12">
            <label htmlFor="description" className="form-label fw-medium">Description</label>
            <textarea
              id="description"
              className="form-control radius-12"
              rows={3}
              placeholder="Optional product description"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 d-flex gap-2">
          <button
            type="button"
            className="btn btn-primary radius-12"
            onClick={saveDraft}
            disabled={loading || !canSaveDraft}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm me-1" aria-hidden />
            ) : (
              <Icon icon="solar:diskette-outline" className="me-1" aria-hidden />
            )}
            {productId ? "Update draft" : "Save draft"}
          </button>
          {productId && (
            <button type="button" className="btn btn-outline-primary radius-12" onClick={() => setStep(2)}>
              Next: Proof pack
            </button>
          )}
          <Link href="/producer/products" className="btn btn-outline-secondary radius-12">
            Cancel
          </Link>
        </div>
      </ProducerSectionCard>

      {/* Step 2: Proof pack */}
      {step >= 2 && productId && (
        <div ref={step2Ref}>
          <ProducerSectionCard title="Step 2 — Proof pack" className="mb-4">
          <p className="text-muted small mb-3">
            Link a factory and upload at least one proof document (e.g. label, packaging photo, license).
            Admin may verify the factory during product review.
          </p>
          <div className="mb-3">
            <label className="form-label fw-medium">Factory</label>
            <div className="d-flex gap-2 flex-wrap">
              <select
                className="form-select radius-12"
                style={{ maxWidth: 280 }}
                value={factoryId}
                onChange={(e) => setFactoryId(e.target.value)}
              >
                <option value="">Select factory</option>
                {factories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.isVerified ? "✓ Verified" : ""}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-outline-secondary radius-12" onClick={linkFactory} disabled={loading}>
                Link
              </button>
              <button type="button" className="btn btn-outline-primary radius-12" onClick={createFactoryAndLink} disabled={loading}>
                + New factory
              </button>
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label fw-medium">Proof documents</label>
            <ProducerProofUpload
              proofs={proofs}
              onAdd={addProof}
              showEvidenceSummary={true}
              requiredMin={1}
              disabled={loading}
              selectId="proofTypeSelect"
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
            <button type="button" className="btn btn-outline-secondary radius-12" onClick={() => setStep(1)}>
              Back
            </button>
          </div>
        </ProducerSectionCard>
        </div>
      )}

      {/* Step 3: Submit */}
      {step >= 3 && productId && (
        <ProducerSectionCard title="Step 3 — Submit for approval">
          <p className="text-muted small mb-3">
            By submitting, you confirm that your factory is verified and proof documents are complete. You will not be
            able to generate codes until the product is approved.
          </p>
          <div className="form-check mb-3">
            <input
              id="declaration"
              type="checkbox"
              className="form-check-input"
              checked={ownershipDeclaration}
              onChange={(e) => setOwnershipDeclaration(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="declaration">
              I declare that I have the legal rights to produce this product. I understand that false or copied product
              claims may result in account suspension.
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
            <button type="button" className="btn btn-outline-secondary radius-12" onClick={() => setStep(2)}>
              Back
            </button>
            <Link href={`/producer/products/${productId}`} className="btn btn-outline-secondary radius-12">
              View product
            </Link>
          </div>
        </ProducerSectionCard>
      )}
    </ProducerPageShell>
  );
}
