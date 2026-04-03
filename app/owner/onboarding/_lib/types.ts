export type OnboardingStatus =
  | 'NOT_STARTED'
  | 'PATH_SELECTED'
  | 'ORG_DRAFT'
  | 'BRANCH_DRAFT'
  | 'REVIEW_READY'
  | 'COMPLETED'
  | 'FAILED_RECOVERABLE';

export type OnboardingPath = 'CREATE_NEW' | 'JOIN_EXISTING';

export interface AccessibleOrg {
  id: number;
  name: string;
  role: string;
  status: string;
}

export interface OnboardingState {
  status: OnboardingStatus;
  selectedPath: OnboardingPath | null;
  lastCompletedStep: string | null;
  draft: OnboardingDraft | null;
  hasAccessibleOrganizations: boolean;
  accessibleOrganizations: AccessibleOrg[];
  alreadyOnboarded: boolean;
  isCompleted: boolean;
}

export interface OnboardingDraft {
  organization?: OrganizationDraft;
  branch?: BranchDraft;
  owner?: OwnerDraft;
}

export interface OrganizationDraft {
  organizationName: string;
  organizationType?: string;
  countryCode?: string;
  timezone?: string;
  displayName?: string;
  primaryPhone?: string;
  primaryEmail?: string;
}

export interface BranchDraft {
  branchName: string;
  branchType?: string;
  city?: string;
  area?: string;
  addressLine1?: string;
  primaryPhone?: string;
  primaryEmail?: string;
  isPrimaryBranch?: boolean;
}

export interface OwnerDraft {
  ownerDesignation?: string;
}

export interface CompleteOnboardingPayload {
  selectedPath: OnboardingPath;
  organization?: OrganizationDraft;
  branch?: BranchDraft;
  owner?: OwnerDraft;
}

export interface OnboardingApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string>;
  };
}

export const ORGANIZATION_TYPES = [
  { value: 'PET_CLINIC', label: 'Pet Clinic' },
  { value: 'PET_HOSPITAL', label: 'Pet Hospital' },
  { value: 'PET_CARE_CENTER', label: 'Pet Care Center' },
  { value: 'MULTI_BRANCH_PET_BUSINESS', label: 'Multi-Branch Pet Business' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const BRANCH_TYPES = [
  { value: 'MAIN', label: 'Main Branch' },
  { value: 'CLINIC', label: 'Clinic' },
  { value: 'HOSPITAL', label: 'Hospital' },
  { value: 'SATELLITE', label: 'Satellite Branch' },
  { value: 'PHARMACY', label: 'Pharmacy' },
  { value: 'DIAGNOSTIC', label: 'Diagnostic Center' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const OWNER_DESIGNATIONS = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'MANAGING_PARTNER', label: 'Managing Partner' },
  { value: 'DIRECTOR', label: 'Director' },
  { value: 'ADMIN_OWNER', label: 'Admin Owner' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const STEPS = {
  PATH: 0,
  ORGANIZATION: 1,
  BRANCH: 2,
  REVIEW: 3,
  SUCCESS: 4,
} as const;

export const STEP_NAMES = ['Setup Path', 'Organization', 'Branch', 'Review', 'Done'] as const;
