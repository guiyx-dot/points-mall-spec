import { DEMO_PHONE, maskPhone, type IssuedUser } from './model'
import { peekConsumer } from '../store'
import { loadCatalog } from '../catalog'
import { useAdmin } from './store'
import { ensureExpireDate, expiringSoonAmount, isPointsExpired, addDays, pointsExpireDate } from '../points-expiry'
import { useEffect, useMemo, useState } from 'react'

export const BOOKS_KEY = 'points-mall-spec-member-books-v5'

export type MemberGrant = {
  id: string
  title: string
  amount: number
  time: string
  claimed: boolean
  expireDate?: string
}

export type MemberBook = {
  phone: string
  name: string
  generalPoints: number
  grants: MemberGrant[]
}

const SEED_BOOKS: MemberBook[] = [
  {
    phone: '13800002202',
    name: '张*伟',
    generalPoints: 2101,
    grants: [{ id: 'sb-1', title: '通用积分发放', amount: 2200, time: '9月1日 09:18', claimed: true, expireDate: addDays(12) }],
  },
  {
    phone: '18600003303',
    name: '李*敏',
    generalPoints: 1300,
    grants: [
      { id: 'sb-2', title: '通用积分发放', amount: 800, time: '8月28日 16:02', claimed: true, expireDate: '2026年11月26日' },
      { id: 'sb-3', title: '补发通用积分', amount: 500, time: '9月2日 11:20', claimed: true, expireDate: '2026年12月1日' },
    ],
  },
  {
    phone: '13700004404',
    name: '王*强',
    generalPoints: 0,
    grants: [{ id: 'sb-4', title: '通用积分发放', amount: 50, time: '8月20日 14:08', claimed: true, expireDate: '2026年11月18日' }],
  },
]

export function digits(phone: string) {
  return phone.replace(/\D/g, '')
}

function generalPointsOf(points: number, quotas: Record<string, number>) {
  let locked = 0
  for (const product of loadCatalog()) {
    if (product.zone !== 'benefit') continue
    locked += (quotas[product.id] ?? 0) * product.cost
  }
  return Math.max(0, points - locked)
}

function demoBook(): MemberBook {
  const data = peekConsumer()
  return {
    phone: DEMO_PHONE,
    name: '桂*徽',
    generalPoints: generalPointsOf(data.points, data.quotas),
    grants: data.grants
      .filter((item) => item.kind !== 'dedicated')
      .map((item) => ({
        id: item.id,
        title: item.title,
        amount: item.amount,
        time: data.ledger.find((row) => row.title.includes(item.title))?.time ?? '—',
        claimed: item.claimed,
        expireDate: item.expireDate,
      })),
  }
}

export function loadBooks(): MemberBook[] {
  try {
    const raw = sessionStorage.getItem(BOOKS_KEY)
    if (!raw) return SEED_BOOKS.map((item) => ({ ...item, grants: [...item.grants] }))
    const parsed = JSON.parse(raw) as MemberBook[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return SEED_BOOKS.map((item) => ({ ...item, grants: [...item.grants] }))
    }
    return parsed.map((item) => ({
      phone: item.phone,
      name: item.name,
      generalPoints: item.generalPoints ?? 0,
      grants: Array.isArray(item.grants) ? item.grants.map((row) => ensureExpireDate(row)) : [],
    }))
  } catch {
    return SEED_BOOKS.map((item) => ({ ...item, grants: [...item.grants] }))
  }
}

export function saveBooks(books: MemberBook[]) {
  sessionStorage.setItem(BOOKS_KEY, JSON.stringify(books))
  window.dispatchEvent(new Event('points-mall-members'))
}

export function creditGeneralPoints(phone: string, amount: number, title: string) {
  const id = digits(phone)
  if (id === DEMO_PHONE) return
  const books = loadBooks()
  const next = books.map((item) =>
    digits(item.phone) === id
      ? {
          ...item,
          generalPoints: item.generalPoints + amount,
          grants: [{ id: `rf-${Date.now()}`, title, amount, time: '刚刚', claimed: true, expireDate: pointsExpireDate() }, ...item.grants],
        }
      : item,
  )
  saveBooks(next)
  return next
}

export type MemberRow = MemberBook & {
  pending: number
  expiringSoon: number
  live: boolean
}

export function buildMemberRows(books: MemberBook[], users: IssuedUser[]): MemberRow[] {
  const live = demoBook()
  const nameByPhone = new Map<string, string>()
  for (const item of users) {
    const phone = digits(item.phone)
    if (item.name) nameByPhone.set(phone, item.name)
  }
  const map = new Map<string, MemberBook>()
  map.set(DEMO_PHONE, live)
  for (const book of books) {
    const phone = digits(book.phone)
    if (phone === DEMO_PHONE) continue
    map.set(phone, { ...book, name: nameByPhone.get(phone) ?? book.name })
  }
  for (const item of users) {
    if (item.kind !== 'general') continue
    const phone = digits(item.phone)
    if (phone === DEMO_PHONE || map.has(phone)) continue
    const related = users.filter((row) => digits(row.phone) === phone && row.kind === 'general')
    map.set(phone, {
      phone,
      name: nameByPhone.get(phone) ?? maskPhone(phone),
      generalPoints: related.reduce((sum, row) => sum + row.points, 0),
      grants: related.map((row) => ({
        id: row.id,
        title: '通用积分发放',
        amount: row.points,
        time: '审批发放',
        claimed: row.claimed,
        expireDate: row.expireDate ?? pointsExpireDate(),
      })),
    })
  }
  return [...map.values()].map((item) => {
    const phone = digits(item.phone)
    return {
      ...item,
      phone,
      pending: item.grants.filter((row) => !row.claimed && !isPointsExpired(row.expireDate)).reduce((sum, row) => sum + row.amount, 0),
      expiringSoon: expiringSoonAmount(item.grants),
      live: phone === DEMO_PHONE,
    }
  })
}

export function useMemberRows() {
  const { users } = useAdmin()
  const [books, setBooks] = useState(loadBooks)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const sync = () => {
      setBooks(loadBooks())
      setTick((n) => n + 1)
    }
    window.addEventListener('points-mall-sync', sync)
    window.addEventListener('points-mall-members', sync)
    return () => {
      window.removeEventListener('points-mall-sync', sync)
      window.removeEventListener('points-mall-members', sync)
    }
  }, [])

  const rows = useMemo(() => buildMemberRows(books, users), [books, users, tick])
  return { rows, books, setBooks, tick }
}
