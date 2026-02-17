'use client'
import '@larkon/assets/scss/app.scss'
import '@larkon-ui/styles/dashboard-overrides.scss'
import FallbackLoading from '@larkon/components/FallbackLoading'
import Footer from '@larkon/components/layout/Footer'
import { LarkonPanelProvider } from '@larkon/context/LarkonPanelContext'
import { ChildrenType } from '@larkon/types/component-props'
import dynamic from 'next/dynamic'
import React, { Suspense } from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const LayoutProvider = dynamic(
  () => import('@larkon/context/useLayoutContext').then((mod) => mod.LayoutProvider),
  { ssr: false }
)
import { TitleProvider } from '@larkon/context/useTitleContext'
const VerticalNavigationBar = dynamic(() => import('@larkon/components/layout/VerticalNavigationBar/page'))
const TopNavigationBar = dynamic(() => import('@larkon/components/layout/TopNavigationBar/page'))

const AdminLayout = ({ children }: ChildrenType) => {
  return (
    <>
      <link rel="stylesheet" href="/assets/css/style.css" />
      <LarkonPanelProvider basePath="/admin">
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
    </>
  )
}

export default AdminLayout
