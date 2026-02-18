"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { ownerGet, ownerPost, ownerPut, ownerUpload } from "@/app/owner/_lib/ownerApi";
import BranchFormStepper from "./BranchFormStepper";
import LocationField from "@/src/components/location/LocationField";
import {
  normalizeLocation,
  withLegacyLocationFields,
  locationValueToAddressJson,
} from "@/src/lib/location/normalizeLocation";
import ImageUploader from "./ImageUploader";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

const normalizeLoc = (loc) => {
  const n = normalizeLocation(loc, "BD");
  return n ? withLegacyLocationFields(n, loc || {}) : loc || { countryCode: "BD" };
};

// Helper to extract array from API response
function pickArray(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.data)) return resp.data;
  if (Array.isArray(resp.items)) return resp.items;
  if (Array.isArray(resp.data?.items)) return resp.data.items;
  return [];
}

export default function BranchForm({
  mode = "create",
  organizationId,
  branchId: branchIdProp,
  onDone,
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(mode === "edit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [branchId, setBranchId] = useState(branchIdProp || null);

  // Branch types
  const [branchTypes, setBranchTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    typeCodes: [],
    branchPhone: "",
    branchEmail: "",
    addressText: "",
    googleMapLink: "",
    managerName: "",
    managerPhone: "",
    location: normalizeLoc({ countryCode: "BD" }),
  });

  // Documents
  const [documents, setDocuments] = useState({
    STORE_FRONT_PHOTO: null,
    SIGNBOARD_PHOTO: null,
    BRANCH_LOGO: null,
    TRADE_LICENSE: null,
    STORE_INSIDE_PHOTO: null,
    OTHER: null,
  });

  /** In edit mode, only hydrate formData once per branchId so user edits are not overwritten by effect re-runs (e.g. Strict Mode). */
  const hydratedBranchIdRef = useRef(null);
  /** Once user edits name or typeCodes, never overwrite them from the load effect. */
  const userEditedStep1Ref = useRef(false);

  // Load branch types
  useEffect(() => {
    let alive = true;
    setTypesLoading(true);
    fetch(`${API_BASE}/api/v1/meta/branch-types`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    })
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        if (!r.ok || !j?.success) throw new Error(j?.message || `Failed (${r.status})`);
        return j.data || [];
      })
      .then((items) => {
        if (!alive) return;
        setBranchTypes(items);
      })
      .catch((e) => {
        if (alive) setError(e.message || "Failed to load branch types");
      })
      .finally(() => {
        if (alive) setTypesLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  // Load existing branch data for edit mode
  useEffect(() => {
    if (mode !== "edit" || !branchIdProp) return;

    const branchKey = String(branchIdProp);
    if (String(hydratedBranchIdRef.current) !== branchKey) {
      userEditedStep1Ref.current = false;
    }

    let alive = true;
    setLoading(true);
    setError("");

    (async () => {
      try {
        let response;
        let branchData;
        
        // Try primary endpoint first
        try {
          response = await ownerGet(`/api/v1/owner/branches/${branchIdProp}`);
          branchData = response?.data || response;
        } catch (e1) {
          // Fallback: try organization-specific endpoint
          console.log("Primary endpoint failed, trying fallback...");
          try {
            response = await ownerGet(`/api/v1/owner/organizations/${organizationId}/branches/${branchIdProp}`);
            branchData = response?.data || response;
          } catch (e2) {
            throw e1; // Throw original error
          }
        }
        
        if (!alive || !branchData) {
          throw new Error("Branch not found");
        }

        console.log("Loaded branch data:", branchData);

        setBranchId(String(branchIdProp));

        // Extract type codes from types array
        const typeCodes = Array.isArray(branchData?.types)
          ? branchData.types.map((t) => t?.type?.code || t?.code).filter(Boolean)
          : [];

        console.log("Extracted type codes:", typeCodes);

        // Extract profile details
        const profile = branchData?.profileDetails || {};
        const branchAddr = branchData?.addressJson || {};
        const profileAddr = profile?.addressJson || {};
        const addr = { ...branchAddr, ...profileAddr };

        const addressText =
          addr?.text ||
          addr?.fullPathText ||
          profile?.addressText ||
          branchData?.addressText ||
          branchData?.address ||
          "";

        const formDataToSet = {
          name: branchData?.name || "",
          typeCodes: typeCodes.length > 0 ? typeCodes : [],
          branchPhone: profile?.branchPhone || branchData?.branchPhone || branchData?.phone || "",
          branchEmail: profile?.branchEmail || branchData?.branchEmail || branchData?.email || "",
          addressText: addressText,
          googleMapLink: profile?.googleMapLink || branchData?.googleMapLink || branchData?.googleMapUrl || "",
          managerName: profile?.managerName || branchData?.managerName || branchData?.manager?.name || "",
          managerPhone: profile?.managerPhone || branchData?.managerPhone || branchData?.manager?.phone || "",
          location: normalizeLoc({
            ...addr,
            kind:
              addr?.kind ||
              (addr?.dhakaAreaId
                ? "DHAKA_AREA"
                : addr?.bdAreaId
                ? "BD_AREA"
                : addr?.latitude
                ? "COORDINATES"
                : "BD_AREA"),
            text: addressText,
            fullPathText: addr?.fullPathText || addressText,
            latitude: profile?.latitude || addr?.latitude || null,
            longitude: profile?.longitude || addr?.longitude || null,
          }),
        };

        console.log("Setting form data:", formDataToSet);
        const branchKey = String(branchIdProp);
        const alreadyHydrated = String(hydratedBranchIdRef.current) === branchKey;
        if (!alreadyHydrated) {
          setFormData((prev) =>
            userEditedStep1Ref.current
              ? { ...formDataToSet, name: prev.name, typeCodes: prev.typeCodes }
              : formDataToSet
          );
          hydratedBranchIdRef.current = branchKey;
        }

        // Load documents
        const profileDocuments = profile?.documents || branchData?.documents || [];
        const documentsByType = {};
        profileDocuments.forEach((doc) => {
          const docType = doc.type || doc.documentType;
          if (docType) {
            documentsByType[docType] = {
              id: doc.id,
              mediaId: doc.mediaId || doc.media?.id,
              url: doc.url || doc.media?.url || doc.media?.fileUrl,
              fileName: doc.fileName || doc.media?.fileName || "Document",
            };
          }
        });

        setDocuments({
          STORE_FRONT_PHOTO: documentsByType.STORE_FRONT_PHOTO || null,
          SIGNBOARD_PHOTO: documentsByType.SIGNBOARD_PHOTO || null,
          BRANCH_LOGO: documentsByType.BRANCH_LOGO || documentsByType.OTHER || null,
          TRADE_LICENSE: documentsByType.TRADE_LICENSE || null,
          STORE_INSIDE_PHOTO: documentsByType.STORE_INSIDE_PHOTO || null,
          OTHER: documentsByType.OTHER || null,
        });
      } catch (e) {
        if (!alive) return;
        console.error("Error loading branch:", e);
        const errorMessage = e.message || "Failed to load branch";
        
        // Check if error is about missing documents - show notice but don't block
        if (errorMessage.includes("Storefront photo") || errorMessage.includes("Signboard photo")) {
          setNotice("Note: Some required documents may be missing. You can add them in Step 3.");
          setError(""); // Don't block the form - allow user to edit and add documents
        } else {
          setError(errorMessage);
        }
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [mode, branchIdProp]);

  // Update form field
  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Toggle branch type
  const toggleType = (code) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.typeCodes) ? prev.typeCodes : [];
      const isSelected = current.includes(code);
      
      if (isSelected && current.length === 1) {
        // Don't allow deselecting the last type
        return prev;
      }
      
      const next = isSelected
        ? current.filter((c) => c !== code)
        : [...current, code];
      
      return { ...prev, typeCodes: next };
    });
  };

  // Handle document upload
  const handleDocumentUpload = async (docType, mediaResult) => {
    if (!branchId) {
      setError("Please complete previous steps first");
      return;
    }

    try {
      setBusy(true);
      setError("");

      // Map UI-only types to API types
      const payloadType = docType === "BRANCH_LOGO" ? "OTHER" : docType;
      const note = docType === "BRANCH_LOGO" ? "Branch Logo" : undefined;

      await ownerPost(`/api/v1/owner/branches/${branchId}/profile/add-document`, {
        type: payloadType,
        mediaId: mediaResult.id,
        note,
        replace: true,
      });

      setDocuments((prev) => ({
        ...prev,
        [docType]: {
          id: mediaResult.id,
          mediaId: mediaResult.id,
          url: mediaResult.url,
          fileName: "Uploaded image",
        },
      }));

      setNotice("Document uploaded successfully!");
      setTimeout(() => setNotice(""), 3000);
    } catch (e) {
      setError(e.message || "Failed to upload document");
    } finally {
      setBusy(false);
    }
  };

  // Handle document delete
  const handleDocumentDelete = (docType) => {
    setDocuments((prev) => ({
      ...prev,
      [docType]: null,
    }));
  };

  // Validation
  const canNext = useMemo(() => {
    if (step === 1) {
      return !!formData.name && formData.typeCodes.length > 0;
    }
    if (step === 2) {
      const loc = formData.location || {};
      const hasLocation =
        !!(loc?.fullPathText || loc?.text || loc?.formattedAddress) ||
        (loc?.countryCode && (loc?.state || loc?.city || loc?.addressLine)) ||
        (loc?.latitude && loc?.longitude);
      return !!formData.addressText && hasLocation;
    }
    if (step === 3) {
      // Storefront and Signboard photos are required
      return !!documents.STORE_FRONT_PHOTO && !!documents.SIGNBOARD_PHOTO;
    }
    return true;
  }, [step, formData, documents]);

  // Save step
  const saveStep = async () => {
    if (!canNext) {
      setError("Please complete all required fields");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      let id = branchId;

      // Step 1: Create/Update basic info
      if (step === 1) {
        if (mode === "create") {
          const response = await ownerPost(`/api/v1/owner/organizations/${organizationId}/branches`, {
            name: formData.name,
            typeCodes: formData.typeCodes,
          });
          id = response?.data?.id || response?.id;
          setBranchId(String(id));
        } else {
          if (!id) {
            setError("Branch ID is missing. Please refresh the page.");
            setBusy(false);
            return;
          }
          const payload = {
            name: String(formData.name || "").trim(),
            typeCodes: Array.isArray(formData.typeCodes) ? formData.typeCodes : [],
          };
          await ownerPut(`/api/v1/owner/branches/${id}`, payload);
        }
      }

      // Step 2: Save location and contact
      if (step === 2 && id) {
        // Build addressJson with proper structure
        const location = formData.location || {};
        const addressJson = {
          ...locationValueToAddressJson(location, { addressText: formData.addressText || "" }),
          kind:
            location.kind ||
            (location.dhakaAreaId
              ? "DHAKA_AREA"
              : location.bdAreaId
              ? "BD_AREA"
              : location.latitude
              ? "COORDINATES"
              : null),
        };

        const payload = {
          branchPhone: formData.branchPhone,
          branchEmail: formData.branchEmail,
          managerName: formData.managerName,
          managerPhone: formData.managerPhone,
          addressJson: addressJson,
          googleMapLink: formData.googleMapLink,
        };
        await ownerPost(`/api/v1/owner/branches/${id}/profile/save-draft`, payload);
      }

      // Step 3: Documents are already saved on upload, just validate
      if (step === 3) {
        if (!documents.STORE_FRONT_PHOTO || !documents.SIGNBOARD_PHOTO) {
          setError("Storefront photo and Signboard photo are required");
          setBusy(false);
          return;
        }
      }

      setNotice("Saved successfully!");
      setTimeout(() => setNotice(""), 3000);

      if (step < 4) {
        setStep(step + 1);
      } else {
        // Final step - submit for verification
        await ownerPost(`/api/v1/owner/branches/${id}/profile/submit`, {});
        setNotice("Branch updated successfully! Redirecting…");
        onDone?.();
      }
    } catch (e) {
      setError(e.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="card radius-12">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="text-muted">Loading branch data...</div>
          {mode === "edit" && branchIdProp && (
            <div className="text-muted mt-2" style={{ fontSize: "12px" }}>
              Branch ID: {branchIdProp}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show error state if there's a critical error in edit mode (but allow form to show if it's just document warning)
  if (error && mode === "edit" && !loading && !error.includes("Storefront photo") && !error.includes("Signboard photo")) {
    return (
      <div className="card radius-12">
        <div className="card-body">
          <div className="alert alert-danger radius-12 mb-3" role="alert">
            <i className="ri-error-warning-line me-2" />
            <strong>Error loading branch:</strong> {error}
          </div>
          <div className="d-flex gap-8 flex-wrap">
            <button
              className="btn btn-primary radius-12"
              onClick={() => {
                setError("");
                setLoading(true);
                // Trigger reload
                window.location.reload();
              }}
            >
              <i className="ri-refresh-line me-1" />
              Retry Loading
            </button>
            <button
              className="btn btn-outline-secondary radius-12"
              onClick={() => {
                setError("");
                // Allow manual editing even if load failed
                setLoading(false);
                setBusy(false);
              }}
            >
              <i className="ri-edit-line me-1" />
              Continue Anyway
            </button>
          </div>
          {branchIdProp && (
            <div className="mt-3 text-muted" style={{ fontSize: "12px" }}>
              <strong>Debug Info:</strong> Branch ID: {branchIdProp}, Mode: {mode}
            </div>
          )}
        </div>
      </div>
    );
  }

  const steps = [
    { number: 1, title: "Basic Info", description: "Branch name and types", icon: "ri-building-2-line" },
    { number: 2, title: "Location", description: "Address and contact", icon: "ri-map-pin-3-line" },
    { number: 3, title: "Documents", description: "Photos and files", icon: "ri-folder-image-line" },
    { number: 4, title: "Review", description: "Confirm and submit", icon: "ri-file-check-line" },
  ];

  return (
    <div className="branch-form">
      {/* Stepper */}
      <div className="card radius-12 mb-24">
        <div className="card-body p-24">
          <BranchFormStepper
            currentStep={step}
            totalSteps={4}
            steps={steps}
            onStepClick={(stepNum) => {
              if (stepNum <= step || (stepNum === step + 1 && canNext)) {
                setStep(stepNum);
              }
            }}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger radius-12 mb-24" role="alert">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      {/* Success Notice */}
      {notice && (
        <div className="alert alert-success radius-12 mb-24" role="alert">
          <i className="ri-checkbox-circle-line me-2" />
          {notice}
        </div>
      )}

      {/* STEP 1: Basic Info — position relative + z-index so inputs are clickable above stepper */}
      {step === 1 && (
        <div className="card radius-12 mb-24" style={{ position: "relative", zIndex: 5, pointerEvents: "auto" }}>
          <div className="card-body p-28" style={{ pointerEvents: "auto" }}>
            <h5 className="mb-20 fw-bold">
              <i className="ri-building-2-line me-2 text-primary"></i>
              Basic Information
            </h5>

            <div className="row g-4">
              <div className="col-md-12">
                <label className="form-label fw-semibold mb-8">
                  Branch Name <span className="text-danger">*</span>
                </label>
                {mode === "edit" ? (
                  <input
                    key={`step1-name-edit-${branchIdProp}-${loading}`}
                    type="text"
                    className="form-control radius-12"
                    defaultValue={formData.name ?? ""}
                    onChange={(e) => {
                      userEditedStep1Ref.current = true;
                      setFormData((p) => ({ ...p, name: e.target.value }));
                    }}
                    onBlur={(e) => setFormData((p) => ({ ...p, name: e.target.value.trim() }))}
                    placeholder="e.g., Rampura Clinic Branch"
                    disabled={busy}
                    autoComplete="off"
                    aria-label="Branch Name"
                  />
                ) : (
                  <input
                    type="text"
                    className="form-control radius-12"
                    value={formData.name ?? ""}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Rampura Clinic Branch"
                    disabled={busy}
                    autoComplete="off"
                    aria-label="Branch Name"
                  />
                )}
              </div>

              <div className="col-md-12" key={`step1-types-${branchIdProp}-${loading}`}>
                <label className="form-label fw-semibold mb-8">
                  Branch Types <span className="text-danger">*</span>
                </label>
                {typesLoading ? (
                  <div className="text-muted">Loading branch types...</div>
                ) : (
                  <div className="row g-3">
                    {branchTypes.map((type) => {
                      const code = type?.code ?? "";
                      const safeId = `branch-type-${String(code).replace(/\s+/g, "-")}-${branchIdProp || "new"}`;
                      const selected = Array.isArray(formData.typeCodes) ? formData.typeCodes : [];
                      const isSelected = selected.includes(code);
                      const isDisabled = busy || (isSelected && selected.length === 1);
                      return (
                        <div key={code} className="col-12 col-md-6">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={!!isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                userEditedStep1Ref.current = true;
                                const next = e.target.checked
                                  ? [...selected, code]
                                  : selected.filter((x) => x !== code);
                                if (next.length === 0) return;
                                setFormData((prev) => ({ ...prev, typeCodes: next }));
                              }}
                              disabled={isDisabled}
                              id={safeId}
                              aria-label={type.nameEn || code}
                            />
                            <label className="form-check-label" htmlFor={safeId}>
                              {type.nameEn}
                              {type.nameBn && <span className="text-muted ms-2">({type.nameBn})</span>}
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <small className="text-muted mt-2 d-block">
                  <i className="ri-information-line me-1" />
                  Select at least one branch type. You can select multiple types.
                </small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Location & Contact */}
      {step === 2 && (
        <div className="card radius-12 mb-24">
          <div className="card-body p-28">
            <h5 className="mb-20 fw-bold">
              <i className="ri-map-pin-3-line me-2 text-primary"></i>
              Location & Contact Information
            </h5>

            {/* Location Picker */}
            <LocationField
              value={formData.location}
              onChange={(next) => {
                const normalized = normalizeLoc(next);
                updateField("location", normalized);
                updateField(
                  "addressText",
                  normalized.fullPathText || normalized.text || formData.addressText
                );
              }}
              label="Business Location"
              defaultCountryCode="BD"
              enableRecent
              enableGPS
              enableMap
              enableBdHierarchy
            />

            <div className="row g-3 mt-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Branch Phone</label>
                <input
                  type="tel"
                  className="form-control radius-12"
                  value={formData.branchPhone}
                  onChange={(e) => updateField("branchPhone", e.target.value)}
                  placeholder="e.g., 017XXXXXXXX"
                  disabled={busy}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Branch Email</label>
                <input
                  type="email"
                  className="form-control radius-12"
                  value={formData.branchEmail}
                  onChange={(e) => updateField("branchEmail", e.target.value)}
                  placeholder="e.g., branch@example.com"
                  disabled={busy}
                />
              </div>

              <div className="col-12">
                <label className="form-label fw-semibold">
                  Branch Address <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control radius-12"
                  rows={3}
                  value={formData.addressText}
                  onChange={(e) => updateField("addressText", e.target.value)}
                  placeholder="House/Road, Area, District, Division"
                  disabled={busy}
                />
              </div>

              <div className="col-12">
                <label className="form-label fw-semibold">Google Map Link</label>
                <input
                  type="url"
                  className="form-control radius-12"
                  value={formData.googleMapLink}
                  onChange={(e) => updateField("googleMapLink", e.target.value)}
                  placeholder="Paste Google Maps URL"
                  disabled={busy}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Manager Name</label>
                <input
                  type="text"
                  className="form-control radius-12"
                  value={formData.managerName}
                  onChange={(e) => updateField("managerName", e.target.value)}
                  placeholder="e.g., Branch Manager"
                  disabled={busy}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Manager Phone</label>
                <input
                  type="tel"
                  className="form-control radius-12"
                  value={formData.managerPhone}
                  onChange={(e) => updateField("managerPhone", e.target.value)}
                  placeholder="e.g., 018XXXXXXXX"
                  disabled={busy}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Documents */}
      {step === 3 && (
        <div className="card radius-12 mb-24">
          <div className="card-body p-28">
            <h5 className="mb-20 fw-bold">
              <i className="ri-folder-image-line me-2 text-primary"></i>
              Documents & Photos
            </h5>
            <p className="text-muted mb-24">
              Upload high-quality images. Storefront and signboard photos are required for verification.
            </p>

            <div className="row g-24">
              <div className="col-12 col-md-6">
                <ImageUploader
                  label="Storefront Photo"
                  value={documents.STORE_FRONT_PHOTO}
                  onChange={(result) => handleDocumentUpload("STORE_FRONT_PHOTO", result)}
                  onDelete={() => handleDocumentDelete("STORE_FRONT_PHOTO")}
                  required
                  help="Clear photo of the branch storefront from outside"
                  disabled={busy || !branchId}
                />
              </div>

              <div className="col-12 col-md-6">
                <ImageUploader
                  label="Signboard Photo"
                  value={documents.SIGNBOARD_PHOTO}
                  onChange={(result) => handleDocumentUpload("SIGNBOARD_PHOTO", result)}
                  onDelete={() => handleDocumentDelete("SIGNBOARD_PHOTO")}
                  required
                  help="Clear photo of the branch signboard with visible name"
                  disabled={busy || !branchId}
                />
              </div>

              <div className="col-12 col-md-6">
                <ImageUploader
                  label="Branch Logo"
                  value={documents.BRANCH_LOGO}
                  onChange={(result) => handleDocumentUpload("BRANCH_LOGO", result)}
                  onDelete={() => handleDocumentDelete("BRANCH_LOGO")}
                  help="Optional: Branch logo or branding image"
                  disabled={busy || !branchId}
                />
              </div>

              <div className="col-12 col-md-6">
                <ImageUploader
                  label="Trade License"
                  value={documents.TRADE_LICENSE}
                  onChange={(result) => handleDocumentUpload("TRADE_LICENSE", result)}
                  onDelete={() => handleDocumentDelete("TRADE_LICENSE")}
                  help="Copy of trade license document"
                  accept="image/*,.pdf"
                  disabled={busy || !branchId}
                />
              </div>

              <div className="col-12 col-md-6">
                <ImageUploader
                  label="Inside Photo"
                  value={documents.STORE_INSIDE_PHOTO}
                  onChange={(result) => handleDocumentUpload("STORE_INSIDE_PHOTO", result)}
                  onDelete={() => handleDocumentDelete("STORE_INSIDE_PHOTO")}
                  help="Optional: Photo of the branch interior"
                  disabled={busy || !branchId}
                />
              </div>

              <div className="col-12 col-md-6">
                <ImageUploader
                  label="Other Document"
                  value={documents.OTHER}
                  onChange={(result) => handleDocumentUpload("OTHER", result)}
                  onDelete={() => handleDocumentDelete("OTHER")}
                  help="Any other relevant document"
                  accept="image/*,.pdf"
                  disabled={busy || !branchId}
                />
              </div>
            </div>

            {!branchId && (
              <div className="alert alert-warning radius-12 mt-24">
                <i className="ri-information-line me-2" />
                Please complete Steps 1 and 2 first to enable document upload.
              </div>
            )}

            <div className="alert alert-info radius-12 mt-24 mb-0">
              <i className="ri-information-line me-2" />
              <strong>Tip:</strong> Clear storefront and readable signboard photos will speed up the approval process.
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Review */}
      {step === 4 && (
        <div className="card radius-12 mb-24">
          <div className="card-body p-28">
            <h5 className="mb-20 fw-bold">
              <i className="ri-file-check-line me-2 text-primary"></i>
              Review & Submit
            </h5>

            <div className="row g-4">
              <div className="col-md-6">
                <div className="p-16 bg-light radius-8">
                  <div className="text-secondary-light mb-4" style={{ fontSize: 12 }}>
                    Branch Name
                  </div>
                  <div className="fw-semibold">{formData.name || "Not provided"}</div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="p-16 bg-light radius-8">
                  <div className="text-secondary-light mb-4" style={{ fontSize: 12 }}>
                    Branch Types
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {formData.typeCodes.map((code) => {
                      const type = branchTypes.find((t) => t.code === code);
                      return (
                        <span key={code} className="badge bg-primary radius-8">
                          {type?.nameEn || code}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="col-12">
                <div className="p-16 bg-light radius-8">
                  <div className="text-secondary-light mb-4" style={{ fontSize: 12 }}>
                    Address
                  </div>
                  <div className="fw-semibold">{formData.addressText || "Not provided"}</div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="p-16 bg-light radius-8">
                  <div className="text-secondary-light mb-4" style={{ fontSize: 12 }}>
                    Branch Phone
                  </div>
                  <div className="fw-semibold">{formData.branchPhone || "Not provided"}</div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="p-16 bg-light radius-8">
                  <div className="text-secondary-light mb-4" style={{ fontSize: 12 }}>
                    Branch Email
                  </div>
                  <div className="fw-semibold">{formData.branchEmail || "Not provided"}</div>
                </div>
              </div>

              {/* Documents Section */}
              <div className="col-12 mt-4">
                <h6 className="mb-16 fw-semibold">
                  <i className="ri-file-image-line me-2 text-primary"></i>
                  Documents & Photos
                </h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className={`p-16 radius-8 border ${documents.STORE_FRONT_PHOTO ? "bg-success-light border-success" : "bg-light border-secondary"}`}>
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <div className="fw-semibold mb-4" style={{ fontSize: 14 }}>
                            Storefront Photo
                          </div>
                          <div className="text-secondary-light" style={{ fontSize: 12 }}>
                            {documents.STORE_FRONT_PHOTO ? (
                              <span className="text-success">
                                <i className="ri-checkbox-circle-line me-1" />
                                Uploaded
                              </span>
                            ) : (
                              <span className="text-danger">
                                <i className="ri-close-circle-line me-1" />
                                Required
                              </span>
                            )}
                          </div>
                        </div>
                        {documents.STORE_FRONT_PHOTO && (
                          <i className="ri-check-line text-success" style={{ fontSize: "24px" }}></i>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className={`p-16 radius-8 border ${documents.SIGNBOARD_PHOTO ? "bg-success-light border-success" : "bg-light border-secondary"}`}>
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <div className="fw-semibold mb-4" style={{ fontSize: 14 }}>
                            Signboard Photo
                          </div>
                          <div className="text-secondary-light" style={{ fontSize: 12 }}>
                            {documents.SIGNBOARD_PHOTO ? (
                              <span className="text-success">
                                <i className="ri-checkbox-circle-line me-1" />
                                Uploaded
                              </span>
                            ) : (
                              <span className="text-danger">
                                <i className="ri-close-circle-line me-1" />
                                Required
                              </span>
                            )}
                          </div>
                        </div>
                        {documents.SIGNBOARD_PHOTO && (
                          <i className="ri-check-line text-success" style={{ fontSize: "24px" }}></i>
                        )}
                      </div>
                    </div>
                  </div>

                  {documents.BRANCH_LOGO && (
                    <div className="col-md-4">
                      <div className="p-16 bg-light radius-8 border">
                        <div className="fw-semibold mb-4" style={{ fontSize: 14 }}>
                          Branch Logo
                        </div>
                        <div className="text-success" style={{ fontSize: 12 }}>
                          <i className="ri-checkbox-circle-line me-1" />
                          Uploaded
                        </div>
                      </div>
                    </div>
                  )}

                  {documents.TRADE_LICENSE && (
                    <div className="col-md-4">
                      <div className="p-16 bg-light radius-8 border">
                        <div className="fw-semibold mb-4" style={{ fontSize: 14 }}>
                          Trade License
                        </div>
                        <div className="text-success" style={{ fontSize: 12 }}>
                          <i className="ri-checkbox-circle-line me-1" />
                          Uploaded
                        </div>
                      </div>
                    </div>
                  )}

                  {documents.STORE_INSIDE_PHOTO && (
                    <div className="col-md-4">
                      <div className="p-16 bg-light radius-8 border">
                        <div className="fw-semibold mb-4" style={{ fontSize: 14 }}>
                          Inside Photo
                        </div>
                        <div className="text-success" style={{ fontSize: 12 }}>
                          <i className="ri-checkbox-circle-line me-1" />
                          Uploaded
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {(!documents.STORE_FRONT_PHOTO || !documents.SIGNBOARD_PHOTO) && (
              <div className="alert alert-warning mt-16 mb-0">
                <i className="ri-error-warning-line me-2" />
                Storefront photo and Signboard photo are required before submission.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="d-flex justify-content-between align-items-center mt-24">
        <button
          className="btn btn-outline-secondary radius-12"
          disabled={busy || step === 1}
          onClick={() => setStep(step - 1)}
        >
          <i className="ri-arrow-left-line me-1" />
          Back
        </button>

        <button
          className="btn btn-primary radius-12"
          disabled={busy || !canNext}
          onClick={saveStep}
        >
          {busy ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Saving...
            </>
          ) : step === 4 ? (
            <>
              <i className="ri-check-line me-1" />
              Submit for Verification
            </>
          ) : (
            <>
              Next <i className="ri-arrow-right-line ms-1" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
