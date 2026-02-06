"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import { apiGet, apiPatch } from "@/lib/api";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import StatusChip from "@/src/bpa/admin/components/StatusChip";

export default function MasterCatalogDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    shortName: "",
    barcode: "",
    countryOfOrigin: "",
    shortDescription: "",
    description: "",
    usageInstructions: "",
    storageInstructions: "",
    safetyWarning: "",
    isActive: true,
  });

  async function load() {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const r = await apiGet(`/api/v1/products/master-catalog/${id}`);
      const next = r?.data || null;
      setItem(next);
      if (next) {
        setForm({
          name: next.name || "",
          shortName: next.shortName || "",
          barcode: next.barcode || "",
          countryOfOrigin: next.countryOfOrigin || "",
          shortDescription: next.shortDescription || "",
          description: next.description || "",
          usageInstructions: next.usageInstructions || "",
          storageInstructions: next.storageInstructions || "",
          safetyWarning: next.safetyWarning || "",
          isActive: next.isActive !== false,
        });
      }
    } catch (e) {
      setError(e?.message || "Failed to load master product");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Check if edit mode should be enabled from URL parameter
    if (searchParams?.get("edit") === "true") {
      setIsEditing(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, searchParams]);

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-secondary">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container-fluid">
        <div className="text-secondary">Not found.</div>
      </div>
    );
  }

  const variants = Array.isArray(item.variantsJson) ? item.variantsJson : [];
  const normalizedVariants = Array.isArray(item.variants) ? item.variants : [];
  const variantsToShow = normalizedVariants.length ? normalizedVariants : variants;

  const handleSave = async () => {
    if (!id) return;
    
    // Basic validation
    if (!form.name || form.name.trim() === "") {
      setSaveError("Product name is required");
      return;
    }
    
    setSaving(true);
    setSaveError("");
    setSaveMessage("");
    try {
      const payload = {
        name: form.name.trim() || null,
        shortName: form.shortName?.trim() || null,
        barcode: form.barcode?.trim() || null,
        countryOfOrigin: form.countryOfOrigin?.trim() || null,
        shortDescription: form.shortDescription?.trim() || null,
        description: form.description?.trim() || null,
        usageInstructions: form.usageInstructions?.trim() || null,
        storageInstructions: form.storageInstructions?.trim() || null,
        safetyWarning: form.safetyWarning?.trim() || null,
        isActive: form.isActive,
      };
      const res = await apiPatch(`/api/v1/products/master-catalog/${id}`, payload);
      const updated = res?.data || res;
      setItem(updated);
      setSaveMessage("Master product updated successfully.");
      setIsEditing(false);
      // Reload to get fresh data
      await load();
    } catch (e) {
      setSaveError(e?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid">
      <PageHeader
        title="Master Product Details"
        subtitle={
          <span className="text-secondary" style={{ fontSize: 13 }}>
            ID: {item.id} •{" "}
            <StatusChip status={item.isActive ? "ACTIVE" : "INACTIVE"} /> •{" "}
            {item.isVerified ? (
              <span className="badge bg-success-soft text-success">Verified</span>
            ) : (
              <span className="badge bg-warning-soft text-warning">Unverified</span>
            )}
          </span>
        }
        right={
          <div className="d-flex gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  className="btn btn-success d-flex align-items-center gap-1"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Icon icon="solar:check-circle-bold" />
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setSaveError("");
                    setSaveMessage("");
                    // reset form back to latest item values
                    setForm({
                      name: item.name || "",
                      shortName: item.shortName || "",
                      barcode: item.barcode || "",
                      countryOfOrigin: item.countryOfOrigin || "",
                      shortDescription: item.shortDescription || "",
                      description: item.description || "",
                      usageInstructions: item.usageInstructions || "",
                      storageInstructions: item.storageInstructions || "",
                      safetyWarning: item.safetyWarning || "",
                      isActive: item.isActive !== false,
                    });
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary d-flex align-items-center gap-1"
                onClick={() => setIsEditing(true)}
              >
                <Icon icon="solar:pen-new-square-linear" /> Edit
              </button>
            )}
            <a
              href={`/api/v1/products/master-catalog/${item.id}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline-secondary d-flex align-items-center gap-2"
            >
              <Icon icon="solar:code-2-linear" /> View API JSON
            </a>
            <a href="/admin/products/master-catalog" className="btn btn-light">
              ← Back
            </a>
          </div>
        }
      />

      {isEditing && (
        <div className="alert alert-info mt-2 d-flex align-items-center gap-2" role="alert">
          <Icon icon="solar:info-circle-bold" />
          <span>You are in edit mode. Make your changes and click "Save changes" to update.</span>
        </div>
      )}
      {saveError ? (
        <div className="alert alert-danger mt-2 d-flex align-items-center gap-2" role="alert">
          <Icon icon="solar:close-circle-bold" />
          <span>{saveError}</span>
        </div>
      ) : null}
      {saveMessage ? (
        <div className="alert alert-success mt-2 d-flex align-items-center gap-2" role="alert">
          <Icon icon="solar:check-circle-bold" />
          <span>{saveMessage}</span>
        </div>
      ) : null}

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <SectionCard title="Basic Information">
            {isEditing ? (
              <>
                <EditableField
                  label="Product Name *"
                  value={form.name}
                  onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                  required
                />
                <EditableField
                  label="Short Name"
                  value={form.shortName}
                  onChange={(v) => setForm((f) => ({ ...f, shortName: v }))}
                />
                <EditableField
                  label="Barcode / Global SKU"
                  value={form.barcode}
                  onChange={(v) => setForm((f) => ({ ...f, barcode: v }))}
                />
                <EditableField
                  label="Country of Origin"
                  value={form.countryOfOrigin}
                  onChange={(v) => setForm((f) => ({ ...f, countryOfOrigin: v }))}
                />
                <div className="mb-3" style={{ fontSize: 13 }}>
                  <div className="text-secondary mb-2" style={{ fontSize: 12 }}>
                    Status
                  </div>
                  <div className="form-switch switch-primary d-flex align-items-center gap-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                      id="isActiveSwitch"
                    />
                    <label className="form-check-label line-height-1 fw-medium text-secondary-light" htmlFor="isActiveSwitch">
                      {form.isActive ? "Active" : "Inactive"}
                    </label>
                  </div>
                </div>
                <Field label="Company" value={item.company?.name} />
                <Field label="Brand" value={item.brand?.name} />
                <Field label="Category" value={item.category?.name} />
                <Field label="Source" value={item.sourceType} />
                <Field label="Source Ref" value={item.sourceRef} />
              </>
            ) : (
              <>
                <Field label="Name" value={item.name} />
                <Field label="Short Name" value={item.shortName} />
                <Field label="Barcode / Global SKU" value={item.barcode} />
                <Field label="Country of Origin" value={item.countryOfOrigin} />
                <Field label="Status" value={<StatusChip status={item.isActive ? "ACTIVE" : "INACTIVE"} />} />
                <Field label="Company" value={item.company?.name} />
                <Field label="Brand" value={item.brand?.name} />
                <Field label="Category" value={item.category?.name} />
                <Field label="Source" value={item.sourceType} />
                <Field label="Source Ref" value={item.sourceRef} />
              </>
            )}
          </SectionCard>
        </div>

        <div className="col-12 col-xl-6">
          <SectionCard title="Descriptions">
            {isEditing ? (
              <>
                <EditableField
                  label="Short Description"
                  value={form.shortDescription}
                  onChange={(v) => setForm((f) => ({ ...f, shortDescription: v }))}
                  textarea
                />
                <EditableField
                  label="Description"
                  value={form.description}
                  onChange={(v) => setForm((f) => ({ ...f, description: v }))}
                  textarea
                />
                <EditableField
                  label="Usage Instructions"
                  value={form.usageInstructions}
                  onChange={(v) => setForm((f) => ({ ...f, usageInstructions: v }))}
                  textarea
                />
                <EditableField
                  label="Storage Instructions"
                  value={form.storageInstructions}
                  onChange={(v) => setForm((f) => ({ ...f, storageInstructions: v }))}
                  textarea
                />
                <EditableField
                  label="Safety Warning"
                  value={form.safetyWarning}
                  onChange={(v) => setForm((f) => ({ ...f, safetyWarning: v }))}
                  textarea
                />
              </>
            ) : (
              <>
                <Field label="Short Description" value={item.shortDescription} />
                <Field label="Description" value={item.description} />
                <Field label="Usage Instructions" value={item.usageInstructions} />
                <Field label="Storage Instructions" value={item.storageInstructions} />
                <Field label="Safety Warning" value={item.safetyWarning} />
              </>
            )}
            {Array.isArray(item.bulletPoints) && item.bulletPoints.length > 0 && (
              <div className="mt-2">
                <div className="text-secondary mb-1" style={{ fontSize: 12 }}>
                  Key Benefits
                </div>
                <ul className="mb-0" style={{ fontSize: 13 }}>
                  {item.bulletPoints.map((bp, idx) => (
                    <li key={idx}>{String(bp)}</li>
                  ))}
                </ul>
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      <div className="row g-3 mt-1">
        <div className="col-12 col-xl-6">
          <SectionCard title="Variants">
            {variantsToShow.length === 0 ? (
              <div className="text-secondary" style={{ fontSize: 13 }}>
                No variants defined.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Pack</th>
                      <th>Flavor</th>
                      <th>MRP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variantsToShow.map((v, idx) => (
                      <tr key={`variant-${idx}`}>
                        <td>{v.title || v.variantName || "—"}</td>
                        <td>
                          {v.packSize
                            ? `${v.packSize} ${v.packUnit || ""}`.trim()
                            : v.packUnit || "—"}
                        </td>
                        <td>{v.flavor || v.flavour || "—"}</td>
                        <td>
                          {v.mrp != null
                            ? `৳${v.mrp}`
                            : v.mrp === null || v.mrp === undefined
                            ? "—"
                            : v.mrp}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="col-12 col-xl-6">
          <SectionCard title="Media">
            <div className="d-flex flex-wrap gap-2">
              {item.primaryMedia?.url && (
                <div className="text-center">
                  <div
                    className="mb-1 text-secondary"
                    style={{ fontSize: 11 }}
                  >
                    Primary
                  </div>
                  <img
                    src={item.primaryMedia.url}
                    alt={item.name || "Primary image"}
                    style={{
                      width: 96,
                      height: 96,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}
                  />
                </div>
              )}
              {Array.isArray(item.galleryMedia) && item.galleryMedia.length > 0 && (
                item.galleryMedia.map((gm) => (
                  <img
                    key={gm.id}
                    src={gm.media?.url}
                    alt={item.name || "Gallery image"}
                    style={{
                      width: 72,
                      height: 72,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}
                  />
                ))
              )}
              {!item.primaryMedia?.url &&
                (!item.galleryMedia || item.galleryMedia.length === 0) &&
                item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name || "Image"}
                    style={{
                      width: 96,
                      height: 96,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}
                  />
                )}
              {!item.primaryMedia?.url &&
                (!item.galleryMedia || item.galleryMedia.length === 0) &&
                !item.imageUrl && (
                  <div className="text-secondary" style={{ fontSize: 13 }}>
                    No images attached yet.
                  </div>
                )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  const isReactElement = typeof value === "object" && value !== null && !Array.isArray(value);
  return (
    <div className="d-flex justify-content-between gap-3 py-2" style={{ fontSize: 13 }}>
      <div className="text-secondary" style={{ minWidth: 140 }}>
        {label}
      </div>
      <div className="text-end" style={{ fontWeight: 500, wordBreak: "break-word" }}>
        {isReactElement ? value : String(value ?? "—")}
      </div>
    </div>
  );
}

function EditableField({ label, value, onChange, textarea = false, required = false, type = "text" }) {
  return (
    <div className="mb-3" style={{ fontSize: 13 }}>
      <label className="form-label text-secondary mb-1" style={{ fontSize: 12, fontWeight: 500 }}>
        {label}
        {required && <span className="text-danger ms-1">*</span>}
      </label>
      {textarea ? (
        <textarea
          className="form-control form-control-sm"
          rows={textarea === true ? 3 : textarea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      ) : (
        <input
          type={type}
          className="form-control form-control-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}`}
          required={required}
        />
      )}
    </div>
  );
}


