"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

/**
 * Hook for managing filter state
 * Syncs with URL search params
 */
export function useEntityFilters(config, defaultFilters = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [filters, setFilters] = useState(() => {
    const initial = { ...defaultFilters };
    // Read from URL params
    if (config?.filters) {
      config.filters.forEach((filterKey) => {
        const value = searchParams.get(filterKey);
        if (value) initial[filterKey] = value;
      });
    }
    return initial;
  });

  // Sync filters with URL params when URL changes (from quick filter clicks)
  useEffect(() => {
    const newFilters = { ...defaultFilters };
    if (config?.filters) {
      config.filters.forEach((filterKey) => {
        const value = searchParams.get(filterKey);
        if (value) {
          newFilters[filterKey] = value;
        }
      });
    }
    
    // Only update if filters actually changed
    const currentFiltersStr = JSON.stringify(filters);
    const newFiltersStr = JSON.stringify(newFilters);
    if (currentFiltersStr !== newFiltersStr) {
      setFilters(newFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const updateFilter = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Update URL
    const params = new URLSearchParams(searchParams);
    if (value === "ALL" || !value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
  };

  const updateFilters = (newFilters) => {
    const merged = { ...filters, ...newFilters };
    setFilters(merged);
    
    // Update URL
    const params = new URLSearchParams(searchParams);
    Object.entries(merged).forEach(([key, value]) => {
      if (value === "ALL" || !value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    router.push(pathname, { scroll: false });
  };

  // Build query string from filters
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "ALL") {
        params.append(key, value);
      }
    });
    return params.toString();
  }, [filters]);

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    queryString,
  };
}
