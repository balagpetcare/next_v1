import EditForm from './components/EditForm'
import PageTItle from '@larkon/components/PageTItle'
import { Metadata } from 'next'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Attributes Edit' }

const page = () => {
  return (
    <>
      <PageTItle title="ATTRIBUTE EDIT" />
      <EditForm />
    </>
  )
}

export default page
