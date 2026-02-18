import logoDark from '@larkon/assets/images/logo-dark.png'
import AppProvidersWrapper from '@larkon/components/wrappers/AppProvidersWrapper'
import type { Metadata } from 'next'
import { Play } from 'next/font/google'
import Image from 'next/image'
import NextTopLoader from 'nextjs-toploader'
import '@larkon/assets/scss/app.scss'

const play = Play({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s | WPA — Pet Smart Solution',
    default: 'WPA — Pet Smart Solution | Admin Dashboard',
  },
  description: 'World Pet Association (WPA) — Pet Smart Solution. Admin dashboard for pet care and management.',
}

const splashScreenStyles = `
#splash-screen {
  position: fixed;
  top: 50%;
  left: 50%;
  background: white;
  display: flex;
  height: 100%;
  width: 100%;
  transform: translate(-50%, -50%);
  align-items: center;
  justify-content: center;
  z-index: 9999;
  opacity: 1;
  transition: all 15s linear;
  overflow: hidden;
}

#splash-screen.remove {
  animation: fadeout 0.7s forwards;
  z-index: 0;
}

@keyframes fadeout {
  to {
    opacity: 0;
    visibility: hidden;
  }
}
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style suppressHydrationWarning>{splashScreenStyles}</style>
      </head>
      <body className={play.className}>
        <div id="splash-screen">
          <Image alt="Logo" width={112} height={24} src={logoDark} style={{ height: '7%', width: 'auto' }} priority />
        </div>
        <NextTopLoader color="#ff6c2f" showSpinner={false} />
        <div id="__next_splash">
          <AppProvidersWrapper>{children}</AppProvidersWrapper>
        </div>
      </body>
    </html>
  )
}
