import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { FOLLOW_UP_GRANT, INITIAL_GRANTS, PRODUCTS } from './data'
import type { CouponHold, Grant, LedgerEntry, Order, PayMethod, PayQuote, Product, Screen } from './types'

export const CONSUMER_KEY = 'points-mall-spec-v1'
export const GOLD_PRODUCT_ID = 'gold'
export const COUPON_PRODUCT_IDS = ['alipay', 'alipay-plus', 'wechat'] as const

type Persisted = {
  grants: Grant[]
  points: number
  quotas: Record<string, number>
  orders: Order[]
  ledger: LedgerEntry[]
  hasEverClaimed: boolean
  followUpIssued: boolean
  goldBalance: number
  coupons: CouponHold[]
  userFeeRate: number
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function formatTime(date = new Date()) {
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function addDays(days: number, date = new Date()) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return `${next.getFullYear()}年${next.getMonth() + 1}月${next.getDate()}日`
}

function benefitLocked(quotas: Record<string, number>) {
  let sum = 0
  for (const product of PRODUCTS) {
    if (product.zone === 'benefit') sum += (quotas[product.id] ?? 0) * product.cost
  }
  return sum
}

function emptyQuotas() {
  const quotas: Record<string, number> = {}
  for (const product of PRODUCTS) {
    if (product.zone === 'benefit') quotas[product.id] = 0
  }
  return quotas
}

function seedBenefitQuotas() {
  const quotas: Record<string, number> = {}
  for (const product of PRODUCTS) {
    if (product.zone === 'benefit') quotas[product.id] = product.quota ?? 0
  }
  return quotas
}

function emptyState(): Persisted {
  return {
    grants: INITIAL_GRANTS.map((item) => ({ ...item })),
    points: 0,
    quotas: emptyQuotas(),
    orders: [],
    ledger: [],
    hasEverClaimed: false,
    followUpIssued: false,
    goldBalance: 0,
    coupons: [],
    userFeeRate: 0,
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function isGoldBenefit(id: string) {
  return id === GOLD_PRODUCT_ID
}

export function isCouponBenefit(id: string) {
  return (COUPON_PRODUCT_IDS as readonly string[]).includes(id)
}

function sumCoupons(coupons: CouponHold[]) {
  return round2(coupons.reduce((sum, item) => sum + item.value, 0))
}

function pickCoupon(coupons: CouponHold[], couponProductId?: string, need?: number): CouponHold | undefined {
  if (couponProductId) return coupons.find((item) => item.productId === couponProductId && item.value > 0)
  const usable = coupons.filter((item) => item.value > 0)
  if (usable.length === 0) return undefined
  if (need != null) {
    const full = usable.filter((item) => item.value >= need).sort((a, b) => b.value - a.value)
    if (full[0]) return full[0]
  }
  return [...usable].sort((a, b) => b.value - a.value)[0]
}

export function makePayQuote(
  goldBalance: number,
  coupons: CouponHold[],
  generalPoints: number,
  product: Product,
  payWith: PayMethod,
  couponProductId?: string,
): PayQuote {
  const cost = product.cost
  if (product.zone !== 'points') {
    return {
      method: 'points',
      goldPaid: 0,
      couponPaid: 0,
      pointsPaid: cost,
      ok: true,
      label: '积分',
    }
  }
  if (payWith === 'points') {
    return {
      method: 'points',
      goldPaid: 0,
      couponPaid: 0,
      pointsPaid: cost,
      ok: generalPoints >= cost,
      label: '积分',
    }
  }
  if (payWith === 'gold') {
    return {
      method: 'gold',
      goldPaid: cost,
      couponPaid: 0,
      pointsPaid: 0,
      ok: goldBalance >= cost,
      label: '通用金',
    }
  }
  const coupon = pickCoupon(coupons, couponProductId, cost)
  if (!coupon) {
    return {
      method: 'coupon',
      goldPaid: 0,
      couponPaid: 0,
      pointsPaid: 0,
      ok: false,
      label: '抵扣券',
    }
  }
  return {
    method: 'coupon',
    goldPaid: 0,
    couponPaid: cost,
    pointsPaid: 0,
    ok: coupon.value >= cost,
    label: coupon.name,
    couponProductId: coupon.productId,
  }
}

function creditWallet(data: Persisted, product: Product, received: number): Pick<Persisted, 'goldBalance' | 'coupons'> {
  if (isGoldBenefit(product.id)) {
    return { goldBalance: round2(data.goldBalance + received), coupons: data.coupons }
  }
  if (!isCouponBenefit(product.id)) {
    return { goldBalance: data.goldBalance, coupons: data.coupons }
  }
  const coupons = data.coupons.map((item) => ({ ...item }))
  const found = coupons.find((item) => item.productId === product.id)
  if (found) found.value = round2(found.value + received)
  else coupons.push({ productId: product.id, name: product.name, value: received })
  return { goldBalance: data.goldBalance, coupons }
}

function debitCoupon(coupons: CouponHold[], productId: string, amount: number) {
  return coupons
    .map((item) =>
      item.productId === productId ? { ...item, value: round2(item.value - amount) } : item,
    )
    .filter((item) => item.value > 0)
}

function loadState(): Persisted {
  try {
    const raw = sessionStorage.getItem(CONSUMER_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Partial<Persisted> & { voucherValue?: number; voucherLabel?: string }
    const next: Persisted = {
      ...emptyState(),
      ...parsed,
      goldBalance: parsed.goldBalance ?? 0,
      coupons: Array.isArray(parsed.coupons) ? parsed.coupons : [],
    }
    const legacy = parsed.voucherValue ?? 0
    if (legacy > 0 && next.goldBalance === 0 && next.coupons.length === 0) {
      const label = parsed.voucherLabel ?? ''
      if (label.includes('金') && !label.includes('券')) next.goldBalance = legacy
      else {
        const product = PRODUCTS.find((item) => item.name === label)
        next.coupons = [
          {
            productId: product && isCouponBenefit(product.id) ? product.id : 'alipay',
            name: label || '抵扣券',
            value: legacy,
          },
        ]
      }
    }
    return next
  } catch {
    return emptyState()
  }
}

type Unavailable = { label: string; hint: string } | null

type Store = Persisted & {
  screen: Screen
  pendingAmount: number
  pendingCount: number
  generalPoints: number
  go: (screen: Screen) => void
  claimPending: () => void
  redeem: (productId: string, payWith?: PayMethod, couponProductId?: string) => Order | null
  reset: () => void
  productById: (id: string) => Product | undefined
  remainingQuota: (productId: string) => number
  unavailable: (product: Product) => Unavailable
  quotePay: (product: Product, payWith: PayMethod, couponProductId?: string) => PayQuote
  couponTotal: number
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Persisted>(loadState)
  const [screen, setScreen] = useState<Screen>(loadState().hasEverClaimed ? { name: 'mall' } : { name: 'claim' })

  useEffect(() => {
    const sync = () => setData(loadState())
    window.addEventListener('points-mall-sync', sync)
    return () => window.removeEventListener('points-mall-sync', sync)
  }, [])

  const persist = (next: Persisted) => {
    setData(next)
    sessionStorage.setItem(CONSUMER_KEY, JSON.stringify(next))
  }

  const pending = data.grants.filter((item) => !item.claimed)
  const pendingAmount = pending.reduce((sum, item) => sum + item.amount, 0)
  const pendingCount = pending.length
  const generalPoints = Math.max(0, data.points - benefitLocked(data.quotas))

  const go = (next: Screen) => {
    if (!data.hasEverClaimed && next.name !== 'claim') {
      setScreen({ name: 'claim' })
      return
    }
    setScreen(next)
  }

  const claimPending = () => {
    if (pendingCount === 0) return
    const amount = pendingAmount
    const title = pendingCount > 1 ? `会员积分领取（${pendingCount} 笔合并）` : pending[0].title
    const nextGrants = data.grants.map((item) => (item.claimed ? item : { ...item, claimed: true }))
    const nextQuotas = { ...data.quotas }
    let userFeeRate = data.userFeeRate
    const hasLegacy = pending.some((grant) => !grant.kind)
    const hasMerchant = pending.some((grant) => grant.kind === 'general' || grant.kind === 'dedicated')
    if (hasLegacy && !data.hasEverClaimed) {
      const seed = seedBenefitQuotas()
      for (const id of Object.keys(seed)) nextQuotas[id] = (nextQuotas[id] ?? 0) + seed[id]
    }
    for (const grant of pending) {
      userFeeRate = Math.max(userFeeRate, grant.userFeeRate ?? 0)
      if (grant.kind === 'dedicated' && grant.productId) {
        const product = PRODUCTS.find((item) => item.id === grant.productId)
        const unit = product?.cost ?? 100
        nextQuotas[grant.productId] = (nextQuotas[grant.productId] ?? 0) + Math.max(0, Math.floor(grant.amount / unit))
      }
    }
    const addFollowUp = !data.followUpIssued && !hasMerchant
    persist({
      ...data,
      grants: addFollowUp ? [...nextGrants, { ...FOLLOW_UP_GRANT }] : nextGrants,
      points: data.points + amount,
      quotas: nextQuotas,
      userFeeRate,
      ledger: [
        { id: `L${Date.now()}`, type: 'claim', title, amount, time: formatTime() },
        ...data.ledger,
      ],
      hasEverClaimed: true,
      followUpIssued: data.followUpIssued || addFollowUp || hasMerchant,
    })
    setScreen({ name: 'mall' })
  }

  const unavailable = (product: Product): Unavailable => {
    const ended = { label: '兑换结束', hint: '该商品兑换活动已结束' }
    if (product.ended || product.benefitStatus === 'ended' || product.benefitStatus === 'locked') return ended
    if (product.zone === 'benefit') {
      const qty = data.quotas[product.id] ?? 0
      if (qty <= 0) return { label: '兑换结束', hint: '该商品发放额度已兑完' }
      const need = qty * product.cost
      if (data.points < need) {
        return { label: '积分不足', hint: `一次兑换剩余 ${qty} 份需要 ${need} 积分` }
      }
      return null
    }
    if (product.zone === 'points') {
      const canPoints = makePayQuote(data.goldBalance, data.coupons, generalPoints, product, 'points').ok
      const canGold = makePayQuote(data.goldBalance, data.coupons, generalPoints, product, 'gold').ok
      const canCoupon = makePayQuote(data.goldBalance, data.coupons, generalPoints, product, 'coupon').ok
      if (!canPoints && !canGold && !canCoupon) return ended
      return null
    }
    return ended
  }

  const redeem = (productId: string, payWith: PayMethod = 'points', couponProductId?: string) => {
    const product = PRODUCTS.find((item) => item.id === productId)
    if (!product) return null
    if (product.ended || product.benefitStatus === 'ended' || product.benefitStatus === 'locked') return null

    if (product.zone === 'benefit') {
      if (unavailable(product)) return null
      const qty = data.quotas[product.id] ?? 0
      const pointsCost = qty * product.cost
      const now = new Date()
      const received = round2(pointsCost * (1 - data.userFeeRate))
      const wallet = creditWallet(data, product, received)
      const order: Order = {
        id: `ORD${now.getTime().toString().slice(-10)}`,
        productId: product.id,
        productName: qty > 1 ? `${product.name}×${qty}` : product.name,
        cost: pointsCost,
        time: formatTime(now),
        expireDate: addDays(product.validityDays, now),
        status: 'completed',
        payWith: 'points',
        payLabel: '积分',
        pointsPaid: pointsCost,
        received,
      }
      persist({
        ...data,
        ...wallet,
        points: data.points - pointsCost,
        quotas: { ...data.quotas, [product.id]: 0 },
        orders: [order, ...data.orders],
        ledger: [
          {
            id: `L${now.getTime()}`,
            type: 'redeem',
            title: qty > 1 ? `兑换${product.name}×${qty}` : `兑换${product.name}`,
            amount: -pointsCost,
            time: order.time,
          },
          ...data.ledger,
        ],
      })
      setScreen({ name: 'success', orderId: order.id })
      return order
    }

    const quote = makePayQuote(data.goldBalance, data.coupons, generalPoints, product, payWith, couponProductId)
    if (!quote.ok) return null
    const now = new Date()
    const order: Order = {
      id: `ORD${now.getTime().toString().slice(-10)}`,
      productId: product.id,
      productName: product.name,
      cost: product.cost,
      time: formatTime(now),
      expireDate: addDays(product.validityDays, now),
      status: 'completed',
      payWith: quote.method,
      payLabel: quote.label,
      goldPaid: quote.goldPaid,
      couponPaid: quote.couponPaid,
      pointsPaid: quote.pointsPaid,
    }
    const ledgerTitle =
      quote.method === 'gold'
        ? `通用金兑换${product.name}`
        : quote.method === 'coupon'
          ? `${quote.label}兑换${product.name}`
          : `兑换${product.name}`
    persist({
      ...data,
      points: data.points - quote.pointsPaid,
      goldBalance: round2(data.goldBalance - quote.goldPaid),
      coupons: quote.couponProductId
        ? debitCoupon(data.coupons, quote.couponProductId, quote.couponPaid)
        : data.coupons,
      orders: [order, ...data.orders],
      ledger: [
        {
          id: `L${now.getTime()}`,
          type: 'redeem',
          title: ledgerTitle,
          amount: -(quote.pointsPaid || quote.goldPaid || quote.couponPaid),
          time: order.time,
        },
        ...data.ledger,
      ],
    })
    setScreen({ name: 'success', orderId: order.id })
    return order
  }

  const reset = () => {
    persist(emptyState())
    setScreen({ name: 'claim' })
  }

  const value = useMemo<Store>(
    () => ({
      ...data,
      screen,
      pendingAmount,
      pendingCount,
      generalPoints,
      go,
      claimPending,
      redeem,
      reset,
      productById: (id: string) => PRODUCTS.find((item) => item.id === id),
      remainingQuota: (productId: string) => data.quotas[productId] ?? 0,
      unavailable,
      quotePay: (product, payWith, couponProductId) =>
        makePayQuote(data.goldBalance, data.coupons, generalPoints, product, payWith, couponProductId),
      couponTotal: sumCoupons(data.coupons),
    }),
    [data, screen, pendingAmount, pendingCount, generalPoints],
  )

  return createElement(StoreContext.Provider, { value }, children)
}

export function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('Store missing')
  return store
}
