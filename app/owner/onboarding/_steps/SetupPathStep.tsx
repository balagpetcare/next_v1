'use client';

import React from 'react';
import type { OnboardingPath, AccessibleOrg } from '../_lib/types';

interface SetupPathStepProps {
  selectedPath: OnboardingPath | null;
  onSelectPath: (path: OnboardingPath) => void;
  hasAccessibleOrgs: boolean;
  accessibleOrgs: AccessibleOrg[];
  submitting: boolean;
}

export default function SetupPathStep({
  selectedPath,
  onSelectPath,
  hasAccessibleOrgs,
  accessibleOrgs,
  submitting,
}: SetupPathStepProps) {
  return (
    <div className="setup-path-step">
      <div className="mb-24">
        <h3 className="fw-semibold text-neutral-900 mb-8">Choose your setup path</h3>
        <p className="text-neutral-600 mb-0">
          Select how you want to get started with your business workspace.
        </p>
      </div>

      <div className="d-flex flex-column gap-16">
        {/* Create New Organization */}
        <button
          type="button"
          className={`path-card p-20 border rounded-3 text-start w-100 bg-white transition-all ${
            selectedPath === 'CREATE_NEW' ? 'border-primary shadow-sm' : 'border-neutral-200'
          }`}
          onClick={() => onSelectPath('CREATE_NEW')}
          disabled={submitting}
        >
          <div className="d-flex align-items-start gap-16">
            <div
              className={`path-icon d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 ${
                selectedPath === 'CREATE_NEW' ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-600'
              }`}
              style={{ width: 48, height: 48 }}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-grow-1">
              <h5 className="fw-semibold mb-4 text-neutral-900">Create a new organization</h5>
              <p className="text-neutral-600 mb-0 small">
                Set up a new business workspace with your first branch. Perfect for new businesses or
                those starting fresh on the platform.
              </p>
            </div>
            <div className="flex-shrink-0 align-self-center">
              <div
                className={`form-check-input rounded-circle ${
                  selectedPath === 'CREATE_NEW' ? 'bg-primary border-primary' : ''
                }`}
                style={{ width: 20, height: 20, marginTop: 0 }}
              />
            </div>
          </div>
        </button>

        {/* Join Existing Organization */}
        <button
          type="button"
          className={`path-card p-20 border rounded-3 text-start w-100 bg-white transition-all ${
            selectedPath === 'JOIN_EXISTING' ? 'border-primary shadow-sm' : 'border-neutral-200'
          } ${!hasAccessibleOrgs ? 'opacity-50' : ''}`}
          onClick={() => hasAccessibleOrgs && onSelectPath('JOIN_EXISTING')}
          disabled={submitting || !hasAccessibleOrgs}
        >
          <div className="d-flex align-items-start gap-16">
            <div
              className={`path-icon d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 ${
                selectedPath === 'JOIN_EXISTING' ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-600'
              }`}
              style={{ width: 48, height: 48 }}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-grow-1">
              <h5 className="fw-semibold mb-4 text-neutral-900">I already have an organization</h5>
              <p className="text-neutral-600 mb-0 small">
                {hasAccessibleOrgs
                  ? `Continue with one of your ${accessibleOrgs.length} existing organization${accessibleOrgs.length > 1 ? 's' : ''}.`
                  : 'No existing organizations found. Create a new one to get started.'}
              </p>
            </div>
            <div className="flex-shrink-0 align-self-center">
              <div
                className={`form-check-input rounded-circle ${
                  selectedPath === 'JOIN_EXISTING' ? 'bg-primary border-primary' : ''
                }`}
                style={{ width: 20, height: 20, marginTop: 0 }}
              />
            </div>
          </div>
        </button>
      </div>

      {hasAccessibleOrgs && selectedPath === 'JOIN_EXISTING' && (
        <div className="mt-20 p-16 bg-neutral-50 rounded-3">
          <h6 className="fw-semibold mb-12 text-neutral-800">Your organizations</h6>
          <div className="d-flex flex-column gap-8">
            {accessibleOrgs.map((org) => (
              <div key={org.id} className="d-flex align-items-center justify-content-between p-12 bg-white rounded-2 border">
                <div>
                  <span className="fw-medium text-neutral-900">{org.name}</span>
                  <span className="badge bg-neutral-100 text-neutral-600 ms-8 small">{org.role}</span>
                </div>
                <span className={`badge ${org.status === 'ACTIVE' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
                  {org.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .path-card:hover:not(:disabled) {
          border-color: var(--bs-primary) !important;
          transform: translateY(-1px);
        }
        .path-card:disabled {
          cursor: not-allowed;
        }
        .transition-all {
          transition: all 0.15s ease-in-out;
        }
      `}</style>
    </div>
  );
}
