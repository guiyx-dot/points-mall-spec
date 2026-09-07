import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { INITIAL_GRANTS } from './data'
import { CATALOG_EVENT, adjustStock, catalogProduct, loadCatalog, type CatalogProduct } from './catalog'
import { addDays, ensureExpireDate, isPointsExpired, nearestExpireDate, pointsExpireDate } from './points-expiry'
import type { CouponHold, Grant, LedgerEntry, Order, PayMethod, PayQuote, Product, Screen } from './types'

export { addDays, pointsExpireDate } from './points-expiry'

export const CONSUMER_KEY = 'points-mall-spec-v2'
export const GOLD_PRODUCT_ID = 'gold'
export const COUPON_PRODUCT_IDS = ['alipay', 'alipay-plus', 'wechat'] as const

export type Persisted = {
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


function benefitLocked(quotas: Record<string, number>, catalog = loadCatalog()) {
  let sum = 0
  for (const product of catalog) {
    if (product.zone === 'benefit') sum += (quotas[product.id] ?? 0) * product.cost
  }
  return sum
}

function seedBenefitQuotas(catalog = loadCatalog()) {
  const quotas: Record<string, number> = {}
  for (const product of catalog) {
    if (product.zone === 'benefit') quotas[product.id] = product.quota ?? 0
  }
  return quotas
}

export function emptyState(): Persisted {
  const grants = INITIAL_GRANTS.map((item) => ({ ...item }))
  const points = grants.reduce((sum, item) => sum + item.amount, 0)
  return {
    grants,
    points,
    quotas: seedBenefitQuotas(),
    orders: [],
    ledger: grants.map((item, index) => ({
      id: `Lseed-${index}`,
      type: 'claim' as const,
      title: item.title,
      amount: item.amount,
      time: formatTime(),
    })),
    hasEverClaimed: true,
    followUpIssued: true,
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
      grants: Array.isArray(parsed.grants) ? parsed.grants.map((item) => ensureExpireDate(item)) : emptyState().grants,
      orders: Array.isArray(parsed.orders)
        ? parsed.orders.map((item) => ({
            ...item,
            status: item.status === 'refunded' ? 'refunded' : 'completed',
          }))
        : [],
    }
    const legacy = parsed.voucherValue ?? 0
    if (legacy > 0 && next.goldBalance === 0 && next.coupons.length === 0) {
      const label = parsed.voucherLabel ?? ''
      if (label.includes('金') && !label.includes('券')) next.goldBalance = legacy
      else {
        const product = loadCatalog().find((item) => item.name === label)
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
  catalog: CatalogProduct[]
  pendingAmount: number
  pendingCount: number
  expiredPendingAmount: number
  nearestExpire: string | null
  generalPoints: number
  go: (screen: Screen) => void
  redeem: (productId: string, payWith?: PayMethod, couponProductId?: string) => Order | null
  reset: () => void
  productById: (id: string) => CatalogProduct | undefined
  remainingQuota: (productId: string) => number
  unavailable: (product: Product) => Unavailable
  quotePay: (product: Product, payWith: PayMethod, couponProductId?: string) => PayQuote
  couponTotal: number
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({
  children,
  isolated,
  initialScreen,
  seed,
}: {
  children: ReactNode
  isolated?: boolean
  initialScreen?: Screen
  seed?: Partial<Persisted>
}) {
  const [data, setData] = useState<Persisted>(() => ({ ...emptyState(), ...(isolated ? {} : loadState()), ...seed }))
  const [screen, setScreen] = useState<Screen>(initialScreen ?? { name: 'member' })
  const [catalog, setCatalog] = useState<CatalogProduct[]>(loadCatalog)

  useEffect(() => {
    if (isolated) return
    const sync = () => setData(loadState())
    const syncCatalog = () => setCatalog(loadCatalog())
    window.addEventListener('points-mall-sync', sync)
    window.addEventListener(CATALOG_EVENT, syncCatalog)
    return () => {
      window.removeEventListener('points-mall-sync', sync)
      window.removeEventListener(CATALOG_EVENT, syncCatalog)
    }
  }, [isolated])

  const persist = (next: Persisted) => {
    setData(next)
    if (!isolated) sessionStorage.setItem(CONSUMER_KEY, JSON.stringify(next))
  }

  const pending = data.grants.filter((item) => !item.claimed && (item.kind === 'dedicated' || !isPointsExpired(item.expireDate)))
  const pendingAmount = pending.reduce((sum, item) => sum + item.amount, 0)
  const pendingCount = pending.length
  const expiredPendingAmount = data.grants
    .filter((item) => !item.claimed && item.kind !== 'dedicated' && isPointsExpired(item.expireDate))
    .reduce((sum, item) => sum + item.amount, 0)
  const nearestExpire = nearestExpireDate(
    data.grants.filter((item) => item.kind !== 'dedicated' && (item.claimed || pending.includes(item))),
  )?.label ?? null
  const generalPoints = Math.max(0, data.points - benefitLocked(data.quotas))

  const go = (next: Screen) => {
    setScreen(next)
  }

  const unavailable = (product: Product): Unavailable => {
    const live = catalog.find((item) => item.id === product.id) ?? product
    const ended = { label: '兑换结束', hint: '该商品兑换活动已结束' }
    if (live.ended || live.onShelf === false || live.benefitStatus === 'ended' || live.benefitStatus === 'locked') {
      return ended
    }
    if (live.zone === 'benefit') {
      if ((live.stock ?? 0) <= 0) return ended
      const qty = data.quotas[live.id] ?? 0
      if (qty <= 0) return { label: '兑换结束', hint: '该商品发放额度已兑完' }
      const need = qty * live.cost
      if (data.points < need) {
        return { label: '积分不足', hint: `一次兑换剩余 ${qty} 份需要 ${need} 积分` }
      }
      return null
    }
    if (live.zone === 'points') {
      if ((live.stock ?? 0) <= 0) return ended
      const canPoints = makePayQuote(data.goldBalance, data.coupons, generalPoints, live, 'points').ok
      const canGold = makePayQuote(data.goldBalance, data.coupons, generalPoints, live, 'gold').ok
      const canCoupon = makePayQuote(data.goldBalance, data.coupons, generalPoints, live, 'coupon').ok
      if (!canPoints && !canGold && !canCoupon) return { label: '余额不足', hint: '积分、通用金和抵扣券都不够支付该商品' }
      return null
    }
    return ended
  }

  const redeem = (productId: string, payWith: PayMethod = 'points', couponProductId?: string) => {
    const product = catalog.find((item) => item.id === productId)
    if (!product) return null
    if (product.ended || product.onShelf === false || product.benefitStatus === 'ended' || product.benefitStatus === 'locked') return null

    if (product.zone === 'benefit') {
      if (unavailable(product)) return null
      const qty = data.quotas[product.id] ?? 0
      if (qty > product.stock) return null
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
      adjustStock(product.id, -qty)
      setScreen({ name: 'success', orderId: order.id })
      return order
    }

    if (product.stock <= 0) return null
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
    adjustStock(product.id, -1)
    setScreen({ name: 'success', orderId: order.id })
    return order
  }

  const reset = () => {
    persist(emptyState())
    setScreen({ name: 'member' })
  }

  const value = useMemo<Store>(
    () => ({
      ...data,
      screen,
      catalog,
      pendingAmount,
      pendingCount,
      expiredPendingAmount,
      nearestExpire,
      generalPoints,
      go,
      redeem,
      reset,
      productById: (id: string) => catalog.find((item) => item.id === id),
      remainingQuota: (productId: string) => data.quotas[productId] ?? 0,
      unavailable,
      quotePay: (product, payWith, couponProductId) =>
        makePayQuote(data.goldBalance, data.coupons, generalPoints, product, payWith, couponProductId),
      couponTotal: sumCoupons(data.coupons),
    }),
    [data, screen, catalog, pendingAmount, pendingCount, expiredPendingAmount, nearestExpire, generalPoints],
  )

  return createElement(StoreContext.Provider, { value }, children)
}

export function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('Store missing')
  return store
}

export function peekConsumer() {
  return loadState()
}

export function writeConsumer(next: Persisted) {
  sessionStorage.setItem(CONSUMER_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('points-mall-sync'))
}

export function adjustConsumerPoints(delta: number, title: string) {
  const data = loadState()
  const nextPoints = Math.max(0, round2(data.points + delta))
  const actual = round2(nextPoints - data.points)
  if (actual === 0) return nextPoints
  writeConsumer({
    ...data,
    points: nextPoints,
    ledger: [
      { id: `L${Date.now()}`, type: actual > 0 ? 'claim' : 'redeem', title, amount: actual, time: formatTime() },
      ...data.ledger,
    ],
  })
  return nextPoints
}

export function addConsumerGrant(amount: number, title: string) {
  creditIssuedRows([
    {
      id: `ag-${Date.now()}`,
      points: Math.max(1, Math.floor(amount)),
      kind: 'general',
      title,
    },
  ])
}

export function creditIssuedRows(
  rows: {
    id: string
    points: number
    kind: 'general' | 'dedicated'
    title?: string
    productId?: string
    productName?: string
    userFeeRate?: number
    expireDate?: string
  }[],
) {
  if (rows.length === 0) return
  const data = loadState()
  const quotas = { ...data.quotas }
  let points = data.points
  let userFeeRate = data.userFeeRate
  const extraGrants: Grant[] = []
  const extraLedger: LedgerEntry[] = []
  const now = formatTime()
  for (const row of rows) {
    const title = row.title ?? (row.kind === 'general' ? '通用积分发放' : `${row.productName ?? '专用券'}发放`)
    extraGrants.push({
      id: `mg-${row.id}`,
      title,
      amount: row.points,
      claimed: true,
      kind: row.kind,
      productId: row.productId,
      userFeeRate: row.userFeeRate,
      expireDate: row.expireDate ?? pointsExpireDate(),
    })
    extraLedger.push({
      id: `L${row.id}`,
      type: 'claim',
      title,
      amount: row.points,
      time: now,
    })
    points += row.points
    userFeeRate = Math.max(userFeeRate, row.userFeeRate ?? 0)
    if (row.kind === 'dedicated' && row.productId) {
      const product = catalogProduct(row.productId)
      const unit = product?.cost ?? 1
      quotas[row.productId] = (quotas[row.productId] ?? 0) + Math.max(0, Math.floor(row.points / unit))
    }
  }
  writeConsumer({
    ...data,
    points,
    quotas,
    userFeeRate,
    grants: [...extraGrants, ...data.grants],
    ledger: [...extraLedger, ...data.ledger],
    hasEverClaimed: true,
  })
}

function restoreCoupon(coupons: CouponHold[], order: Order) {
  const paid = order.couponPaid ?? 0
  if (paid <= 0) return coupons
  const found = coupons.find((item) => item.name === order.payLabel)
  if (found) {
    return coupons.map((item) =>
      item.name === order.payLabel ? { ...item, value: round2(item.value + paid) } : item,
    )
  }
  return [...coupons, { productId: 'alipay', name: order.payLabel ?? '抵扣券', value: paid }]
}

export function refundConsumerOrder(orderId: string) {
  const data = loadState()
  const order = data.orders.find((item) => item.id === orderId)
  if (!order || order.status === 'refunded') return false
  const product = catalogProduct(order.productId)
  if (product?.zone === 'benefit') return false
  const pointsBack = order.pointsPaid ?? (order.payWith === 'gold' || order.payWith === 'coupon' ? 0 : order.cost)
  const goldBack = order.goldPaid ?? 0
  const couponBack = order.couponPaid ?? 0
  const credit = pointsBack || goldBack || couponBack
  writeConsumer({
    ...data,
    points: round2(data.points + pointsBack),
    goldBalance: round2(data.goldBalance + goldBack),
    coupons: restoreCoupon(data.coupons, order),
    orders: data.orders.map((item) => (item.id === orderId ? { ...item, status: 'refunded' } : item)),
    ledger: [
      {
        id: `L${Date.now()}`,
        type: 'claim',
        title: `退款${order.productName}`,
        amount: credit,
        time: formatTime(),
      },
      ...data.ledger,
    ],
  })
  adjustStock(order.productId, 1)
  return true
}
