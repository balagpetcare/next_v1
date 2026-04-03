"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getOwnerKyc,
  putOwnerKycDraft,
  submitOwnerKyc,
} from "../_lib/kycApi";
import { kycIdentitySchema } from "../_lib/kycSchema";
import {
  presentAddressJsonToInternationalAddress,
  internationalAddressToPresentAddressJson,
} from "../_lib/addressAdapter";
import KycPageShell from "./KycPageShell";
import KycAddressForm from "./KycAddressForm";
import KycDocumentsForm from "./KycDocumentsForm";
import KycReviewSubmit from "./KycReviewSubmit";
import NationalitySelect from "./NationalitySelect";
import {
  getNationalityByCode,
  getNationalityByDemonym,
} from "../_data/nationalities";
import type { InternationalAddress } from "../_types/kyc";
import type { KycDocumentType } from "../_types/kyc";
import { ShieldCheck, FileText, Upload, CheckCircle, Info } from "lucide-react";

const REQUIRED_DOCS = ["NID_FRONT", "NID_BACK", "SELFIE_WITH_NID"];

function normStatus(s: string): string {
  return String(s || "UNSUBMITTED").toUpperCase();
}

function isLocked(s: string): boolean {
  const t = normStatus(s);
  return t === "VERIFIED" || t === "APPROVED" || t === "EXPIRED";
}

function getStatusBadgeClass(s: string): string {
  const t = normStatus(s);
  if (t === "VERIFIED" || t === "APPROVED") return "bg-success-focus text-success-main";
  if (t === "REJECTED" || t === "BLOCKED" || t === "EXPIRED") return "bg-danger-focus text-danger-main";
  if (t === "REQUEST_CHANGES") return "bg-warning-focus text-warning-main";
  if (t === "UNSUBMITTED" || t === "DRAFT") return "bg-gray-200 text-gray-800";
  return "bg-primary-50 text-primary-600";
}

