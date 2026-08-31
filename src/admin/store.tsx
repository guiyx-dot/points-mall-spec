import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { CONSUMER_KEY, formatTime } from '../store'
import type { Grant } from '../types'
import {
  DEMO_PHONE,
  issuePerUser,
  maskPhone,
  quote,
  skuById,
  dedicatedLabel,
  feeRateFor,
  type AdminOrder,
  type AdminScreen,
  type ApprovalDraft,
  type ImportRow,
  type IssuedUser,
  type PurchaseKind,
} from './model'

const ADMIN_KEY = 'points-mall-spec-admin-v1'

type AdminData = {
  orders: AdminOrder[]
  users: IssuedUser[]
}

type AdminStore = AdminData & {
  screen: AdminScreen
  issueOrderId: string | null
  approvalDraft: ApprovalDraft | null
  go: (screen: AdminScreen, issueOrderId?: string | null) => void
  setApprovalDraft: (draft: ApprovalDraft | null) => void
  createOrder: (input: {
    kind: PurchaseKind
    productId?: string
    costAmount: number
    merchantFeeRate: number
    grants?: ImportRow[]
    source?: 'catalog' | 'approval'
  }) => AdminOrder
  distribute: (orderId: string, phones: string[], amounts?: number[]) => IssuedUser[]
  remainingPoints: (orderId: string) => number
}

const Ctx = createContext<AdminStore | null>(null)

function empty(): AdminData {
  return { orders: [], users: [] }
}

function load(): AdminData {
  try {
    const raw = sessionStorage.getItem(ADMIN_KEY)
    if (!raw) return empty()
    const next: AdminData = { ...empty(), ...JSON.parse(raw) } as AdminData
    next.orders = (next.orders ?? []).map((item) => ({
      ...item,
      source: item.source ?? 'catalog',
    }))
    return next
  } catch {
    return empty()
  }
}

const NAMES = ['桂*徽', '张*伟', '李*敏', '王*强', '陈*婷']

function nameFor(index: number, phone: string) {
  if (phone.replace(/\D/g, '') === DEMO_PHONE) return '桂*徽'
  return NAMES[index % NAMES.length]
}

function pushConsumerGrants(rows: IssuedUser[]) {
  const demo = rows.filter((row) => row.phone.replace(/\D/g, '') === DEMO_PHONE)
  if (demo.length === 0) return
  let persisted: { grants?: Grant[] }
  try {
    persisted = JSON.parse(sessionStorage.getItem(CONSUMER_KEY) || 'null') || {}
  } catch {
    persisted = {}
  }
  const grants: Grant[] = Array.isArray(persisted.grants) ? persisted.grants : []
  const extra: Grant[] = demo.map((row) => ({
    id: `mg-${row.id}`,
    title: row.kind === 'general' ? '通用积分发放' : `${row.productName}发放`,
    amount: row.points,
    claimed: false,
    kind: row.kind,
    productId: row.productId,
    userFeeRate: row.userFeeRate,
  }))
  sessionStorage.setItem(CONSUMER_KEY, JSON.stringify({ ...persisted, grants: [...grants, ...extra] }))
  window.dispatchEvent(new Event('points-mall-sync'))
}

