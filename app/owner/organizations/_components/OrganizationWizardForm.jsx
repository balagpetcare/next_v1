"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import LocationField from "@/src/components/location/LocationField";
import { normalizeLocation, withLegacyLocationFields } from "@/src/lib/location/normalizeLocation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.success) throw new Error(j?.message || `Request failed (${res.status})`);
  return j.data;
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

function Card({ title, subtitle, children, right }) {
  return (
    <div className="card border radius-16 mb-16">
      <div className="card-body p-16">
        <div className="d-flex align-items-start justify-content-between gap-12 flex-wrap mb-12">
          <div>
            <div className="fw-semibold text-black">{title}</div>
            {subtitle ? (
              <div className="text-secondary-light" style={{ fontSize: 13 }}>
                {subtitle}
              </div>
            ) : null}
          </div>
          {right ? <div>{right}</div> : null}
        </div>
        {children}
      </div>
    </div>
  );
}

function StepPill({ idx, title, active, done }) {
  const base = "d-flex align-items-center gap-8";
  const circleCls = done
    ? "bg-success-main text-white"
    : active
    ? "bg-primary-600 text-white"
    : "bg-gray-100 text-gray-700";
  const textCls = active ? "text-black" : "text-secondary-light";
  return (
    <div className={base}>
      <div
        className={`radius-16 d-flex align-items-center justify-content-center ${circleCls}`}
        style={{ width: 28, height: 28, fontWeight: 700, fontSize: 13 }}
      >
        {done ? "✓" : idx}
      </div>
      <div className={textCls} style={{ fontWeight: 600, fontSize: 13 }}>
        {title}
      </div>
    </div>
  );
}

function validateEmail(email) {
  if (!email) return null;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) ? null : "Invalid email format";
}

function validatePhone(phone) {
  if (!phone) return null;
  const re = /^[0-9]{10,15}$/;
  return re.test(String(phone).replace(/[\s\-+()]/g, "")) ? null : "Invalid phone number (10-15 digits)";
}

function validateURL(url) {
  if (!url) return null;
  try {
    new URL(url);
    return null;
  } catch {
    return "Invalid URL format";
  }
}

function validateDateRange(issueDate, expiryDate) {
  if (!issueDate || !expiryDate) return null;
  const issue = new Date(issueDate);
  const expiry = new Date(expiryDate);
  return expiry > issue ? null : "Expiry date must be after issue date";
}

const DEFAULT_STATE = {
  basic: {
    name: "",
    orgTypeCode: "",
    supportPhone: "",
    supportEmail: "",
    whatsappNumber: "",
    alternatePhone: "",
    addressText: "",
  },
  location: { countryCode: "BD" },
  legal: {
    registrationType: "PROPRIETORSHIP",
    tradeLicenseNumber: "",
    tradeLicenseIssueDate: "",
    tradeLicenseExpiryDate: "",
    issuingAuthority: "",
    tinNumber: "",
    binNumber: "",
    officialEmail: "",
    officialPhone: "",
    website: "",
    facebookPage: "",
    bankAccountName: "",
    bankAccountNumber: "",
    bankName: "",
    bankBranchName: "",
    routingNumber: "",
    payoutBkash: "",
    payoutNagad: "",
    payoutRocket: "",
  },
  directors: [{ name: "", role: "Owner", mobile: "", email: "" }],
  typeSpecific: {},
  docs: { TRADE_LICENSE: null },
};

