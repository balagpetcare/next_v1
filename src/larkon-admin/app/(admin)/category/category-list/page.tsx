import Category from './components/Category'
import CategoryList from './components/CategoryList'
import PageTItle from '@larkon/components/PageTItle'
import { Metadata } from 'next'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Category List' }

const CategoryListPage = () => {
  return (
    <>
      <PageTItle title="CATEGORIES LIST" />
      <Category />
      <CategoryList />
    </>
  )
}

export default CategoryListPage
