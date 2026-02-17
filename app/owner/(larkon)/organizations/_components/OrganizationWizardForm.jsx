"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import LocationPicker from "@/components/location/LocationPicker";
import { normalizeLocation, withLegacyLocationFields } from "@/src/lib/location/normalizeLocation";
import LkFormGroup from "@larkon-ui/components/LkFormGroup";
import LkInput from "@larkon-ui/components/LkInput";
import LkSelect from "@larkon-ui/components/LkSelect";
import LkTextarea from "@larkon-ui/components/LkTextarea";
import LkFileUpload from "@larkon-ui/components/LkFileUpload";

// Reusable LocationPicker is SSR-safe (exported with ssr: false). Use it directly.
function legacyLocationToPickerValue(loc) {
  if (!loc) return { lat: null, lng: null, address: "", city: "", state: "", country: "Bangladesh", postalCode: "" };
  const lat = loc.lat ?? loc.latitude ?? null;
  const lng = loc.lng ?? loc.longitude ?? null;
  return {
    lat: lat != null && Number.isFinite(lat) ? lat : null,
    lng: lng != null && Number.isFinite(lng) ? lng : null,
    address: loc.addressLine || loc.formattedAddress || loc.fullPathText || loc.text || "",
    city: loc.city || loc.cityName || "",
    state: loc.state || loc.stateName || "",
    country: loc.countryName || (loc.countryCode === "BD" ? "Bangladesh" : loc.countryCode || "Bangladesh"),
    postalCode: loc.postalCode || "",
  };
}

