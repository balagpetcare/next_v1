"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchBranchSummary } from "./api";

const emptySummary = {
  branch: null,
  myAccess: { role: "", permissions: [], scopes: [] },
  kpis: {},
  todayBoard: {},
  alerts: {},
  activity: [],
};

const CACHE_TTL_MS = 45000;
const branchSummaryCache = { id: null, at: 0, data: null };

/**
 * useBranchContext(branchId)
 * Fetches branch summary (from GET /api/v1/branches/:branchId/summary or composed from existing APIs).
 * Caches by branchId to avoid double-fetch when sidebar and page both use the hook. Branch-scoped only.
 */
export function useBranchContext(branchId) {
  const id = branchId == null ? "" : String(branchId).replace(/[^0-9]/g, "");
  const [branch, setBranch] = useState(emptySummary.branch);
  const [myAccess, setMyAccess] = useState(emptySummary.myAccess);
  const [kpis, setKpis] = useState(emptySummary.kpis);
  const [todayBoard, setTodayBoard] = useState(emptySummary.todayBoard);
  const [alerts, setAlerts] = useState(emptySummary.alerts);
  const [activity, setActivity] = useState(emptySummary.activity);
  const [isLoading, setIsLoading] = useState(!!id);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState(null);

  const refetch = useCallback(async () => {
    if (!id) return;
    const hasCached = branchSummaryCache.id === id && branchSummaryCache.data;
    if (!hasCached) setIsLoading(true);
    setError("");
    setErrorCode(null);
    const result = await fetchBranchSummary(id);
    if (result.success) {
      const data = result.data;
      branchSummaryCache.id = id;
      branchSummaryCache.at = Date.now();
      branchSummaryCache.data = data;
      setBranch(data.branch);
      setMyAccess(data.myAccess);
      setKpis(data.kpis ?? {});
      setTodayBoard(data.todayBoard ?? {});
      setAlerts(data.alerts ?? {});
      setActivity(Array.isArray(data.activity) ? data.activity : []);
    } else {
      branchSummaryCache.id = null;
      branchSummaryCache.data = null;
      setError(result.message ?? "Failed to load");
      setErrorCode(result.errorCode ?? "network");
      setBranch(null);
      setMyAccess(emptySummary.myAccess);
      setKpis({});
      setTodayBoard({});
      setAlerts({});
      setActivity([]);
      // If access forbidden/suspended, clear lastActiveBranchId for this branch so selector won't auto-redirect here
      if (result.errorCode === "forbidden" && typeof window !== "undefined" && id) {
        try {
          const key = "lastActiveBranchId";
          if (localStorage.getItem(key) === id) localStorage.removeItem(key);
        } catch (_) {}
      }
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      setBranch(null);
      setMyAccess(emptySummary.myAccess);
      setKpis({});
      setTodayBoard({});
      setAlerts({});
      setActivity([]);
      setError("");
      setErrorCode(null);
      return;
    }
    // Invalidate cache when branchId changes so role/permissions always reflect the active branch
    if (branchSummaryCache.id !== id) {
      branchSummaryCache.id = null;
      branchSummaryCache.data = null;
    }
    const cached = branchSummaryCache.id === id && Date.now() - branchSummaryCache.at < CACHE_TTL_MS && branchSummaryCache.data;
    if (cached) {
      setBranch(cached.branch);
      setMyAccess(cached.myAccess);
      setKpis(cached.kpis ?? {});
      setTodayBoard(cached.todayBoard ?? {});
      setAlerts(cached.alerts ?? {});
      setActivity(Array.isArray(cached.activity) ? cached.activity : []);
      setIsLoading(false);
    }
    refetch();
  }, [id, refetch]);

  const hasViewPermission =
    (myAccess?.permissions ?? []).includes("branch.view") &&
    (myAccess?.permissions ?? []).includes("dashboard.view");

  return {
    branch,
    myAccess,
    kpis,
    todayBoard,
    alerts,
    activity,
    isLoading,
    error,
    errorCode,
    refetch,
    hasViewPermission,
  };
}
