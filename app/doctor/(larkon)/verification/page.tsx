"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Clock,
  User,
  BadgeCheck,
  Upload,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  doctorGetVerification,
  doctorUpsertVerificationDraft,
  doctorUploadVerificationDocument,
  doctorDeleteVerificationDocument,
  doctorAddLicense,
  doctorUpdateLicense,
  doctorDeleteLicense,
  doctorUploadLicenseDocument,
  doctorSubmitVerification,
} from "@/lib/api";
import CountrySelector from "./components/CountrySelector";
import RegulatoryBodySelector from "./components/RegulatoryBodySelector";
import LicenseForm from "./components/LicenseForm";
import DocumentUploader from "./components/DocumentUploader";

async function getDashboardPath(): Promise<string> {
  const res = await fetch("/api/v1/auth/me", { credentials: "include", headers: { Accept: "application/json" } });
  const j = await res.json().catch(() => null);
  return j?.panels?.owner === true ? "/owner/dashboard" : "/doctor/dashboard";
}

const DOC_TYPES = [
  { value: "DOCTOR_REGISTRATION", label: "Registration / License" },
  { value: "DOCTOR_DEGREE", label: "Degree certificate" },
  { value: "VET_LICENSE", label: "Veterinary License" },
  { value: "VET_DEGREE", label: "Veterinary Degree" },
  { value: "NID_FRONT", label: "NID front" },
  { value: "NID_BACK", label: "NID back" },
  { value: "DOCTOR_PHOTO", label: "Profile photo" },
  { value: "GOV_ID_FRONT", label: "Government ID (Front)" },
  { value: "PROFILE_PHOTO", label: "Professional Photo" },
  { value: "ADDITIONAL", label: "Additional" },
];

function docLabel(type: string): string {
  return DOC_TYPES.find((t) => t.value === type)?.label ?? type;
}

