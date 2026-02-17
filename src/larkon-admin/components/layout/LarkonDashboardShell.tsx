'use client'
import FallbackLoading from '@larkon/components/FallbackLoading'
import Footer from '@larkon/components/layout/Footer'
import { LarkonPanelProvider } from '@larkon/context/LarkonPanelContext'
import LarkonThemeSync from '@larkon/context/LarkonThemeSync'
import { TitleProvider } from '@larkon/context/useTitleContext'
import { ChildrenType } from '@larkon/types/component-props'
import dynamic from 'next/dynamic'
import React, { Suspense } from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const LayoutProvider = dynamic(
  () => import('@larkon/context/useLayoutContext').then((mod) => mod.LayoutProvider),
  { ssr: false }
)
const VerticalNavigationBar = dynamic(() => import('@larkon/components/layout/VerticalNavigationBar/page'))
const TopNavigationBar = dynamic(() => import('@larkon/components/layout/TopNavigationBar/page'))

export type LarkonDashboardShellProps = ChildrenType & { basePath: string }

/** Shared dashboard shell: TopNav, Sidebar, content area, Footer. SCSS must be imported by the caller (panel layout). */
export default function LarkonDashboardShell({ children, basePath }: LarkonDashboardShellProps) {
  return (
    <LarkonPanelProvider basePath={basePath}>
      <LarkonThemeSync />
      <LayoutProvider>
        <TitleProvider>
          <div className="wrapper larkon-dashboard">
            <Suspense>
              <TopNavigationBar />
            </Suspense>
            <Suspense fallback={<FallbackLoading />}>
              <VerticalNavigationBar />
            </Suspense>
            <div className="page-content">
              <div className="container-fluid">{children}</div>
              <Footer />
            </div>
          </div>
        </TitleProvider>
        <ToastContainer theme="colored" />
      </LayoutProvider>
    </LarkonPanelProvider>
  )
}
