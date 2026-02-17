"use client"
import PageTItle from '@larkon/components/PageTItle'
import dynamic from 'next/dynamic'

const InvoiceAdd = dynamic(() => import('./InvoiceAdd'), { 
  ssr: false 
})
const InvoicePage = () => {
  return (
    <>
      <PageTItle title="INVOICES CREATE" />
      <InvoiceAdd />
    </>
  )
}

export default InvoicePage
