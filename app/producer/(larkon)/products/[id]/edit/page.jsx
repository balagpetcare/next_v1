"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { useToast } from "@/src/hooks/useToast";
import {
  producerProductGet,
  producerProductUpdate,
  producerProductSubmit,
  producerProductAddProof,
  producerFactoriesList,
  producerFactoryCreate,
} from "../../../../_lib/producerApi";
import ProducerPageShell from "../../../../_components/ProducerPageShell";
import ProducerSectionCard from "../../../../_components/ProducerSectionCard";
import ProducerProofUpload from "../../../../_components/ProducerProofUpload";
import { getErrorMessage } from "../../../../_lib/errors";

const PRODUCT_TYPES = [
  { value: "", label: "Select type (optional)" },
  { value: "PET_FOOD", label: "Pet food" },
  { value: "MEDICINE", label: "Medicine" },
  { value: "SUPPLEMENT", label: "Supplement" },
  { value: "ACCESSORY", label: "Accessory" },
  { value: "LIVE_ANIMAL", label: "Live animal" },
  { value: "OTHER", label: "Other" },
];

/** Backend only allows PATCH when status === DRAFT. REJECTED cannot be updated (gap). */
const CAN_EDIT_FULL = ["DRAFT"];
const CAN_EDIT_AFTER_REJECT = ["REJECTED"]; // UI allows edit; backend may return 400 until backend supports REJECTED→resubmit

