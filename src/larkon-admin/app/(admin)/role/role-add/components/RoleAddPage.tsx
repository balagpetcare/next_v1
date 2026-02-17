"use client"
import PageTItle from '@larkon/components/PageTItle'
import dynamic from 'next/dynamic'
const RoleAdd = dynamic(() => import('./RoleAdd'), {
  ssr: false,
})

const RoleAddPage = () => {
  return (
    <>
      <PageTItle title="ROLE ADD" />
      <RoleAdd />
    </>
  )
}

export default RoleAddPage
