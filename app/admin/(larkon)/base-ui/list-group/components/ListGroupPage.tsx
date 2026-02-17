"use client"
import PageTItle from '@larkon/components/PageTItle'
import dynamic from 'next/dynamic'
const AllListGroup = dynamic(() => import('./AllListGroup'), { 
  ssr: false 
})
const ListGroupPage = () => {
  return (
    <>
      <PageTItle title="LIST GROUP" />
      <AllListGroup />
    </>
  )
}

export default ListGroupPage