export default function ProducerProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  const [touched, setTouched] = useState({});
  const [step, setStep] = useState(1);
  const step2Ref = useRef(null);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const status = product?.status || "DRAFT";
  const allowEdit = CAN_EDIT_FULL.includes(status) || CAN_EDIT_AFTER_REJECT.includes(status);
  const backendAllowsUpdate = CAN_EDIT_FULL.includes(status); // REJECTED: UI allows, backend returns 400
  const allowSubmit = status === "DRAFT" && product?.factoryId && (proofs?.length ?? 0) > 0;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    producerProductGet(id)
      .then((p) => {
        if (!p) {
          setProduct(null);
          return;
        }
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
        setStep(p.status === "DRAFT" ? 1 : 2);
      })
      .catch((e) => {
        if (e?.status === 401) {
          router.replace(`/producer/login?from=/producer/products/${id}/edit`);
          return;
        }
        if (e?.status === 403) {
          toast.error("You don't have access to this product.");
          return;
        }
        if (e?.status === 404) {
          setProduct(null);
          toast.error("Product not found.");
          return;
        }
        setProduct(null);
        toast.error(getErrorMessage(e, "Failed to load product"));
      })
      .finally(() => setLoading(false));
  }, [id, router, toast]);

  useEffect(() => {
    producerFactoriesList()
      .then((list) => setFactories(Array.isArray(list) ? list : []))
      .catch(() => setFactories([]));
  }, []);

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
    if (!backendAllowsUpdate) {
      toast.error("Backend does not allow editing this product in its current status. Only Draft products can be updated. If this was rejected, request backend support for resubmission.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        brandName: form.brandName || "",
        productName: form.productName.trim(),
        sku: form.sku.trim(),
        packSize: form.packSize || undefined,
        description: form.description || undefined,
        productType: form.productType || undefined,
      };
      const updated = await producerProductUpdate(id, payload);
      setProduct((prev) => (prev ? { ...prev, ...updated } : updated));
      toast.success("Updated");
      if (step === 1) setStep(2);
    } catch (e) {
      if (e?.status === 400 && e?.data?.message?.includes("DRAFT")) {
        toast.error("Only draft products can be updated. Backend does not support editing rejected products yet.");
        return;
      }
      toast.error(getErrorMessage(e, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const addProof = async (proofType, file) => {
    if (!id || !file || status !== "DRAFT") return;
    setSaving(true);
    try {
      await producerProductAddProof(id, { file, proofType });
      const updated = await producerProductGet(id);
      setProofs(updated?.proofs?.map((pr) => ({ ...pr, file: pr.media ? "Uploaded" : file.name })) ?? []);
      setProduct(updated);
      toast.success("Proof added");
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to add proof"));
    } finally {
      setSaving(false);
    }
  };

  const linkFactory = async () => {
    if (!id || !factoryId || !backendAllowsUpdate) {
      toast.error(backendAllowsUpdate ? "Select a factory" : "Cannot change factory in current status.");
      return;
    }
    setSaving(true);
    try {
      await producerProductUpdate(id, { factoryId: Number(factoryId) });
      setProduct((p) => (p ? { ...p, factoryId: Number(factoryId) } : p));
      toast.success("Factory linked");
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to link factory"));
    } finally {
      setSaving(false);
    }
  };

  const createFactoryAndLink = async () => {
    const name = window.prompt("Factory name");
    if (!name?.trim()) return;
    setSaving(true);
    try {
      const created = await producerFactoryCreate({ name: name.trim() });
      setFactories((prev) => [...prev, created]);
      setFactoryId(String(created?.id ?? ""));
      if (id && backendAllowsUpdate) {
        await producerProductUpdate(id, { factoryId: created?.id });
        setProduct((p) => (p ? { ...p, factoryId: created?.id } : p));
      }
      toast.success("Factory created");
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to create factory"));
    } finally {
      setSaving(false);
    }
  };

  const goToStep3 = () => {
    if (!product?.factoryId) {
      toast.error("Select a factory and click Link (or create one) before continuing.");
      return;
    }
    if ((proofs?.length ?? 0) === 0) {
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
    if (status !== "DRAFT") return;
    setSaving(true);
    try {
      await producerProductSubmit(id, { ownershipDeclarationAccepted: true });
      setProduct((p) => (p ? { ...p, status: "SUBMITTED" } : p));
      toast.success("Submitted for approval");
      router.push(`/producer/products/${id}`);
      router.refresh();
    } catch (e) {
      const code = e?.data?.code;
      const msg = getErrorMessage(e, "Submit failed");
      toast.error(msg);
      if (code && (code === "FACTORY_REQUIRED" || code === "PROOFS_REQUIRED")) {
        setStep(2);
        setTimeout(() => step2Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
    } finally {
      setSaving(false);
    }
  };

  const productName = product?.productName || "Product";

  if (loading) {
    return (
      <ProducerPageShell title="Edit product" breadcrumbs={[{ label: "Products", href: "/producer/products" }, { label: "…" }]}>
        <div className="placeholder-glow">
          <div className="card radius-12"><div className="card-body"><span className="placeholder col-6" /></div></div>
        </div>
      </ProducerPageShell>
    );
  }

  if (!product) {
    return (
      <ProducerPageShell title="Product not found" breadcrumbs={[{ label: "Products", href: "/producer/products" }, { label: "Edit" }]}>
        <ProducerSectionCard title="Not found">
          <p className="text-muted mb-0">Product not found or you don't have access.</p>
          <Link href="/producer/products" className="btn btn-outline-primary btn-sm mt-3 radius-12">Back to products</Link>
        </ProducerSectionCard>
      </ProducerPageShell>
    );
  }

  const readOnly = !allowEdit || !backendAllowsUpdate;

  return (
    <ProducerPageShell
      title={`Edit: ${productName}`}
      breadcrumbs={[
        { label: "Products", href: "/producer/products" },
        { label: productName, href: `/producer/products/${id}` },
        { label: "Edit" },
      ]}
      actions={
        <div className="d-flex gap-2">
          <Link href={`/producer/products/${id}`} className="btn btn-outline-primary btn-sm radius-12">
            <Icon icon="solar:eye-outline" className="me-1" /> View
          </Link>
          <Link href="/producer/products" className="btn btn-outline-secondary btn-sm radius-12">
            <Icon icon="solar:arrow-left-outline" className="me-1" /> Back to products
          </Link>
        </div>
      }
    >
      {status !== "DRAFT" && status !== "REJECTED" && (
        <div className="alert alert-info radius-12 mb-3">
          <strong>Editing restricted.</strong> This product is {status.replace(/_/g, " ").toLowerCase()}. Core fields cannot be changed. Backend allows updates only for Draft (and does not yet support resubmission after Rejection).
        </div>
      )}
      {status === "REJECTED" && (
        <div className="alert alert-warning radius-12 mb-3">
          You can fix and resubmit. Note: the backend currently only allows saving when status is Draft. If Save fails, request backend support for &quot;update when Rejected&quot; to enable resubmission.
        </div>
      )}

      <div className="d-flex gap-2 mb-4">
        <span className={`badge ${step >= 1 ? "bg-primary" : "bg-secondary"}`}>1. Basic info</span>
        <span className={`badge ${step >= 2 ? "bg-primary" : "bg-secondary"}`}>2. Proof pack</span>
        <span className={`badge ${step >= 3 ? "bg-primary" : "bg-secondary"}`}>3. Submit</span>
      </div>

      <ProducerSectionCard title="Step 1 — Basic information" className="mb-4">
        <div className="row g-3">
          <div className="col-md-6">
            <label htmlFor="productName" className="form-label fw-medium">Product name <span className="text-danger">*</span></label>
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
            {errors.productName && <div className="invalid-feedback">{errors.productName}</div>}
          </div>
          <div className="col-md-6">
            <label htmlFor="sku" className="form-label fw-medium">SKU <span className="text-danger">*</span></label>
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
              disabled={readOnly}
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="productType" className="form-label fw-medium">Product type</label>
            <select
              id="productType"
              className="form-select radius-12"
              value={form.productType}
              onChange={(e) => setField("productType", e.target.value)}
              disabled={readOnly}
            >
              {PRODUCT_TYPES.map((opt) => (
                <option key={opt.value || "empty"} value={opt.value}>{opt.label}</option>
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
              disabled={readOnly}
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
              disabled={readOnly}
            />
          </div>
        </div>
        <div className="mt-4 d-flex gap-2">
          <button
            type="button"
            className="btn btn-primary radius-12"
            onClick={saveDraft}
            disabled={saving || !canSaveDraft || readOnly}
          >
            {saving ? <span className="spinner-border spinner-border-sm me-1" /> : <Icon icon="solar:diskette-outline" className="me-1" />}
            {backendAllowsUpdate ? "Save" : "Save (disabled)"}
          </button>
          {backendAllowsUpdate && (
            <button type="button" className="btn btn-outline-primary radius-12" onClick={() => setStep(2)}>
              Next: Proof pack
            </button>
          )}
          <Link href={`/producer/products/${id}`} className="btn btn-outline-secondary radius-12">Cancel</Link>
        </div>
      </ProducerSectionCard>

      {step >= 2 && (
        <div ref={step2Ref}>
          <ProducerSectionCard title="Step 2 — Proof pack" className="mb-4">
            <p className="text-muted small mb-3">
              Link a factory and upload at least one proof document. Admin may verify the factory during product review.
            </p>
            <div className="mb-3">
              <label className="form-label fw-medium">Factory</label>
              <div className="d-flex gap-2 flex-wrap">
                <select
                  className="form-select radius-12"
                  style={{ maxWidth: 280 }}
                  value={factoryId}
                  onChange={(e) => setFactoryId(e.target.value)}
                  disabled={!backendAllowsUpdate}
                >
                  <option value="">Select factory</option>
                  {factories.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} {f.isVerified ? "✓ Verified" : ""}</option>
                  ))}
                </select>
                <button type="button" className="btn btn-outline-secondary radius-12" onClick={linkFactory} disabled={saving || !backendAllowsUpdate}>
                  Link
                </button>
                <button type="button" className="btn btn-outline-primary radius-12" onClick={createFactoryAndLink} disabled={saving}>
                  + New factory
                </button>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-medium">Proof documents</label>
              <ProducerProofUpload
                proofs={proofs}
                onAdd={status === "DRAFT" ? addProof : undefined}
                showEvidenceSummary={true}
                requiredMin={1}
                disabled={saving}
                selectId="proofTypeSelectEdit"
              />
            </div>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-outline-primary radius-12" onClick={goToStep3} disabled={saving}>
                Next: Submit for approval
              </button>
              <button type="button" className="btn btn-outline-secondary radius-12" onClick={() => setStep(1)}>Back</button>
            </div>
          </ProducerSectionCard>
        </div>
      )}

      {step >= 3 && status === "DRAFT" && (
        <ProducerSectionCard title="Step 3 — Submit for approval">
          <p className="text-muted small mb-3">
            By submitting, you confirm that your factory is verified and proof documents are complete.
          </p>
          <div className="form-check mb-3">
            <input
              id="declarationEdit"
              type="checkbox"
              className="form-check-input"
              checked={ownershipDeclaration}
              onChange={(e) => setOwnershipDeclaration(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="declarationEdit">
              I declare that I have the legal rights to produce this product.
            </label>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-primary radius-12"
              onClick={submitForApproval}
              disabled={saving || !ownershipDeclaration}
            >
              {saving ? <span className="spinner-border spinner-border-sm me-1" /> : <Icon icon="solar:plain-2-outline" className="me-1" />}
              Submit for approval
            </button>
            <button type="button" className="btn btn-outline-secondary radius-12" onClick={() => setStep(2)}>Back</button>
            <Link href={`/producer/products/${id}`} className="btn btn-outline-secondary radius-12">View product</Link>
          </div>
        </ProducerSectionCard>
      )}
    </ProducerPageShell>
  );
}
