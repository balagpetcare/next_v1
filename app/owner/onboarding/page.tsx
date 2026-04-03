'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useOnboardingState, useOnboardingMutations, useLocalDraft } from './_hooks/useOnboarding';
import type { OnboardingPath } from './_lib/types';
import { STEPS, STEP_NAMES } from './_lib/types';

import SetupPathStep from './_steps/SetupPathStep';
import OrganizationStep from './_steps/OrganizationStep';
import BranchStep from './_steps/BranchStep';
import ReviewStep from './_steps/ReviewStep';
import SuccessStep from './_steps/SuccessStep';

function OnboardingWizardContent() {
  const router = useRouter();
  const { state, loading, error: stateError, refetch } = useOnboardingState();
  const {
    submitting,
    error: mutationError,
    fieldErrors,
    savePath,
    saveDraft,
    complete,
    reset,
    clearError,
  } = useOnboardingMutations();

  const { orgDraft, branchDraft, updateOrgDraft, updateBranchDraft, loadFromServerDraft } = useLocalDraft();

  type StepIndex = (typeof STEPS)[keyof typeof STEPS];
  const [currentStep, setCurrentStep] = useState<StepIndex>(STEPS.PATH);
  const [selectedPath, setSelectedPath] = useState<OnboardingPath | null>(null);
  const [completedData, setCompletedData] = useState<{ orgName: string; branchName: string } | null>(null);

  // Load draft from server state
  useEffect(() => {
    if (state?.draft) {
      loadFromServerDraft(state.draft);
    }
    if (state?.selectedPath) {
      setSelectedPath(state.selectedPath);
    }
    // Resume from last step
    if (state?.lastCompletedStep) {
      const stepMap: Record<string, StepIndex> = {
        PATH: STEPS.ORGANIZATION,
        ORGANIZATION: STEPS.BRANCH,
        BRANCH: STEPS.REVIEW,
        REVIEW: STEPS.REVIEW,
      };
      const resumeStep = stepMap[state.lastCompletedStep] ?? STEPS.PATH;
      setCurrentStep(resumeStep);
    }
  }, [state, loadFromServerDraft]);

  // Redirect if already onboarded
  useEffect(() => {
    if (state?.alreadyOnboarded && !state?.isCompleted) {
      router.replace('/owner/dashboard');
    }
  }, [state, router]);

  const handleSelectPath = useCallback(
    async (path: OnboardingPath) => {
      setSelectedPath(path);
      clearError();
      const result = await savePath(path);
      if (result) {
        if (path === 'JOIN_EXISTING') {
          // For join existing, redirect to dashboard
          router.replace('/owner/dashboard');
        } else {
          setCurrentStep(STEPS.ORGANIZATION);
        }
      }
    },
    [savePath, clearError, router]
  );

  const handleNextFromOrg = useCallback(async () => {
    clearError();
    // Validate
    if (!orgDraft.organizationName || orgDraft.organizationName.trim().length < 2) {
      return;
    }
    await saveDraft('ORGANIZATION', orgDraft);
    setCurrentStep(STEPS.BRANCH);
  }, [orgDraft, saveDraft, clearError]);

  const handleNextFromBranch = useCallback(async () => {
    clearError();
    // Validate
    if (!branchDraft.branchName || branchDraft.branchName.trim().length < 2) {
      return;
    }
    await saveDraft('BRANCH', branchDraft);
    setCurrentStep(STEPS.REVIEW);
  }, [branchDraft, saveDraft, clearError]);

  const handleComplete = useCallback(async () => {
    clearError();
    const result = await complete({
      selectedPath: 'CREATE_NEW',
      organization: orgDraft,
      branch: branchDraft,
    });
    if (result) {
      setCompletedData({
        orgName: result.organization.name,
        branchName: result.branch.name,
      });
      setCurrentStep(STEPS.SUCCESS);
    }
  }, [orgDraft, branchDraft, complete, clearError]);

  const handleReset = useCallback(async () => {
    const success = await reset();
    if (success) {
      setCurrentStep(STEPS.PATH);
      setSelectedPath(null);
      refetch();
    }
  }, [reset, refetch]);

  const handleBack = useCallback(() => {
    if (currentStep === STEPS.ORGANIZATION) {
      setCurrentStep(STEPS.PATH);
    } else if (currentStep === STEPS.BRANCH) {
      setCurrentStep(STEPS.ORGANIZATION);
    } else if (currentStep === STEPS.REVIEW) {
      setCurrentStep(STEPS.BRANCH);
    }
  }, [currentStep]);

  // Loading state
  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-neutral-50">
        <div className="text-center">
          <span className="spinner-border text-primary mb-16" role="status" />
          <p className="text-neutral-600 mb-0">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (stateError) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-neutral-50">
        <div className="text-center" style={{ maxWidth: 400 }}>
          <div className="text-danger mb-16">
            <svg width="48" height="48" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h4 className="fw-semibold mb-8">Unable to load onboarding</h4>
          <p className="text-neutral-600 mb-16">{stateError}</p>
          <button className="btn btn-primary" onClick={() => refetch()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Success step (full screen)
  if (currentStep === STEPS.SUCCESS && completedData) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-neutral-50 py-32">
        <div className="container" style={{ maxWidth: 720 }}>
          <SuccessStep
            organizationName={completedData.orgName}
            branchName={completedData.branchName}
          />
        </div>
      </div>
    );
  }

  const error = mutationError;

  return (
    <div className="min-vh-100 bg-neutral-50">
      <div className="container py-32">
        <div className="row justify-content-center">
          {/* Sidebar */}
          <div className="col-12 col-lg-4 mb-24 mb-lg-0">
            <div className="card border-0 shadow-sm sticky-lg-top" style={{ top: 24 }}>
              <div className="card-body p-24">
                <h4 className="fw-bold text-primary mb-20">Owner Onboarding</h4>

                {/* Progress Steps */}
                <div className="d-flex flex-column gap-16">
                  {STEP_NAMES.slice(0, 4).map((name, idx) => {
                    const isActive = currentStep === idx;
                    const isCompleted = currentStep > idx;
                    return (
                      <div key={name} className="d-flex align-items-center gap-12">
                        <div
                          className={`d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 ${
                            isCompleted
                              ? 'bg-success text-white'
                              : isActive
                              ? 'bg-primary text-white'
                              : 'bg-neutral-200 text-neutral-500'
                          }`}
                          style={{ width: 28, height: 28, fontSize: 12 }}
                        >
                          {isCompleted ? (
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <span
                          className={`small ${
                            isActive ? 'fw-semibold text-neutral-900' : 'text-neutral-600'
                          }`}
                        >
                          {name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Help text */}
                <div className="mt-24 pt-20 border-top">
                  <p className="small text-neutral-600 mb-12">
                    Need help? Check our{' '}
                    <Link href="/getting-started" className="text-primary">
                      getting started guide
                    </Link>
                    .
                  </p>
                  {currentStep > STEPS.PATH && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary w-100"
                      onClick={handleReset}
                      disabled={submitting}
                    >
                      Start Over
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-12 col-lg-8">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-24 p-md-32">
                {/* Error Alert */}
                {error && (
                  <div className="alert alert-danger d-flex align-items-start gap-12 mb-24" role="alert">
                    <svg className="flex-shrink-0 mt-4" width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>{error}</div>
                  </div>
                )}

                {/* Step Content */}
                {currentStep === STEPS.PATH && (
                  <SetupPathStep
                    selectedPath={selectedPath}
                    onSelectPath={handleSelectPath}
                    hasAccessibleOrgs={state?.hasAccessibleOrganizations || false}
                    accessibleOrgs={state?.accessibleOrganizations || []}
                    submitting={submitting}
                  />
                )}

                {currentStep === STEPS.ORGANIZATION && (
                  <OrganizationStep
                    draft={orgDraft}
                    onChange={updateOrgDraft}
                    errors={fieldErrors}
                    submitting={submitting}
                  />
                )}

                {currentStep === STEPS.BRANCH && (
                  <BranchStep
                    draft={branchDraft}
                    onChange={updateBranchDraft}
                    errors={fieldErrors}
                    submitting={submitting}
                  />
                )}

                {currentStep === STEPS.REVIEW && (
                  <ReviewStep
                    organization={orgDraft}
                    branch={branchDraft}
                    onEditOrganization={() => setCurrentStep(STEPS.ORGANIZATION)}
                    onEditBranch={() => setCurrentStep(STEPS.BRANCH)}
                    submitting={submitting}
                  />
                )}

                {/* Action Buttons */}
                {currentStep !== STEPS.PATH && (
                  <div className="d-flex justify-content-between align-items-center mt-32 pt-24 border-top">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleBack}
                      disabled={submitting}
                    >
                      Back
                    </button>

                    {currentStep === STEPS.ORGANIZATION && (
                      <button
                        type="button"
                        className="btn btn-primary px-32"
                        onClick={handleNextFromOrg}
                        disabled={submitting || !orgDraft.organizationName?.trim()}
                      >
                        {submitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-8" />
                            Saving...
                          </>
                        ) : (
                          'Continue'
                        )}
                      </button>
                    )}

                    {currentStep === STEPS.BRANCH && (
                      <button
                        type="button"
                        className="btn btn-primary px-32"
                        onClick={handleNextFromBranch}
                        disabled={submitting || !branchDraft.branchName?.trim()}
                      >
                        {submitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-8" />
                            Saving...
                          </>
                        ) : (
                          'Continue'
                        )}
                      </button>
                    )}

                    {currentStep === STEPS.REVIEW && (
                      <button
                        type="button"
                        className="btn btn-success px-32"
                        onClick={handleComplete}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-8" />
                            Creating...
                          </>
                        ) : (
                          'Create Workspace'
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Path step has its own continue button */}
                {currentStep === STEPS.PATH && selectedPath === 'CREATE_NEW' && (
                  <div className="mt-32 pt-24 border-top">
                    <button
                      type="button"
                      className="btn btn-primary w-100 py-12"
                      onClick={() => handleSelectPath('CREATE_NEW')}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-8" />
                          Saving...
                        </>
                      ) : (
                        'Continue with Create New'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OwnerOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-vh-100 d-flex align-items-center justify-content-center">
          <span className="spinner-border text-primary" role="status" />
        </div>
      }
    >
      <OnboardingWizardContent />
    </Suspense>
  );
}
