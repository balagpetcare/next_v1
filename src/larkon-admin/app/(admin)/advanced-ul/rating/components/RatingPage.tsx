"use client"
import PageTItle from '@larkon/components/PageTItle'
import dynamic from 'next/dynamic'

const Ratings = dynamic(() => import('./Ratings'), {
  ssr: false, 
})

const RatingPage = () => {
  return (
    <>
      <PageTItle title="RATINGS" />
      <Ratings />
    </>
  )
}

export default RatingPage
