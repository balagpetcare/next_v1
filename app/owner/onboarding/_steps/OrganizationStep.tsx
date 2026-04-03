'use client';

import React from 'react';
import type { OrganizationDraft } from '../_lib/types';
import { ORGANIZATION_TYPES } from '../_lib/types';

interface OrganizationStepProps {
  draft: OrganizationDraft;
  onChange: (updates: Partial<OrganizationDraft>) => void;
  errors: Record<string, string>;
  submitting: boolean;
}

export default function OrganizationStep({
  draft,
  onChange,
  errors,
  submitting,
}: OrganizationStepProps) {
  return (
    <div className="organization-step">
      <div className="mb-24">
        <h3 className="fw-semibold text-neutral-900 mb-8">Organization Details</h3>
        <p className="text-neutral-600 mb-0">
          Enter your business information. This will be the main identity for your workspace.
        </p>
      </div>

      <div className="row g-20">
        {/* Organization Name */}
        <div className="col-12">
          <label className="form-label fw-medium">
            Organization Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${errors.organizationName ? 'is-invalid' : ''}`}
            placeholder="e.g., Bala G Pet Clinics"
            value={draft.organizationName}
            onChange={(e) => onChange({ organizationName: e.target.value })}
            disabled={submitting}
            maxLength={120}
          />
          {errors.organizationName && (
            <div className="invalid-feedback">{errors.organizationName}</div>
          )}
          <div className="form-text">
            This is the main business name used across your workspace.
          </div>
        </div>

        {/* Organization Type */}
        <div className="col-12 col-md-6">
          <label className="form-label fw-medium">
            Business Type <span className="text-danger">*</span>
          </label>
          <select
            className="form-select"
            value={draft.organizationType || 'PET_CLINIC'}
            onChange={(e) => onChange({ organizationType: e.target.value })}
            disabled={submitting}
          >
            {ORGANIZATION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <div className="form-text">
            Choose the type that best describes your organization.
          </div>
        </div>

        {/* Country */}
        <div className="col-12 col-md-6">
          <label className="form-label fw-medium">Country</label>
          <select
            className="form-select"
            value={draft.countryCode || 'BD'}
            onChange={(e) => onChange({ countryCode: e.target.value })}
            disabled={submitting}
          >
            <option value="BD">Bangladesh</option>
            <option value="IN">India</option>
            <option value="PK">Pakistan</option>
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="AE">United Arab Emirates</option>
          </select>
          <div className="form-text">
            Used for business defaults and localization.
          </div>
        </div>

        {/* Timezone */}
        <div className="col-12 col-md-6">
          <label className="form-label fw-medium">Timezone</label>
          <select
            className="form-select"
            value={draft.timezone || 'Asia/Dhaka'}
            onChange={(e) => onChange({ timezone: e.target.value })}
            disabled={submitting}
          >
            <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
            <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</option>
            <option value="Asia/Karachi">Asia/Karachi (GMT+5)</option>
            <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
            <option value="Europe/London">Europe/London (GMT+0)</option>
            <option value="America/New_York">America/New_York (GMT-5)</option>
          </select>
          <div className="form-text">
            Used for schedules, appointments, and reports.
          </div>
        </div>

        {/* Primary Phone (Optional) */}
        <div className="col-12 col-md-6">
          <label className="form-label fw-medium">Primary Phone</label>
          <input
            type="tel"
            className="form-control"
            placeholder="e.g., +8801700000000"
            value={draft.primaryPhone || ''}
            onChange={(e) => onChange({ primaryPhone: e.target.value })}
            disabled={submitting}
          />
          <div className="form-text">Optional. Main contact number for your business.</div>
        </div>

        {/* Primary Email (Optional) */}
        <div className="col-12 col-md-6">
          <label className="form-label fw-medium">Primary Email</label>
          <input
            type="email"
            className="form-control"
            placeholder="e.g., contact@example.com"
            value={draft.primaryEmail || ''}
            onChange={(e) => onChange({ primaryEmail: e.target.value })}
            disabled={submitting}
          />
          <div className="form-text">Optional. Main email for business communications.</div>
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
              <strong>What is an Organization?</strong><br />
              An organization represents your business or company. It can have multiple branches
              (locations/operating units). You can add more details and complete KYC verification later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
