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
      <div className="container-fluid">
        <div className="d-flex align-items-center justify-content-center py-5">
          <span className="spinner-border text-primary" role="status" />
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
        <div className="row g-3">
          <div className="col-12 col-xl-8">
            <div className="card border radius-16 mb-16">
              <div className="card-body p-20">
                <div className="fw-semibold mb-12">Identity</div>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Full name *</label>
                    <input
                      className="form-control radius-12"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={locked}
                    />
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">Mobile</label>
                    <input
                      className="form-control radius-12"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      disabled={locked}
                    />
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control radius-12"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={locked}
                    />
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">Date of birth</label>
                    <input
                      type="date"
                      className="form-control radius-12"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      disabled={locked}
                    />
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">Nationality</label>
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
                    <label className="form-label">NID Number</label>
                    <input
                      className="form-control radius-12"
                      value={nidNumber}
                      onChange={(e) => setNidNumber(e.target.value)}
                      disabled={locked}
                    />
                  </div>
                </div>
                <div className="d-flex gap-10 flex-wrap mt-16">
                  <button
                    type="button"
                    className="btn btn-dark radius-12"
                    disabled={locked}
                    onClick={() => saveDraft(false)}
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary radius-12"
                    disabled={locked}
                    onClick={() => saveDraft(true)}
                  >
                    Save & Continue
                  </button>
                </div>
              </div>
            </div>
            <KycAddressForm value={address} onChange={setAddress} disabled={locked} />
          </div>
          <div className="col-12 col-xl-4">
            <div className="card border radius-16">
              <div className="card-body p-20">
                <div className="fw-semibold mb-8">You&apos;ll need</div>
                <div className="text-sm text-secondary-light">
                  • NID front & back (clear)
                  <br />• Selfie with NID
                  <br />• Accurate address
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="row g-3">
          <div className="col-12">
            <KycDocumentsForm
              documentType={documentType}
              onDocumentTypeChange={setDocumentType}
              existingDocs={docs}
              onUploadComplete={load}
              disabled={locked}
            />
            <div className="d-flex gap-10 flex-wrap mt-16">
              <button type="button" className="btn btn-light radius-12" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary radius-12"
                disabled={!step3Enabled}
                onClick={() => setStep(3)}
              >
                Next: Review & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="row g-3">
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
          <div className="col-12 col-xl-4">
            <div className="card border radius-16">
              <div className="card-body p-20">
                <div className="fw-semibold mb-8">After submit</div>
                <div className="text-sm text-secondary-light">
                  You can create your first branch, add products, and invite staff while we review.
                </div>
                <a href="/owner/dashboard" className="btn btn-light radius-12 mt-12 w-100">
                  Open Dashboard
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </KycPageShell>
  );
}
