import { PRODUCTS } from '../data'
import type { Product } from '../types'

export const FEE_RATE = 0.08
export const GENERAL_FEE_RATE = 0.03
export const DEMO_PHONE = '19911011101'

const DEDICATED_IDS = ['gold', 'alipay', 'alipay-plus', 'wechat'] as const

export const DEDICATED_SKUS = DEDICATED_IDS.map((id) => PRODUCTS.find((item) => item.id === id)).filter(
  (item): item is Product => Boolean(item),
)

export function dedicatedLabel(name?: string) {
  const base = name?.trim()
  if (!base) return '专用券'
  return base.endsWith('专用券') ? base : `${base}专用券`
}

export type PurchaseKind = 'general' | 'dedicated'

export type AdminOrder = {
  id: string
  source: 'catalog' | 'approval'
  kind: PurchaseKind
  productId?: string
  productName: string
  costAmount: number
  pointsTotal: number
  merchantFeeRate: number
  userFeeRate: number
  merchantPay: number
  userFeeAmount: number
  issuedPoints: number
  status: 'paid'
  createdAt: string
}

export type IssuedUser = {
  id: string
  phone: string
  name: string
  orderId: string
  points: number
  kind: PurchaseKind
  productId?: string
  productName: string
  userFeeRate: number
  claimed: boolean
}

export type AdminScreen = 'catalog' | 'buy' | 'orders' | 'issue' | 'users' | 'approval' | 'approval-buy' | 'approval-pay'

export function money(n: number) {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function maskPhone(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.length < 7) return phone
  return `${d.slice(0, 3)}****${d.slice(-4)}`
}

export function skuById(id: string): Product | undefined {
  return PRODUCTS.find((item) => item.id === id)
}

export const FEE_PCT = Math.round(FEE_RATE * 100)
export const GENERAL_FEE_PCT = Math.round(GENERAL_FEE_RATE * 100)
export const SAMPLE_UNITS = 100
export const UNIT_PRICE = 1

export function feeRateFor(kind: PurchaseKind) {
  return kind === 'general' ? GENERAL_FEE_RATE : FEE_RATE
}

export function feePctFor(kind: PurchaseKind) {
  return kind === 'general' ? GENERAL_FEE_PCT : FEE_PCT
}

export type ImportRow = {
  phone: string
  units: number
  points: number
  name?: string
  plate?: string
  idNo?: string
  alipay?: string
  remark?: string
  effectiveDate?: string
}

export const SAMPLE_TABLE: ImportRow[] = [
  { phone: '19911011101', name: '桂*徽', units: 1, points: 1 },
  { phone: '13800002202', name: '张*伟', units: 1, points: 1 },
  { phone: '18600003303', name: '李*敏', units: 1, points: 1 },
]

const EXTRA_NAMES = ['王*强', '陈*婷', '刘*军', '赵*丽', '周*杰', '吴*芳', '徐*峰', '孙*燕', '胡*斌', '朱*敏']

function extraPhone(index: number) {
  return `139${String(80000000 + index).slice(-8)}`
}

export function buildApprovalUsers(count = 128): ImportRow[] {
  const date = '2026-08-27'
  const head: ImportRow[] = [
    {
      phone: '19911011101',
      name: '桂*徽',
      units: 1,
      points: 1,
      plate: '浙A·8***2',
      idNo: '3301**********1101',
      alipay: '19911011101',
      effectiveDate: date,
    },
    {
      phone: '13800002202',
      name: '张*伟',
      units: 1,
      points: 1,
      plate: '',
      idNo: '3301**********2202',
      alipay: '13800002202',
      effectiveDate: date,
    },
    {
      phone: '18600003303',
      name: '李*敏',
      units: 1,
      points: 1,
      plate: '浙B·6***9',
      idNo: '',
      alipay: '',
      effectiveDate: date,
    },
  ]
  const extra = Array.from({ length: Math.max(0, count - head.length) }, (_, index) => {
    const n = index + 1
    const phone = extraPhone(n)
    return {
      phone,
      name: EXTRA_NAMES[index % EXTRA_NAMES.length],
      units: 1,
      points: 1,
      plate: n % 4 === 0 ? `浙A·${String(10 + (n % 90)).slice(-2)}***${n % 10}` : '',
      idNo: n % 3 === 0 ? `3301**********${String(1000 + n).slice(-4)}` : '',
      alipay: n % 2 === 0 ? phone : '',
      remark: '',
      effectiveDate: date,
    }
  })
  return [...head, ...extra]
}

export const APPROVAL_USERS = buildApprovalUsers(128)

export type ApprovalTab = 'discount' | 'car'