export default function DoctorVerificationPage() {
  const router = useRouter();
  const [data, setData] = useState<Awaited<ReturnType<typeof doctorGetVerification>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dashboardHref, setDashboardHref] = useState<string | null>(null);
  const [primaryCountryCode, setPrimaryCountryCode] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [registrationBody, setRegistrationBody] = useState("");
  const [nidNumber, setNidNumber] = useState("");
  const [uploading, setUploading] = useState(false);
  const [newLicenseBodyId, setNewLicenseBodyId] = useState<number | "">("");
  const [newLicenseNumber, setNewLicenseNumber] = useState("");
  const [addingLicense, setAddingLicense] = useState(false);
  const [legacyOpen, setLegacyOpen] = useState(false);

  const canEdit =
    data == null ||
    data?.verificationStatus === "UNSUBMITTED" ||
    data?.verificationStatus === "REJECTED";
  const isSubmitted = data?.verificationStatus === "SUBMITTED";
  const isVerified = data?.verificationStatus === "VERIFIED";

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (data) {
      setPrimaryCountryCode(data.primaryCountryCode ?? "");
      setLicenseNumber(data.licenseNumber ?? "");
      setRegistrationBody(data.registrationBody ?? "");
      setNidNumber(data.nidNumber ?? "");
    }
  }, [data?.id, data?.primaryCountryCode, data?.licenseNumber, data?.registrationBody, data?.nidNumber]);

  useEffect(() => {
    if (isVerified || isSubmitted) {
      getDashboardPath().then(setDashboardHref);
    }
  }, [isVerified, isSubmitted]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const v = await doctorGetVerification();
      setData(v);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft() {
    if (!canEdit) return;
    setSaving(true);
    setError("");
    try {
      await doctorUpsertVerificationDraft({
        licenseNumber: licenseNumber || null,
        registrationBody: registrationBody || null,
        primaryCountryCode: primaryCountryCode || null,
        nidNumber: nidNumber || null,
      });
      await load();
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function removeDoc(id: number) {
    if (!canEdit) return;
    try {
      await doctorDeleteVerificationDocument(id);
      await load();
    } catch (err) {
      setError((err as Error)?.message ?? "Delete failed");
    }
  }

  async function handleAddLicense() {
    if (!canEdit || !newLicenseBodyId || !newLicenseNumber.trim()) return;
    setAddingLicense(true);
    setError("");
    try {
      await doctorAddLicense({
        regulatoryBodyId: Number(newLicenseBodyId),
        licenseNumber: newLicenseNumber.trim(),
      });
      setNewLicenseBodyId("");
      setNewLicenseNumber("");
      await load();
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to add license");
    } finally {
      setAddingLicense(false);
    }
  }

  async function handleUpdateLicense(
    id: number,
    payload: { licenseNumber?: string; issueDate?: string; expiryDate?: string }
  ) {
    if (!canEdit) return;
    try {
      await doctorUpdateLicense(id, payload);
      await load();
    } catch (e) {
      setError((e as Error)?.message ?? "Update failed");
    }
  }

  async function handleRemoveLicense(id: number) {
    if (!canEdit) return;
    try {
      await doctorDeleteLicense(id);
      await load();
    } catch (e) {
      setError((e as Error)?.message ?? "Remove failed");
    }
  }

  async function handleUploadLicenseDoc(licenseId: number, file: File, documentType: string) {
    if (!canEdit) return;
    setUploading(true);
    setError("");
    try {
      await doctorUploadLicenseDocument(licenseId, file, documentType);
      await load();
    } catch (e) {
      setError((e as Error)?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!canEdit) return;
    setSaving(true);
    setError("");
    try {
      await doctorSubmitVerification();
      await load();
      const path = await getDashboardPath();
      router.replace(path);
    } catch (e) {
      setError((e as Error)?.message ?? "Submit failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card radius-12">
        <div className="card-body text-center text-muted py-5">Loading...</div>
      </div>
    );
  }

  if (isVerified) {
    const href = dashboardHref ?? "/doctor/dashboard";
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12 shadow-sm">
          <div className="card-body text-center py-5 px-4">
            <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success bg-opacity-10 mb-3" style={{ width: 80, height: 80 }}>
              <ShieldCheck className="text-success" size={40} strokeWidth={2} />
            </div>
            <h5 className="fw-bold mb-2">You are Verified!</h5>
            <p className="text-muted mb-4">Your credentials have been verified. You can now access the full dashboard.</p>
            <Link href={href} className="btn btn-primary btn-lg">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    const href = dashboardHref ?? "/doctor/dashboard";
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12 shadow-sm">
          <div className="card-body text-center py-5 px-4">
            <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-warning bg-opacity-10 mb-3" style={{ width: 80, height: 80 }}>
              <Clock className="text-warning" size={40} strokeWidth={2} />
            </div>
            <h5 className="fw-bold mb-2">Application Under Review</h5>
            <p className="text-muted mb-4">Your documents are being reviewed. You will be notified once an admin has completed the verification.</p>
            <Link href={href} className="btn btn-outline-primary btn-lg">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const licenses = data?.licenses ?? [];
  const verificationDocs = (data?.documents ?? []).filter((d) => !d.doctorLicenseId);
  const hasAnyDocs = verificationDocs.length > 0 || licenses.some((l) => (l.documents?.length ?? 0) > 0);

  const step1Done = !!(primaryCountryCode || nidNumber?.trim());
  const step2Done = licenses.length > 0;
  const step3Done = hasAnyDocs;
  const step4Done = false;

  const hasRequiredLicense = licenses.some((l) => l.licenseNumber?.trim());
  const hasRequiredDoc =
    verificationDocs.some((d) =>
      ["VET_LICENSE", "DOCTOR_REGISTRATION", "VET_DEGREE", "DOCTOR_DEGREE"].includes(d.documentType)
    ) ||
    licenses.some((l) =>
      (l.documents ?? []).some((d) =>
        ["VET_LICENSE", "VET_DEGREE", "GOV_ID_FRONT", "GOV_ID_BACK", "PROFILE_PHOTO", "ADDITIONAL"].includes(d.documentType)
      )
    );
  const canSubmit = hasRequiredLicense && hasRequiredDoc;

  return (
    <div className="dashboard-main-body">
      {/* Status banner */}
      {data?.verificationStatus === "REJECTED" && (
        <div className="alert alert-danger radius-12 d-flex align-items-start gap-2 mb-3" role="alert">
          <AlertCircle size={22} className="flex-shrink-0 mt-1" />
          <div className="flex-grow-1">
            <strong>Application was not approved.</strong>
            {data.reviewNote && (
              <p className="mb-0 mt-1">{data.reviewNote}</p>
            )}
            <p className="mb-0 mt-2 small">Resubmit after fixing the issues below.</p>
          </div>
        </div>
      )}
      {canEdit && data?.verificationStatus !== "REJECTED" && (
        <div className="alert alert-info radius-12 d-flex align-items-center gap-2 mb-3">
          <AlertCircle size={20} />
          <span>Complete your profile to start practicing. Fill in each section and submit for review.</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger radius-12 mb-3" role="alert">
          {error}
        </div>
      )}

      {/* 4-step progress */}
      <div className="card radius-12 mb-4">
        <div className="card-body py-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            {[
              { done: step1Done, label: "Personal Info", icon: User },
              { done: step2Done, label: "Licenses", icon: BadgeCheck },
              { done: step3Done, label: "Documents", icon: Upload },
              { done: step4Done, label: "Submit", icon: CheckCircle },
            ].map((step, i) => (
              <div key={i} className="d-flex align-items-center">
                <div
                  className={`d-flex align-items-center gap-2 rounded-pill px-3 py-1 ${
                    step.done ? "bg-success bg-opacity-10 text-success" : "bg-light text-muted"
                  }`}
                >
                  {step.done ? (
                    <CheckCircle size={18} />
                  ) : (
                    <step.icon size={18} />
                  )}
                  <span className="small fw-medium">{step.label}</span>
                </div>
                {i < 3 && <ChevronRight size={18} className="text-muted mx-1" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 1: Personal Identity */}
      <div className="card radius-12 mb-4">
        <div className="card-header bg-transparent border-0 pt-3 pb-0">
          <h6 className="mb-0 d-flex align-items-center gap-2">
            <User size={20} className="text-primary" />
            Personal Identity
          </h6>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <CountrySelector
                value={primaryCountryCode}
                onChange={setPrimaryCountryCode}
                disabled={!canEdit}
                placeholder="Select primary country of practice"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">National ID (NID) number</label>
              <input
                type="text"
                className="form-control"
                value={nidNumber}
                onChange={(e) => setNidNumber(e.target.value)}
                disabled={!canEdit}
                placeholder="Enter NID if applicable"
              />
            </div>
          </div>
          <div className="mt-3">
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-muted d-flex align-items-center gap-1"
              onClick={() => setLegacyOpen(!legacyOpen)}
              aria-expanded={legacyOpen}
            >
              {legacyOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              Legacy registration number (optional)
            </button>
            {legacyOpen && (
              <div className="mt-2 ps-3 border-start">
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label small">License / registration number</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      disabled={!canEdit}
                      placeholder="e.g. BMDC or council registration"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Registration body</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={registrationBody}
                      onChange={(e) => setRegistrationBody(e.target.value)}
                      disabled={!canEdit}
                      placeholder="e.g. BMDC, Veterinary Council"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Professional Licenses */}
      <div className="card radius-12 mb-4">
        <div className="card-header bg-transparent border-0 pt-3 pb-0 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="mb-0 d-flex align-items-center gap-2">
            <BadgeCheck size={20} className="text-primary" />
            Professional Licenses
            {licenses.length > 0 && (
              <span className="badge bg-primary rounded-pill">{licenses.length}</span>
            )}
          </h6>
        </div>
        <div className="card-body">
          <p className="text-muted small mb-3">
            Add each regulatory body you are licensed with. You can add multiple licenses (e.g. different states/countries).
          </p>
          {primaryCountryCode && canEdit && (
            <div className="card bg-light border-0 radius-12 mb-3">
              <div className="card-body">
                <h6 className="small text-uppercase text-muted mb-2">Add license</h6>
                <RegulatoryBodySelector
                  countryCode={primaryCountryCode}
                  value={newLicenseBodyId}
                  onChange={(id) => setNewLicenseBodyId(id)}
                  disabled={!canEdit}
                />
                <div className="row g-2 align-items-end mt-2">
                  <div className="col-md-6">
                    <label className="form-label small">License number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newLicenseNumber}
                      onChange={(e) => setNewLicenseNumber(e.target.value)}
                      placeholder="Enter license/registration number"
                    />
                  </div>
                  <div className="col-md-4">
                    <button
                      type="button"
                      className="btn btn-primary w-100"
                      onClick={handleAddLicense}
                      disabled={addingLicense || !newLicenseBodyId || !newLicenseNumber.trim()}
                    >
                      {addingLicense ? "Adding..." : "Add license"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {!primaryCountryCode && canEdit && (
            <p className="text-muted small mb-0">Select your primary country of practice above to add licenses.</p>
          )}
          {licenses.map((lic) => (
            <LicenseForm
              key={lic.id}
              countryCode={primaryCountryCode}
              license={lic}
              onUpdate={handleUpdateLicense}
              onRemove={handleRemoveLicense}
              onUploadDoc={handleUploadLicenseDoc}
              onRemoveDoc={removeDoc}
              disabled={!canEdit}
            />
          ))}
        </div>
      </div>

      {/* Section 3: Documents */}
      <div className="card radius-12 mb-4">
        <div className="card-header bg-transparent border-0 pt-3 pb-0">
          <h6 className="mb-0 d-flex align-items-center gap-2">
            <Upload size={20} className="text-primary" />
            Documents
            {verificationDocs.length > 0 && (
              <span className="badge bg-primary rounded-pill">{verificationDocs.length}</span>
            )}
          </h6>
        </div>
        <div className="card-body">
          <p className="text-muted small mb-3">
            Upload at least one of: Registration/License or Degree certificate (required to submit).
          </p>
          {canEdit && (
            <DocumentUploader
              documentTypes={DOC_TYPES}
              documents={verificationDocs}
              onUpload={async (file, documentType) => {
                setUploading(true);
                setError("");
                try {
                  await doctorUploadVerificationDocument(file, documentType);
                  await load();
                } catch (err) {
                  setError((err as Error)?.message ?? "Upload failed");
                } finally {
                  setUploading(false);
                }
              }}
              onRemove={removeDoc}
              disabled={!canEdit}
            />
          )}
          {!canEdit && verificationDocs.length > 0 && (
            <ul className="list-group list-group-flush mb-0">
              {verificationDocs.map((d) => (
                <li key={d.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <span>{docLabel(d.documentType)}</span>
                  {d.url && (
                    <a href={d.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary">
                      View
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Section 4: Requirements & Submit */}
      <div className="card radius-12 mb-4">
        <div className="card-header bg-transparent border-0 pt-3 pb-0">
          <h6 className="mb-0 d-flex align-items-center gap-2">
            <CheckCircle size={20} className="text-primary" />
            Review & Submit
          </h6>
        </div>
        <div className="card-body">
          <ul className="list-unstyled mb-4">
            <li className="d-flex align-items-center gap-2 mb-2">
              {hasRequiredLicense ? (
                <CheckCircle size={18} className="text-success flex-shrink-0" />
              ) : (
                <AlertCircle size={18} className="text-warning flex-shrink-0" />
              )}
              <span className={hasRequiredLicense ? "text-success" : "text-muted"}>
                At least one license with license number
              </span>
            </li>
            <li className="d-flex align-items-center gap-2 mb-2">
              {hasRequiredDoc ? (
                <CheckCircle size={18} className="text-success flex-shrink-0" />
              ) : (
                <AlertCircle size={18} className="text-warning flex-shrink-0" />
              )}
              <span className={hasRequiredDoc ? "text-success" : "text-muted"}>
                At least one document (Registration/License or Degree)
              </span>
            </li>
          </ul>
          {canEdit && (
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={saveDraft} disabled={saving}>
                {saving ? "Saving..." : "Save draft"}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={submit}
                disabled={saving || !canSubmit || uploading}
              >
                {saving ? "Submitting..." : "Submit for review"}
              </button>
              {!canSubmit && (
                <span className="align-self-center small text-muted">Complete the checklist above to submit.</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
