'use client'
import logoDark from '@larkon/assets/images/logo-dark.png'
import logoLight from '@larkon/assets/images/logo-light.png'
import smallImg from '@larkon/assets/images/small/img-10.jpg'
import TextFormInput from '@larkon/components/form/TextFormInput'
import { yupResolver } from '@hookform/resolvers/yup'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect } from 'react'
import { Button, Card, Col, Row } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'

const ResetPassword = () => {
  const resetPasswordSchema = yup.object({
    email: yup.string().email('Please enter a valid email').required('please enter your email'),
  })
  const { control, handleSubmit } = useForm({
    resolver: yupResolver(resetPasswordSchema),
  })
  return (
    <div className="d-flex flex-column vh-100 p-3">
      <div className="d-flex flex-column flex-grow-1">
        <Row className="h-100">
          <Col xxl={7}>
            <Row className="justify-content-center h-100">
              <Col lg={6} className="py-lg-5">
                <div className="d-flex flex-column h-100 justify-content-center">
                  <div className="auth-logo mb-4">
                    <Link href="/dashboard" className="logo-dark">
                      <Image src={logoDark} height={24} alt="logo dark" />
                    </Link>
                    <Link href="/dashboard" className="logo-light">
                      <Image src={logoLight} height={24} alt="logo light" />
                    </Link>
                  </div>
                  <h2 className="fw-bold fs-24">Reset Password</h2>
                  <p className="text-muted mt-1 mb-4">
                    Enter your email address and we&apos;ll send you an email with instructions to reset your password.
                  </p>
                  <div>
                    <form className="authentication-form" onSubmit={handleSubmit(() => {})}>
                      <TextFormInput
                        control={control}
                        name="email"
                        containerClassName="mb-3"
                        label="Email"
                        id="email-id"
                        placeholder="Enter your email"
                      />
                      <div className="mb-1 text-center d-grid">
                        <Button variant="primary" type="submit">
                          Reset Password
                        </Button>
                      </div>
                    </form>
                  </div>
                  <p className="mt-5 text-danger text-center">
                    Back to
                    <Link href="/auth/sign-in" className="text-dark fw-bold ms-1">
                      Sign In
                    </Link>
                  </p>
                </div>
              </Col>
            </Row>
          </Col>
          <Col xxl={5} className="d-none d-xxl-flex">
            <Card className="h-100 mb-0 overflow-hidden">
              <div className="d-flex flex-column h-100">
                <Image src={smallImg} height={867} width={759} alt="small-img" className="w-100 h-100" />
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default ResetPassword
