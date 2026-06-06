'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  OnboardingState,
  OnboardingPath,
  OrganizationDraft,
  BranchDraft,
  CompleteOnboardingPayload,
  OnboardingApiResponse,
} from '../_lib/types';

const API_BASE =
  (typeof window !== "undefined"
    ? ""
    : String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000")
  ).replace(/\/+$/, "") || "";

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<OnboardingApiResponse<T>> {
  const res = await fetch(`${API_BASE}/api/v1/owner/onboarding${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const json = await res.json();
  return json;
}

export function useOnboardingState() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi<OnboardingState>('/state');
      if (res.success && res.data) {
        setState(res.data);
      } else {
        setError(res.error?.message || 'Failed to load onboarding state');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Network error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  return { state, loading, error, refetch: fetchState };
}

export function useOnboardingMutations() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const savePath = useCallback(async (path: OnboardingPath) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchApi('/path', {
        method: 'POST',
        body: JSON.stringify({ selectedPath: path }),
      });
      if (!res.success) {
        setError(res.error?.message || 'Failed to save path');
        return null;
      }
      return res.data;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Network error';
      setError(message);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const saveDraft = useCallback(async (step: string, payload: object) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchApi('/draft', {
        method: 'POST',
        body: JSON.stringify({ step, payload }),
      });
      if (!res.success) {
        setError(res.error?.message || 'Failed to save draft');
        return null;
      }
      return res.data;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Network error';
      setError(message);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const complete = useCallback(async (payload: CompleteOnboardingPayload) => {
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await fetchApi<{
        organization: { id: number; name: string };
        branch: { id: number; name: string };
        membership: { role: string };
        redirectTo: string;
      }>('/complete', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.success) {
        setError(res.error?.message || 'Failed to complete onboarding');
        if (res.error?.fieldErrors) {
          setFieldErrors(res.error.fieldErrors);
        }
        return null;
      }
      return res.data;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Network error';
      setError(message);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const joinExisting = useCallback(async (organizationId: number) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchApi<{
        organization: { id: number; name: string };
        redirectTo: string;
      }>('/join-existing', {
        method: 'POST',
        body: JSON.stringify({ organizationId }),
      });
      if (!res.success) {
        setError(res.error?.message || 'Failed to join organization');
        return null;
      }
      return res.data;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Network error';
      setError(message);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const reset = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchApi('/reset', { method: 'POST' });
      if (!res.success) {
        setError(res.error?.message || 'Failed to reset');
        return false;
      }
      return true;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Network error';
      setError(message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return {
    submitting,
    error,
    fieldErrors,
    savePath,
    saveDraft,
    complete,
    joinExisting,
    reset,
    clearError: () => setError(null),
  };
}

export function useLocalDraft() {
  const [orgDraft, setOrgDraft] = useState<OrganizationDraft>({
    organizationName: '',
    organizationType: 'PET_CLINIC',
    countryCode: 'BD',
    timezone: 'Asia/Dhaka',
  });

  const [branchDraft, setBranchDraft] = useState<BranchDraft>({
    branchName: '',
    branchType: 'MAIN',
    city: '',
    area: '',
    isPrimaryBranch: true,
  });

  const updateOrgDraft = useCallback((updates: Partial<OrganizationDraft>) => {
    setOrgDraft((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateBranchDraft = useCallback((updates: Partial<BranchDraft>) => {
    setBranchDraft((prev) => ({ ...prev, ...updates }));
  }, []);

  const loadFromServerDraft = useCallback(
    (draft: { organization?: OrganizationDraft; branch?: BranchDraft } | null) => {
      if (draft?.organization) {
        setOrgDraft((prev) => ({ ...prev, ...draft.organization }));
      }
      if (draft?.branch) {
        setBranchDraft((prev) => ({ ...prev, ...draft.branch }));
      }
    },
    []
  );

  return {
    orgDraft,
    branchDraft,
    updateOrgDraft,
    updateBranchDraft,
    loadFromServerDraft,
  };
}
