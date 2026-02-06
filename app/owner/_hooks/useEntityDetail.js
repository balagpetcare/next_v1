"use client";

import { useState, useEffect, useCallback } from "react";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

/**
 * Generic hook for fetching entity details
 * Handles loading, error, and data state
 */
export function useEntityDetail(config, entityId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!config?.apiPath || !entityId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${config.apiPath}/${entityId}`;
      const response = await ownerGet(url);
      setData(response?.data || response);
    } catch (err) {
      setError(err?.message || "Failed to load data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [config?.apiPath, entityId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    loading,
    error,
    refresh: load,
  };
}
