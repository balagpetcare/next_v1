"use client";

import { useEffect, useState } from "react";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import type { BranchOption } from "../../price-master/_lib/priceMasterTypes";
import type { GovernancePolicyLite, OrgMetaForRules } from "../_lib/enterpriseRulesTypes";
import { normalizeBranches, permissionSetFromAuthMe, pickOrgId } from "../_lib/enterpriseRulesSession";

export function useEnterpriseRulesOrgResources() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [permSet, setPermSet] = useState<Set<string>>(() => new Set());
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<OrgMetaForRules>({ categories: [], brands: [] });
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [policy, setPolicy] = useState<GovernancePolicyLite | null>(null);
  const [tiers, setTiers] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [me, authMe] = await Promise.all([ownerGet<unknown>("/api/v1/owner/me"), ownerGet<Record<string, unknown>>("/api/v1/auth/me")]);
        if (cancelled) return;
        setPermSet(permissionSetFromAuthMe(authMe));
        let oid = pickOrgId(me);
        if (oid == null) {
          const orgs = await ownerGet<{ data?: { id: number }[] }>("/api/v1/owner/organizations");
          const list = (orgs as { data?: unknown[] })?.data ?? orgs;
          const first = Array.isArray(list) ? (list[0] as { id?: number })?.id : null;
          oid = first != null ? Number(first) : null;
        }
        setOrgId(oid);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load organization");
      } finally {
        if (!cancelled) setSessionLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const [m, br, pol, tr] = await Promise.all([
          ownerGet<{ data?: { categories?: { id: number; name: string }[]; brands?: { id: number; name: string }[] } }>(
            `/api/v1/pricing/org/meta?orgId=${orgId}`
          ),
          ownerGet<unknown>(`/api/v1/owner/organizations/${orgId}/branches`),
          ownerGet<{ data?: GovernancePolicyLite }>(`/api/v1/pricing/governance/policy?orgId=${orgId}`),
          ownerGet<{ data?: { id: number; name: string }[] }>(`/api/v1/pricing/membership/tiers?orgId=${orgId}`),
        ]);
        if (cancelled) return;
        const md = (m as { data?: OrgMetaForRules })?.data;
        setMeta({ categories: md?.categories ?? [], brands: md?.brands ?? [] });
        setBranches(normalizeBranches(br));
        setPolicy((pol as { data?: GovernancePolicyLite })?.data ?? null);
        const td = (tr as { data?: { id: number; name: string }[] })?.data;
        setTiers(Array.isArray(td) ? td : []);
      } catch {
        if (!cancelled) {
          setMeta({ categories: [], brands: [] });
          setBranches([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  return { orgId, permSet, sessionLoaded, error, setError, meta, branches, policy, tiers };
}