export default function OwnerKycClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [kyc, setKyc] = useState<Awaited<ReturnType<typeof getOwnerKyc>>>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState(1);

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationalityCode, setNationalityCode] = useState("BD");
  const [nationalityLabel, setNationalityLabel] = useState("Bangladeshi");
  const [nidNumber, setNidNumber] = useState("");
  const [address, setAddress] = useState<InternationalAddress | null>(null);
  const [documentType, setDocumentType] = useState<KycDocumentType>("NID");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const hasRedirected = useRef(false);

  const load = useCallback(async () => {
    setError("");
    setMessage("");
    try {
      const data = await getOwnerKyc();
      setKyc(data);
      if (data) {
        setFullName(data.fullName || "");
        setMobile(data.mobile || "");
        setEmail(data.email || "");
        setDateOfBirth(data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : "");
        const decl = (data.declarationsJson as Record<string, unknown>) || {};
        const nc = decl.nationalityCode as string | undefined;
        const nl = decl.nationalityLabel as string | undefined;
        if (nc && nc.length === 2) {
          setNationalityCode(nc.toUpperCase());
          setNationalityLabel(nl || getNationalityByCode(nc)?.demonym || nc);
        } else {
          const natStr = (data.nationality as string) || "";
          const byDemonym = natStr && getNationalityByDemonym(natStr);
          const byCode = natStr && natStr.length === 2 && getNationalityByCode(natStr);
          const opt = byDemonym ?? byCode;
          if (opt) {
            setNationalityCode(opt.countryCode);
            setNationalityLabel(opt.demonym);
          }
        }
        setNidNumber(data.nidNumber || "");
        setAddress(presentAddressJsonToInternationalAddress(data.presentAddressJson));
        setConsentAccepted(!!(decl.termsAcceptedAt ?? decl.termsAccepted ?? decl.infoTrueConfirmedAt ?? decl.infoTrueConfirmed));
      }
    } catch (e) {
      setError((e as Error).message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const status = normStatus(kyc?.verificationStatus ?? "");
  const locked = isLocked(status);
  const editable = !locked && ["UNSUBMITTED", "DRAFT", "SUBMITTED", "REQUEST_CHANGES", "REJECTED"].includes(status);
  const hasDraft = !!kyc?.id;

  const docs = kyc?.documents ?? [];
  const haveDocTypes = new Set(docs.map((d) => String(d.type).toUpperCase()));
  const missingRequired = REQUIRED_DOCS.filter((t) => !haveDocTypes.has(t));
  const step2Enabled = hasDraft;
  const step3Enabled = hasDraft && missingRequired.length === 0;

  const saveDraft = useCallback(
    async (goNext = false) => {
      if (locked) return;
      setError("");
      setMessage("");
      try {
        const validated = kycIdentitySchema.safeParse({
          fullName,
          mobile,
          email,
          dateOfBirth,
          nationalityCode: nationalityCode.trim().toUpperCase(),
          nationalityLabel,
          nidNumber,
        });
        if (!validated.success) {
          throw new Error(validated.error.errors[0]?.message || "Validation failed");
        }
        const presentAddressJson = address
          ? internationalAddressToPresentAddressJson(address)
          : undefined;
        await putOwnerKycDraft({
          fullName: fullName.trim(),
          mobile: mobile.trim() || undefined,
          email: email.trim() || undefined,
          dateOfBirth: dateOfBirth || undefined,
          nationality: nationalityLabel || undefined,
          nidNumber: nidNumber.trim() || undefined,
          presentAddressJson,
        });
        setMessage("Draft saved. You can now upload documents.");
        await load();
        if (goNext) setStep(2);
      } catch (e) {
        setError((e as Error).message || "Failed to save");
      }
    },
    [fullName, mobile, email, dateOfBirth, nationalityCode, nationalityLabel, nidNumber, address, locked, load]
  );

  const handleSubmit = useCallback(async () => {
    if (locked) return;
    if (!consentAccepted) {
      setError("Please accept the terms and confirm the information is true.");
      return;
    }
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      if (!kyc?.id) throw new Error("Save draft first.");
      if (missingRequired.length) throw new Error(`Missing: ${missingRequired.join(", ")}`);
      const consentTimestamp = new Date().toISOString();
      const declarationsObj = {
        consentAccepted: true,
        consentTimestamp,
        documentType: documentType as string,
        nationalityCode: nationalityCode.trim().toUpperCase(),
        nationalityLabel,
        termsAcceptedAt: consentTimestamp,
        infoTrueConfirmedAt: consentTimestamp,
        termsAccepted: true,
        infoTrueConfirmed: true,
      };
      const presentAddr = address ? internationalAddressToPresentAddressJson(address) : undefined;
      const docKeys: Record<string, string> = {};
      for (const d of docs) {
        const key = d?.media?.key ? String(d.media.key) : "";
        if (key && REQUIRED_DOCS.includes(String(d.type).toUpperCase())) {
          docKeys[String(d.type).toUpperCase()] = key;
        }
      }
      await submitOwnerKyc({
        NID_FRONT: docKeys.NID_FRONT,
        NID_BACK: docKeys.NID_BACK,
        SELFIE_WITH_NID: docKeys.SELFIE_WITH_NID,
        declarationsJson: declarationsObj,
        ...(presentAddr && { presentAddressJson: presentAddr }),
      });
      setMessage("Submitted for review. You can continue setting up branches and products.");
      await load();
    } catch (e) {
      setError((e as Error).message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }, [kyc?.id, consentAccepted, missingRequired, nationalityCode, nationalityLabel, documentType, address, docs, locked, load]);

  useEffect(() => {
    if (!kyc || !["VERIFIED", "APPROVED"].includes(status) || hasRedirected.current) return;
    hasRedirected.current = true;
    const base = String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
    fetch(`${base}/api/v1/auth/me`, { credentials: "include" })
      .then((r) => r.json().catch(() => null))
      .then((j) => {
        if (j?.panels?.owner === true) router.replace("/owner/dashboard");
      })
      .catch(() => {});
  }, [kyc, status, router]);

  const addressSummary =
    address?.formattedAddress ||
    [address?.addressLine1, address?.admin2?.name, address?.admin1?.name, address?.countryName]
      .filter(Boolean)
      .join(", ") ||
    "—";

  const documentSummary =
    missingRequired.length === 0
      ? "All required documents uploaded"
      : `Missing: ${missingRequired.join(", ")}`;

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: "linear-gradient(to bottom, #f8fafc 0%, #ffffff 100%)" }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }} />
          <p className="text-muted">Loading your verification workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <KycPageShell
      step={step}
      onStepChange={setStep}
      step2Enabled={step2Enabled}
      step3Enabled={step3Enabled}
      status={status}
      statusBadgeClass={getStatusBadgeClass(status)}
      error={error}
      message={message}
      rejectionReason={kyc?.rejectionReason ?? undefined}
      reviewNote={kyc?.reviewNote ?? undefined}
      locked={locked}
    >
      {step === 1 && (
        <div className="row g-4">
          <div className="col-12 col-xl-8">
            {/* Identity Information Card */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-bottom py-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-primary bg-opacity-10 text-primary p-2 rounded">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h5 className="mb-0 fw-bold">Personal Identity</h5>
                    <small className="text-muted">Please ensure this matches your official ID document</small>
                  </div>
                </div>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-semibold">Full Legal Name <span className="text-danger">*</span></label>
                    <input
                      className="form-control form-control-lg"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={locked}
                      placeholder="e.g. Jane Doe"
                    />
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label fw-semibold">Mobile Number <span className="text-danger">*</span></label>
                    <input
                      className="form-control form-control-lg"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      disabled={locked}
                      placeholder="+880..."
                    />
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label fw-semibold">Email Address <span className="text-danger">*</span></label>
                    <input
                      type="email"
                      className="form-control form-control-lg"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={locked}
                      placeholder="name@example.com"
                    />
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label fw-semibold">Date of Birth <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className="form-control form-control-lg"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      disabled={locked}
                    />
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label fw-semibold">Nationality <span className="text-danger">*</span></label>
                    <NationalitySelect
                      value={nationalityCode}
                      onChange={(code, opt) => {
                        setNationalityCode(code);
                        setNationalityLabel(opt?.demonym ?? code);
                      }}
                      placeholder="Select nationality..."
                      disabled={locked}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold">National ID (NID) Number <span className="text-danger">*</span></label>
                    <input
                      className="form-control form-control-lg"
                      value={nidNumber}
                      onChange={(e) => setNidNumber(e.target.value)}
                      disabled={locked}
                      placeholder="10, 13, or 17 digit NID number"
                    />
                  </div>
                </div>
              </div>
              <div className="card-footer bg-light border-top py-3">
                <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                  {!locked && (
                    <small className="text-muted d-flex align-items-center gap-2">
                      <Info size={14} />
                      All fields marked with <span className="text-danger fw-bold">*</span> are required
                    </small>
                  )}
                  <div className="d-flex gap-2 ms-auto">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      disabled={locked}
                      onClick={() => saveDraft(false)}
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={locked}
                      onClick={() => saveDraft(true)}
                    >
                      Save & Continue →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Form */}
            <KycAddressForm value={address} onChange={setAddress} disabled={locked} />
          </div>
          
          {/* Trust & Requirements Sidebar */}
          <div className="col-12 col-xl-4">
            <div className="card border-0 shadow-sm bg-primary bg-opacity-10 sticky-top" style={{ top: "1rem" }}>
              <div className="card-body p-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="bg-primary text-white p-2 rounded">
                    <ShieldCheck size={20} />
                  </div>
                  <h6 className="mb-0 fw-bold">Secure Verification</h6>
                </div>
                <p className="text-muted small mb-3">
                  We collect your identity details to comply with regulatory requirements and ensure a safe environment for all users.
                </p>
                <div className="fw-semibold mb-2">What you'll need:</div>
                <ul className="list-unstyled mb-3">
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <CheckCircle size={16} className="text-success flex-shrink-0 mt-1" />
                    <small>Clear photos of your valid NID (front & back)</small>
                  </li>
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <CheckCircle size={16} className="text-success flex-shrink-0 mt-1" />
                    <small>A clear selfie holding your NID card</small>
                  </li>
                  <li className="d-flex align-items-start gap-2">
                    <CheckCircle size={16} className="text-success flex-shrink-0 mt-1" />
                    <small>Your accurate present residential address</small>
                  </li>
                </ul>
                <div className="border-top pt-3">
                  <small className="text-muted d-flex align-items-center gap-2">
                    <Upload size={14} />
                    Your data is securely encrypted
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="row g-4">
          <div className="col-12 col-xl-8">
            <KycDocumentsForm
              documentType={documentType}
              onDocumentTypeChange={setDocumentType}
              existingDocs={docs.map(({ media, ...d }) => ({ ...d, media: media ?? undefined }))}
              onUploadComplete={load}
              disabled={locked}
            />
            
            {/* Navigation */}
            <div className="card border-0 shadow-sm mt-4">
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setStep(1)}>
                    ← Back to Identity
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!step3Enabled}
                    onClick={() => setStep(3)}
                  >
                    Continue to Review →
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Photo Requirements Sidebar */}
          <div className="col-12 col-xl-4">
            <div className="card border-0 shadow-sm bg-info bg-opacity-10 sticky-top" style={{ top: "1rem" }}>
              <div className="card-body p-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="bg-info text-white p-2 rounded">
                    <FileText size={20} />
                  </div>
                  <h6 className="mb-0 fw-bold">Photo Requirements</h6>
                </div>
                <ul className="list-unstyled mb-0">
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <CheckCircle size={16} className="text-info flex-shrink-0 mt-1" />
                    <small>Ensure good lighting and avoid glare or reflections on the card</small>
                  </li>
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <CheckCircle size={16} className="text-info flex-shrink-0 mt-1" />
                    <small>All text and numbers must be clearly readable</small>
                  </li>
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <CheckCircle size={16} className="text-info flex-shrink-0 mt-1" />
                    <small>Do not digitally alter or watermark the images</small>
                  </li>
                  <li className="d-flex align-items-start gap-2">
                    <CheckCircle size={16} className="text-info flex-shrink-0 mt-1" />
                    <small>For the selfie, make sure both your face and the NID card are clearly visible together</small>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="row g-4">
          <div className="col-12 col-xl-8">
            <KycReviewSubmit
              fullName={fullName}
              mobile={mobile}
              email={email}
              nationalitySummary={nationalityLabel || getNationalityByCode(nationalityCode)?.demonym || nationalityCode}
              addressSummary={addressSummary}
              documentSummary={documentSummary}
              consentAccepted={consentAccepted}
              onConsentChange={setConsentAccepted}
              onSubmit={handleSubmit}
              onEditStep={setStep}
              disabled={locked || !editable}
              submitting={submitting}
            />
          </div>
          
          {/* After Submission Info */}
          <div className="col-12 col-xl-4">
            <div className="card border-0 shadow-sm bg-success bg-opacity-10 sticky-top" style={{ top: "1rem" }}>
              <div className="card-body p-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="bg-success text-white p-2 rounded">
                    <Info size={20} />
                  </div>
                  <h6 className="mb-0 fw-bold">After Submission</h6>
                </div>
                <p className="text-muted small mb-3">
                  Once you submit your verification, our compliance team will review it. You can continue to set up your business branches, products, and invite staff in the meantime.
                </p>
                <p className="text-muted small mb-3">
                  Certain features like going live and wallet payouts will remain locked until your verification is fully approved.
                </p>
                <a href="/owner/dashboard" className="btn btn-outline-success w-100">
                  Go to Dashboard
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </KycPageShell>
  );
}
