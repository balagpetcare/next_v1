"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/apiFetch";

const PAGE_SIZE = 100;
const MAX_PAGES = 50; // cap: 5000 products
const SAFE_CAP = PAGE_SIZE * MAX_PAGES;

/**
 * Fetches owner products (paginated) and returns Set of masterCatalogId (already added).
 * Pagination-safe: loops until complete or hits safe cap; then sets hasMoreIfCapped.
 */
export function useAlreadyAddedSet(orgId: number | null) {
  const [addedSet, setAddedSet] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [hasMoreIfCapped, setHasMoreIfCapped] = useState(false);

  const load = useCallback(async () => {
    if (orgId == null) {
      setAddedSet(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    setHasMoreIfCapped(false);
    const set = new Set<number>();
    let page = 1;
    let totalFetched = 0;

    try {
      while (true) {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
          ...(orgId != null && { orgId: String(orgId) }),
        });
        const res = (await apiFetch(`/api/v1/products?${params}`)) as {
          success?: boolean;
          data?: Array<{ masterCatalogId?: number | null }>;
          pagination?: { total: number; totalPages: number };
        };
        const items = res?.data ?? [];
        items.forEach((p) => {
          if (p.masterCatalogId != null) set.add(p.masterCatalogId);
        });
        totalFetched += items.length;
        const total = res?.pagination?.total ?? 0;
        const totalPages = res?.pagination?.totalPages ?? 1;
        if (page >= totalPages || items.length === 0 || totalFetched >= SAFE_CAP) {
          if (totalFetched >= SAFE_CAP && total > SAFE_CAP) setHasMoreIfCapped(true);
          break;
        }
        page += 1;
      }
      setAddedSet(set);
    } catch (e) {
      console.error("Load already-added set error:", e);
      setAddedSet(new Set());
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  return { addedSet, loading: loading, hasMoreIfCapped, refetch: load };
}
