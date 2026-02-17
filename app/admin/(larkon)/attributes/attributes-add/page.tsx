import PageTItle from '@larkon/components/PageTItle'
import EditForm from './components/EditForm'
import { Metadata } from 'next'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Attributes Add' }

const AttributesAddPage = () => {
  return (
    <div>
      <PageTItle title="ATTRIBUTE ADD" />
      <EditForm />
    </div>
  )
}

export default AttributesAddPage
