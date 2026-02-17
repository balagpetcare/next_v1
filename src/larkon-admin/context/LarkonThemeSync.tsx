'use client'

import { useLayoutEffect } from 'react'
import type { LayoutState } from '@larkon/types/context'

const STORAGE_KEY = '__REBACK_NEXT_CONFIG__'

/**
 * Applies theme from localStorage to document root as soon as the dashboard shell mounts,
 * so the first paint uses the saved theme even before LayoutProvider (which may be dynamic) loads.
 * Does not render anything.
 */
export default function LarkonThemeSync() {
  useLayoutEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
      if (!raw) return
      const settings: LayoutState = JSON.parse(raw)
      const root = document.documentElement
      const body = document.body
      if (!body) return
      root.setAttribute('data-bs-theme', settings.theme)
      body.setAttribute('data-bs-theme', settings.theme)
      root.setAttribute('data-topbar-color', settings.topbarTheme)
      root.setAttribute('data-menu-color', settings.menu.theme)
      root.setAttribute('data-menu-size', settings.menu.size)
    } catch {
      // ignore parse errors or missing localStorage
    }
  }, [])
  return null
}
