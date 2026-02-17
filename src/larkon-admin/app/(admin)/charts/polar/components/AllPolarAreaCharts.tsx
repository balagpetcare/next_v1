'use client'
import { useEffect, useState } from 'react'
const ReactApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
})
import ComponentContainerCard from '@larkon/components/ComponentContainerCard'
import { basicPolarAreaOpts, monochromePolarAreaOpts } from '../data'
import dynamic from 'next/dynamic'

const BasicChart = () => {
  return (
    <ComponentContainerCard id="basic" title="Basic Polar Area Chart">
      <ReactApexChart height={380} options={basicPolarAreaOpts} series={basicPolarAreaOpts.series} type="polarArea" />
    </ComponentContainerCard>
  )
}

const MonochromeChart = () => {
  const [renderCount, setRenderCount] = useState(0)

  useEffect(() => {
    if (renderCount < 2) setRenderCount(() => renderCount + 1)
  }, [renderCount])

  return (
    renderCount && (
      <ComponentContainerCard key={renderCount} id="monochrome" title="Monochrome Polar Area">
        <ReactApexChart height={380} options={monochromePolarAreaOpts} series={monochromePolarAreaOpts.series} type="polarArea" />
      </ComponentContainerCard>
    )
  )
}

const AllPolarAreaCharts = () => {
  return (
    <>
      <BasicChart />
      <MonochromeChart />
    </>
  )
}

export default AllPolarAreaCharts
