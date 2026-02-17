export const dynamic = 'force-dynamic'
import ResetPassword from './components/ResetPassword'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reset Password' }

const ResetPasswordPage = () => {
  return (
    <>
      <ResetPassword />
    </>
  )
}

export default ResetPasswordPage
