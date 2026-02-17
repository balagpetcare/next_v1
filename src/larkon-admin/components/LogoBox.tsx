import logoDark from '@larkon/assets/images/logo-dark.png'
import logoLight from '@larkon/assets/images/logo-light.png'
import logoSm from '@larkon/assets/images/logo-sm.png'
import { useLarkonPanelBasePath } from '@larkon/context/LarkonPanelContext'
import Image from 'next/image'
import Link from 'next/link'

const LogoBox = () => {
  const basePath = useLarkonPanelBasePath()
  const logoHref = basePath ? `${basePath}/dashboard` : '/'
  return (
    <div className="logo-box">
      <Link href={logoHref} className="logo-dark">
        <Image src={logoSm} width={28} height={26} className="logo-sm" alt="logo sm" />
        <Image src={logoDark} height={24} width={112} className="logo-lg" alt="logo dark" />
      </Link>
      <Link href={logoHref} className="logo-light">
        <Image src={logoSm} width={28} height={26} className="logo-sm" alt="logo sm" />
        <Image src={logoLight} height={24} width={112} className="logo-lg" alt="logo light" />
      </Link>
    </div>
  )
}

export default LogoBox
