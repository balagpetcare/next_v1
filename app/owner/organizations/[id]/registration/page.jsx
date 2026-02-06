"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import LocationField from "@/src/components/location/LocationField";
import { normalizeLocation, withLegacyLocationFields, locationValueToAddressJson } from "@/src/lib/location/normalizeLocation";
import StatusBadge from "@/app/owner/_components/StatusBadge";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

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

async function apiReq(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : JSON.stringify(body || {}),
    credentials: "include",
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.success) throw new Error(j?.message || `Request failed (${res.status})`);
  return j.data;
}

function norm(s) {
  return String(s || "").toUpperCase();
}

const DOC_TYPE_OPTIONS = [
  { value: "TRADE_LICENSE", label: "Trade License", required: true },
  { value: "NID", label: "NID", required: false },
  { value: "TIN", label: "TIN", required: false },
  { value: "BIN", label: "BIN/VAT", required: false },
  { value: "BANK_STATEMENT", label: "Bank Statement", required: false },
  { value: "OTHER", label: "Other", required: false },
];

function docLabel(v) {
  return DOC_TYPE_OPTIONS.find((x) => x.value === v)?.label || v;
}

function mediaViewUrl(d) {
  // Your backend may return: url OR fileUrl OR fileId (or legacy mediaId)
  if (d?.url) return d.url;
  if (d?.fileUrl) return d.fileUrl;
  if (d?.file?.url) return d.file.url;

  const id = d?.fileId ?? d?.mediaId ?? d?.media?.id;
  if (id) return `${API_BASE}/api/v1/media/${id}`;
  return null;
}

function mediaDownloadUrl(d) {
  if (d?.downloadUrl) return d.downloadUrl;
  if (d?.fileDownloadUrl) return d.fileDownloadUrl;

  const id = d?.fileId ?? d?.mediaId ?? d?.media?.id;
  if (id) return `${API_BASE}/api/v1/media/${id}/download`;
  return null;
}

function StepPill({ active, done, children, onClick }) {
  const cls = active
    ? "bg-primary-50 text-primary-600 border-primary"
    : done
    ? "bg-success-focus text-success-main border-success"
    : "bg-white text-dark border";

  return (
    <button type="button" className={`btn w-100 text-start border radius-12 px-12 py-10 ${cls}`} onClick={onClick}>
      <div className="d-flex align-items-center justify-content-between gap-2">
        <div className="fw-semibold" style={{ fontSize: 14 }}>
          {children}
        </div>
        <div style={{ fontSize: 12 }} className={done ? "text-success-main" : "text-muted"}>
          {done ? "Done" : active ? "Current" : ""}
        </div>
      </div>
    </button>
  );
}

