export const POINTS_VALIDITY_DAYS = 90
export const POINTS_EXPIRE_SOON_DAYS = 15

export function addDays(days: number, date = new Date()) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return `${next.getFullYear()}年${next.getMonth() + 1}月${next.getDate()}日`
}

export function pointsExpireDate(from = new Date()) {
  return addDays(POINTS_VALIDITY_DAYS, from)
}

export function parseCnDate(label?: string) {
  if (!label) return null
  const withYear = label.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
  if (withYear) {
    return new Date(Number(withYear[1]), Number(withYear[2]) - 1, Number(withYear[3]), 23, 59, 59, 999)
  }
  const noYear = label.match(/(\d{1,2})月(\d{1,2})日/)
  if (!noYear) return null
  const now = new Date()
  return new Date(now.getFullYear(), Number(noYear[1]) - 1, Number(noYear[2]), 23, 59, 59, 999)
}

export function daysUntilExpire(expireDate?: string, now = new Date()) {
  const date = parseCnDate(expireDate)
  if (!date) return null
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((date.getTime() - start.getTime()) / 86400000)
}

export function isPointsExpired(expireDate?: string, now = new Date()) {
  const days = daysUntilExpire(expireDate, now)
  return days != null && days < 0
}

export function isExpireSoon(expireDate?: string, now = new Date()) {
  const days = daysUntilExpire(expireDate, now)
  return days != null && days >= 0 && days <= POINTS_EXPIRE_SOON_DAYS
}

export function ensureExpireDate<T extends { expireDate?: string }>(item: T, from = new Date()): T {
  if (item.expireDate) return item
  return { ...item, expireDate: pointsExpireDate(from) }
}

export function nearestExpireDate(items: { expireDate?: string }[], now = new Date()) {
  let best: { label: string; days: number } | null = null
  for (const item of items) {
    const days = daysUntilExpire(item.expireDate, now)
    if (days == null || days < 0 || !item.expireDate) continue
    if (!best || days < best.days) best = { label: item.expireDate, days }
  }
  return best
}

export function expiringSoonAmount(items: { amount: number; expireDate?: string }[], now = new Date()) {
  return items.reduce((sum, item) => (isExpireSoon(item.expireDate, now) ? sum + item.amount : sum), 0)
}

export function pointsExpiryHint(expireDate?: string | null) {
  if (!expireDate) return `通用积分自发放起 ${POINTS_VALIDITY_DAYS} 天有效`
  return `通用积分自发放起 ${POINTS_VALIDITY_DAYS} 天有效，最近 ${expireDate} 到期`
}