function pickerValueToLegacyLocation(pickerVal, previousLocation) {
  const prev = previousLocation || {};
  const parts = [pickerVal.address, pickerVal.city, pickerVal.state, pickerVal.country].filter(Boolean);
  const fullPathText = parts.join(", ");
  return {
    ...prev,
    countryCode: prev.countryCode || "BD",
    lat: pickerVal.lat ?? undefined,
    lng: pickerVal.lng ?? undefined,
    latitude: pickerVal.lat ?? null,
    longitude: pickerVal.lng ?? null,
    addressLine: pickerVal.address || undefined,
    city: pickerVal.city || undefined,
    cityName: pickerVal.city || undefined,
    state: pickerVal.state || undefined,
    stateName: pickerVal.state || undefined,
    countryName: pickerVal.country || undefined,
    postalCode: pickerVal.postalCode || undefined,
    formattedAddress: fullPathText || undefined,
    fullPathText: fullPathText || undefined,
    text: fullPathText || undefined,
  };
}

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
  }

  const canNext = useMemo(() => {
    if (step === 1) return !!basic.name && !!basic.supportPhone && !!basic.orgTypeCode && !!(location?.fullPathText || location?.text || location?.formattedAddress || (location?.countryCode && (location?.state || location?.city || location?.addressLine)));
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
              <LkFormGroup label="Organization Name *">
                <LkInput
                  className="radius-12"
                  value={basic.name}
                  onChange={(e) => setBasicField("name", e.target.value)}
                  placeholder="e.g., Community Pet Clinic"
                  disabled={busy || readOnly}
                />
              </LkFormGroup>
            </div>
            <div className="col-md-6">
              <LkFormGroup label="Organization Type *" error={typesError}>
                <LkSelect
                  className="radius-12"
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
                </LkSelect>
              </LkFormGroup>
              {!typesLoading && !typesError ? (
                <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                  Loaded from seeded types in the database.
                </div>
              ) : null}
            </div>
            <div className="col-md-6">
              <LkFormGroup label="Support Phone *">
                <LkInput
                  className="radius-12"
                  value={basic.supportPhone}
                  onChange={(e) => setBasicField("supportPhone", e.target.value)}
                  placeholder="e.g., 017XXXXXXXX"
                  disabled={busy || readOnly}
                />
              </LkFormGroup>
            </div>
            <div className="col-md-6">
              <LkFormGroup label="Support Email" error={fieldErrors.supportEmail}>
                <LkInput
                  type="email"
                  error={!!fieldErrors.supportEmail}
                  className="radius-12"
                  value={basic.supportEmail}
                  onChange={(e) => setBasicField("supportEmail", e.target.value)}
                  placeholder="e.g., support@example.com"
                  disabled={busy || readOnly}
                />
              </LkFormGroup>
            </div>
            <div className="col-md-4">
              <LkFormGroup label="WhatsApp Number" error={fieldErrors.whatsappNumber}>
                <LkInput
                  error={!!fieldErrors.whatsappNumber}
                  className="radius-12"
                  value={basic.whatsappNumber}
                  onChange={(e) => setBasicField("whatsappNumber", e.target.value)}
                  placeholder="e.g., 017XXXXXXXX"
                  disabled={busy || readOnly}
                />
              </LkFormGroup>
            </div>
            <div className="col-md-4">
              <LkFormGroup label="Alternate Phone" error={fieldErrors.alternatePhone}>
                <LkInput
                  error={!!fieldErrors.alternatePhone}
                  className="radius-12"
                  value={basic.alternatePhone}
                  onChange={(e) => setBasicField("alternatePhone", e.target.value)}
                  placeholder="e.g., 019XXXXXXXX"
                  disabled={busy || readOnly}
                />
              </LkFormGroup>
            </div>

            <div className="col-12 mt-3">
              <LocationPicker
                value={legacyLocationToPickerValue(location)}
                onChange={(pickerVal) => setLocation(normalizeLoc(pickerValueToLegacyLocation(pickerVal, location)))}
                label="Business Location"
                required
              />
              {locationHelperText ? (
                <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                  {locationHelperText}
                </div>
              ) : null}
            </div>

            <div className="col-12">
              <LkFormGroup label="Office Address">
                <LkTextarea
                  className="radius-12"
                  rows={3}
                  value={basic.addressText}
                  onChange={(e) => setBasicField("addressText", e.target.value)}
                  placeholder="House/Road, Area"
                  disabled={busy || readOnly}
                />
              </LkFormGroup>
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
                        <LkFormGroup label="Vet License Number">
                          <LkInput
                            className="radius-12"
                            value={typeSpecific.vetLicenseNumber || ""}
                            onChange={(e) => setTypeSpecific({ ...typeSpecific, vetLicenseNumber: e.target.value })}
                            placeholder="Veterinary license number"
                            disabled={busy || readOnly}
                          />
                        </LkFormGroup>
                      </div>
                      <div className="col-md-6">
                        <LkFormGroup label="Emergency Contact">
                          <LkInput
                            className="radius-12"
                            value={typeSpecific.emergencyContact || ""}
                            onChange={(e) => setTypeSpecific({ ...typeSpecific, emergencyContact: e.target.value })}
                            placeholder="Emergency contact number"
                            disabled={busy || readOnly}
                          />
                        </LkFormGroup>
                      </div>
                      <div className="col-md-12">
                        <LkFormGroup label="Specializations">
                          <LkInput
                            className="radius-12"
                            value={typeSpecific.specializations || ""}
                            onChange={(e) => setTypeSpecific({ ...typeSpecific, specializations: e.target.value })}
                            placeholder="e.g., Surgery, Vaccination, Grooming"
                            disabled={busy || readOnly}
                          />
                        </LkFormGroup>
                      </div>
                      <div className="col-md-12">
                        <LkFormGroup label="Services Offered">
                          <LkTextarea
                            className="radius-12"
                            rows={3}
                            value={typeSpecific.services || ""}
                            onChange={(e) => setTypeSpecific({ ...typeSpecific, services: e.target.value })}
                            placeholder="List services offered (one per line)"
                            disabled={busy || readOnly}
                          />
                        </LkFormGroup>
                      </div>
                    </div>
                  ) : basic.orgTypeCode === "PET_SHOP" ? (
                    <div className="row g-3">
                      <div className="col-md-6">
                        <LkFormGroup label="Store Hours">
                          <LkInput
                            className="radius-12"
                            value={typeSpecific.storeHours || ""}
                            onChange={(e) => setTypeSpecific({ ...typeSpecific, storeHours: e.target.value })}
                            placeholder="e.g., 9 AM - 9 PM"
                            disabled={busy || readOnly}
                          />
                        </LkFormGroup>
                      </div>
                      <div className="col-md-6">
                        <LkFormGroup label="Delivery Available">
                          <LkSelect
                            className="radius-12"
                            value={typeSpecific.deliveryAvailable || ""}
                            onChange={(e) => setTypeSpecific({ ...typeSpecific, deliveryAvailable: e.target.value })}
                            disabled={busy || readOnly}
                          >
                            <option value="">Select...</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </LkSelect>
                        </LkFormGroup>
                      </div>
                      <div className="col-md-12">
                        <LkFormGroup label="Product Categories Focus">
                          <LkInput
                            className="radius-12"
                            value={typeSpecific.productCategories || ""}
                            onChange={(e) => setTypeSpecific({ ...typeSpecific, productCategories: e.target.value })}
                            placeholder="e.g., Food, Toys, Accessories"
                            disabled={busy || readOnly}
                          />
                        </LkFormGroup>
                      </div>
                      <div className="col-md-12">
                        <LkFormGroup label="Online Store URL">
                          <LkInput
                            className="radius-12"
                            value={typeSpecific.onlineStoreUrl || ""}
                            onChange={(e) => setTypeSpecific({ ...typeSpecific, onlineStoreUrl: e.target.value })}
                            placeholder="e.g., https://shop.example.com"
                            disabled={busy || readOnly}
                          />
                        </LkFormGroup>
                      </div>
                    </div>
                  ) : basic.orgTypeCode === "ONLINE_HUB" ? (
                    <div className="row g-3">
                      <div className="col-md-6">
                        <LkFormGroup label="Platform Website">
                          <LkInput
                            className="radius-12"
                            value={typeSpecific.platformUrl || ""}
                            onChange={(e) => setTypeSpecific({ ...typeSpecific, platformUrl: e.target.value })}
                            placeholder="Main platform URL"
                            disabled={busy || readOnly}
                          />
                        </LkFormGroup>
                      </div>
                      <div className="col-md-6">
                        <LkFormGroup label="Social Media Links">
                          <LkInput
                            className="radius-12"
                            value={typeSpecific.socialMedia || ""}
                            onChange={(e) => setTypeSpecific({ ...typeSpecific, socialMedia: e.target.value })}
                            placeholder="Comma-separated URLs"
                            disabled={busy || readOnly}
                          />
                        </LkFormGroup>
                      </div>
                      <div className="col-md-6">
                        <LkFormGroup label="Delivery Coverage Areas">
                          <LkInput
                            className="radius-12"
                            value={typeSpecific.deliveryCoverage || ""}
                            onChange={(e) => setTypeSpecific({ ...typeSpecific, deliveryCoverage: e.target.value })}
                            placeholder="e.g., Dhaka, Chittagong"
                            disabled={busy || readOnly}
                          />
                        </LkFormGroup>
                      </div>
                      <div className="col-md-3">
                        <LkFormGroup label="Minimum Order Value (BDT)">
                          <LkInput
                            type="number"
                            className="radius-12"
                            value={typeSpecific.minOrderValue || ""}
                            onChange={(e) => setTypeSpecific({ ...typeSpecific, minOrderValue: e.target.value })}
                            placeholder="0"
                            disabled={busy || readOnly}
                          />
                        </LkFormGroup>
                      </div>
                      <div className="col-md-3">
                        <LkFormGroup label="Delivery Charge (BDT)">
                          <LkInput
                            type="number"
                            className="radius-12"
                            value={typeSpecific.deliveryCharge || ""}
                            onChange={(e) => setTypeSpecific({ ...typeSpecific, deliveryCharge: e.target.value })}
                            placeholder="0"
                            disabled={busy || readOnly}
                          />
                        </LkFormGroup>
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
              <LkFormGroup label="Registration Type *">
                <LkSelect
                  className="radius-12"
                  value={legal.registrationType}
                  onChange={(e) => setLegalField("registrationType", e.target.value)}
                  disabled={busy || readOnly}
                >
                  <option value="PROPRIETORSHIP">Proprietorship</option>
                  <option value="PARTNERSHIP">Partnership</option>
                  <option value="LIMITED_COMPANY">Limited Company</option>
                  <option value="NGO">NGO</option>
                </LkSelect>
              </LkFormGroup>
            </div>
            <div className="col-md-6">
              <LkFormGroup label="Trade License Number *">
                <LkInput
                  className="radius-12"
                  value={legal.tradeLicenseNumber}
                  onChange={(e) => setLegalField("tradeLicenseNumber", e.target.value)}
                  placeholder="e.g., TR-123456"
                  disabled={busy || readOnly}
                />
              </LkFormGroup>
            </div>
            <div className="col-md-3">
              <LkFormGroup label="Issue Date" error={fieldErrors.tradeLicenseDateRange}>
                <LkInput
                  type="date"
                  error={!!fieldErrors.tradeLicenseDateRange}
                  className="radius-12"
                  value={legal.tradeLicenseIssueDate}
                  onChange={(e) => setLegalField("tradeLicenseIssueDate", e.target.value)}
                  disabled={busy || readOnly}
                />
              </LkFormGroup>
            </div>
            <div className="col-md-3">
              <LkFormGroup label="Expiry Date" error={fieldErrors.tradeLicenseDateRange}>
                <LkInput
                  type="date"
                  error={!!fieldErrors.tradeLicenseDateRange}
                  className="radius-12"
                  value={legal.tradeLicenseExpiryDate}
                  onChange={(e) => setLegalField("tradeLicenseExpiryDate", e.target.value)}
                  disabled={busy || readOnly}
                />
              </LkFormGroup>
            </div>
            <div className="col-md-6">
              <LkFormGroup label="Issuing Authority">
                <LkInput
                  className="radius-12"
                  value={legal.issuingAuthority}
                  onChange={(e) => setLegalField("issuingAuthority", e.target.value)}
                  placeholder="e.g., Dhaka City Corporation"
                  disabled={busy || readOnly}
                />
              </LkFormGroup>
            </div>
            <div className="col-md-6">
              <LkFormGroup label="TIN Number">
                <LkInput
                  className="radius-12"
                  value={legal.tinNumber}
                  onChange={(e) => setLegalField("tinNumber", e.target.value)}
                  placeholder="e.g., 1234567890"
                  disabled={busy || readOnly}
                />
              </LkFormGroup>
            </div>
            <div className="col-md-6">
              <LkFormGroup label="BIN Number">
                <LkInput
                  className="radius-12"
                  value={legal.binNumber}
                  onChange={(e) => setLegalField("binNumber", e.target.value)}
                  placeholder="e.g., 123456789-0001"
                  disabled={busy || readOnly}
                />
              </LkFormGroup>
            </div>
            <div className="col-md-6">
              <LkFormGroup label="Official Phone">
                <LkInput
                  className="radius-12"
                  value={legal.officialPhone}
                  onChange={(e) => setLegalField("officialPhone", e.target.value)}
                  placeholder="e.g., 017XXXXXXXX"
                  disabled={busy || readOnly}
                />
              </LkFormGroup>
            </div>
            <div className="col-md-6">
              <LkFormGroup label="Official Email">
                <LkInput
                  type="email"
                  className="radius-12"
                  value={legal.officialEmail}
                  onChange={(e) => setLegalField("officialEmail", e.target.value)}
                  placeholder="e.g., office@example.com"
                  disabled={busy || readOnly}
                />
              </LkFormGroup>
            </div>
            <div className="col-md-6">
              <LkFormGroup label="Website">
                <LkInput
                  className="radius-12"
                  value={legal.website}
                  onChange={(e) => setLegalField("website", e.target.value)}
                  placeholder="e.g., https://example.com"
                  disabled={busy || readOnly}
                />
              </LkFormGroup>
            </div>
            <div className="col-md-6">
              <LkFormGroup label="Facebook Page">
                <LkInput
                  className="radius-12"
                  value={legal.facebookPage}
                  onChange={(e) => setLegalField("facebookPage", e.target.value)}
                  placeholder="e.g., https://facebook.com/yourpage"
                  disabled={busy || readOnly}
                />
              </LkFormGroup>
            </div>

            {/* Banking and payout are collected only on /owner/organizations/[id]/payouts */}
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card title="Documents & Directors" subtitle="Upload trade license and add directors/partners (if applicable)">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Trade License Document *</label>
              <LkFileUpload onChange={(e) => e.target.files?.[0] && handleTradeLicenseUpload(e.target.files[0])} disabled={busy || readOnly} />
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
                        <LkFormGroup label="Name *">
                          <LkInput
                            className="radius-12"
                            value={d.name}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDirectors((p) => p.map((x, i) => (i === idx ? { ...x, name: v } : x)));
                            }}
                            disabled={busy || readOnly}
                          />
                        </LkFormGroup>
                      </div>
                      <div className="col-md-3">
                        <LkFormGroup label="Role">
                          <LkInput
                            className="radius-12"
                            value={d.role}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDirectors((p) => p.map((x, i) => (i === idx ? { ...x, role: v } : x)));
                            }}
                            disabled={busy || readOnly}
                          />
                        </LkFormGroup>
                      </div>
                      <div className="col-md-3">
                        <LkFormGroup label="Mobile">
                          <LkInput
                            className="radius-12"
                            value={d.mobile}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDirectors((p) => p.map((x, i) => (i === idx ? { ...x, mobile: v } : x)));
                            }}
                            disabled={busy || readOnly}
                          />
                        </LkFormGroup>
                      </div>
                      <div className="col-md-2">
                        <LkFormGroup label="Email">
                          <LkInput
                            className="radius-12"
                            value={d.email}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDirectors((p) => p.map((x, i) => (i === idx ? { ...x, email: v } : x)));
                            }}
                            disabled={busy || readOnly}
                          />
                        </LkFormGroup>
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
            <div className="col-12 mt-3">
              <div className="text-muted" style={{ fontSize: 12 }}>
                Payout / banking
              </div>
              <div className="fw-semibold">Configure later in Organization → Payouts</div>
            </div>

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

