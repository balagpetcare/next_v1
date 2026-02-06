"use client";

import { useState, useEffect, useCallback } from "react";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

/**
 * Generic hook for fetching entity lists
 * Handles loading, error, and data state
 */
export function useEntityList(config, filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const pickArray = (resp) => {
    if (!resp) return [];
    if (Array.isArray(resp)) return resp;
    if (Array.isArray(resp.data)) return resp.data;
    if (Array.isArray(resp.items)) return resp.items;
    if (Array.isArray(resp.data?.items)) return resp.data.items;
    return [];
  };

  const load = useCallback(async () => {
    if (!config?.apiPath) return;

    setLoading(true);
    setError(null);

    try {
      // Build query string from filters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "ALL") {
          params.append(key, value);
        }
      });
      const queryString = params.toString();
      const url = `${config.apiPath}${queryString ? `?${queryString}` : ""}`;

      const response = await ownerGet(url);
      const items = pickArray(response);

      setData(items);

      // Calculate stats if needed
      if (config.stats) {
        const calculatedStats = {};
        config.stats.forEach((statKey) => {
          if (statKey === "total") {
            calculatedStats.total = items.length;
          } else if (statKey === "verified") {
            calculatedStats.verified = items.filter(
              (item) =>
                String(item.verificationStatus || item.status || "")
                  .toUpperCase()
                  .includes("VERIFIED") ||
                String(item.verificationStatus || item.status || "")
                  .toUpperCase()
                  .includes("APPROVED")
            ).length;
          } else if (statKey === "pending") {
            calculatedStats.pending = items.filter(
              (item) =>
                ["DRAFT", "SUBMITTED", "PENDING_REVIEW"].includes(
                  String(item.verificationStatus || item.status || "").toUpperCase()
                )
            ).length;
          } else if (statKey === "active") {
            calculatedStats.active = items.filter(
              (item) =>
                String(item.status || "").toUpperCase() === "ACTIVE"
            ).length;
          } else if (statKey === "inactive") {
            calculatedStats.inactive = items.filter(
              (item) =>
                String(item.status || "").toUpperCase() === "INACTIVE" ||
                String(item.status || "").toUpperCase() === "DISABLED"
            ).length;
          }
        });
        setStats(calculatedStats);
      }
    } catch (err) {
      setError(err?.message || "Failed to load data");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [config?.apiPath, JSON.stringify(filters)]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    loading,
    error,
    stats,
    refresh: load,
  };
}
