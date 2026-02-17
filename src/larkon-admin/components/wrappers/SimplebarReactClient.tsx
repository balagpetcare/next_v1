'use client'
import type { ChildrenType } from '@larkon/types/component-props'
import SimpleBar, { type Props } from 'simplebar-react'
type SimplebarReactClientProps = Props & ChildrenType

const SimplebarReactClient = ({ children, ...options }: SimplebarReactClientProps) => {
  return <SimpleBar {...options}>{children}</SimpleBar>
}

export default SimplebarReactClient
