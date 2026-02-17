import PageTItle from '@larkon/components/PageTItle'
import type { Metadata } from 'next'
import { Row } from 'react-bootstrap'
import EmailView from './components/EmailView'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Inbox' }

const Email = () => {
  return (
    <>
      <PageTItle title="INBOX" />
      <Row className="g-1 mb-3">
        <EmailView />
      </Row>
    </>
  )
}

export default Email
