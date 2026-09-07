export type Zone = 'benefit' | 'points'
export type Category = 'dining' | 'life' | 'travel'
export type BenefitStatus = 'available' | 'locked' | 'ended'
export type Tab = 'mall' | 'mine'

export type Screen =
  | { name: 'member' }
  | { name: 'claim' }
  | { name: 'mall' }
  | { name: 'detail'; productId: string }
  | { name: 'success'; orderId: string }
  | { name: 'gold-wallet'; fromOrderId?: string }
  | { name: 'my-benefits'; fromOrderId?: string }
  | { name: 'mine' }
  | { name: 'records' }

export type Product = {
  id: string
  name: string
  subtitle: string
  zone: Zone
  category?: Category
  cost: number
  validityDays: number
  stockLabel: string
  description: string
  usage: string
  benefitStatus?: BenefitStatus
  quota?: number
  ended?: boolean
  stock?: number
  onShelf?: boolean
}

export type Grant = {
  id: string
  title: string
  amount: number
  claimed: boolean
  expireDate?: string
  kind?: 'general' | 'dedicated'
  productId?: string
  userFeeRate?: number
}

export type LedgerEntry = {
  id: string
  type: 'claim' | 'redeem'
  title: string
  amount: number
  time: string
}

export type PayMethod = 'points' | 'gold' | 'coupon'

export type CouponHold = {
  productId: string
  name: string
  value: number
}

export type PayQuote = {
  method: PayMethod
  goldPaid: number
  couponPaid: number
  pointsPaid: number
  ok: boolean
  label: string
  couponProductId?: string
}

export type Order = {
  id: string
  productId: string
  productName: string
  cost: number
  time: string
  expireDate: string
  status: 'completed' | 'refunded'
  payWith?: PayMethod
  payLabel?: string
  goldPaid?: number
  couponPaid?: number
  pointsPaid?: number
  received?: number
}