function applyGrants(order: AdminOrder, grants: ImportRow[], orders: AdminOrder[], users: IssuedUser[]) {
  const rows: IssuedUser[] = grants.map((row, index) => ({
    id: `${order.id}-${row.phone}-${Date.now()}-${index}`,
    phone: row.phone,
    name: nameFor(index, row.phone),
    orderId: order.id,
    points: row.points,
    kind: order.kind,
    productId: order.productId,
    productName: order.productName,
    userFeeRate: order.userFeeRate,
    claimed: false,
  }))
  const issued = rows.reduce((sum, row) => sum + row.points, 0)
  return {
    next: {
      orders: orders.map((item) =>
        item.id === order.id ? { ...item, issuedPoints: item.issuedPoints + issued } : item,
      ),
      users: [...rows, ...users],
    },
    rows,
  }
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AdminData>(load)
  const [screen, setScreen] = useState<AdminScreen>('catalog')
  const [issueOrderId, setIssueOrderId] = useState<string | null>(null)
  const [approvalDraft, setApprovalDraft] = useState<ApprovalDraft | null>(null)

  const persist = (next: AdminData) => {
    setData(next)
    sessionStorage.setItem(ADMIN_KEY, JSON.stringify(next))
  }

  const go = (next: AdminScreen, orderId: string | null = issueOrderId) => {
    setScreen(next)
    if (next === 'issue') setIssueOrderId(orderId)
  }

  const createOrder: AdminStore['createOrder'] = (input) => {
    const product = input.productId ? skuById(input.productId) : undefined
    const q = quote(input.costAmount, input.merchantFeeRate, feeRateFor(input.kind))
    const order: AdminOrder = {
      id: `PO${Date.now().toString().slice(-10)}`,
      source: input.source ?? 'catalog',
      kind: input.kind,
      productId: input.productId,
      productName: input.kind === 'general' ? '通用积分' : dedicatedLabel(product?.name),
      costAmount: input.costAmount,
      pointsTotal: input.costAmount,
      merchantFeeRate: q.merchantFeeRate,
      userFeeRate: q.userFeeRate,
      merchantPay: q.merchantPay,
      userFeeAmount: q.userFeeAmount,
      issuedPoints: 0,
      status: 'paid',
      createdAt: formatTime(),
    }
    const orders = [order, ...data.orders]
    if (input.grants && input.grants.length > 0) {
      const applied = applyGrants(order, input.grants, orders, data.users)
      persist(applied.next)
      pushConsumerGrants(applied.rows)
      if (input.source === 'approval') {
        setApprovalDraft((prev) => (prev ? { ...prev, paid: true, orderId: order.id } : prev))
        setScreen('approval-pay')
        return order
      }
      setIssueOrderId(order.id)
      setScreen('users')
      return order
    }
    persist({ ...data, orders })
    setIssueOrderId(order.id)
    setScreen('issue')
    return order
  }

  const remainingPoints = (orderId: string) => {
    const order = data.orders.find((item) => item.id === orderId)
    if (!order) return 0
    return Math.max(0, order.pointsTotal - order.issuedPoints)
  }

  const distribute: AdminStore['distribute'] = (orderId, phones) => {
    const order = data.orders.find((item) => item.id === orderId)
    if (!order) return []
    const cleaned = [...new Set(phones.map((item) => item.replace(/\D/g, '')).filter((item) => item.length >= 11))]
    if (cleaned.length === 0) return []
    const remain = remainingPoints(orderId)
    const per = issuePerUser(remain, cleaned.length, order.kind, order.productId)
    if (per <= 0) return []
    const rows: IssuedUser[] = cleaned.map((phone, index) => ({
      id: `${orderId}-${phone}-${Date.now()}-${index}`,
      phone,
      name: nameFor(index, phone),
      orderId,
      points: per,
      kind: order.kind,
      productId: order.productId,
      productName: order.productName,
      userFeeRate: order.userFeeRate,
      claimed: false,
    }))
    persist({
      orders: data.orders.map((item) =>
        item.id === orderId ? { ...item, issuedPoints: item.issuedPoints + per * rows.length } : item,
      ),
      users: [...rows, ...data.users],
    })
    pushConsumerGrants(rows)
    setScreen('users')
    return rows
  }

  const value = useMemo<AdminStore>(
    () => ({ ...data, screen, issueOrderId, approvalDraft, go, setApprovalDraft, createOrder, distribute, remainingPoints }),
    [data, screen, issueOrderId, approvalDraft],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAdmin() {
  const store = useContext(Ctx)
  if (!store) throw new Error('Admin store missing')
  return store
}

export { maskPhone }