function SectionCard({ title, subtitle, right, children }) {
  return (
    <div className="card radius-12 mb-3">
      <div className="card-body p-24">
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-12">
          <div>
            <h6 className="mb-1">{title}</h6>
            {subtitle ? (
              <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.4 }}>
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

function InfoRow({ label, value }) {
  return (
    <div className="d-flex justify-content-between gap-3 py-10 border-bottom">
      <div className="text-secondary">{label}</div>
      <div className="fw-semibold text-end" style={{ maxWidth: 420 }}>
        {value ?? "-"}
      </div>
    </div>
  );
}

function DocumentsEditor({ orgId, locked, documents, busy, onUpload }) {
  const grouped = useMemo(() => {
    const map = new Map();
    for (const d of Array.isArray(documents) ? documents : []) {
      const key = norm(d?.type || d?.docType || "OTHER");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(d);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => {
        const av = Number(a?.version || 0);
        const bv = Number(b?.version || 0);
        if (bv !== av) return bv - av;
        const at = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });
      map.set(k, arr);
    }
    return map;
  }, [documents]);

  return (
    <div className="table-responsive">
      <table className="table align-middle mb-0">
        <thead>
          <tr>
            <th style={{ minWidth: 180 }}>Document</th>
            <th style={{ width: 160 }}>Latest</th>
            <th style={{ width: 140 }}>Updated</th>
            <th style={{ minWidth: 280 }}>Replace / Update</th>
            <th className="text-end" style={{ width: 160 }}></th>
          </tr>
        </thead>
        <tbody>
          {DOC_TYPE_OPTIONS.map((slot) => {
            const list = grouped.get(slot.value) || [];
            const latest = list[0] || null;
            const latestWhen = latest?.createdAt ? new Date(latest.createdAt).toLocaleString() : "—";
            const st = norm(latest?.verificationStatus || latest?.status || (latest ? "UPLOADED" : "UNSUBMITTED"));

            const view = latest ? mediaViewUrl(latest) : null;
            const dl = latest ? mediaDownloadUrl(latest) : null;

            return (
              <tr key={slot.value}>
                <td>
                  <div className="fw-semibold">
                    {slot.label} {slot.required ? <span className="text-danger">*</span> : null}
                  </div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    {latest ? `v${latest?.version || 1}` : "Not uploaded"}
                    {list.length > 1 ? ` • ${list.length} versions` : ""}
                  </div>
                </td>

                <td>
                  <StatusBadge status={st} />
                </td>

                <td style={{ fontSize: 13 }}>
                  {latestWhen}
                </td>

                <td>
                  <input
                    type="file"
                    className="form-control"
                    disabled={busy || locked}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUpload(slot.value, f);
                      e.currentTarget.value = "";
                    }}
                  />
                  <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                    {locked ? "Locked after approval" : "Upload a new file to update this document (creates new version)."}
                  </div>

                  {list.length > 1 ? (
                    <details className="mt-2">
                      <summary className="text-muted" style={{ fontSize: 12, cursor: "pointer" }}>
                        View version history
                      </summary>
                      <div className="mt-2 border radius-12 p-12">
                        <div className="table-responsive">
                          <table className="table table-sm align-middle mb-0">
                            <thead>
                              <tr>
                                <th style={{ width: 90 }}>Version</th>
                                <th>Uploaded</th>
                                <th style={{ width: 120 }}>Status</th>
                                <th className="text-end" style={{ width: 160 }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {list.map((it) => {
                                const itSt = norm(it?.verificationStatus || it?.status || "UPLOADED");
                                const itWhen = it?.createdAt ? new Date(it.createdAt).toLocaleString() : "—";
                                const itView = mediaViewUrl(it);
                                const itDl = mediaDownloadUrl(it);
                                return (
                                  <tr key={it.id || `${slot.value}-${itWhen}`}> 
                                    <td>v{it?.version || 1}</td>
                                    <td>{itWhen}</td>
                                    <td><StatusBadge status={itSt} /></td>
                                    <td className="text-end">
                                      {itView ? (
                                        <a className="btn btn-outline-secondary btn-sm me-2" href={itView} target="_blank" rel="noreferrer">
                                          View
                                        </a>
                                      ) : null}
                                      {itDl ? (
                                        <a className="btn btn-outline-primary btn-sm" href={itDl} target="_blank" rel="noreferrer">
                                          Download
                                        </a>
                                      ) : null}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </details>
                  ) : null}
                </td>

                <td className="text-end">
                  {view ? (
                    <a className="btn btn-outline-secondary btn-sm me-2" href={view} target="_blank" rel="noreferrer">
                      View
                    </a>
                  ) : null}
                  {dl ? (
                    <a className="btn btn-outline-primary btn-sm" href={dl} target="_blank" rel="noreferrer">
                      Download
                    </a>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="text-muted mt-12" style={{ fontSize: 12 }}>
        Tip: Always upload clear images/PDF. Admin will review the latest version.
      </div>
    </div>
  );
}

export default function OrganizationRegistrationEditPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params?.id;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [org, setOrg] = useState(null);
  const [basic, setBasic] = useState({ name: "", supportPhone: "", addressText: "", orgTypeCode: "" });
  const normalizeLoc = (loc) => {
    const n = normalizeLocation(loc, "BD");
    return n ? withLegacyLocationFields(n, loc || {}) : loc || { countryCode: "BD" };
  };
  const [location, setLocation] = useState(() => normalizeLoc({ countryCode: "BD" }));
  const [legal, setLegal] = useState({
    registrationType: "PROPRIETORSHIP",
    tradeLicenseNumber: "",
    issuingAuthority: "",
    tinNumber: "",
    binNumber: "",
    officialEmail: "",
    website: "",
    facebookPage: "",
  });
  const [directors, setDirectors] = useState([{ name: "", role: "Owner", mobile: "", email: "" }]);

  const orgStatus = norm(org?.status);
  const legalStatus = norm(org?.legalProfile?.verificationStatus);

  // ✅ NEW RULE: edit stays ON until approved
  const locked = orgStatus === "APPROVED";

  const documents = useMemo(() => {
    const lp = org?.legalProfile;
    return Array.isArray(lp?.documents) ? lp.documents : [];
  }, [org]);

  const stepDone = useMemo(() => {
    const businessDone = !!basic.name && !!basic.supportPhone && (!!location?.bdAreaId || !!location?.dhakaAreaId) && !!(location?.fullPathText || location?.text);
    const legalDone = !!legal.tradeLicenseNumber;
    const hasTrade = documents.some((d) => norm(d?.type || d?.docType) === "TRADE_LICENSE");
    const docsDone = hasTrade;
    const reviewDone = businessDone && legalDone && docsDone;
    return { businessDone, legalDone, docsDone, reviewDone, hasTrade };
  }, [basic, location, legal, documents]);

  useEffect(() => {
    if (!orgId) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      setNotice("");
      try {
        const j = await ownerGet(`/api/v1/owner/organizations/${orgId}`);
        const o = j?.data || j;
        if (!alive) return;
        setOrg(o);

        setBasic({
          name: o?.name || "",
          supportPhone: o?.supportPhone || "",
          addressText: o?.addressJson?.text || "",
          orgTypeCode: o?.addressJson?.orgTypeCode || "",
        });

        setLocation(
          normalizeLoc({
            ...o?.addressJson,
            kind: o?.addressJson?.locationKind || null,
            cityCorporationId: o?.addressJson?.cityCorporationId || null,
            cityCorporationCode: o?.addressJson?.cityCorporationCode || null,
            dhakaAreaId: o?.addressJson?.dhakaAreaId || o?.addressJson?.areaId || null,
            bdAreaId: o?.addressJson?.bdAreaId || null,
            fullPathText: o?.addressJson?.fullPathText || o?.addressJson?.locationText || null,
            text: o?.addressJson?.fullPathText || o?.addressJson?.locationText || null,
            countryCode: o?.addressJson?.countryCode || "BD",
          })
        );

        const lp = o?.legalProfile;
        setLegal((p) => ({
          ...p,
          registrationType: lp?.registrationType || "PROPRIETORSHIP",
          tradeLicenseNumber: lp?.tradeLicenseNumber || "",
          issuingAuthority: lp?.issuingAuthority || "",
          tinNumber: lp?.tinNumber || "",
          binNumber: lp?.binNumber || "",
          officialEmail: lp?.officialEmail || "",
          website: lp?.website || "",
          facebookPage: lp?.facebookPage || "",
        }));

        const dRows = Array.isArray(lp?.directors) ? lp.directors : [];
        if (dRows.length) {
          setDirectors(dRows.map((d) => ({ name: d.name || "", role: d.role || "", mobile: d.mobile || "", email: d.email || "" })));
        }
      } catch (e) {
        if (alive) setError(e?.message || "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [orgId]);

  function setBasicField(k, v) {
    setBasic((p) => ({ ...p, [k]: v }));
  }
  function setLegalField(k, v) {
    setLegal((p) => ({ ...p, [k]: v }));
  }

  async function reloadOrg() {
    if (!orgId) return;
    const fresh = await ownerGet(`/api/v1/owner/organizations/${orgId}`);
    setOrg(fresh?.data || fresh);
  }

  async function updateBusiness() {
    if (!orgId) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const addressJson = {
        ...locationValueToAddressJson(location, { addressText: basic.addressText || "" }),
        orgTypeCode: basic.orgTypeCode || null,
        locationKind: location?.kind || null,
      };
      await apiReq("PUT", `/api/v1/owner/organizations/${orgId}`, {
        name: basic.name,
        supportPhone: basic.supportPhone,
        cityCorporationId: addressJson.cityCorporationId || null,
        dhakaAreaId: addressJson.dhakaAreaId || null,
        bdAreaId: addressJson.bdAreaId || addressJson.areaId || null,
        fullPathText: addressJson.fullPathText || addressJson.formattedAddress || null,
        addressJson,
      });
      await reloadOrg();
      setNotice("Business information updated.");
    } catch (e) {
      setError(e?.message || "Failed to update business info");
    } finally {
      setBusy(false);
    }
  }

  async function updateLegal() {
    if (!orgId) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await apiReq("POST", `/api/v1/owner/organizations/${orgId}/legal-profile/save-draft`, {
        organizationName: basic.name,
        registrationType: legal.registrationType,
        tradeLicenseNumber: legal.tradeLicenseNumber,
        issuingAuthority: legal.issuingAuthority,
        tinNumber: legal.tinNumber,
        binNumber: legal.binNumber,
        officialEmail: legal.officialEmail,
        website: legal.website,
        facebookPage: legal.facebookPage,
        officialPhone: basic.supportPhone,
      });

      await apiReq("POST", `/api/v1/owner/organizations/${orgId}/legal-profile/save-directors`, { directors });
      await reloadOrg();
      setNotice("Legal information updated.");
    } catch (e) {
      setError(e?.message || "Failed to update legal info");
    } finally {
      setBusy(false);
    }
  }

  async function uploadDocument(docType, file) {
    if (!orgId || !file) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const fileId = await uploadMedia(file);
      // backend may expect fileId OR legacy mediaId; send both for compatibility
      await apiReq("POST", `/api/v1/owner/organizations/${orgId}/legal-profile/add-document`, {
        type: docType,
        fileId,
        mediaId: fileId,
      });
      await reloadOrg();
      setNotice(`${docLabel(docType)} updated.`);
    } catch (e) {
      setError(e?.message || "Document upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitForVerification() {
    if (!orgId) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      // Encourage saving per-section first, but allow direct submit.
      await apiReq("POST", `/api/v1/owner/organizations/${orgId}/legal-profile/submit`, {});
      setNotice("Submitted for verification.");
      router.push(`/owner/organizations/${orgId}`);
    } catch (e) {
      setError(e?.message || "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-fluid" style={{ maxWidth: 1150 }}>
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-0">Organization Registration (Edit)</h4>
          <div className="text-muted" style={{ fontSize: 13 }}>
            Step-by-step update: Business, Legal, Documents, then Review.
          </div>

          <div className="d-flex gap-2 mt-2 flex-wrap" style={{ fontSize: 13 }}>
            <div>
              Org: <StatusBadge status={orgStatus || "—"} />
            </div>
            <div>
              Trade License: <StatusBadge status={legalStatus || "UNSUBMITTED"} />
            </div>
            <div>
              Edit mode: <StatusBadge status={locked ? "LOCKED" : "ON"} />
            </div>
          </div>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <Link className="btn btn-outline-secondary" href={`/owner/organizations/${orgId}`}>
            ← Back
          </Link>
          <button className="btn btn-outline-secondary" disabled={busy || loading} onClick={reloadOrg}>
            Refresh
          </button>
          <button
            className="btn btn-success"
            disabled={busy || loading || locked || !stepDone.reviewDone}
            onClick={submitForVerification}
            title={!stepDone.reviewDone ? "Complete required steps (Business + Legal + Trade License)" : ""}
          >
            Submit
          </button>
        </div>
      </div>

      {locked ? (
        <div className="alert alert-info">
          This organization is <b>Approved</b>. Editing is locked. To change approved data, request a change from the verification flow.
        </div>
      ) : null}

      {legalStatus === "SUBMITTED" ? (
        <div className="alert alert-info">
          <b>Submitted:</b> You can still update Business, Legal, and Documents until it is approved. If you update anything, please submit again.
        </div>
      ) : null}

      {legalStatus === "REJECTED" && (org?.legalProfile?.rejectionReason || org?.legalProfile?.reviewNote) ? (
        <div className="alert alert-danger">
          <b>Rejected:</b> {org?.legalProfile?.rejectionReason || org?.legalProfile?.reviewNote}
          <div className="mt-2">Update the required fields/documents and submit again.</div>
        </div>
      ) : null}

      {error ? <div className="alert alert-danger">{error}</div> : null}
      {notice ? <div className="alert alert-success">{notice}</div> : null}

      <div className="row g-3">
        {/* Stepper */}
        <div className="col-lg-3">
          <div className="card radius-12" style={{ position: "sticky", top: 18 }}>
            <div className="card-body p-24">
              <h6 className="mb-12">Steps</h6>
              <div className="d-flex flex-column gap-10">
                <StepPill active={step === 1} done={stepDone.businessDone} onClick={() => setStep(1)}>
                  Business
                </StepPill>
                <StepPill active={step === 2} done={stepDone.legalDone} onClick={() => setStep(2)}>
                  Legal
                </StepPill>
                <StepPill active={step === 3} done={stepDone.docsDone} onClick={() => setStep(3)}>
                  Documents
                </StepPill>
                <StepPill active={step === 4} done={stepDone.reviewDone} onClick={() => setStep(4)}>
                  Review
                </StepPill>
              </div>

              <hr className="my-16" />

              <div className="text-muted" style={{ fontSize: 12 }}>
                Each section has its own <b>Update</b> button.
              </div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="col-lg-9">
          {loading ? <div className="card radius-12"><div className="card-body p-24">Loading...</div></div> : null}

          {!loading && step === 1 ? (
            <SectionCard
              title="Business Information"
              subtitle="Update organization name, phone, address and business location."
              right={
                <button className="btn btn-primary" disabled={busy || locked} onClick={updateBusiness}>
                  {busy ? "Updating..." : "Update Business"}
                </button>
              }
            >
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Organization Name *</label>
                  <input className="form-control" value={basic.name} onChange={(e) => setBasicField("name", e.target.value)} disabled={locked} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Support Phone *</label>
                  <input className="form-control" value={basic.supportPhone} onChange={(e) => setBasicField("supportPhone", e.target.value)} disabled={locked} />
                </div>

                <div className="col-12">
                  <LocationField
                    value={location}
                    onChange={(n) => setLocation(normalizeLoc(n))}
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
                  <textarea className="form-control" rows={3} value={basic.addressText} onChange={(e) => setBasicField("addressText", e.target.value)} disabled={locked} />
                </div>

                {!stepDone.businessDone ? (
                  <div className="col-12">
                    <div className="alert alert-warning mb-0">
                      Required: Organization Name, Support Phone, and Location must be selected.
                    </div>
                  </div>
                ) : null}
              </div>
            </SectionCard>
          ) : null}

          {!loading && step === 2 ? (
            <SectionCard
              title="Legal Information"
              subtitle="Update trade license number and other legal information."
              right={
                <button className="btn btn-primary" disabled={busy || locked} onClick={updateLegal}>
                  {busy ? "Updating..." : "Update Legal"}
                </button>
              }
            >
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Registration Type</label>
                  <select className="form-select" value={legal.registrationType} onChange={(e) => setLegalField("registrationType", e.target.value)} disabled={locked}>
                    <option value="PROPRIETORSHIP">Proprietorship</option>
                    <option value="PARTNERSHIP">Partnership</option>
                    <option value="LIMITED_COMPANY">Limited Company</option>
                    <option value="NGO">NGO</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Trade License Number *</label>
                  <input className="form-control" value={legal.tradeLicenseNumber} onChange={(e) => setLegalField("tradeLicenseNumber", e.target.value)} disabled={locked} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Issuing Authority</label>
                  <input className="form-control" value={legal.issuingAuthority} onChange={(e) => setLegalField("issuingAuthority", e.target.value)} disabled={locked} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">TIN Number</label>
                  <input className="form-control" value={legal.tinNumber} onChange={(e) => setLegalField("tinNumber", e.target.value)} disabled={locked} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">BIN/VAT Number</label>
                  <input className="form-control" value={legal.binNumber} onChange={(e) => setLegalField("binNumber", e.target.value)} disabled={locked} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Official Email</label>
                  <input className="form-control" value={legal.officialEmail} onChange={(e) => setLegalField("officialEmail", e.target.value)} disabled={locked} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Website</label>
                  <input className="form-control" value={legal.website} onChange={(e) => setLegalField("website", e.target.value)} disabled={locked} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Facebook Page</label>
                  <input className="form-control" value={legal.facebookPage} onChange={(e) => setLegalField("facebookPage", e.target.value)} disabled={locked} />
                </div>

                <div className="col-12">
                  <div className="border radius-12 p-16">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-10">
                      <div className="fw-semibold">Directors / Partners</div>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={locked}
                        onClick={() => setDirectors((p) => [...p, { name: "", role: "Director", mobile: "", email: "" }])}
                      >
                        Add
                      </button>
                    </div>

                    <div className="d-flex flex-column gap-10">
                      {directors.map((d, idx) => (
                        <div key={idx} className="border radius-12 p-12">
                          <div className="row g-2 align-items-end">
                            <div className="col-md-3">
                              <label className="form-label mb-1">Name</label>
                              <input
                                className="form-control"
                                value={d.name}
                                disabled={locked}
                                onChange={(e) =>
                                  setDirectors((p) => p.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                                }
                              />
                            </div>
                            <div className="col-md-2">
                              <label className="form-label mb-1">Role</label>
                              <input
                                className="form-control"
                                value={d.role}
                                disabled={locked}
                                onChange={(e) =>
                                  setDirectors((p) => p.map((x, i) => (i === idx ? { ...x, role: e.target.value } : x)))
                                }
                              />
                            </div>
                            <div className="col-md-3">
                              <label className="form-label mb-1">Mobile</label>
                              <input
                                className="form-control"
                                value={d.mobile}
                                disabled={locked}
                                onChange={(e) =>
                                  setDirectors((p) => p.map((x, i) => (i === idx ? { ...x, mobile: e.target.value } : x)))
                                }
                              />
                            </div>
                            <div className="col-md-3">
                              <label className="form-label mb-1">Email</label>
                              <input
                                className="form-control"
                                value={d.email}
                                disabled={locked}
                                onChange={(e) =>
                                  setDirectors((p) => p.map((x, i) => (i === idx ? { ...x, email: e.target.value } : x)))
                                }
                              />
                            </div>
                            <div className="col-md-1 text-end">
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                disabled={locked || directors.length === 1}
                                onClick={() => setDirectors((p) => p.filter((_, i) => i !== idx))}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                      After editing directors, click <b>Update Legal</b>.
                    </div>
                  </div>
                </div>

                {!stepDone.legalDone ? (
                  <div className="col-12">
                    <div className="alert alert-warning mb-0">Trade License Number is required.</div>
                  </div>
                ) : null}
              </div>
            </SectionCard>
          ) : null}

          {!loading && step === 3 ? (
            <SectionCard
              title="Documents"
              subtitle="See what you uploaded, view versions, and upload new files to update documents."
              right={
                <button className="btn btn-outline-secondary" disabled={busy} onClick={reloadOrg}>
                  Refresh Docs
                </button>
              }
            >
              <DocumentsEditor orgId={orgId} locked={locked} documents={documents} busy={busy} onUpload={uploadDocument} />

              {!stepDone.docsDone ? (
                <div className="alert alert-warning mt-3 mb-0">
                  Trade License document is required. Please upload it to proceed.
                </div>
              ) : null}
            </SectionCard>
          ) : null}

          {!loading && step === 4 ? (
            <SectionCard
              title="Review"
              subtitle="Check everything before submitting for verification."
              right={
                <button className="btn btn-success" disabled={busy || locked || !stepDone.reviewDone} onClick={submitForVerification}>
                  Submit
                </button>
              }
            >
              <div className="border radius-12 p-16">
                <InfoRow label="Organization Name" value={basic.name || "-"} />
                <InfoRow label="Support Phone" value={basic.supportPhone || "-"} />
                <InfoRow label="Location" value={location?.fullPathText || location?.text || "-"} />
                <InfoRow label="Trade License Number" value={legal.tradeLicenseNumber || "-"} />
                <InfoRow label="Trade License Document" value={stepDone.hasTrade ? "Uploaded" : "Not uploaded"} />
              </div>

              {!stepDone.reviewDone ? (
                <div className="alert alert-warning mt-3 mb-0">
                  Complete required steps:
                  <ul className="mb-0 mt-2">
                    {!stepDone.businessDone ? <li>Business: name, phone, location</li> : null}
                    {!stepDone.legalDone ? <li>Legal: trade license number</li> : null}
                    {!stepDone.docsDone ? <li>Documents: trade license upload</li> : null}
                  </ul>
                </div>
              ) : (
                <div className="alert alert-success mt-3 mb-0">
                  Ready to submit. Click <b>Submit</b> to send for admin verification.
                </div>
              )}
            </SectionCard>
          ) : null}

          {!loading ? (
            <div className="card radius-12" style={{ position: "sticky", bottom: 12, zIndex: 10 }}>
              <div className="card-body p-16 d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {locked
                    ? "Approved — editing locked"
                    : stepDone.reviewDone
                    ? "All required steps complete. You can submit now."
                    : "Update each section using its Update button."
                  }
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <button
                    className="btn btn-outline-secondary"
                    disabled={busy || loading}
                    onClick={() => setStep((s) => Math.max(1, s - 1))}
                  >
                    Back
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={busy || loading || (step === 1 && !stepDone.businessDone) || (step === 2 && !stepDone.legalDone) || (step === 3 && !stepDone.docsDone)}
                    onClick={() => setStep((s) => Math.min(4, s + 1))}
                    title={step === 1 && !stepDone.businessDone ? "Complete Business section first" : step === 2 && !stepDone.legalDone ? "Complete Legal section first" : step === 3 && !stepDone.docsDone ? "Upload trade license first" : ""}
                  >
                    Next
                  </button>
                  <button
                    className="btn btn-success"
                    disabled={busy || loading || locked || !stepDone.reviewDone}
                    onClick={submitForVerification}
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
