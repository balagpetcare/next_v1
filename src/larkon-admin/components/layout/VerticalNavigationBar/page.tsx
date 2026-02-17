import FallbackLoading from '@larkon/components/FallbackLoading'
import LogoBox from '@larkon/components/LogoBox'
import SimplebarReactClient from '@larkon/components/wrappers/SimplebarReactClient'
import { getMenuItems } from '@larkon/helpers/Manu'
import { useLarkonPanelBasePath } from '@larkon/context/LarkonPanelContext'
import { Suspense, useMemo } from 'react'
import AppMenu from './components/AppMenu'
import HoverMenuToggle from './components/HoverMenuToggle'

const VerticalNavigationBarPage = () => {
  const basePath = useLarkonPanelBasePath()
  const menuItems = useMemo(() => getMenuItems(basePath), [basePath])
  return (
    <div className="main-nav">
      <LogoBox />
      <HoverMenuToggle />
      <SimplebarReactClient className="scrollbar" data-simplebar>
        <Suspense fallback={<FallbackLoading />}>
          <AppMenu menuItems={menuItems} />
        </Suspense>
      </SimplebarReactClient>
    </div>
  )
}

export default VerticalNavigationBarPage
