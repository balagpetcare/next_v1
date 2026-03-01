'use client'

import { useCallback, useMemo, useState } from 'react'

type InitialFilters = Record<string, string>

type UseAdminFiltersOptions = {
  defaultLimit?: number
}

/**
 * Shared state for admin list search + filters. Use with AdminFiltersBar.
 */
export function useAdminFilters(
  initialFilters: InitialFilters = {},
  _options: UseAdminFiltersOptions = {}
): {
  search: string
  setSearch: (value: string) => void
  filters: Record<string, string>
  setFilter: (key: string, value: string) => void
  reset: () => void
} {
  const [search, setSearch] = useState('')
  const [initialSnapshot] = useState<Record<string, string>>(() => ({ ...initialFilters }))
  const [filters, setFiltersState] = useState<Record<string, string>>(initialSnapshot)

  const setFilter = useCallback((key: string, value: string) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }))
  }, [])

  const reset = useCallback(() => {
    setSearch('')
    setFiltersState({ ...initialSnapshot })
  }, [initialSnapshot])

  return useMemo(
    () => ({
      search,
      setSearch,
      filters,
      setFilter,
      reset,
    }),
    [search, filters, setFilter, reset]
  )
}
