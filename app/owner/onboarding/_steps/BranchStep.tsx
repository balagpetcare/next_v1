'use client';

import React from 'react';
import type { BranchDraft } from '../_lib/types';
import { BRANCH_TYPES } from '../_lib/types';

interface BranchStepProps {
  draft: BranchDraft;
  onChange: (updates: Partial<BranchDraft>) => void;
  errors: Record<string, string>;
  submitting: boolean;
}

export default function BranchStep({
  draft,
  onChange,
  errors,
  submitting,
}: BranchStepProps) {
  return (
    <div className="branch-step">
      <div className="mb-24">
        <h3 className="fw-semibold text-neutral-900 mb-8">Primary Branch Setup</h3>
        <p className="text-neutral-600 mb-0">
          Create your first operating branch. You can add more branches later from the owner panel.
        </p>
      </div>

      <div className="row g-20">
        {/* Branch Name */}
        <div className="col-12">
          <label className="form-label fw-medium">
            Branch Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${errors.branchName ? 'is-invalid' : ''}`}
            placeholder="e.g., Main Branch, Gulshan Clinic"
            value={draft.branchName}
            onChange={(e) => onChange({ branchName: e.target.value })}
            disabled={submitting}
            maxLength={120}
          />
          {errors.branchName && (
            <div className="invalid-feedback">{errors.branchName}</div>
          )}
          <div className="form-text">
            A descriptive name for this branch location.
          </div>
        </div>

        {/* Branch Type */}
        <div className="col-12 col-md-6">
          <label className="form-label fw-medium">
            Branch Type <span className="text-danger">*</span>
          </label>
          <select
            className="form-select"
            value={draft.branchType || 'MAIN'}
            onChange={(e) => onChange({ branchType: e.target.value })}
            disabled={submitting}
          >
            {BRANCH_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <div className="form-text">
            Choose the kind of branch you are setting up.
          </div>
        </div>

        {/* City */}
        <div className="col-12 col-md-6">
          <label className="form-label fw-medium">City</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g., Dhaka"
            value={draft.city || ''}
            onChange={(e) => onChange({ city: e.target.value })}
            disabled={submitting}
          />
        </div>

        {/* Area */}
        <div className="col-12 col-md-6">
          <label className="form-label fw-medium">Area</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g., Gulshan, Dhanmondi"
            value={draft.area || ''}
            onChange={(e) => onChange({ area: e.target.value })}
            disabled={submitting}
          />
        </div>

        {/* Address Line */}
        <div className="col-12 col-md-6">
          <label className="form-label fw-medium">Address</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g., House 1, Road 2"
            value={draft.addressLine1 || ''}
            onChange={(e) => onChange({ addressLine1: e.target.value })}
            disabled={submitting}
          />
          <div className="form-text">
            This can be updated later if needed.
          </div>
        </div>

        {/* Primary Phone */}
        <div className="col-12 col-md-6">
          <label className="form-label fw-medium">Branch Phone</label>
          <input
            type="tel"
            className="form-control"
            placeholder="e.g., +8801700000000"
            value={draft.primaryPhone || ''}
            onChange={(e) => onChange({ primaryPhone: e.target.value })}
            disabled={submitting}
          />
        </div>

        {/* Primary Email */}
        <div className="col-12 col-md-6">
          <label className="form-label fw-medium">Branch Email</label>
          <input
            type="email"
            className="form-control"
            placeholder="e.g., branch@example.com"
            value={draft.primaryEmail || ''}
            onChange={(e) => onChange({ primaryEmail: e.target.value })}
            disabled={submitting}
          />
        </div>
      </div>

      <div className="mt-24 p-16 bg-info-subtle rounded-3 border border-info-subtle">
        <div className="d-flex gap-12">
          <div className="flex-shrink-0 text-info">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="mb-0 small text-info-emphasis">
              <strong>What is a Branch?</strong><br />
              A branch represents a physical location or operating unit of your organization.
              Each branch can have its own staff, services, inventory, and settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
