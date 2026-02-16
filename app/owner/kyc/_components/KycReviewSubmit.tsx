"use client";

export interface KycReviewSubmitProps {
  fullName: string;
  mobile: string;
  email: string;
  nationalitySummary?: string;
  addressSummary: string;
  documentSummary: string;
  consentAccepted: boolean;
  onConsentChange: (v: boolean) => void;
  onSubmit: () => void;
  onEditStep: (step: number) => void;
  disabled?: boolean;
  submitting?: boolean;
}

export default function KycReviewSubmit({
  fullName,
  mobile,
  email,
  nationalitySummary,
  addressSummary,
  documentSummary,
  consentAccepted,
  onConsentChange,
  onSubmit,
  onEditStep,
  disabled = false,
  submitting = false,
}: KycReviewSubmitProps) {
  return (
    <div className="card border radius-16">
      <div className="card-body p-20">
        <div className="fw-semibold mb-16">Review & Submit</div>

        <div className="border radius-12 p-16 mb-16 bg-light">
          <div className="text-sm text-secondary-light mb-8">Identity</div>
          <div className="mb-6"><b>Name:</b> {fullName || "—"}</div>
          <div className="mb-6"><b>Mobile:</b> {mobile || "—"}</div>
          <div className="mb-6"><b>Email:</b> {email || "—"}</div>
          {nationalitySummary && (
            <div className="mb-6"><b>Nationality:</b> {nationalitySummary}</div>
          )}
          <button type="button" className="btn btn-link btn-sm p-0 mt-8" onClick={() => onEditStep(1)}>
            Edit
          </button>
        </div>

        <div className="border radius-12 p-16 mb-16 bg-light">
          <div className="text-sm text-secondary-light mb-8">Address</div>
          <div className="mb-0">{addressSummary || "—"}</div>
          <button type="button" className="btn btn-link btn-sm p-0 mt-8" onClick={() => onEditStep(1)}>
            Edit
          </button>
        </div>

        <div className="border radius-12 p-16 mb-16 bg-light">
          <div className="text-sm text-secondary-light mb-8">Documents</div>
          <div className="mb-0">{documentSummary}</div>
          <button type="button" className="btn btn-link btn-sm p-0 mt-8" onClick={() => onEditStep(2)}>
            Edit
          </button>
        </div>

        <div className="mb-16">
          <div className="form-check">
            <input
              id="kyc-consent"
              type="checkbox"
              className="form-check-input"
              checked={consentAccepted}
              onChange={(e) => onConsentChange(e.target.checked)}
              disabled={disabled}
            />
            <label className="form-check-label" htmlFor="kyc-consent">
              I accept the terms and confirm the information provided is true
            </label>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary radius-12"
          onClick={onSubmit}
          disabled={disabled || submitting || !consentAccepted}
        >
          {submitting ? "Submitting…" : "Submit for Review"}
        </button>
      </div>
    </div>
  );
}
