'use client'
import { createContext, use, ReactNode } from 'react'

const DEFAULT_BASE_PATH = '/admin'

export type LarkonPanelContextType = {
  basePath: string
}

const LarkonPanelContext = createContext<LarkonPanelContextType | undefined>(undefined)

export function LarkonPanelProvider({
  basePath = DEFAULT_BASE_PATH,
  children,
}: {
  basePath?: string
  children: ReactNode
}) {
  const value: LarkonPanelContextType = { basePath }
  return (
    <LarkonPanelContext.Provider value={value}>
      {children}
    </LarkonPanelContext.Provider>
  )
}

export function useLarkonPanelBasePath(): string {
  const context = use(LarkonPanelContext)
  return context?.basePath ?? DEFAULT_BASE_PATH
}