export default function OrganizationWizardForm({
  title,
  subtitle,
  badge,
  status,
  hydrateToken,
  initialState,
  locationHelperText,
  readOnly = false,
  onSaveDraft,
  onSubmit,
  onUploadTradeLicense,
}) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [fieldErrors, setFieldErrors] = useState({});

  const [basic, setBasic] = useState(DEFAULT_STATE.basic);
  const [location, setLocation] = useState(() =>
    withLegacyLocationFields(
      normalizeLocation(DEFAULT_STATE.location, "BD") || { countryCode: "BD" },
      DEFAULT_STATE.location
    )
  );
  const [legal, setLegal] = useState(DEFAULT_STATE.legal);
  const [directors, setDirectors] = useState(DEFAULT_STATE.directors);
  const [typeSpecific, setTypeSpecific] = useState(DEFAULT_STATE.typeSpecific);
  const [docs, setDocs] = useState(DEFAULT_STATE.docs);

  const [orgTypes, setOrgTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState("");

  useEffect(() => {
    (async () => {
      setTypesLoading(true);
      setTypesError("");
      try {
        const rows = await apiGet("/api/v1/meta/organization-types");
        setOrgTypes(Array.isArray(rows) ? rows : []);
      } catch (e) {
        setTypesError(e?.message || "Failed to load organization types");
        setOrgTypes([]);
      } finally {
        setTypesLoading(false);
      }
    })();
  }, []);

  const normalizeLoc = useCallback((loc) => {
    const n = normalizeLocation(loc, "BD");
    return n ? withLegacyLocationFields(n, loc || {}) : loc || {};
  }, []);

  useEffect(() => {
    const s = initialState || DEFAULT_STATE;
    setBasic({ ...DEFAULT_STATE.basic, ...(s.basic || {}) });
    setLocation(normalizeLoc(s.location || DEFAULT_STATE.location));
    setLegal({ ...DEFAULT_STATE.legal, ...(s.legal || {}) });
    setDirectors(
      Array.isArray(s.directors) && s.directors.length ? s.directors : DEFAULT_STATE.directors
    );
    setTypeSpecific({ ...(s.typeSpecific || {}) });
    setDocs({ ...DEFAULT_STATE.docs, ...(s.docs || {}) });
    setFieldErrors({});
    setError("");
    setOk("");
    setStep(1);
  }, [hydrateToken]);

  useEffect(() => {
    if (basic?.orgTypeCode) return;
    if (!typesLoading && !typesError && Array.isArray(orgTypes) && orgTypes.length) {
      setBasic((p) => ({ ...p, orgTypeCode: p.orgTypeCode || orgTypes[0]?.code || "" }));
    }
  }, [typesLoading, typesError, orgTypes, basic?.orgTypeCode]);

  function setBasicField(k, v) {
    setBasic((p) => ({ ...p, [k]: v }));
    if (fieldErrors[k]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
    }
    if (k === "supportEmail" && v) {
      const err = validateEmail(v);
      if (err) setFieldErrors((prev) => ({ ...prev, [k]: err }));
    }
    if ((k === "supportPhone" || k === "whatsappNumber" || k === "alternatePhone") && v) {
      const err = validatePhone(v);
      if (err) setFieldErrors((prev) => ({ ...prev, [k]: err }));
    }
  }

  function setLegalField(k, v) {
    setLegal((p) => ({ ...p, [k]: v }));
    if (fieldErrors[k]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
    }
    if (k === "officialEmail" && v) {
      const err = validateEmail(v);
      if (err) setFieldErrors((prev) => ({ ...prev, [k]: err }));
    }
    if (k === "officialPhone" && v) {
      const err = validatePhone(v);
      if (err) setFieldErrors((prev) => ({ ...prev, [k]: err }));
    }
    if ((k === "website" || k === "facebookPage") && v) {
      const err = validateURL(v);
      if (err) setFieldErrors((prev) => ({ ...prev, [k]: err }));
    }
    if (k === "tradeLicenseIssueDate" || k === "tradeLicenseExpiryDate") {
      const err = validateDateRange(
        legal.tradeLicenseIssueDate || (k === "tradeLicenseIssueDate" ? v : ""),
        legal.tradeLicenseExpiryDate || (k === "tradeLicenseExpiryDate" ? v : "")
      );
      if (err) setFieldErrors((prev) => ({ ...prev, tradeLicenseDateRange: err }));
      else {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.tradeLicenseDateRange;
          return next;
        });
      }
    }
    if ((k === "payoutBkash" || k === "payoutNagad" || k === "payoutRocket") && v) {
      const err = validatePhone(v);
      if (err) setFieldErrors((prev) => ({ ...prev, [k]: err }));
    }
  }

  const canNext = useMemo(() => {
    if (step === 1) return !!basic.name && !!basic.supportPhone && !!basic.orgTypeCode && !!(location?.fullPathText || location?.text);
    if (step === 2) return !!legal.tradeLicenseNumber;
    if (step === 3) return !!docs.TRADE_LICENSE;
    return true;
  }, [step, basic, legal, docs, location]);

  async function handleSaveDraft() {
    if (readOnly) return;
    setError("");
    setOk("");
    setBusy(true);
    try {
      const msg = await onSaveDraft?.({ basic, location, legal, directors, typeSpecific, docs });
      setOk(msg || "Draft saved.");
    } catch (e) {
      setError(e?.message || "Failed to save draft");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (readOnly) return;
    setError("");
    setOk("");
    setBusy(true);
    try {
      const msg = await onSubmit?.({ basic, location, legal, directors, typeSpecific, docs });
      if (msg) setOk(msg);
    } catch (e) {
      setError(e?.message || "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleTradeLicenseUpload(file) {
    if (readOnly || !file) return;
    setError("");
    setOk("");
    setBusy(true);
    try {
      const next = await onUploadTradeLicense?.(file, { basic, location, legal, directors, typeSpecific, docs });
      setDocs({ TRADE_LICENSE: { fileName: next?.fileName || file.name, fileId: next?.fileId } });
      setOk("Trade license uploaded.");
    } catch (e) {
      setError(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-start justify-content-between gap-12 flex-wrap mt-12 mb-12">
        <div>
          <div className="d-flex align-items-center gap-8 flex-wrap">
            <h4 className="mb-0">{title}</h4>
            {badge ? (
              <span className="badge bg-primary-50 text-primary-600 radius-16 px-12 py-6 fw-semibold">{badge}</span>
            ) : null}
            {status ? (
              <span className="badge bg-gray-50 text-gray-700 radius-16 px-12 py-6 fw-semibold">
                Status: {status}
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <div className="text-secondary-light" style={{ fontSize: 13 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>

      {readOnly ? (
        <Alert type="warning">This organization is locked for editing.</Alert>
      ) : null}

      {error ? <Alert type="danger">{error}</Alert> : null}
      {ok ? <Alert type="success">{ok}</Alert> : null}

      <div className="card border radius-16 mb-16">
        <div className="card-body p-16">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-12">
            <div className="text-secondary-light" style={{ fontSize: 13 }}>
              Step {step} of 4
            </div>
            <div className="d-flex align-items-center gap-16 flex-wrap">
              <StepPill idx={1} title="Business" active={step === 1} done={step > 1} />
              <StepPill idx={2} title="Legal" active={step === 2} done={step > 2} />
              <StepPill idx={3} title="Documents" active={step === 3} done={step > 3} />
              <StepPill idx={4} title="Review" active={step === 4} done={false} />
            </div>
          </div>

          <div className="progress mt-12" style={{ height: 8 }}>
            <div className="progress-bar" role="progressbar" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        </div>
      </div>

      {step === 1 ? (
        <Card title="Business Information" subtitle="Basic organization info">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Organization Name *</label>
              <input
                className="form-control"
                value={basic.name}
                onChange={(e) => setBasicField("name", e.target.value)}
                placeholder="e.g., Community Pet Clinic"
                disabled={busy || readOnly}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Organization Type *</label>
              <select
                className="form-select"
                value={basic.orgTypeCode}
                onChange={(e) => setBasicField("orgTypeCode", e.target.value)}
                disabled={typesLoading || !!typesError || busy || readOnly}
              >
                {typesLoading ? <option value="">Loading...</option> : null}
                {!typesLoading && !typesError && orgTypes.length === 0 ? <option value="">No types found</option> : null}
                {!typesLoading && !typesError
                  ? orgTypes.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.nameEn || t.label}
                      </option>
                    ))
                  : null}
              </select>
              {typesError ? (
                <div className="text-danger mt-1" style={{ fontSize: 12 }}>
                  {typesError}
                </div>
              ) : null}
              {!typesLoading && !typesError ? (
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Loaded from seeded types in the database.
                </div>
              ) : null}
            </div>
            <div className="col-md-6">
              <label className="form-label">Support Phone *</label>
              <input
                className="form-control"
                value={basic.supportPhone}
                onChange={(e) => setBasicField("supportPhone", e.target.value)}
                placeholder="e.g., 017XXXXXXXX"
                disabled={busy || readOnly}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Support Email</label>
              <input
                type="email"
                className={`form-control ${fieldErrors.supportEmail ? "is-invalid" : ""}`}
                value={basic.supportEmail}
                onChange={(e) => setBasicField("supportEmail", e.target.value)}
                placeholder="e.g., support@example.com"
                disabled={busy || readOnly}
              />
              {fieldErrors.supportEmail && <div className="invalid-feedback">{fieldErrors.supportEmail}</div>}
            </div>
            <div className="col-md-4">
              <label className="form-label">WhatsApp Number</label>
              <input
                className={`form-control ${fieldErrors.whatsappNumber ? "is-invalid" : ""}`}
                value={basic.whatsappNumber}
                onChange={(e) => setBasicField("whatsappNumber", e.target.value)}
                placeholder="e.g., 017XXXXXXXX"
                disabled={busy || readOnly}
              />
              {fieldErrors.whatsappNumber && <div className="invalid-feedback">{fieldErrors.whatsappNumber}</div>}
            </div>
            <div className="col-md-4">
              <label className="form-label">Alternate Phone</label>
              <input
                className={`form-control ${fieldErrors.alternatePhone ? "is-invalid" : ""}`}
                value={basic.alternatePhone}
                onChange={(e) => setBasicField("alternatePhone", e.target.value)}
                placeholder="e.g., 019XXXXXXXX"
                disabled={busy || readOnly}
              />
              {fieldErrors.alternatePhone && <div className="invalid-feedback">{fieldErrors.alternatePhone}</div>}
            </div>

            <div className="col-12 mt-3">
              <LocationField
                value={location}
                onChange={(next) => setLocation(normalizeLoc(next))}
                label="Business Location"
                defaultCountryCode="BD"
                enableRecent
                enableGPS
                enableMap
                enableBdHierarchy
              />
              {locationHelperText ? (
                <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                  {locationHelperText}
                </div>
              ) : null}
            </div>

            <div className="col-12">
              <label className="form-label">Office Address</label>
              <textarea
                className="form-control"
                rows={3}
                value={basic.addressText}
                onChange={(e) => setBasicField("addressText", e.target.value)}
                placeholder="House/Road, Area, District, Division"
                disabled={busy || readOnly}
              />
            </div>

            {basic.orgTypeCode ? (
              <div className="col-12 mt-4">
                <div className="border-top pt-3">
                  <h6 className="fw-semibold mb-3">
                    {basic.orgTypeCode === "CLINIC"
                      ? "Clinic Information"
                      : basic.orgTypeCode === "PET_SHOP"
                      ? "Pet Shop Information"
                      : basic.orgTypeCode === "ONLINE_HUB"
                      ? "Online Hub Information"
                      : "Additional Information"}
                  </h6>
                  {basic.orgTypeCode === "CLINIC" ? (
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Vet License Number</label>
                        <input
                          className="form-control"
                          value={typeSpecific.vetLicenseNumber || ""}
                          onChange={(e) => setTypeSpecific({ ...typeSpecific, vetLicenseNumber: e.target.value })}
                          placeholder="Veterinary license number"
                          disabled={busy || readOnly}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Emergency Contact</label>
                        <input
                          className="form-control"
                          value={typeSpecific.emergencyContact || ""}
                          onChange={(e) => setTypeSpecific({ ...typeSpecific, emergencyContact: e.target.value })}
                          placeholder="Emergency contact number"
                          disabled={busy || readOnly}
                        />
                      </div>
                      <div className="col-md-12">
                        <label className="form-label">Specializations</label>
                        <input
                          className="form-control"
                          value={typeSpecific.specializations || ""}
                          onChange={(e) => setTypeSpecific({ ...typeSpecific, specializations: e.target.value })}
                          placeholder="e.g., Surgery, Vaccination, Grooming"
                          disabled={busy || readOnly}
                        />
                      </div>
                      <div className="col-md-12">
                        <label className="form-label">Services Offered</label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={typeSpecific.services || ""}
                          onChange={(e) => setTypeSpecific({ ...typeSpecific, services: e.target.value })}
                          placeholder="List services offered (one per line)"
                          disabled={busy || readOnly}
                        />
                      </div>
                    </div>
                  ) : basic.orgTypeCode === "PET_SHOP" ? (
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Store Hours</label>
                        <input
                          className="form-control"
                          value={typeSpecific.storeHours || ""}
                          onChange={(e) => setTypeSpecific({ ...typeSpecific, storeHours: e.target.value })}
                          placeholder="e.g., 9 AM - 9 PM"
                          disabled={busy || readOnly}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Delivery Available</label>
                        <select
                          className="form-select"
                          value={typeSpecific.deliveryAvailable || ""}
                          onChange={(e) => setTypeSpecific({ ...typeSpecific, deliveryAvailable: e.target.value })}
                          disabled={busy || readOnly}
                        >
                          <option value="">Select...</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                      <div className="col-md-12">
                        <label className="form-label">Product Categories Focus</label>
                        <input
                          className="form-control"
                          value={typeSpecific.productCategories || ""}
                          onChange={(e) => setTypeSpecific({ ...typeSpecific, productCategories: e.target.value })}
                          placeholder="e.g., Food, Toys, Accessories"
                          disabled={busy || readOnly}
                        />
                      </div>
                      <div className="col-md-12">
                        <label className="form-label">Online Store URL</label>
                        <input
                          className="form-control"
                          value={typeSpecific.onlineStoreUrl || ""}
                          onChange={(e) => setTypeSpecific({ ...typeSpecific, onlineStoreUrl: e.target.value })}
                          placeholder="e.g., https://shop.example.com"
                          disabled={busy || readOnly}
                        />
                      </div>
                    </div>
                  ) : basic.orgTypeCode === "ONLINE_HUB" ? (
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Platform Website</label>
                        <input
                          className="form-control"
                          value={typeSpecific.platformUrl || ""}
                          onChange={(e) => setTypeSpecific({ ...typeSpecific, platformUrl: e.target.value })}
                          placeholder="Main platform URL"
                          disabled={busy || readOnly}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Social Media Links</label>
                        <input
                          className="form-control"
                          value={typeSpecific.socialMedia || ""}
                          onChange={(e) => setTypeSpecific({ ...typeSpecific, socialMedia: e.target.value })}
                          placeholder="Comma-separated URLs"
                          disabled={busy || readOnly}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Delivery Coverage Areas</label>
                        <input
                          className="form-control"
                          value={typeSpecific.deliveryCoverage || ""}
                          onChange={(e) => setTypeSpecific({ ...typeSpecific, deliveryCoverage: e.target.value })}
                          placeholder="e.g., Dhaka, Chittagong"
                          disabled={busy || readOnly}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Minimum Order Value (BDT)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={typeSpecific.minOrderValue || ""}
                          onChange={(e) => setTypeSpecific({ ...typeSpecific, minOrderValue: e.target.value })}
                          placeholder="0"
                          disabled={busy || readOnly}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Delivery Charge (BDT)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={typeSpecific.deliveryCharge || ""}
                          onChange={(e) => setTypeSpecific({ ...typeSpecific, deliveryCharge: e.target.value })}
                          placeholder="0"
                          disabled={busy || readOnly}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card title="Legal & Tax Information" subtitle="Trade license is required">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Registration Type *</label>
              <select
                className="form-select"
                value={legal.registrationType}
                onChange={(e) => setLegalField("registrationType", e.target.value)}
                disabled={busy || readOnly}
              >
                <option value="PROPRIETORSHIP">Proprietorship</option>
                <option value="PARTNERSHIP">Partnership</option>
                <option value="LIMITED_COMPANY">Limited Company</option>
                <option value="NGO">NGO</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Trade License Number *</label>
              <input
                className="form-control"
                value={legal.tradeLicenseNumber}
                onChange={(e) => setLegalField("tradeLicenseNumber", e.target.value)}
                placeholder="e.g., TR-123456"
                disabled={busy || readOnly}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Issue Date</label>
              <input
                type="date"
                className={`form-control ${fieldErrors.tradeLicenseDateRange ? "is-invalid" : ""}`}
                value={legal.tradeLicenseIssueDate}
                onChange={(e) => setLegalField("tradeLicenseIssueDate", e.target.value)}
                disabled={busy || readOnly}
              />
              {fieldErrors.tradeLicenseDateRange && <div className="invalid-feedback">{fieldErrors.tradeLicenseDateRange}</div>}
            </div>
            <div className="col-md-3">
              <label className="form-label">Expiry Date</label>
              <input
                type="date"
                className={`form-control ${fieldErrors.tradeLicenseDateRange ? "is-invalid" : ""}`}
                value={legal.tradeLicenseExpiryDate}
                onChange={(e) => setLegalField("tradeLicenseExpiryDate", e.target.value)}
                disabled={busy || readOnly}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Issuing Authority</label>
              <input
                className="form-control"
                value={legal.issuingAuthority}
                onChange={(e) => setLegalField("issuingAuthority", e.target.value)}
                placeholder="e.g., Dhaka City Corporation"
                disabled={busy || readOnly}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">TIN Number</label>
              <input
                className="form-control"
                value={legal.tinNumber}
                onChange={(e) => setLegalField("tinNumber", e.target.value)}
                placeholder="e.g., 1234567890"
                disabled={busy || readOnly}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">BIN Number</label>
              <input
                className="form-control"
                value={legal.binNumber}
                onChange={(e) => setLegalField("binNumber", e.target.value)}
                placeholder="e.g., 123456789-0001"
                disabled={busy || readOnly}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Official Phone</label>
              <input
                className="form-control"
                value={legal.officialPhone}
                onChange={(e) => setLegalField("officialPhone", e.target.value)}
                placeholder="e.g., 017XXXXXXXX"
                disabled={busy || readOnly}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Official Email</label>
              <input
                type="email"
                className="form-control"
                value={legal.officialEmail}
                onChange={(e) => setLegalField("officialEmail", e.target.value)}
                placeholder="e.g., office@example.com"
                disabled={busy || readOnly}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Website</label>
              <input
                className="form-control"
                value={legal.website}
                onChange={(e) => setLegalField("website", e.target.value)}
                placeholder="e.g., https://example.com"
                disabled={busy || readOnly}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Facebook Page</label>
              <input
                className="form-control"
                value={legal.facebookPage}
                onChange={(e) => setLegalField("facebookPage", e.target.value)}
                placeholder="e.g., https://facebook.com/yourpage"
                disabled={busy || readOnly}
              />
            </div>

            <div className="col-12 mt-4">
              <div className="border-top pt-3">
                <h6 className="fw-semibold mb-3">Bank Account Information</h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Account Name</label>
                    <input
                      className="form-control"
                      value={legal.bankAccountName}
                      onChange={(e) => setLegalField("bankAccountName", e.target.value)}
                      placeholder="Account holder name"
                      disabled={busy || readOnly}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Account Number</label>
                    <input
                      className="form-control"
                      value={legal.bankAccountNumber}
                      onChange={(e) => setLegalField("bankAccountNumber", e.target.value)}
                      placeholder="Bank account number"
                      disabled={busy || readOnly}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Bank Name</label>
                    <input
                      className="form-control"
                      value={legal.bankName}
                      onChange={(e) => setLegalField("bankName", e.target.value)}
                      placeholder="e.g., Sonali Bank"
                      disabled={busy || readOnly}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Branch Name</label>
                    <input
                      className="form-control"
                      value={legal.bankBranchName}
                      onChange={(e) => setLegalField("bankBranchName", e.target.value)}
                      placeholder="Branch name"
                      disabled={busy || readOnly}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Routing Number</label>
                    <input
                      className="form-control"
                      value={legal.routingNumber}
                      onChange={(e) => setLegalField("routingNumber", e.target.value)}
                      placeholder="Bank routing number"
                      disabled={busy || readOnly}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 mt-4">
              <div className="border-top pt-3">
                <h6 className="fw-semibold mb-3">Payment/Payout Methods</h6>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">bKash Number</label>
                    <input
                      className={`form-control ${fieldErrors.payoutBkash ? "is-invalid" : ""}`}
                      value={legal.payoutBkash}
                      onChange={(e) => setLegalField("payoutBkash", e.target.value)}
                      placeholder="e.g., 017XXXXXXXX"
                      disabled={busy || readOnly}
                    />
                    {fieldErrors.payoutBkash && <div className="invalid-feedback">{fieldErrors.payoutBkash}</div>}
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Nagad Number</label>
                    <input
                      className={`form-control ${fieldErrors.payoutNagad ? "is-invalid" : ""}`}
                      value={legal.payoutNagad}
                      onChange={(e) => setLegalField("payoutNagad", e.target.value)}
                      placeholder="e.g., 017XXXXXXXX"
                      disabled={busy || readOnly}
                    />
                    {fieldErrors.payoutNagad && <div className="invalid-feedback">{fieldErrors.payoutNagad}</div>}
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Rocket Number</label>
                    <input
                      className={`form-control ${fieldErrors.payoutRocket ? "is-invalid" : ""}`}
                      value={legal.payoutRocket}
                      onChange={(e) => setLegalField("payoutRocket", e.target.value)}
                      placeholder="e.g., 017XXXXXXXX"
                      disabled={busy || readOnly}
                    />
                    {fieldErrors.payoutRocket && <div className="invalid-feedback">{fieldErrors.payoutRocket}</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card title="Documents & Directors" subtitle="Upload trade license and add directors/partners (if applicable)">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Trade License Document *</label>
              <input type="file" className="form-control" onChange={(e) => e.target.files?.[0] && handleTradeLicenseUpload(e.target.files[0])} disabled={busy || readOnly} />
              <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                {docs.TRADE_LICENSE ? `Uploaded: ${docs.TRADE_LICENSE.fileName}` : "Not uploaded"}
              </div>
            </div>

            <div className="col-12">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="fw-semibold">Directors / Partners</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    Add at least one responsible person
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => setDirectors((p) => [...p, { name: "", role: "Director", mobile: "", email: "" }])}
                  disabled={busy || readOnly}
                >
                  Add Person
                </button>
              </div>

              <div className="mt-2">
                {directors.map((d, idx) => (
                  <div className="border rounded p-3 mb-2" key={idx}>
                    <div className="row g-2">
                      <div className="col-md-4">
                        <label className="form-label">Name *</label>
                        <input
                          className="form-control"
                          value={d.name}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDirectors((p) => p.map((x, i) => (i === idx ? { ...x, name: v } : x)));
                          }}
                          disabled={busy || readOnly}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Role</label>
                        <input
                          className="form-control"
                          value={d.role}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDirectors((p) => p.map((x, i) => (i === idx ? { ...x, role: v } : x)));
                          }}
                          disabled={busy || readOnly}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Mobile</label>
                        <input
                          className="form-control"
                          value={d.mobile}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDirectors((p) => p.map((x, i) => (i === idx ? { ...x, mobile: v } : x)));
                          }}
                          disabled={busy || readOnly}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">Email</label>
                        <input
                          className="form-control"
                          value={d.email}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDirectors((p) => p.map((x, i) => (i === idx ? { ...x, email: v } : x)));
                          }}
                          disabled={busy || readOnly}
                        />
                      </div>
                    </div>
                    {directors.length > 1 ? (
                      <div className="text-end mt-2">
                        <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setDirectors((p) => p.filter((_, i) => i !== idx))} disabled={busy || readOnly}>
                          Remove
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card title="Review & Submit" subtitle="Confirm information before submitting">
          <div className="row g-3">
            <div className="col-12">
              <h6 className="fw-semibold mb-3">Business Information</h6>
            </div>
            <div className="col-md-6">
              <div className="text-muted" style={{ fontSize: 12 }}>
                Organization Name
              </div>
              <div className="fw-semibold">{basic.name || "-"}</div>
            </div>
            <div className="col-md-6">
              <div className="text-muted" style={{ fontSize: 12 }}>
                Organization Type
              </div>
              <div className="fw-semibold">
                {basic.orgTypeCode ? (orgTypes.find((x) => x.code === basic.orgTypeCode)?.nameEn || basic.orgTypeCode) : "-"}
              </div>
            </div>
            <div className="col-md-4">
              <div className="text-muted" style={{ fontSize: 12 }}>
                Support Phone
              </div>
              <div className="fw-semibold">{basic.supportPhone || "-"}</div>
            </div>
            <div className="col-md-4">
              <div className="text-muted" style={{ fontSize: 12 }}>
                Support Email
              </div>
              <div className="fw-semibold">{basic.supportEmail || "-"}</div>
            </div>
            <div className="col-md-4">
              <div className="text-muted" style={{ fontSize: 12 }}>
                WhatsApp Number
              </div>
              <div className="fw-semibold">{basic.whatsappNumber || "-"}</div>
            </div>
            <div className="col-12">
              <div className="text-muted" style={{ fontSize: 12 }}>
                Location
              </div>
              <div className="fw-semibold">{location?.fullPathText || location?.text || "-"}</div>
            </div>

            <div className="col-12 mt-4">
              <h6 className="fw-semibold mb-3">Legal & Tax Information</h6>
            </div>
            <div className="col-md-6">
              <div className="text-muted" style={{ fontSize: 12 }}>
                Registration Type
              </div>
              <div className="fw-semibold">{legal.registrationType}</div>
            </div>
            <div className="col-md-6">
              <div className="text-muted" style={{ fontSize: 12 }}>
                Trade License Number
              </div>
              <div className="fw-semibold">{legal.tradeLicenseNumber || "-"}</div>
            </div>
            {legal.bankAccountName ? (
              <div className="col-12 mt-3">
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Bank Account
                </div>
                <div className="fw-semibold">
                  {legal.bankAccountName} - {legal.bankName}
                </div>
              </div>
            ) : null}
            {legal.payoutBkash || legal.payoutNagad || legal.payoutRocket ? (
              <div className="col-12 mt-3">
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Payout Methods
                </div>
                <div className="fw-semibold">
                  {[
                    legal.payoutBkash && `bKash: ${legal.payoutBkash}`,
                    legal.payoutNagad && `Nagad: ${legal.payoutNagad}`,
                    legal.payoutRocket && `Rocket: ${legal.payoutRocket}`,
                  ]
                    .filter(Boolean)
                    .join(", ") || "-"}
                </div>
              </div>
            ) : null}

            <div className="col-12 mt-4">
              <div className="text-muted" style={{ fontSize: 12 }}>
                Trade License Document
              </div>
              <div className="fw-semibold">{docs.TRADE_LICENSE ? "Uploaded" : "Missing"}</div>
            </div>
          </div>
          <div className="alert alert-warning mt-3 mb-0">
            After submission, the organization status becomes <strong>Pending Review</strong> until approved by Admin.
          </div>
        </Card>
      ) : null}

      <div className="d-flex justify-content-between mt-3">
        <button className="btn btn-outline-secondary" disabled={busy || step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>
          Back
        </button>
        <div className="d-flex gap-8 flex-wrap">
          <button className="btn btn-outline-secondary" disabled={busy || readOnly} onClick={handleSaveDraft}>
            Save Draft
          </button>
          {step < 4 ? (
            <button className="btn btn-primary" disabled={busy || !canNext} onClick={() => setStep((s) => Math.min(4, s + 1))}>
              Next
            </button>
          ) : (
            <button className="btn btn-success" disabled={busy || readOnly} onClick={handleSubmit}>
              Submit for Verification
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

