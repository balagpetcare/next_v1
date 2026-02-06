"use client";

import { useEffect, useState } from "react";

export type MeResponse = {
  user?: any;
  orgMembers?: any[];
  orgId?: number | null;
  branchId?: number | null;
  roles?: string[];
  permissions?: string[];
  branches?: { id: number; name?: string }[];
  profile?: any;
};

const API_BASE = String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

async function fetchJson(url: string) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

/**
 * Fetches the current user context.
 * - prefers /api/v1/me (shared)
 * - falls back to /api/v1/admin/auth/me for admin panel (if needed)
 */
export function useMe(pathname?: string) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        // Try /api/v1/auth/me first (includes full profile with avatarMedia)
        const authMe = await fetchJson(`${API_BASE}/api/v1/auth/me`);
        const normalizedAuth =
          authMe && typeof authMe === "object" && "data" in authMe ? (authMe as any).data : authMe;
        if (!cancelled) {
          setMe(normalizedAuth);
          return;
        }
      } catch (e) {
        // Fallback to /api/v1/me
        try {
          const primary = await fetchJson(`${API_BASE}/api/v1/me`);
          const normalized =
            primary && typeof primary === "object" && "data" in primary ? (primary as any).data : primary;
          if (!cancelled) {
            setMe(normalized);
            return;
          }
        } catch (e2) {
          // admin fallback
          try {
            const admin = await fetchJson(`${API_BASE}/api/v1/admin/auth/me`);
            const normalized =
              admin && typeof admin === "object" && "data" in admin ? (admin as any).data : admin;
            if (!cancelled) setMe(normalized);
          } catch {
            if (!cancelled) setMe(null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return { me, loading };
}

export function useBranchSelection(me: MeResponse | null) {
  const [branchId, setBranchId] = useState<number | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("bpa_branch_id") : null;
    if (saved) {
      const n = Number(saved);
      if (!Number.isNaN(n)) setBranchId(n);
      return;
    }
    if (me?.branchId) setBranchId(Number(me.branchId));
  }, [me?.branchId]);

  function select(id: number | null) {
    setBranchId(id);
    if (typeof window !== "undefined") {
      if (id === null) window.localStorage.removeItem("bpa_branch_id");
      else window.localStorage.setItem("bpa_branch_id", String(id));
      window.dispatchEvent(new CustomEvent("bpa:branch-change", { detail: { branchId: id } }));
    }
  }

  return { branchId, select };
}
