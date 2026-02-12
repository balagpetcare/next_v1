"use client";

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet, apiPut, apiPost } from "../../../lib/api";

import ImageUploadWithCrop from "@/src/components/common/ImageUploadWithCrop";
import { normalizeKycStatus, isApproved } from "../_lib/ownerKycGuard";

const ALLOWED_NAV_STATUSES = ["SUBMITTED", "VERIFIED", "APPROVED", "REQUEST_CHANGES"];

const REQUIRED = [
  { type: "NID_FRONT", label: "NID Front", hint: "Front side of NID (clear & readable)" },
  { type: "NID_BACK", label: "NID Back", hint: "Back side of NID (clear & readable)" },
  { type: "SELFIE_WITH_NID", label: "Selfie with NID", hint: "Hold NID near face; good lighting" },
];
const OPTIONAL_DOCS = [{ type: "TRADE_LICENSE", label: "Trade License", hint: "Optional; speeds up verification" }];

function normStatus(s) {
  return String(s || "UNSUBMITTED").toUpperCase();
}
function isLockedStatus(status) {
  const t = normStatus(status);
  return t === "VERIFIED" || t === "APPROVED" || t === "EXPIRED";
}
function canEdit(status) {
  const t = normStatus(status);
  return t === "UNSUBMITTED" || t === "DRAFT" || t === "SUBMITTED" || t === "REQUEST_CHANGES" || t === "REJECTED";
}

const DEFAULT_CROP_CONFIG = {
  aspectRatio: 1,
  minWidth: 300,
  minHeight: 300,
  allowRotate: true,
  allowZoom: true,
};

const CROP_CONFIG = {
  NID_FRONT: { aspectRatio: 1.6 },
  NID_BACK: { aspectRatio: 1.6 },
  SELFIE_WITH_NID: { aspectRatio: 1 },
  // TRADE_LICENSE চাইলে Free করে দিতে পারেন:
  TRADE_LICENSE: { aspectRatio: null }, // ✅ free crop
};

function getCropConfig(type) {
  const t = String(type || "").toUpperCase();
  return { ...DEFAULT_CROP_CONFIG, ...(CROP_CONFIG[t] || {}) };
}

function Badge({ text }) {
  const t = normStatus(text);
  const cls =
    t === "VERIFIED" || t === "APPROVED"
      ? "bg-success-focus text-success-main"
      : t === "REJECTED" || t === "BLOCKED" || t === "EXPIRED"
      ? "bg-danger-focus text-danger-main"
      : t === "REQUEST_CHANGES"
      ? "bg-warning-focus text-warning-main"
      : t === "SUSPENDED"
      ? "bg-dark text-white"
      : t === "UNSUBMITTED" || t === "DRAFT"
      ? "bg-gray-200 text-gray-800"
      : "bg-primary-50 text-primary-600";
  return <span className={`badge ${cls} radius-16 px-12 py-6 fw-semibold`}>{t}</span>;
}

