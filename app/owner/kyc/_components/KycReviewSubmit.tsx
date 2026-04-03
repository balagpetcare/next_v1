"use client";

import { CheckCircle2, User, MapPin, FileCheck, Edit2, Send } from "lucide-react";

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
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white border-bottom py-3">
        <div className="d-flex align-items-center gap-2">
          <div className="bg-primary bg-opacity-10 text-primary p-2 rounded">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h5 className="mb-0 fw-bold">Review & Confirm</h5>
            <small className="text-muted">Please verify all information before final submission</small>
          </div>
        </div>
      </div>
      <div className="card-body p-4">
        <div className="row g-3 mb-4">
          {/* Identity Review */}
          <div className="col-12 col-md-6">
            <div className="border rounded-3 p-3 bg-light h-100 position-relative">
              <button 
                type="button" 
                className="btn btn-sm btn-outline-secondary position-absolute top-0 end-0 m-2 d-flex align-items-center gap-1"
                onClick={() => onEditStep(1)}
              >
                <Edit2 size={14} /> <span className="d-none d-sm-inline">Edit</span>
              </button>
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="bg-primary bg-opacity-10 text-primary p-2 rounded">
                  <User size={18} />
                </div>
                <h6 className="mb-0 fw-bold">Identity Details</h6>
              </div>
              <div className="d-flex flex-column gap-2">
                <div>
                  <small className="text-muted">Legal Name</small>
                  <div className="fw-semibold">{fullName || "—"}</div>
                </div>
                <div>
                  <small className="text-muted">Mobile</small>
                  <div className="fw-semibold">{mobile || "—"}</div>
                </div>
                <div>
                  <small className="text-muted">Email</small>
                  <div className="fw-semibold">{email || "—"}</div>
                </div>
                {nationalitySummary && (
                  <div>
                    <small className="text-muted">Nationality</small>
                    <div className="fw-semibold">{nationalitySummary}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Address Review */}
          <div className="col-12 col-md-6">
            <div className="border rounded-3 p-3 bg-light h-100 position-relative">
              <button 
                type="button" 
                className="btn btn-sm btn-outline-secondary position-absolute top-0 end-0 m-2 d-flex align-items-center gap-1"
                onClick={() => onEditStep(1)}
              >
                <Edit2 size={14} /> <span className="d-none d-sm-inline">Edit</span>
              </button>
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="bg-primary bg-opacity-10 text-primary p-2 rounded">
                  <MapPin size={18} />
                </div>
                <h6 className="mb-0 fw-bold">Present Address</h6>
              </div>
              <div className="text-muted small">{addressSummary || "—"}</div>
            </div>
          </div>

          {/* Documents Review */}
          <div className="col-12">
            <div className="border rounded-3 p-3 bg-light position-relative">
              <div className="d-flex align-items-center justify-content-between gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-success bg-opacity-10 text-success p-2 rounded">
                    <FileCheck size={20} />
                  </div>
                  <div>
                    <h6 className="mb-1 fw-bold">Uploaded Documents</h6>
                    <div className="text-muted small">{documentSummary}</div>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 flex-shrink-0"
                  onClick={() => onEditStep(2)}
                >
                  <Edit2 size={14} /> <span className="d-none d-sm-inline">Edit</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Consent Section */}
        <div className="bg-primary bg-opacity-10 border border-primary rounded-3 p-3 mb-4">
          <div className="form-check d-flex align-items-start gap-3 m-0">
            <input
              id="kyc-consent"
              type="checkbox"
              className="form-check-input mt-1 flex-shrink-0"
              style={{ width: 20, height: 20, cursor: disabled ? 'not-allowed' : 'pointer' }}
              checked={consentAccepted}
              onChange={(e) => onConsentChange(e.target.checked)}
              disabled={disabled}
            />
            <label className="form-check-label fw-semibold" htmlFor="kyc-consent" style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
              I confirm that all the information and documents provided above are true, accurate, and belong to me. I accept the platform's terms of service and data processing policies.
            </label>
          </div>
        </div>

        {/* Submit Action */}
        <div className="bg-light border rounded-3 p-4">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
            <div className="d-flex align-items-start gap-3">
              <div className="bg-primary bg-opacity-10 text-primary p-2 rounded flex-shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h6 className="fw-bold mb-1">Ready to Submit</h6>
                <small className="text-muted">Your verification will be reviewed within 24-48 hours</small>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-lg px-4 py-3 fw-bold shadow d-flex align-items-center gap-2 flex-shrink-0"
              onClick={onSubmit}
              disabled={disabled || submitting || !consentAccepted}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={20} />
                  <span>Submit Verification</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
