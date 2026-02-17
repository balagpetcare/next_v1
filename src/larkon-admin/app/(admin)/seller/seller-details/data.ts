export type ProductCategoryType = {
  title: string
  progress: number
  amount: number
  variant: string
}
export type AllSellsType = {
  title: string
  item: string
}
export type CompanyReviewsType = {
  star: number
  progress: number
}

export const productCategoryData: ProductCategoryType[] = [
  {
    title: "Man's Wares",
    progress: 70,
    amount: 123,
    variant: 'primary',
  },
  {
    title: "Woman's Wares",
    progress: 90,
    amount: 233,
    variant: 'success',
  },
  {
    title: "Kid's Wares",
    progress: 60,
    amount: 110,
    variant: 'warning',
  },
  {
    title: 'Foot Wares',
    progress: 40,
    amount: 51,
    variant: 'info',
  },
]

export const allSellsData: AllSellsType[] = [
  {
    item: '865',
    title: 'Item Stock',
  },
  {
    item: '+4.5k',
    title: 'Sells',
  },
  {
    item: '+2k',
    title: 'Happy Client',
  },
  {
    item: '+36k',
    title: 'Followers',
  },
]

export const companyReviewsData: CompanyReviewsType[] = [
  {
    progress: 80,
    star: 5,
  },
  {
    progress: 50,
    star: 4,
  },
  {
    progress: 30,
    star: 3,
  },
  {
    progress: 20,
    star: 2,
  },
  {
    progress: 10,
    star: 1,
  },
]
