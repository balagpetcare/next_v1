export type CouponsType = {
  coupons: number
  description: string
  price: number
  duration: number
  variant: string
}

export const couponsData: CouponsType[] = [
  {
    coupons: 4,
    description: 'Small nice summer coupons pack',
    duration: 1,
    price: 140,
    variant: 'primary',
  },
  {
    coupons: 8,
    description: 'Medium nice summer coupons pack',
    duration: 1,
    price: 235,
    variant: 'info',
  },
]
