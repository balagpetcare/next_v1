'use client';

import React from 'react';
import Link from 'next/link';

interface SuccessStepProps {
  organizationName: string;
  branchName: string;
}

export default function SuccessStep({ organizationName, branchName }: SuccessStepProps) {
  return (
    <div className="success-step text-center py-32">
      {/* Success Icon */}
      <div className="mb-24">
        <div
          className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success text-white"
          style={{ width: 80, height: 80 }}
        >
          <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Success Message */}
      <h2 className="fw-bold text-neutral-900 mb-12">Your workspace is ready!</h2>
      <p className="text-neutral-600 mb-32 mx-auto" style={{ maxWidth: 480 }}>
        Your organization and first branch have been created successfully.
        You now have full owner access to manage your business.
      </p>

      {/* Created Summary */}
      <div className="d-flex flex-column flex-md-row gap-16 justify-content-center mb-32">
        <div className="card border bg-white" style={{ minWidth: 200 }}>
          <div className="card-body py-16 px-20">
            <div className="text-neutral-500 small mb-4">Organization</div>
            <div className="fw-semibold text-neutral-900">{organizationName}</div>
          </div>
        </div>
        <div className="card border bg-white" style={{ minWidth: 200 }}>
          <div className="card-body py-16 px-20">
            <div className="text-neutral-500 small mb-4">Primary Branch</div>
            <div className="fw-semibold text-neutral-900">{branchName}</div>
          </div>
        </div>
        <div className="card border bg-white" style={{ minWidth: 200 }}>
          <div className="card-body py-16 px-20">
            <div className="text-neutral-500 small mb-4">Your Role</div>
            <div className="fw-semibold text-neutral-900">Owner</div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="p-20 bg-neutral-50 rounded-3 mb-32 mx-auto" style={{ maxWidth: 560 }}>
        <h5 className="fw-semibold mb-16 text-neutral-800">Recommended next steps</h5>
        <div className="d-flex flex-column gap-12 text-start">
          <div className="d-flex align-items-start gap-12">
            <div className="flex-shrink-0 text-primary mt-4">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 7.5a.5.5 0 0 1 0 1H9v2.5a.5.5 0 0 1-1 0V8.5H5.5a.5.5 0 0 1 0-1H8V5a.5.5 0 0 1 1 0v2.5h2.5z"/>
              </svg>
            </div>
            <div>
              <div className="fw-medium text-neutral-900">Complete organization profile</div>
              <div className="small text-neutral-600">Add logo, description, and business details</div>
            </div>
          </div>
          <div className="d-flex align-items-start gap-12">
            <div className="flex-shrink-0 text-primary mt-4">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 7.5a.5.5 0 0 1 0 1H9v2.5a.5.5 0 0 1-1 0V8.5H5.5a.5.5 0 0 1 0-1H8V5a.5.5 0 0 1 1 0v2.5h2.5z"/>
              </svg>
            </div>
            <div>
              <div className="fw-medium text-neutral-900">Submit KYC verification</div>
              <div className="small text-neutral-600">Verify your identity to unlock all features</div>
            </div>
          </div>
          <div className="d-flex align-items-start gap-12">
            <div className="flex-shrink-0 text-primary mt-4">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 7.5a.5.5 0 0 1 0 1H9v2.5a.5.5 0 0 1-1 0V8.5H5.5a.5.5 0 0 1 0-1H8V5a.5.5 0 0 1 1 0v2.5h2.5z"/>
              </svg>
            </div>
            <div>
              <div className="fw-medium text-neutral-900">Add staff and doctors</div>
              <div className="small text-neutral-600">Invite team members to help manage operations</div>
            </div>
          </div>
          <div className="d-flex align-items-start gap-12">
            <div className="flex-shrink-0 text-primary mt-4">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 7.5a.5.5 0 0 1 0 1H9v2.5a.5.5 0 0 1-1 0V8.5H5.5a.5.5 0 0 1 0-1H8V5a.5.5 0 0 1 1 0v2.5h2.5z"/>
              </svg>
            </div>
            <div>
              <div className="fw-medium text-neutral-900">Configure services and pricing</div>
              <div className="small text-neutral-600">Set up your service catalog and pricing policies</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="d-flex flex-column flex-sm-row gap-12 justify-content-center">
        <Link href="/owner/dashboard" className="btn btn-primary btn-lg px-32">
          Go to Dashboard
        </Link>
        <Link href="/owner/branches" className="btn btn-outline-primary btn-lg px-32">
          Complete Branch Profile
        </Link>
      </div>
    </div>
  );
}