export type ApprovalRecord = {
  id: string
  tab: ApprovalTab
  batchNo: string
  approvalNo: string
  merchant: string
  chainName: string
  applicant: string
  submittedAt: string
  handler: string
  customerName: string
  customerPhone: string
  status: string
  users: ImportRow[]
}

export const APPROVAL_RECORDS: ApprovalRecord[] = [
  {
    id: 'ar1',
    tab: 'discount',
    batchNo: '2068945828076064768',
    approvalNo: '010162320098',
    merchant: '产研中心线上验证专用',
    chainName: '产研验证商户演示营销折扣提报',
    applicant: '灵犀小二023',
    submittedAt: '2026-06-22 14:34:38',
    handler: 'lingzhen',
    customerName: '桂*徽',
    customerPhone: '19911011101',
    status: '已通过',
    users: APPROVAL_USERS,
  },
  {
    id: 'ar2',
    tab: 'discount',
    batchNo: '2068945828076064801',
    approvalNo: '010162320112',
    merchant: '产研中心线上验证专用',
    chainName: '产研验证商户演示营销折扣批量',
    applicant: '灵犀小二023',
    submittedAt: '2026-06-21 09:12:05',
    handler: 'lingzhen',
    customerName: '张*伟',
    customerPhone: '13800002202',
    status: '已通过',
    users: APPROVAL_USERS,
  },
  {
    id: 'ar3',
    tab: 'car',
    batchNo: '2068945828076064902',
    approvalNo: '010162320220',
    merchant: '产研中心线上验证专用',
    chainName: '产研验证商户演示新车单笔提报',
    applicant: '灵犀小二023',
    submittedAt: '2026-06-20 16:08:11',
    handler: 'lingzhen',
    customerName: '李*敏',
    customerPhone: '18600003303',
    status: '已通过',
    users: APPROVAL_USERS,
  },
  {
    id: 'ar4',
    tab: 'car',
    batchNo: '2068945828076064918',
    approvalNo: '010162320231',
    merchant: '产研中心线上验证专用',
    chainName: '产研验证商户演示新车批量提报',
    applicant: '灵犀小二023',
    submittedAt: '2026-06-19 11:22:47',
    handler: 'lingzhen',
    customerName: '王*强',
    customerPhone: '13700004404',
    status: '已通过',
    users: APPROVAL_USERS,
  },
]

export type ApprovalDraft = {
  recordId: string
  kind: PurchaseKind
  productId?: string
  merchantFeeRate: number
  rows: ImportRow[]
  paid: boolean
  orderId?: string
  ticketNo?: string
}

export function approvalById(id: string) {
  return APPROVAL_RECORDS.find((item) => item.id === id)
}

export function parseImport(text: string, unitPoints = 1): ImportRow[] {
  const map = new Map<string, number>()
  for (const line of text.split(/\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.split(/[\s,，\t]+/).filter(Boolean)
    const phone = (parts[0] ?? '').replace(/\D/g, '')
    if (phone.length < 11) continue
    const units = Math.max(1, Math.floor(Number(parts[1]) || 1))
    map.set(phone, (map.get(phone) ?? 0) + units)
  }
  return [...map.entries()].map(([phone, units]) => ({
    phone,
    units,
    points: units * unitPoints,
  }))
}

export function planFromRows(rows: ImportRow[]) {
  const units = rows.reduce((sum, row) => sum + row.units, 0)
  const pointsTotal = rows.reduce((sum, row) => sum + row.points, 0)
  const costAmount = units * UNIT_PRICE
  return { rows, units, pointsTotal, costAmount }
}

export function quote(costAmount: number, merchantFeeRate: number, totalFeeRate = FEE_RATE) {
  const total = Math.round(Math.max(0, totalFeeRate) * 100) / 100
  const clamped = Math.round(Math.min(total, Math.max(0, merchantFeeRate)) * 100) / 100
  const userFeeRate = Math.round((total - clamped) * 100) / 100
  return {
    merchantFeeRate: clamped,
    userFeeRate,
    merchantFeeAmount: round2(costAmount * clamped),
    userFeeAmount: round2(costAmount * userFeeRate),
    merchantPay: round2(costAmount * (1 + clamped)),
    userGets: round2(costAmount * (1 - userFeeRate)),
  }
}

export function issuePerUser(remain: number, count: number, kind: PurchaseKind, productId?: string) {
  if (count <= 0 || remain <= 0) return 0
  const unit = kind === 'dedicated' ? (skuById(productId ?? '')?.cost ?? 100) : 1
  return Math.floor(remain / count / unit) * unit
}

export function round2(n: number) {
  return Math.round(n * 100) / 100
}

export const SAMPLE_PHONES = `19911011101
13800002202
18600003303`
