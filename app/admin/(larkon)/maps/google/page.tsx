export const dynamic = 'force-dynamic'
import type { Metadata } from 'next'
import AllGoogleMaps from './components/AllGoogleMaps'
import { Container } from 'react-bootstrap'
import PageTItle from '@larkon/components/PageTItle'

export const metadata: Metadata = { title: 'Google Maps' }

const GoogleMaps = () => {
  return (
    <>
      <PageTItle title="GOOGLE MAPS" />
      <Container>
        <AllGoogleMaps />
      </Container>
    </>
  )
}

export default GoogleMaps
