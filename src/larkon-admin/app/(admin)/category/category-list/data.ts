import { StaticImageData } from 'next/image'
import product1 from '@larkon/assets/images/product/p-1.png'
import product6 from '@larkon/assets/images/product/p-6.png'
import product7 from '@larkon/assets/images/product/p-7.png'
import product9 from '@larkon/assets/images/product/p-9.png'

export type CategoryType = {
  image: StaticImageData
  categoryTitle: string
}

export const categoryData: CategoryType[] = [
  {
    image: product1,
    categoryTitle: 'Fashion Categories',
  },
  {
    image: product6,
    categoryTitle: 'Electronics Headphone',
  },
  {
    image: product7,
    categoryTitle: 'Foot Wares',
  },
  {
    image: product9,
    categoryTitle: 'Eye Ware & Sunglass',
  },
]
