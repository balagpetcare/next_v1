"use client"
import dynamic from 'next/dynamic'

const InvoiceDetails = dynamic(() => import('./InvoiceDetails'), { 
  ssr: false 
})

const InvoiceDetailPage = () => {
  return <InvoiceDetails />
}

export default InvoiceDetailPage