function Alert({ type = "info", children }) {
  const styles =
    type === "danger"
      ? "border-danger-200 bg-danger-50 text-danger-700"
      : type === "success"
      ? "border-success-200 bg-success-50 text-success-700"
      : type === "warning"
      ? "border-warning-200 bg-warning-focus text-warning-main"
      : "border-gray-200 bg-gray-50 text-gray-700";

  return (
    <div className={`border radius-12 p-12 ${styles}`} style={{ marginBottom: 12 }}>
      {children}
    </div>
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

/**
 * ✅ FIXED getDocUrl:
 * - relative path (no leading slash) handle
 * - cache-bust query (?t=) so upload replace shows immediately
 */
function getDocUrl(doc) {
  const raw = doc?.url || doc?.fileUrl || doc?.publicUrl || doc?.path || "";
  let u = String(raw || "").trim();
  if (!u) return "";

  const cacheBust = `t=${encodeURIComponent(doc?.updatedAt || Date.now())}`;

  // full URL
  if (u.startsWith("http:") || u.startsWith("https:")) {
    return u + (u.includes("?") ? "&" : "?") + cacheBust;
  }

  const base = API_BASE.replace(/\/+$/, "");

  // starts with /
  if (u.startsWith("/")) {
    return `${base}${u}` + (u.includes("?") ? "&" : "?") + cacheBust;
  }

  // relative path like "uploads/.."
  return `${base}/${u}` + (u.includes("?") ? "&" : "?") + cacheBust;
}

function findDoc(docs, type) {
  return (docs || []).find((d) => String(d.type).toUpperCase() === String(type).toUpperCase()) || null;
}

function KycDocCard({ label, hint, type, doc, disabled, loading, uploading, onUpload }) {
  const url = getDocUrl(doc);
  const uploaded = !!url;
  const config = getCropConfig(type);

  return (
    <div className="card border radius-16 h-100">
      <div className="card-body p-16">
        <div className="d-flex align-items-start justify-content-between gap-12">
          <div>
            <div className="fw-semibold">{label}</div>
            <div className="text-sm text-secondary-light">{hint}</div>
          </div>

          <span className={`text-xs fw-semibold ${uploaded ? "text-success-main" : "text-danger-main"}`}>
            {uploaded ? "Uploaded" : "Missing"}
          </span>
        </div>

        <div className="mt-12">
          {uploaded ? (
            <div className="border radius-12 p-12">
              <div className="d-flex gap-12 align-items-start flex-wrap">
                <div
                  className="border radius-12 overflow-hidden bg-light d-flex align-items-center justify-content-center position-relative"
                  style={{ width: 210, height: 130 }}
                >
                  {/* ✅ key={url} + onError: upload পরে show না হলে debug friendly */}
                  <img
                    key={url}
                    src={url}
                    alt={label}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      // hide broken img
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>

                <div style={{ minWidth: 240, flex: 1 }}>
                  <div className="text-sm text-secondary-light mb-8">Uploaded file</div>

                  <div className="d-flex gap-10 flex-wrap">
                    <a className="btn btn-light btn-sm radius-12" href={url} target="_blank" rel="noreferrer">
                      View
                    </a>
                    <a className="btn btn-light btn-sm radius-12" href={url} download>
                      Download
                    </a>
                  </div>

                  <div className="mt-12">
                    <div className="text-sm text-secondary-light mb-8">Actions</div>

                    <ImageUploadWithCrop
                      label="Replace Image"
                      aspectRatio={config.aspectRatio ?? null} // ✅ allow free
                      showOriginalSize={true}
                      existingImageUrl={url}
                      output={{ maxWidth: 1800, maxHeight: 1800, quality: 0.92, mime: "image/jpeg" }}
                      disabled={disabled}
                      onImageCropped={(blob) => {
                        if (blob) onUpload(type, blob);
                      }}
                    />
                  </div>

                  <div className="mt-10 text-xs text-secondary-light">
                    If preview doesn't show, click <b>View</b> to verify the URL (auth/public link issue).
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <ImageUploadWithCrop
                label={`Upload ${label}`}
                aspectRatio={config.aspectRatio ?? null} // ✅ allow free
                showOriginalSize={true}
                output={{ maxWidth: 1800, maxHeight: 1800, quality: 0.92, mime: "image/jpeg" }}
                disabled={disabled}
                onImageCropped={(blob) => {
                  if (blob) onUpload(type, blob);
                }}
              />
              <div className="text-xs text-secondary-light mt-8">Upload clear image. You can crop/rotate before saving.</div>
            </div>
          )}

          {uploading ? <div className="text-xs text-secondary-light mt-8">Uploading...</div> : null}
        </div>
      </div>
    </div>
  );
}

const TOTAL_STEPS = 3;

function Steps({ step, setStep, step2Enabled, step3Enabled }) {
  const progressPct = (step / TOTAL_STEPS) * 100;
  return (
    <div className="card border radius-16 mb-16">
      <div className="card-body p-16">
        <div className="mb-12">
          <div className="d-flex justify-content-between text-sm text-secondary-light mb-6">
            <span>Step {step} of {TOTAL_STEPS}</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="progress radius-12" style={{ height: 8 }}>
            <div
              className="progress-bar bg-primary"
              role="progressbar"
              style={{ width: `${progressPct}%` }}
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-10">
          <div className="d-flex align-items-center gap-10 flex-wrap">
            <button className={`btn ${step === 1 ? "btn-primary" : "btn-light"} radius-12`} onClick={() => setStep(1)} type="button">
              1 Identity
            </button>
            <button
              className={`btn ${step === 2 ? "btn-primary" : "btn-light"} radius-12`}
              onClick={() => {
                if (!step2Enabled) return;
                setStep(2);
              }}
              type="button"
              disabled={!step2Enabled}
            >
              2 Documents
            </button>
            <button
              className={`btn ${step === 3 ? "btn-primary" : "btn-light"} radius-12`}
              onClick={() => {
                if (!step3Enabled) return;
                setStep(3);
              }}
              type="button"
              disabled={!step3Enabled}
            >
              3 Review & Submit
            </button>
          </div>
          <div className="text-sm text-secondary-light">
            {!step2Enabled && "Save Step 1 to unlock Step 2"}
            {step2Enabled && !step3Enabled && "Upload required docs to unlock Review"}
            {step3Enabled && "Complete declarations and submit"}
          </div>
        </div>
      </div>
    </div>
  );
}

function OwnerKycContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectReason = searchParams?.get("reason") ?? "";

  const [loading, setLoading] = useState(false);
  const [kyc, setKyc] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [uploadingType, setUploadingType] = useState(null);
  const [step, setStep] = useState(1);

  const [draft, setDraft] = useState({
    fullName: "",
    mobile: "",
    email: "",
    dateOfBirth: "",
    nationality: "Bangladeshi",
    nidNumber: "",
    presentAddressShort: "",
    country: "",
    division: "",
    city: "",
    latitude: "",
    longitude: "",
  });
  const hasRedirectedApproved = useRef(false);
  const [declarations, setDeclarations] = useState({
    termsAccepted: false,
    dataProcessingConsent: false,
    infoTrueConfirmed: false,
    legalBusinessCategory: false,
  });

  async function load() {
    setErr("");
    setMsg("");
    try {
      const res = await apiGet("/api/v1/owner/kyc");
      const data = res?.data || null;
      setKyc(data);

      if (data) {
        const addr = data.presentAddressJson && typeof data.presentAddressJson === "object" ? data.presentAddressJson : {};
        setDraft({
          fullName: data.fullName || "",
          mobile: data.mobile || "",
          email: data.email || "",
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : "",
          nationality: data.nationality || "Bangladeshi",
          nidNumber: data.nidNumber || "",
          presentAddressShort: addr.text || addr.presentAddressShort || "",
          country: addr.country || "",
          division: addr.division || addr.state || "",
          city: addr.city || "",
          latitude: addr.latitude != null ? String(addr.latitude) : "",
          longitude: addr.longitude != null ? String(addr.longitude) : "",
        });
        const decl = data.declarationsJson && typeof data.declarationsJson === "object" ? data.declarationsJson : {};
        setDeclarations({
          termsAccepted: !!decl.termsAcceptedAt || !!decl.termsAccepted,
          dataProcessingConsent: !!decl.dataProcessingConsentAt || !!decl.dataProcessingConsent,
          infoTrueConfirmed: !!decl.infoTrueConfirmedAt || !!decl.infoTrueConfirmed,
          legalBusinessCategory: !!decl.legalBusinessCategoryAt || !!decl.legalBusinessCategory,
        });
      }
    } catch (e) {
      setErr(e.message || "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const status = normStatus(kyc?.verificationStatus);
  const normalizedStatus = normalizeKycStatus(kyc?.verificationStatus);
  useEffect(() => {
    if (!kyc || !isApproved(normalizedStatus) || hasRedirectedApproved.current) return;
    hasRedirectedApproved.current = true;
    // Only redirect when user has owner access; else layout redirects back → loop
    (async () => {
      try {
        const res = await fetch("/api/v1/auth/me", { credentials: "include" });
        if (!res.ok) return;
        const j = await res.json().catch(() => null);
        if (j?.panels?.owner === true) router.replace("/owner/dashboard");
      } catch {
        // On error, stay on kyc
      }
    })();
  }, [kyc, normalizedStatus, router]);
  const locked = isLockedStatus(status);
  const editable = canEdit(status) && !locked;
  const hasDraft = !!kyc?.id;

  const haveTypes = useMemo(() => {
    const s = new Set((kyc?.documents || []).map((d) => String(d.type).toUpperCase()));
    return s;
  }, [kyc]);

  const missingRequired = useMemo(() => {
    return REQUIRED.filter((r) => !haveTypes.has(String(r.type).toUpperCase())).map((r) => r.type);
  }, [haveTypes]);

  const step2Enabled = hasDraft;
  const step3Enabled = hasDraft && missingRequired.length === 0;

  async function saveDraft({ goNext = false } = {}) {
    if (locked) return;
    setLoading(true);
    setErr("");
    setMsg("");

    try {
      if (!draft.fullName?.trim()) throw new Error("Full name is required.");

      const presentAddressJson = {
        ...(draft.presentAddressShort ? { text: draft.presentAddressShort } : {}),
        ...(draft.country ? { country: draft.country } : {}),
        ...(draft.division ? { division: draft.division } : {}),
        ...(draft.city ? { city: draft.city } : {}),
        ...(draft.latitude !== "" && draft.latitude != null ? { latitude: parseFloat(draft.latitude) } : {}),
        ...(draft.longitude !== "" && draft.longitude != null ? { longitude: parseFloat(draft.longitude) } : {}),
      };
      const res = await apiPut("/api/v1/owner/kyc", {
        fullName: draft.fullName,
        mobile: draft.mobile,
        email: draft.email,
        dateOfBirth: draft.dateOfBirth || undefined,
        nationality: draft.nationality || undefined,
        nidNumber: draft.nidNumber,
        presentAddressJson: Object.keys(presentAddressJson).length ? presentAddressJson : undefined,
      });

      const data = res?.data || null;
      setKyc(data);

      setMsg("Draft saved. You can now upload documents.");
      await load();

      if (goNext) setStep(2);
    } catch (e) {
      setErr(e.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function uploadDoc(type, file, inputEl) {
    if (!file) return;

    if (locked) {
      setErr("KYC is approved/verified. Documents are locked.");
      return;
    }
    if (!editable) {
      setErr("KYC is not editable right now.");
      return;
    }
    if (!kyc?.id) {
      setErr("Please save Step-1 (KYC Information) first.");
      return;
    }

    setLoading(true);
    setUploadingType(type);
    setErr("");
    setMsg("");

    try {
      const base = String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
      const fd = new FormData();
      fd.append("type", type);
      fd.append("file", file);

      const res = await fetch(`${base}/api/v1/owner/kyc/documents`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
        body: fd,
      });

      let payload = null;
      try {
        payload = await res.json();
      } catch {
        const t = await res.text().catch(() => "");
        payload = t ? { message: t } : null;
      }

      if (!res.ok) throw new Error(payload?.message || `Upload failed (${res.status})`);

      setMsg(`Uploaded: ${type}`);
      await load();

      if (inputEl) inputEl.value = "";
    } catch (e) {
      setErr(e.message || "Upload failed");
    } finally {
      setLoading(false);
      setUploadingType(null);
    }
  }

  async function submit() {
    if (locked) return;
    if (!declarations.termsAccepted || !declarations.infoTrueConfirmed) {
      setErr("Please accept the terms and confirm that the information provided is true.");
      return;
    }
    setLoading(true);
    setErr("");
    setMsg("");

    try {
      if (!kyc?.id) throw new Error("Please save KYC Information first.");
      if (missingRequired.length) throw new Error(`Please upload required documents first: ${missingRequired.join(", ")}`);

      const declarationsJson = {
        termsAcceptedAt: declarations.termsAccepted ? new Date().toISOString() : null,
        dataProcessingConsentAt: declarations.dataProcessingConsent ? new Date().toISOString() : null,
        infoTrueConfirmedAt: declarations.infoTrueConfirmed ? new Date().toISOString() : null,
        legalBusinessCategoryAt: declarations.legalBusinessCategory ? new Date().toISOString() : null,
      };
      const res = await apiPost("/api/v1/owner/kyc/submit", { declarationsJson });
      setKyc(res?.data || null);
      setMsg("Submitted for review. You can continue setting up branches and products while we review.");
      await load();
    } catch (e) {
      setErr(e.message || "Submit failed");
    } finally {
      setLoading(false);
    }
  }

  const docNidFront = findDoc(kyc?.documents, "NID_FRONT");
  const docNidBack = findDoc(kyc?.documents, "NID_BACK");
  const docSelfie = findDoc(kyc?.documents, "SELFIE_WITH_NID");

  const docsDisabled = isLockedStatus(status) || loading || !hasDraft;

  const canNavigateAway = ALLOWED_NAV_STATUSES.includes(status);

  return (
    <div className="container-fluid">
      {redirectReason === "kyc_required" && (
        <div className="alert alert-info border-0 radius-12 mb-16" role="status">
          Complete KYC to continue setting up your organization and first branch.
        </div>
      )}
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-12 mb-16">
        <div>
          <h4 className="mb-6">Owner KYC</h4>
          <div className="text-secondary-light text-sm">
            Step 1: Save information. Step 2: Upload documents (crop/edit). After approval, everything becomes read-only.
          </div>
          {canNavigateAway && (
            <div className="mt-10">
              <Link href="/owner/dashboard" className="btn btn-primary btn-sm radius-12">
                Go to Dashboard
              </Link>
            </div>
          )}
        </div>

        <div className="d-flex align-items-center gap-10">
          <div className="text-sm text-secondary-light">Status</div>
          <Badge text={status} />
        </div>
      </div>

      {locked ? (
        <Alert type="success">
          ✅ Your KYC is <b>{status}</b>. Everything is locked (view-only).
        </Alert>
      ) : status === "REJECTED" ? (
        <Alert type="danger">
          <div className="fw-semibold mb-8">KYC was rejected</div>
          {(kyc?.rejectionReason || kyc?.reviewNote) && (
            <div className="mb-8">
              {kyc.rejectionReason && (
                <div>
                  <b>Reason:</b> {kyc.rejectionReason}
                </div>
              )}
              {kyc.reviewNote && (
                <div className="mt-4">
                  <b>Review note:</b> {kyc.reviewNote}
                </div>
              )}
            </div>
          )}
          <div>
            Please update your information or documents and <b>Submit for Review</b> again.
          </div>
        </Alert>
      ) : status === "REQUEST_CHANGES" ? (
        <Alert type="warning">⚠️ Admin requested changes. Update your info/documents and submit again.</Alert>
      ) : status === "SUBMITTED" ? (
        <Alert type="info">
          ⏳ Submitted and under review. You can still update information/documents until approval. Continue setting up branches and products.
        </Alert>
      ) : status === "EXPIRED" ? (
        <Alert type="danger">KYC expired. Business data may be removed. Please contact support if you need to resubmit.</Alert>
      ) : null}

      {err ? <Alert type="danger">{err}</Alert> : null}
      {msg ? <Alert type="success">{msg}</Alert> : null}

      <Steps step={step} setStep={setStep} step2Enabled={step2Enabled} step3Enabled={step3Enabled} />

      {/* STEP 1 */}
      {step === 1 ? (
        <div className="row g-3">
          <div className="col-12 col-xl-8">
            <div className="card border radius-16">
              <div className="card-body p-20">
                <div className="d-flex align-items-start justify-content-between mb-12">
                  <div>
                    <div className="fw-semibold">KYC Information</div>
                    <div className="text-sm text-secondary-light">Keep these details accurate.</div>
                  </div>
                  <span className={`text-xs fw-semibold ${editable ? "text-success-main" : "text-secondary-light"}`}>
                    {editable ? "Editable" : "Read-only"}
                  </span>
                </div>

                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Full name *</label>
                    <input
                      className="form-control"
                      value={draft.fullName}
                      disabled={isLockedStatus(status) || loading}
                      onChange={(e) => setDraft((s) => ({ ...s, fullName: e.target.value }))}
                    />
                  </div>

                  <div className="col-12 col-lg-6">
                    <label className="form-label">Mobile</label>
                    <input
                      className="form-control"
                      value={draft.mobile}
                      disabled={isLockedStatus(status) || loading}
                      onChange={(e) => setDraft((s) => ({ ...s, mobile: e.target.value }))}
                    />
                  </div>

                  <div className="col-12 col-lg-6">
                    <label className="form-label">Email</label>
                    <input
                      className="form-control"
                      value={draft.email}
                      disabled={isLockedStatus(status) || loading}
                      onChange={(e) => setDraft((s) => ({ ...s, email: e.target.value }))}
                    />
                  </div>

                  <div className="col-12 col-lg-6">
                    <label className="form-label">Date of birth</label>
                    <input
                      type="date"
                      className="form-control"
                      value={draft.dateOfBirth}
                      disabled={isLockedStatus(status) || loading}
                      onChange={(e) => setDraft((s) => ({ ...s, dateOfBirth: e.target.value }))}
                    />
                  </div>

                  <div className="col-12 col-lg-6">
                    <label className="form-label">Nationality</label>
                    <select
                      className="form-select"
                      value={draft.nationality}
                      disabled={isLockedStatus(status) || loading}
                      onChange={(e) => setDraft((s) => ({ ...s, nationality: e.target.value }))}
                    >
                      <option value="Bangladeshi">Bangladeshi</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="col-12 col-lg-6">
                    <label className="form-label">NID Number</label>
                    <input
                      className="form-control"
                      value={draft.nidNumber}
                      disabled={isLockedStatus(status) || loading}
                      onChange={(e) => setDraft((s) => ({ ...s, nidNumber: e.target.value }))}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Present address (short)</label>
                    <input
                      className="form-control"
                      placeholder="House/Road, Area, City"
                      value={draft.presentAddressShort}
                      disabled={isLockedStatus(status) || loading}
                      onChange={(e) => setDraft((s) => ({ ...s, presentAddressShort: e.target.value }))}
                    />
                  </div>

                  <div className="col-12 col-lg-6">
                    <label className="form-label">Country</label>
                    <input
                      className="form-control"
                      placeholder="e.g. Bangladesh"
                      value={draft.country}
                      disabled={isLockedStatus(status) || loading}
                      onChange={(e) => setDraft((s) => ({ ...s, country: e.target.value }))}
                    />
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">Division / State</label>
                    <input
                      className="form-control"
                      placeholder="e.g. Dhaka"
                      value={draft.division}
                      disabled={isLockedStatus(status) || loading}
                      onChange={(e) => setDraft((s) => ({ ...s, division: e.target.value }))}
                    />
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">City</label>
                    <input
                      className="form-control"
                      placeholder="City or district"
                      value={draft.city}
                      disabled={isLockedStatus(status) || loading}
                      onChange={(e) => setDraft((s) => ({ ...s, city: e.target.value }))}
                    />
                  </div>
                  <div className="col-12 col-lg-3">
                    <label className="form-label">Latitude (optional)</label>
                    <input
                      className="form-control"
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g. 23.8103"
                      value={draft.latitude}
                      disabled={isLockedStatus(status) || loading}
                      onChange={(e) => setDraft((s) => ({ ...s, latitude: e.target.value }))}
                    />
                  </div>
                  <div className="col-12 col-lg-3">
                    <label className="form-label">Longitude (optional)</label>
                    <input
                      className="form-control"
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g. 90.4125"
                      value={draft.longitude}
                      disabled={isLockedStatus(status) || loading}
                      onChange={(e) => setDraft((s) => ({ ...s, longitude: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="d-flex gap-10 flex-wrap mt-16">
                  <button className="btn btn-dark radius-12" disabled={isLockedStatus(status) || loading} onClick={() => saveDraft({ goNext: false })} type="button">
                    Save Draft
                  </button>

                  <button className="btn btn-primary radius-12" disabled={isLockedStatus(status) || loading} onClick={() => saveDraft({ goNext: true })} type="button">
                    Save & Continue
                  </button>
                </div>

                <div className="mt-12 text-xs text-secondary-light">
                  {hasDraft ? "Draft exists. You can proceed to Documents." : "Save draft to create your KYC record and unlock document upload."}
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-xl-4">
            <div className="card border radius-16">
              <div className="card-body p-20">
                <div className="fw-semibold mb-8">What you’ll need</div>
                <div className="text-sm text-secondary-light">
                  • NID front & back (clear)
                  <br />• Selfie with NID
                  <br />• Correct name & contact details
                </div>
                <div className="border-top mt-12 pt-12 text-xs text-secondary-light">Tip: Use crop/edit in Step 2 to align/rotate images before upload.</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* STEP 2 */}
      {step === 2 ? (
        <div className="row g-3">
          <div className="col-12">
            <div className="card border radius-16">
              <div className="card-body p-20">
                <div className="d-flex align-items-start justify-content-between mb-12 flex-wrap gap-10">
                  <div>
                    <div className="fw-semibold">Documents</div>
                    <div className="text-sm text-secondary-light">Upload clear images. Cropping/editing (move/zoom/rotate) is recommended.</div>
                  </div>

                  <span className={`text-xs fw-semibold ${!docsDisabled ? "text-success-main" : "text-secondary-light"}`}>
                    {locked ? "Locked" : !docsDisabled ? "Editable" : "Read-only"}
                  </span>
                </div>

                {!hasDraft ? <Alert type="warning">Save Step 1 first to enable uploads.</Alert> : null}

                <div className="row g-3">
                  <div className="col-12 col-lg-6">
                    <KycDocCard
                      label="NID Front"
                      hint="Upload NID front side"
                      type="NID_FRONT"
                      doc={docNidFront}
                      disabled={docsDisabled}
                      loading={loading}
                      uploading={uploadingType === "NID_FRONT"}
                      onUpload={uploadDoc}
                    />
                  </div>

                  <div className="col-12 col-lg-6">
                    <KycDocCard
                      label="NID Back"
                      hint="Upload NID back side"
                      type="NID_BACK"
                      doc={docNidBack}
                      disabled={docsDisabled}
                      loading={loading}
                      uploading={uploadingType === "NID_BACK"}
                      onUpload={uploadDoc}
                    />
                  </div>

                  <div className="col-12">
                    <KycDocCard
                      label="Selfie with NID"
                      hint="Selfie holding NID (clear face + readable NID)"
                      type="SELFIE_WITH_NID"
                      doc={docSelfie}
                      disabled={docsDisabled}
                      loading={loading}
                      uploading={uploadingType === "SELFIE_WITH_NID"}
                      onUpload={uploadDoc}
                    />
                  </div>

                  {OPTIONAL_DOCS.map((opt) => (
                    <div key={opt.type} className="col-12 col-lg-6">
                      <KycDocCard
                        label={opt.label}
                        hint={opt.hint}
                        type={opt.type}
                        doc={findDoc(kyc?.documents, opt.type)}
                        disabled={docsDisabled}
                        loading={loading}
                        uploading={uploadingType === opt.type}
                        onUpload={uploadDoc}
                      />
                    </div>
                  ))}
                </div>

                <div className="d-flex align-items-center justify-content-between flex-wrap gap-10 mt-16">
                  <div className="text-xs">
                    {missingRequired.length ? (
                      <span className="text-danger-main">
                        Missing required: <b>{missingRequired.join(", ")}</b>
                      </span>
                    ) : (
                      <span className="text-success-main">All required documents uploaded. Go to Review & Submit.</span>
                    )}
                  </div>

                  <div className="d-flex gap-10 flex-wrap">
                    <button className="btn btn-light radius-12" type="button" onClick={() => setStep(1)}>
                      Back to Identity
                    </button>
                    <button className="btn btn-primary radius-12" type="button" disabled={!step3Enabled || loading} onClick={() => setStep(3)}>
                      Next: Review & Submit
                    </button>
                  </div>
                </div>

                <div className="mt-12 text-xs text-secondary-light">Note: After approval/verification, documents cannot be replaced or deleted.</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* STEP 3 */}
      {step === 3 ? (
        <div className="row g-3">
          <div className="col-12 col-xl-8">
            <div className="card border radius-16">
              <div className="card-body p-20">
                <div className="fw-semibold mb-12">Review & Submit</div>

                <div className="border radius-12 p-16 mb-16 bg-light">
                  <div className="text-sm text-secondary-light mb-8">Identity (Step 1)</div>
                  <div className="mb-6">
                    <b>Name:</b> {draft.fullName || "—"}
                  </div>
                  <div className="mb-6">
                    <b>Mobile:</b> {draft.mobile || "—"}
                  </div>
                  <div className="mb-6">
                    <b>Email:</b> {draft.email || "—"}
                  </div>
                  <div className="mb-6">
                    <b>DOB:</b> {draft.dateOfBirth || "—"}
                  </div>
                  <div className="mb-6">
                    <b>Nationality:</b> {draft.nationality || "—"}
                  </div>
                  <div className="mb-6">
                    <b>NID:</b> {draft.nidNumber || "—"}
                  </div>
                  <div>
                    <b>Address:</b> {draft.presentAddressShort || "—"}
                  </div>
                  <button type="button" className="btn btn-link btn-sm p-0 mt-8" onClick={() => setStep(1)}>
                    Edit
                  </button>
                </div>

                <div className="border radius-12 p-16 mb-16 bg-light">
                  <div className="text-sm text-secondary-light mb-8">Documents (Step 2)</div>
                  <ul className="mb-0">
                    {REQUIRED.map((r) => (
                      <li key={r.type}>
                        {r.label}: {haveTypes.has(r.type) ? "✓ Uploaded" : "✗ Missing"}
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="btn btn-link btn-sm p-0 mt-8" onClick={() => setStep(2)}>
                    Edit
                  </button>
                </div>

                <div className="mb-16">
                  <div className="text-sm text-secondary-light mb-8">Compliance declarations</div>

                  <div className="form-check mb-8">
                    <input
                      id="decl-terms"
                      type="checkbox"
                      className="form-check-input"
                      checked={declarations.termsAccepted}
                      disabled={locked || loading}
                      onChange={(e) => setDeclarations((s) => ({ ...s, termsAccepted: e.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor="decl-terms">
                      I accept the terms and conditions
                    </label>
                  </div>

                  <div className="form-check mb-8">
                    <input
                      id="decl-data"
                      type="checkbox"
                      className="form-check-input"
                      checked={declarations.dataProcessingConsent}
                      disabled={locked || loading}
                      onChange={(e) => setDeclarations((s) => ({ ...s, dataProcessingConsent: e.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor="decl-data">
                      I consent to data processing as per policy
                    </label>
                  </div>

                  <div className="form-check mb-8">
                    <input
                      id="decl-info"
                      type="checkbox"
                      className="form-check-input"
                      checked={declarations.infoTrueConfirmed}
                      disabled={locked || loading}
                      onChange={(e) => setDeclarations((s) => ({ ...s, infoTrueConfirmed: e.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor="decl-info">
                      I confirm the information provided is true
                    </label>
                  </div>

                  <div className="form-check mb-8">
                    <input
                      id="decl-legal"
                      type="checkbox"
                      className="form-check-input"
                      checked={declarations.legalBusinessCategory}
                      disabled={locked || loading}
                      onChange={(e) => setDeclarations((s) => ({ ...s, legalBusinessCategory: e.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor="decl-legal">
                      My business does not involve illegal products or services
                    </label>
                  </div>
                </div>

                <div className="d-flex gap-10 flex-wrap">
                  <button type="button" className="btn btn-light radius-12" onClick={() => setStep(2)}>
                    Back to Documents
                  </button>
                  <button
                    className="btn btn-primary radius-12"
                    disabled={
                      locked ||
                      loading ||
                      !editable ||
                      !hasDraft ||
                      missingRequired.length > 0 ||
                      !declarations.termsAccepted ||
                      !declarations.infoTrueConfirmed
                    }
                    onClick={submit}
                    type="button"
                  >
                    {status === "REJECTED" || status === "REQUEST_CHANGES" ? "Resubmit for Review" : "Submit for Review"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-xl-4">
            <div className="card border radius-16">
              <div className="card-body p-20">
                <div className="fw-semibold mb-8">Setup checklist</div>
                <div className="text-sm text-secondary-light">
                  After submit you can: create first branch, add location, add products (drafts), invite staff. Go live, payouts, and ads unlock after approval.
                </div>
                <Link href="/owner/dashboard" className="btn btn-light radius-12 mt-12 w-100">
                  Open Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function OwnerKycPage() {
  return (
    <Suspense fallback={
      <div className="container-fluid">
        <div className="d-flex align-items-center justify-content-center py-5">
          <span className="spinner-border text-primary" role="status" />
        </div>
      </div>
    }>
      <OwnerKycContent />
    </Suspense>
  );
}
