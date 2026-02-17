import FallbackLoading from '@larkon/components/FallbackLoading'
import Footer from '@larkon/components/layout/Footer'
import AuthProtectionWrapper from '@larkon/components/wrappers/AuthProtectionWrapper'
import { ChildrenType } from '@larkon/types/component-props'
import dynamic from 'next/dynamic'
import React, { Suspense } from 'react'

const VerticalNavigationBar = dynamic(() => import('@larkon/components/layout/VerticalNavigationBar/page'))
const TopNavigationBar = dynamic(() => import('@larkon/components/layout/TopNavigationBar/page'))

const AdminLayout = ({ children }: ChildrenType) => {
  return (
    <AuthProtectionWrapper>
      <div className="wrapper">
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
    </AuthProtectionWrapper>
  )
}

export default AdminLayout
