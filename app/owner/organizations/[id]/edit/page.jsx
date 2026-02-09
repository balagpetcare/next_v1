"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import OrganizationWizardForm from "@/app/owner/organizations/_components/OrganizationWizardForm";
import LocationField from "@/src/components/location/LocationField";
import {
  normalizeLocation,
  withLegacyLocationFields,
  locationValueToAddressJson,
} from "@/src/lib/location/normalizeLocation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

// ---------- API helpers (same style as your create page) ----------
async function uploadMedia(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/v1/media/upload`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.success) throw new Error(j?.message || `Upload failed (${res.status})`);
  return j.data?.id;
}

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

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
    credentials: "include",
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.success) throw new Error(j?.message || `Request failed (${res.status})`);
  return j.data;
}

async function apiPut(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
    credentials: "include",
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.success) throw new Error(j?.message || `Request failed (${res.status})`);
  return j.data;
}

// ---------- UI helpers ----------
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
    <div className={base} style={{ cursor: "pointer" }}>
      <div
        className={`radius-16 d-flex align-items-center justify-content-center ${circleCls}`}
        style={{ width: 28, height: 28, fontWeight: 700, fontSize: 13 }}
      >
        {done ? "✓" : idx}
      </div>
      <div className={`fw-semibold ${textCls}`} style={{ fontSize: 13 }}>
        {title}
      </div>
    </div>
  );
}

function normalizeStep(s) {
  const v = String(s || "").toLowerCase();
  if (v === "business") return 1;
  if (v === "legal") return 2;
  if (v === "documents") return 3;
  if (v === "review") return 4;
  return 1;
}

function stepToKey(n) {
  if (n === 1) return "business";
  if (n === 2) return "legal";
  if (n === 3) return "documents";
  return "review";
}

function getDocUrl(doc) {
  return (
    doc?.url ||
    doc?.fileUrl ||
    doc?.file?.url ||
    doc?.file?.publicUrl ||
    doc?.file?.signedUrl ||
    ""
  );
}

function isDocUpdated(doc) {
  const c = doc?.createdAt ? new Date(doc.createdAt).getTime() : 0;
  const u = doc?.updatedAt ? new Date(doc.updatedAt).getTime() : 0;
  if (u && c) return u > c;
  return Boolean(doc?.isUpdated || doc?.updated || doc?.reuploaded);
}

function EditOrganizationPageOld() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();

  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  // Step from URL
  const stepFromUrl = useMemo(() => normalizeStep(search?.get("step")), [search]);
  const [step, setStep] = useState(stepFromUrl);

  useEffect(() => setStep(stepFromUrl), [stepFromUrl]);

  // org types same as create page
  const [orgTypes, setOrgTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState("");

  // Form states (same shape as create page)
  const [basic, setBasic] = useState({
    name: "",
    orgTypeCode: "",
    supportPhone: "",
    supportEmail: "",
    whatsappNumber: "",
    alternatePhone: "",
    addressText: "",
  });

  const normalizeLoc = useCallback((loc) => {
    const n = normalizeLocation(loc, "BD");
    return n ? withLegacyLocationFields(n, loc || {}) : loc || { countryCode: "BD" };
  }, []);

  const [location, setLocation] = useState(() => normalizeLoc({ countryCode: "BD" }));

  const [legal, setLegal] = useState({
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
  });

  const [directors, setDirectors] = useState([{ name: "", role: "Owner", mobile: "", email: "" }]);

  const [typeSpecific, setTypeSpecific] = useState({});

  // docs map for quick validation
  const [docs, setDocs] = useState({
    TRADE_LICENSE: null, // { fileName, fileId }
  });

  // loaded org for showing existing docs list
  const [org, setOrg] = useState(null);

  // replace doc UI
  const [replacingDoc, setReplacingDoc] = useState(null);
  const [replaceBusy, setReplaceBusy] = useState(false);
  const [replaceError, setReplaceError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  function validateEmail(email) {
    if (!email) return null;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email) ? null : "Invalid email format";
  }

  function validatePhone(phone) {
    if (!phone) return null;
    const re = /^[0-9]{10,15}$/;
    return re.test(phone.replace(/[\s\-+()]/g, '')) ? null : "Invalid phone number (10-15 digits)";
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

  function setBasicField(k, v) {
    setBasic((p) => ({ ...p, [k]: v }));
    // Clear error when user types
    if (fieldErrors[k]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
    }
    // Validate on change
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
    // Clear error when user types
    if (fieldErrors[k]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
    }
    // Validate on change
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
    // Validate date range
    if (k === "tradeLicenseIssueDate" || k === "tradeLicenseExpiryDate") {
      const err = validateDateRange(legal.tradeLicenseIssueDate || (k === "tradeLicenseIssueDate" ? v : ""), legal.tradeLicenseExpiryDate || (k === "tradeLicenseExpiryDate" ? v : ""));
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

  // Load org types
  useEffect(() => {
    (async () => {
      setTypesLoading(true);
      setTypesError("");
      try {
        const rows = await apiGet("/api/v1/meta/organization-types");
        const list = Array.isArray(rows) ? rows : [];
        setOrgTypes(list);
      } catch (e) {
        setTypesError(e?.message || "Failed to load organization types");
      } finally {
        setTypesLoading(false);
      }
    })();
  }, []);

  // Load organization details
  async function loadOrg() {
    if (!id) return;
    setLoading(true);
    setError("");
    setOk("");
    try {
      const data = await apiGet(`/api/v1/owner/organizations/${id}`);
      setOrg(data);

      // -------- hydrate states from server --------
      const addr = data?.addressJson || {};
      setBasic((p) => ({
        ...p,
        name: data?.name || "",
        supportPhone: data?.supportPhone || "",
        supportEmail: data?.owner?.ownerProfile?.supportEmail || addr?.supportEmail || "",
        whatsappNumber: addr?.whatsappNumber || "",
        alternatePhone: addr?.alternatePhone || "",
        orgTypeCode: addr?.orgTypeCode || p.orgTypeCode || "",
        addressText: addr?.text || "",
      }));

      // Load type-specific data
      if (addr?.typeSpecific) {
        setTypeSpecific(addr.typeSpecific);
      }

      setLocation(
        normalizeLoc({
          ...addr,
          kind: addr?.locationKind || data?.locationKind || null,
          cityCorporationId: addr?.cityCorporationId || data?.cityCorporationId || null,
          cityCorporationCode: addr?.cityCorporationCode || data?.cityCorporationCode || null,
          dhakaAreaId: addr?.dhakaAreaId || data?.dhakaAreaId || null,
          bdAreaId: addr?.bdAreaId || data?.bdAreaId || null,
          latitude: addr?.latitude || data?.latitude || null,
          longitude: addr?.longitude || data?.longitude || null,
          fullPathText:
            addr?.fullPathText || data?.fullPathText || data?.addressJson?.fullPathText || null,
          text: addr?.fullPathText || data?.fullPathText || null,
          countryCode: addr?.countryCode || data?.countryCode || "BD",
        })
      );

      const lp = data?.legalProfile || {};
      setLegal((p) => ({
        ...p,
        registrationType: lp?.registrationType || p.registrationType || "PROPRIETORSHIP",
        tradeLicenseNumber: lp?.tradeLicenseNumber || "",
        tradeLicenseIssueDate: lp?.tradeLicenseIssueDate ? new Date(lp.tradeLicenseIssueDate).toISOString().split('T')[0] : "",
        tradeLicenseExpiryDate: lp?.tradeLicenseExpiryDate ? new Date(lp.tradeLicenseExpiryDate).toISOString().split('T')[0] : "",
        issuingAuthority: lp?.issuingAuthority || "",
        tinNumber: lp?.tinNumber || "",
        binNumber: lp?.binNumber || "",
        officialEmail: lp?.officialEmail || "",
        officialPhone: lp?.officialPhone || "",
        website: lp?.website || "",
        facebookPage: lp?.facebookPage || "",
      }));

      // directors (try multiple possible shapes)
      const dirs = lp?.directors || lp?.directorsJson || lp?.directorList || null;
      if (Array.isArray(dirs) && dirs.length) {
        setDirectors(
          dirs.map((d) => ({
            name: d?.name || "",
            role: d?.role || "Director",
            mobile: d?.mobile || "",
            email: d?.email || "",
          }))
        );
      } else {
        setDirectors([{ name: "", role: "Owner", mobile: "", email: "" }]);
      }

      // docs - pick TRADE_LICENSE if exists
      const documents = Array.isArray(lp?.documents) ? lp.documents : [];
      const tl = documents.find((d) => String(d?.type || "").toUpperCase() === "TRADE_LICENSE");
      if (tl) {
        setDocs({
          TRADE_LICENSE: {
            fileName: tl?.originalName || tl?.fileName || "TRADE_LICENSE",
            fileId: tl?.fileId || tl?.mediaId || tl?.media?.id || null,
          },
        });
      } else {
        setDocs({ TRADE_LICENSE: null });
      }

      // if orgTypeCode missing but types loaded, set default
      if (!addr?.orgTypeCode && orgTypes?.length) {
        setBasic((p) => ({ ...p, orgTypeCode: p.orgTypeCode || orgTypes[0]?.code || "" }));
      }
    } catch (e) {
      setError(e?.message || "Failed to load organization");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // validation same as create
  const canNext = useMemo(() => {
    if (step === 1)
      return (
        !!basic.name &&
        !!basic.supportPhone &&
        !!basic.orgTypeCode &&
        !!(location?.fullPathText || location?.text || location?.formattedAddress || (location?.countryCode && (location?.state || location?.city || location?.addressLine)))
      );
    if (step === 2) return !!legal.tradeLicenseNumber;
    if (step === 3) return !!docs.TRADE_LICENSE;
    return true;
  }, [step, basic, legal, docs, location]);

  function goStep(nextStep) {
    const n = Math.min(4, Math.max(1, nextStep));
    router.replace(`/owner/organizations/${id}/edit?step=${stepToKey(n)}`);
  }

  // -------- Save Business (Organization main record) --------
  async function saveBusiness() {
    setError("");
    setOk("");
    setBusy(true);
    try {
      const addressJson = {
        ...locationValueToAddressJson(location, { addressText: basic.addressText || "" }),
        orgTypeCode: basic.orgTypeCode,
        whatsappNumber: basic.whatsappNumber || null,
        alternatePhone: basic.alternatePhone || null,
        typeSpecific: typeSpecific || {},
      };

      await apiPut(`/api/v1/owner/organizations/${id}`, {
        name: basic.name,
        supportPhone: basic.supportPhone,
        supportEmail: basic.supportEmail || null,
        cityCorporationId: addressJson.cityCorporationId || null,
        dhakaAreaId: addressJson.dhakaAreaId || null,
        bdAreaId: addressJson.bdAreaId || addressJson.areaId || null,
        fullPathText: addressJson.fullPathText || addressJson.formattedAddress || null,
        addressJson,
      });

      setOk("Business info updated.");
      await loadOrg();
    } catch (e) {
      setError(e?.message || "Failed to update business info");
    } finally {
      setBusy(false);
    }
  }

  // -------- Save Legal Draft + Directors (same endpoints as create) --------
  async function saveDraft() {
    setError("");
    setOk("");
    setBusy(true);
    try {
      await apiPost(`/api/v1/owner/organizations/${id}/legal-profile/save-draft`, {
        organizationName: basic.name,
        registrationType: legal.registrationType,
        tradeLicenseNumber: legal.tradeLicenseNumber,
        tradeLicenseIssueDate: legal.tradeLicenseIssueDate || null,
        tradeLicenseExpiryDate: legal.tradeLicenseExpiryDate || null,
        issuingAuthority: legal.issuingAuthority,
        tinNumber: legal.tinNumber,
        binNumber: legal.binNumber,
        officialEmail: legal.officialEmail,
        officialPhone: legal.officialPhone || basic.supportPhone,
        website: legal.website,
        facebookPage: legal.facebookPage,
      });

      await apiPost(`/api/v1/owner/organizations/${id}/legal-profile/save-directors`, { directors });

      setOk("Legal draft updated.");
      await loadOrg();
    } catch (e) {
      setError(e?.message || "Failed to save draft");
    } finally {
      setBusy(false);
    }
  }

  // -------- Document upload/replace (same as create) --------
  async function handleTradeLicenseUpload(file) {
    setError("");
    setOk("");
    setBusy(true);
    try {
      const fileId = await uploadMedia(file);
      await apiPost(`/api/v1/owner/organizations/${id}/legal-profile/add-document`, {
        type: "TRADE_LICENSE",
        fileId,
        mediaId: fileId,
      });
      setDocs({ TRADE_LICENSE: { fileName: file.name, fileId } });
      setOk("Trade license updated.");
      await loadOrg();
    } catch (e) {
      setError(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleReplaceUpload(file) {
    if (!replacingDoc?.type || !file) return;
    setReplaceError("");
    setReplaceBusy(true);
    try {
      const fileId = await uploadMedia(file);
      await apiPost(`/api/v1/owner/organizations/${id}/legal-profile/add-document`, {
        type: replacingDoc.type,
        fileId,
        mediaId: fileId,
      });
      setReplacingDoc(null);
      await loadOrg();
      router.refresh();
    } catch (e) {
      setReplaceError(e?.message || "Replace failed");
    } finally {
      setReplaceBusy(false);
    }
  }

  // -------- Submit --------
  async function submit() {
    setError("");
    setOk("");
    setBusy(true);
    try {
      // ensure business updated + legal saved before submit
      await saveBusiness();
      await saveDraft();
      await apiPost(`/api/v1/owner/organizations/${id}/legal-profile/submit`, {});
      router.push(`/owner/organizations/${id}`);
    } catch (e) {
      setError(e?.message || "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  const documents = org?.legalProfile?.documents || [];

  if (loading) return <div className="p-30 text-center">Loading...</div>;

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-start justify-content-between gap-12 flex-wrap mt-12 mb-12">
        <div>
          <div className="d-flex align-items-center gap-8 flex-wrap">
            <h4 className="mb-0">Edit Organization</h4>
            <span className="badge bg-primary-50 text-primary-600 radius-16 px-12 py-6 fw-semibold">
              Org ID: {id}
            </span>
          </div>
          <div className="text-secondary-light" style={{ fontSize: 13 }}>
            Update business/legal/documents then submit for verification if needed.
          </div>
        </div>

        <div className="d-flex gap-8 flex-wrap">
          <button className="btn btn-outline-secondary" disabled={busy} onClick={saveBusiness}>
            Save Business
          </button>
          <button className="btn btn-outline-secondary" disabled={busy} onClick={saveDraft}>
            Save Legal Draft
          </button>

          {step < 4 ? (
            <button className="btn btn-primary" disabled={busy || !canNext} onClick={() => goStep(step + 1)}>
              Next
            </button>
          ) : (
            <button className="btn btn-success" disabled={busy} onClick={submit}>
              Submit for Verification
            </button>
          )}
        </div>
      </div>

      {error ? <Alert type="danger">{error}</Alert> : null}
      {ok ? <Alert type="success">{ok}</Alert> : null}

      {/* Step header */}
      <div className="card border radius-16 mb-16">
        <div className="card-body p-16">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-12">
            <div className="text-secondary-light" style={{ fontSize: 13 }}>
              Step {step} of 4
            </div>
            <div className="d-flex align-items-center gap-16 flex-wrap">
              <div onClick={() => goStep(1)}>
                <StepPill idx={1} title="Business" active={step === 1} done={step > 1} />
              </div>
              <div onClick={() => goStep(2)}>
                <StepPill idx={2} title="Legal" active={step === 2} done={step > 2} />
              </div>
              <div onClick={() => goStep(3)}>
                <StepPill idx={3} title="Documents" active={step === 3} done={step > 3} />
              </div>
              <div onClick={() => goStep(4)}>
                <StepPill idx={4} title="Review" active={step === 4} done={false} />
              </div>
            </div>
          </div>

          <div className="progress mt-12" style={{ height: 8 }}>
            <div className="progress-bar" role="progressbar" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* STEP 1: Business */}
      {step === 1 ? (
        <Card
          title="Business Information"
          subtitle="Basic organization info"
          right={
            <button className="btn btn-outline-primary btn-sm" disabled={busy} onClick={saveBusiness}>
              Save Business
            </button>
          }
        >
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Organization Name *</label>
              <input
                className="form-control"
                value={basic.name}
                onChange={(e) => setBasicField("name", e.target.value)}
                placeholder="e.g., Community Pet Clinic"
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Organization Type *</label>
              <select
                className="form-select"
                value={basic.orgTypeCode}
                onChange={(e) => setBasicField("orgTypeCode", e.target.value)}
                disabled={typesLoading || !!typesError}
              >
                {typesLoading ? <option value="">Loading...</option> : null}
                {!typesLoading && !typesError && orgTypes.length === 0 ? (
                  <option value="">No types found</option>
                ) : null}
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
            </div>

            <div className="col-md-6">
              <label className="form-label">Support Phone *</label>
              <input
                className="form-control"
                value={basic.supportPhone}
                onChange={(e) => setBasicField("supportPhone", e.target.value)}
                placeholder="e.g., 017XXXXXXXX"
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
              />
              {fieldErrors.alternatePhone && <div className="invalid-feedback">{fieldErrors.alternatePhone}</div>}
            </div>

            <div className="col-12 mt-3">
              <LocationField
                value={location}
                onChange={(next) => setLocation(normalizeLoc(next))}
                label="Business Location (Bangladesh / Dhaka City)"
                defaultCountryCode="BD"
                enableRecent
                enableGPS
                enableMap
                enableBdHierarchy
              />
            </div>

            <div className="col-12">
              <label className="form-label">Office Address</label>
              <textarea
                className="form-control"
                rows={3}
                value={basic.addressText}
                onChange={(e) => setBasicField("addressText", e.target.value)}
                placeholder="House/Road, Area"
              />
            </div>

            {/* Type-Specific Fields */}
            {basic.orgTypeCode && (
              <div className="col-12 mt-4">
                <div className="border-top pt-3">
                  <h6 className="fw-semibold mb-3">
                    {basic.orgTypeCode === "CLINIC" ? "Clinic Information" :
                     basic.orgTypeCode === "PET_SHOP" ? "Pet Shop Information" :
                     basic.orgTypeCode === "ONLINE_HUB" ? "Online Hub Information" :
                     "Additional Information"}
                  </h6>
                  {basic.orgTypeCode === "CLINIC" ? (
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Vet License Number</label>
                        <input className="form-control" value={typeSpecific.vetLicenseNumber || ""} onChange={(e) => setTypeSpecific({...typeSpecific, vetLicenseNumber: e.target.value})} placeholder="Veterinary license number" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Emergency Contact</label>
                        <input className="form-control" value={typeSpecific.emergencyContact || ""} onChange={(e) => setTypeSpecific({...typeSpecific, emergencyContact: e.target.value})} placeholder="Emergency contact number" />
                      </div>
                      <div className="col-md-12">
                        <label className="form-label">Specializations</label>
                        <input className="form-control" value={typeSpecific.specializations || ""} onChange={(e) => setTypeSpecific({...typeSpecific, specializations: e.target.value})} placeholder="e.g., Surgery, Vaccination, Grooming" />
                      </div>
                      <div className="col-md-12">
                        <label className="form-label">Services Offered</label>
                        <textarea className="form-control" rows={3} value={typeSpecific.services || ""} onChange={(e) => setTypeSpecific({...typeSpecific, services: e.target.value})} placeholder="List services offered (one per line)" />
                      </div>
                    </div>
                  ) : basic.orgTypeCode === "PET_SHOP" ? (
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Store Hours</label>
                        <input className="form-control" value={typeSpecific.storeHours || ""} onChange={(e) => setTypeSpecific({...typeSpecific, storeHours: e.target.value})} placeholder="e.g., 9 AM - 9 PM" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Delivery Available</label>
                        <select className="form-select" value={typeSpecific.deliveryAvailable || ""} onChange={(e) => setTypeSpecific({...typeSpecific, deliveryAvailable: e.target.value})}>
                          <option value="">Select...</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                      <div className="col-md-12">
                        <label className="form-label">Product Categories Focus</label>
                        <input className="form-control" value={typeSpecific.productCategories || ""} onChange={(e) => setTypeSpecific({...typeSpecific, productCategories: e.target.value})} placeholder="e.g., Food, Toys, Accessories" />
                      </div>
                      <div className="col-md-12">
                        <label className="form-label">Online Store URL</label>
                        <input className="form-control" value={typeSpecific.onlineStoreUrl || ""} onChange={(e) => setTypeSpecific({...typeSpecific, onlineStoreUrl: e.target.value})} placeholder="e.g., https://shop.example.com" />
                      </div>
                    </div>
                  ) : basic.orgTypeCode === "ONLINE_HUB" ? (
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Platform Website</label>
                        <input className="form-control" value={typeSpecific.platformUrl || ""} onChange={(e) => setTypeSpecific({...typeSpecific, platformUrl: e.target.value})} placeholder="Main platform URL" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Social Media Links</label>
                        <input className="form-control" value={typeSpecific.socialMedia || ""} onChange={(e) => setTypeSpecific({...typeSpecific, socialMedia: e.target.value})} placeholder="Comma-separated URLs" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Delivery Coverage Areas</label>
                        <input className="form-control" value={typeSpecific.deliveryCoverage || ""} onChange={(e) => setTypeSpecific({...typeSpecific, deliveryCoverage: e.target.value})} placeholder="e.g., Dhaka, Chittagong" />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Minimum Order Value (BDT)</label>
                        <input type="number" className="form-control" value={typeSpecific.minOrderValue || ""} onChange={(e) => setTypeSpecific({...typeSpecific, minOrderValue: e.target.value})} placeholder="0" />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Delivery Charge (BDT)</label>
                        <input type="number" className="form-control" value={typeSpecific.deliveryCharge || ""} onChange={(e) => setTypeSpecific({...typeSpecific, deliveryCharge: e.target.value})} placeholder="0" />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {/* STEP 2: Legal */}
      {step === 2 ? (
        <Card
          title="Legal & Tax Information"
          subtitle="Trade license is required"
          right={
            <button className="btn btn-outline-primary btn-sm" disabled={busy} onClick={saveDraft}>
              Save Legal Draft
            </button>
          }
        >
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Registration Type *</label>
              <select
                className="form-select"
                value={legal.registrationType}
                onChange={(e) => setLegalField("registrationType", e.target.value)}
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
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Issue Date</label>
              <input
                type="date"
                className={`form-control ${fieldErrors.tradeLicenseDateRange ? "is-invalid" : ""}`}
                value={legal.tradeLicenseIssueDate}
                onChange={(e) => setLegalField("tradeLicenseIssueDate", e.target.value)}
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
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Issuing Authority</label>
              <input
                className="form-control"
                value={legal.issuingAuthority}
                onChange={(e) => setLegalField("issuingAuthority", e.target.value)}
                placeholder="e.g., Dhaka City Corporation"
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">TIN Number</label>
              <input
                className="form-control"
                value={legal.tinNumber}
                onChange={(e) => setLegalField("tinNumber", e.target.value)}
                placeholder="e.g., 1234567890"
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">BIN Number</label>
              <input
                className="form-control"
                value={legal.binNumber}
                onChange={(e) => setLegalField("binNumber", e.target.value)}
                placeholder="e.g., 123456789-0001"
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Official Phone</label>
              <input
                className={`form-control ${fieldErrors.officialPhone ? "is-invalid" : ""}`}
                value={legal.officialPhone}
                onChange={(e) => setLegalField("officialPhone", e.target.value)}
                placeholder="e.g., 017XXXXXXXX"
              />
              {fieldErrors.officialPhone && <div className="invalid-feedback">{fieldErrors.officialPhone}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label">Official Email</label>
              <input
                type="email"
                className={`form-control ${fieldErrors.officialEmail ? "is-invalid" : ""}`}
                value={legal.officialEmail}
                onChange={(e) => setLegalField("officialEmail", e.target.value)}
                placeholder="e.g., office@example.com"
              />
              {fieldErrors.officialEmail && <div className="invalid-feedback">{fieldErrors.officialEmail}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label">Website</label>
              <input
                className={`form-control ${fieldErrors.website ? "is-invalid" : ""}`}
                value={legal.website}
                onChange={(e) => setLegalField("website", e.target.value)}
                placeholder="e.g., https://example.com"
              />
              {fieldErrors.website && <div className="invalid-feedback">{fieldErrors.website}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label">Facebook Page</label>
              <input
                className={`form-control ${fieldErrors.facebookPage ? "is-invalid" : ""}`}
                value={legal.facebookPage}
                onChange={(e) => setLegalField("facebookPage", e.target.value)}
                placeholder="e.g., https://facebook.com/yourpage"
              />
              {fieldErrors.facebookPage && <div className="invalid-feedback">{fieldErrors.facebookPage}</div>}
            </div>

            <div className="col-12 mt-4">
              <div className="text-muted" style={{ fontSize: 12 }}>Payout / banking</div>
              <div className="fw-semibold">Configure in Organization → Payouts</div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* STEP 3: Documents + Directors */}
      {step === 3 ? (
        <Card title="Documents & Directors" subtitle="Replace documents and update directors/partners">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Trade License Document *</label>
              <input
                type="file"
                className="form-control"
                disabled={busy}
                onChange={(e) => e.target.files?.[0] && handleTradeLicenseUpload(e.target.files[0])}
              />
              <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                {docs.TRADE_LICENSE ? `Uploaded: ${docs.TRADE_LICENSE.fileName}` : "Not uploaded"}
              </div>
            </div>

            {/* Existing documents list */}
            <div className="col-12">
              <div className="fw-semibold mb-2">Existing Documents</div>

              {documents?.length ? (
                <div className="row g-2">
                  {documents.map((doc, idx) => {
                    const url = getDocUrl(doc);
                    const updated = isDocUpdated(doc);
                    return (
                      <div className="col-md-6" key={doc?.id || idx}>
                        <div className="border radius-12 p-12 d-flex align-items-center justify-content-between">
                          <div>
                            <div className="fw-semibold" style={{ fontSize: 13 }}>
                              {String(doc?.type || "DOCUMENT").replace(/_/g, " ")}{" "}
                              {updated ? (
                                <span className="badge bg-warning-focus text-warning-main radius-16 px-10 py-6 ms-2">
                                  UPDATED
                                </span>
                              ) : null}
                            </div>
                            <div className="text-secondary-light" style={{ fontSize: 12 }}>
                              {doc?.fileId ? `fileId: ${doc.fileId}` : "—"}
                            </div>
                          </div>

                          <div className="d-flex gap-8">
                            {url ? (
                              <a className="btn btn-outline-primary btn-sm" href={url} target="_blank">
                                View
                              </a>
                            ) : null}
                            <button
                              type="button"
                              className="btn btn-outline-warning btn-sm"
                              onClick={() => {
                                setReplacingDoc(doc);
                                setReplaceError("");
                              }}
                            >
                              Replace
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-secondary-light" style={{ fontSize: 13 }}>
                  No documents found.
                </div>
              )}

              {/* Replace inline modal */}
              {replacingDoc ? (
                <div className="mt-12 border radius-12 p-12">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="fw-semibold">
                      Replace: {String(replacingDoc?.type || "").replace(/_/g, " ")}
                    </div>
                    <button
                      className="btn btn-light btn-sm"
                      disabled={replaceBusy}
                      onClick={() => setReplacingDoc(null)}
                    >
                      Close
                    </button>
                  </div>

                  {replaceError ? <Alert type="danger">{replaceError}</Alert> : null}

                  <label className="form-label mt-2">Select new file</label>
                  <input
                    type="file"
                    className="form-control"
                    disabled={replaceBusy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleReplaceUpload(f);
                      e.target.value = "";
                    }}
                  />
                  <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                    {replaceBusy ? "Uploading & updating..." : "File will be uploaded and document will be updated."}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Directors */}
            <div className="col-12">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="fw-semibold">Directors / Partners</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    Add at least one responsible person
                  </div>
                </div>

                <div className="d-flex gap-8">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => setDirectors((p) => [...p, { name: "", role: "Director", mobile: "", email: "" }])}
                  >
                    Add Person
                  </button>
                  <button type="button" className="btn btn-outline-secondary btn-sm" disabled={busy} onClick={saveDraft}>
                    Save Directors
                  </button>
                </div>
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
                        />
                      </div>
                    </div>

                    {directors.length > 1 ? (
                      <div className="text-end mt-2">
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => setDirectors((p) => p.filter((_, i) => i !== idx))}
                        >
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

      {/* STEP 4: Review */}
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
                {basic.orgTypeCode
                  ? orgTypes.find((x) => x.code === basic.orgTypeCode)?.nameEn || basic.orgTypeCode
                  : "-"}
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
              <div className="text-muted" style={{ fontSize: 12 }}>Payout / banking</div>
              <div className="fw-semibold">Configure in Organization → Payouts</div>
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

      {/* Footer controls */}
      <div className="d-flex justify-content-between mt-3">
        <button className="btn btn-outline-secondary" disabled={busy || step === 1} onClick={() => goStep(step - 1)}>
          Back
        </button>
        <div className="d-flex gap-8 flex-wrap">
          <button className="btn btn-outline-secondary" disabled={busy} onClick={saveBusiness}>
            Save Business
          </button>
          <button className="btn btn-outline-secondary" disabled={busy} onClick={saveDraft}>
            Save Draft
          </button>

          {step < 4 ? (
            <button className="btn btn-primary" disabled={busy || !canNext} onClick={() => goStep(step + 1)}>
              Next
            </button>
          ) : (
            <button className="btn btn-success" disabled={busy} onClick={submit}>
              Submit for Verification
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EditOrganizationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [hydrateToken, setHydrateToken] = useState(1);
  const [initialState, setInitialState] = useState(null);
  const [orgStatus, setOrgStatus] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      setLoading(true);
      setLoadError("");
      try {
        const data = await apiGet(`/api/v1/owner/organizations/${id}`);
        if (!alive) return;

        setOrgStatus(data?.status || null);

        const addr = data?.addressJson || {};
        const lp = data?.legalProfile || {};

        const dirs = lp?.directors || lp?.directorsJson || lp?.directorList || null;
        const directors =
          Array.isArray(dirs) && dirs.length
            ? dirs.map((d) => ({
                name: d?.name || "",
                role: d?.role || "Director",
                mobile: d?.mobile || "",
                email: d?.email || "",
              }))
            : [{ name: "", role: "Owner", mobile: "", email: "" }];

        const documents = Array.isArray(lp?.documents) ? lp.documents : [];
        const tl = documents.find((d) => String(d?.type || "").toUpperCase() === "TRADE_LICENSE");
        const docs = {
          TRADE_LICENSE: tl
            ? {
                fileName: tl?.originalName || tl?.fileName || "TRADE_LICENSE",
                fileId: tl?.fileId || tl?.mediaId || tl?.media?.id || null,
              }
            : null,
        };

        setInitialState({
          basic: {
            name: data?.name || "",
            supportPhone: data?.supportPhone || "",
            supportEmail: data?.owner?.ownerProfile?.supportEmail || addr?.supportEmail || "",
            whatsappNumber: addr?.whatsappNumber || "",
            alternatePhone: addr?.alternatePhone || "",
            orgTypeCode: addr?.orgTypeCode || "",
            addressText: addr?.text || "",
          },
          location: {
            kind: addr?.locationKind || data?.locationKind || null,
            countryCode: addr?.countryCode || null,
            divisionId: addr?.divisionId || null,
            districtId: addr?.districtId || null,
            upazilaId: addr?.upazilaId || null,
            bdAreaId: addr?.bdAreaId || data?.bdAreaId || null,
            cityCorporationId: addr?.cityCorporationId || data?.cityCorporationId || null,
            cityCorporationCode: addr?.cityCorporationCode || data?.cityCorporationCode || null,
            dhakaAreaId: addr?.dhakaAreaId || data?.dhakaAreaId || null,
            latitude: data?.location?.lat ?? addr?.latitude ?? data?.latitude ?? null,
            longitude: data?.location?.lng ?? addr?.longitude ?? data?.longitude ?? null,
            lat: data?.location?.lat ?? addr?.lat ?? null,
            lng: data?.location?.lng ?? addr?.lng ?? null,
            addressLine: data?.location?.address ?? addr?.addressLine ?? null,
            city: data?.location?.city ?? addr?.cityName ?? null,
            cityName: data?.location?.city ?? addr?.cityName ?? null,
            state: data?.location?.state ?? addr?.stateName ?? null,
            stateName: data?.location?.state ?? addr?.stateName ?? null,
            countryName: data?.location?.country ?? addr?.countryName ?? null,
            postalCode: data?.location?.postalCode ?? addr?.postalCode ?? null,
            fullPathText: addr?.fullPathText || data?.fullPathText || null,
            text: addr?.fullPathText || data?.fullPathText || null,
          },
          legal: {
            registrationType: lp?.registrationType || "PROPRIETORSHIP",
            tradeLicenseNumber: lp?.tradeLicenseNumber || "",
            tradeLicenseIssueDate: lp?.tradeLicenseIssueDate
              ? new Date(lp.tradeLicenseIssueDate).toISOString().split("T")[0]
              : "",
            tradeLicenseExpiryDate: lp?.tradeLicenseExpiryDate
              ? new Date(lp.tradeLicenseExpiryDate).toISOString().split("T")[0]
              : "",
            issuingAuthority: lp?.issuingAuthority || "",
            tinNumber: lp?.tinNumber || "",
            binNumber: lp?.binNumber || "",
            officialEmail: lp?.officialEmail || "",
            officialPhone: lp?.officialPhone || "",
            website: lp?.website || "",
            facebookPage: lp?.facebookPage || "",
          },
          directors,
          typeSpecific: addr?.typeSpecific || {},
          docs,
        });
        setHydrateToken((t) => t + 1);
      } catch (e) {
        if (!alive) return;
        setLoadError(e?.message || "Failed to load organization");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  async function saveBusiness(state) {
    const loc = state?.location || {};
    await apiPut(`/api/v1/owner/organizations/${id}`, {
      name: state?.basic?.name,
      supportPhone: state?.basic?.supportPhone,
      supportEmail: state?.basic?.supportEmail || null,

      cityCorporationId: loc.cityCorporationId || null,
      dhakaAreaId: loc.dhakaAreaId || null,
      bdAreaId: loc.bdAreaId || null,
      fullPathText: loc.fullPathText || loc.text || null,

      addressJson: {
        text: state?.basic?.addressText || "",
        orgTypeCode: state?.basic?.orgTypeCode,
        locationKind: loc.kind || null,
        countryCode: loc.countryCode || null,
        divisionId: loc.divisionId || null,
        districtId: loc.districtId || null,
        upazilaId: loc.upazilaId || null,
        cityCorporationId: loc.cityCorporationId || null,
        cityCorporationCode: loc.cityCorporationCode || null,
        dhakaAreaId: loc.dhakaAreaId || null,
        bdAreaId: loc.bdAreaId || null,
        fullPathText: loc.fullPathText || loc.text || null,
        latitude: loc.latitude ?? loc.lat ?? null,
        longitude: loc.longitude ?? loc.lng ?? null,
        whatsappNumber: state?.basic?.whatsappNumber || null,
        alternatePhone: state?.basic?.alternatePhone || null,
        typeSpecific: state?.typeSpecific || {},
      },
      location: {
        lat: loc.lat ?? loc.latitude ?? null,
        lng: loc.lng ?? loc.longitude ?? null,
        address: loc.addressLine || loc.formattedAddress || "",
        city: loc.city || loc.cityName || "",
        state: loc.state || loc.stateName || "",
        country: loc.countryName || "Bangladesh",
        postalCode: loc.postalCode || "",
      },
    });
  }

  async function saveLegalDraft(state) {
    await apiPost(`/api/v1/owner/organizations/${id}/legal-profile/save-draft`, {
      organizationName: state?.basic?.name,
      registrationType: state?.legal?.registrationType,
      tradeLicenseNumber: state?.legal?.tradeLicenseNumber,
      tradeLicenseIssueDate: state?.legal?.tradeLicenseIssueDate || null,
      tradeLicenseExpiryDate: state?.legal?.tradeLicenseExpiryDate || null,
      issuingAuthority: state?.legal?.issuingAuthority,
      tinNumber: state?.legal?.tinNumber,
      binNumber: state?.legal?.binNumber,
      officialEmail: state?.legal?.officialEmail,
      officialPhone: state?.legal?.officialPhone || state?.basic?.supportPhone,
      website: state?.legal?.website,
      facebookPage: state?.legal?.facebookPage,
    });
    await apiPost(`/api/v1/owner/organizations/${id}/legal-profile/save-directors`, {
      directors: state?.directors || [],
    });
  }

  async function onSaveDraft(state) {
    await saveBusiness(state);
    await saveLegalDraft(state);
    return "Draft saved.";
  }

  async function onUploadTradeLicense(file) {
    const fileId = await uploadMedia(file);
    await apiPost(`/api/v1/owner/organizations/${id}/legal-profile/add-document`, {
      type: "TRADE_LICENSE",
      fileId,
      mediaId: fileId,
    });
    return { fileName: file.name, fileId };
  }

  async function onSubmit(state) {
    await onSaveDraft(state);
    await apiPost(`/api/v1/owner/organizations/${id}/legal-profile/submit`, {});
    router.push(`/owner/organizations/${id}`);
  }

  if (loading) return <div className="p-30 text-center">Loading...</div>;
  if (loadError) return <div className="p-30 text-center text-danger">{loadError}</div>;

  return (
    <OrganizationWizardForm
      title="Edit Organization"
      subtitle="Update business/legal/documents then submit for verification if needed."
      badge={id ? `Org ID: ${id}` : null}
      status={orgStatus}
      readOnly={orgStatus === "APPROVED"}
      hydrateToken={hydrateToken}
      initialState={initialState}
      onSaveDraft={onSaveDraft}
      onSubmit={onSubmit}
      onUploadTradeLicense={onUploadTradeLicense}
    />
  );
}
