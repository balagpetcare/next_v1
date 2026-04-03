'use client';

import React from 'react';
import type { OrganizationDraft, BranchDraft } from '../_lib/types';
import { ORGANIZATION_TYPES, BRANCH_TYPES } from '../_lib/types';

interface ReviewStepProps {
  organization: OrganizationDraft;
  branch: BranchDraft;
  onEditOrganization: () => void;
  onEditBranch: () => void;
  submitting: boolean;
}

export default function ReviewStep({
  organization,
  branch,
  onEditOrganization,
  onEditBranch,
  submitting,
}: ReviewStepProps) {
  const orgTypeName = ORGANIZATION_TYPES.find((t) => t.value === organization.organizationType)?.label || organization.organizationType;
  const branchTypeName = BRANCH_TYPES.find((t) => t.value === branch.branchType)?.label || branch.branchType;

  return (
    <div className="review-step">
      <div className="mb-24">
        <h3 className="fw-semibold text-neutral-900 mb-8">Review & Confirm</h3>
        <p className="text-neutral-600 mb-0">
          Please review your information before creating your workspace.
        </p>
      </div>

      {/* Organization Summary */}
      <div className="card border mb-20">
        <div className="card-header bg-white d-flex justify-content-between align-items-center py-12">
          <h5 className="mb-0 fw-semibold">Organization</h5>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={onEditOrganization}
            disabled={submitting}
          >
            Edit
          </button>
        </div>
        <div className="card-body">
          <div className="row g-16">
            <div className="col-12 col-md-6">
              <div className="text-neutral-500 small mb-4">Name</div>
              <div className="fw-medium">{organization.organizationName || '—'}</div>
            </div>
            <div className="col-12 col-md-6">
              <div className="text-neutral-500 small mb-4">Type</div>
              <div className="fw-medium">{orgTypeName || '—'}</div>
            </div>
            <div className="col-12 col-md-6">
              <div className="text-neutral-500 small mb-4">Country</div>
              <div className="fw-medium">{organization.countryCode || 'BD'}</div>
            </div>
            <div className="col-12 col-md-6">
              <div className="text-neutral-500 small mb-4">Timezone</div>
              <div className="fw-medium">{organization.timezone || 'Asia/Dhaka'}</div>
            </div>
            {organization.primaryPhone && (
              <div className="col-12 col-md-6">
                <div className="text-neutral-500 small mb-4">Phone</div>
                <div className="fw-medium">{organization.primaryPhone}</div>
              </div>
            )}
            {organization.primaryEmail && (
              <div className="col-12 col-md-6">
                <div className="text-neutral-500 small mb-4">Email</div>
                <div className="fw-medium">{organization.primaryEmail}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Branch Summary */}
      <div className="card border mb-20">
        <div className="card-header bg-white d-flex justify-content-between align-items-center py-12">
          <h5 className="mb-0 fw-semibold">Primary Branch</h5>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={onEditBranch}
            disabled={submitting}
          >
            Edit
          </button>
        </div>
        <div className="card-body">
          <div className="row g-16">
            <div className="col-12 col-md-6">
              <div className="text-neutral-500 small mb-4">Name</div>
              <div className="fw-medium">{branch.branchName || '—'}</div>
            </div>
            <div className="col-12 col-md-6">
              <div className="text-neutral-500 small mb-4">Type</div>
              <div className="fw-medium">{branchTypeName || '—'}</div>
            </div>
            {branch.city && (
              <div className="col-12 col-md-6">
                <div className="text-neutral-500 small mb-4">City</div>
                <div className="fw-medium">{branch.city}</div>
              </div>
            )}
            {branch.area && (
              <div className="col-12 col-md-6">
                <div className="text-neutral-500 small mb-4">Area</div>
                <div className="fw-medium">{branch.area}</div>
              </div>
            )}
            {branch.addressLine1 && (
              <div className="col-12">
                <div className="text-neutral-500 small mb-4">Address</div>
                <div className="fw-medium">{branch.addressLine1}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* What will be created */}
      <div className="p-16 bg-success-subtle rounded-3 border border-success-subtle">
        <h6 className="fw-semibold mb-12 text-success-emphasis">What will be created:</h6>
        <ul className="mb-0 ps-20">
          <li className="mb-8">1 organization workspace</li>
          <li className="mb-8">1 primary branch</li>
          <li className="mb-0">Owner access with full administrative control</li>
        </ul>
      </div>

      {/* Additional notes */}
      <div className="mt-20 p-16 bg-neutral-50 rounded-3">
        <p className="mb-0 small text-neutral-600">
          <strong>Note:</strong> After setup, you can add more branches, complete KYC verification,
          configure services, add staff, and set up pricing policies from the owner panel.
        </p>
      </div>
    </div>
  );
}
