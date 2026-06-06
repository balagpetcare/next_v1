"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getBrowserSafeApiBase } from "@/lib/authRedirect";

async function getJSON(path) {
  const base = getBrowserSafeApiBase();
  const res = await fetch(`${base}${path}`, { credentials: "include", headers: { Accept: "application/json" } });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(j?.message || res.statusText || "Request failed");
  return j;
}

export function useMe() {
  const [state, setState] = useState({ loading: true, me: null, error: null });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const j = await getJSON("/api/v1/me");
      const me = j?.success ? j.data : j;
      setState({ loading: false, me, error: null });
    } catch (e) {
      setState({ loading: false, me: null, error: e });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const permissions = useMemo(() => {
    const p = state.me?.permissions || state.me?.authz?.permissions || [];
    return Array.isArray(p) ? p.map(String) : [];
  }, [state.me]);

  return { ...state, permissions, refresh };
}

export function useBranchSelection() {
  // Simple localStorage-based selection (optional).
  const [branchId, setBranchId] = useState(null);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem("bpa.owner.branchId");
      if (v) setBranchId(v);
    } catch {}
  }, []);

  const set = useCallback((id) => {
    setBranchId(id);
    try {
      if (id == null) window.localStorage.removeItem("bpa.owner.branchId");
      else window.localStorage.setItem("bpa.owner.branchId", String(id));
    } catch {}
  }, []);

  return { branchId, setBranchId: set };
}
