import { useEffect, useState } from 'react'
import { ProductIcon } from '../icons'
import { catalogProduct } from '../catalog'
import { formatTime, peekConsumer, refundConsumerOrder, adjustConsumerPoints } from '../store'
import { DEMO_PHONE, maskPhone } from './model'
import { creditGeneralPoints } from './member-data'

export type RedeemStatus = 'completed' | 'refunded'

export type RedeemOrder = {
  id: string
  phone: string
  name: string
  productId: string
  productName: string
  cost: number
  payLabel: string
  time: string
  status: RedeemStatus
  refundedAt?: string
}

const REDEEMS_KEY = 'points-mall-spec-redeems-v2'

const SEED: RedeemOrder[] = [
  {
    id: 'ORD88210011',
    phone: '13800002202',
    name: '张*伟',
    productId: 'starbucks',
    productName: '星巴克中杯兑换券',
    cost: 99,
    payLabel: '积分',
    time: '9月1日 10:12',
    status: 'completed',
  },
  {
    id: 'ORD88210028',
    phone: '13700004404',
    name: '王*强',
    productId: 'takeout',
    productName: '外卖满减券',
    cost: 50,
    payLabel: '积分',
    time: '8月21日 08:44',
    status: 'completed',
  },
  {
    id: 'RD2003',
    phone: DEMO_PHONE,
    name: '桂*徽',
    productId: 'ride',
    productName: '网约车代金券',
    cost: 100,
    payLabel: '积分',
    time: '9月3日 09:15',
    status: 'completed',
  },
]

function fromConsumer(): RedeemOrder[] {
  const data = peekConsumer()
  return data.orders.flatMap((item) => {
    const product = catalogProduct(item.productId)
    if (product?.zone === 'benefit') return []
    return [
      {
        id: item.id,
        phone: DEMO_PHONE,
        name: '桂*徽',
        productId: item.productId,
        productName: item.productName,
        cost: item.cost,
        payLabel: item.payLabel ?? (item.payWith === 'gold' ? '通用金' : item.payWith === 'coupon' ? '抵扣券' : '积分'),
        time: item.time,
        status: item.status === 'refunded' ? 'refunded' : 'completed',
      },
    ]
  })
}

function loadRedeems(): RedeemOrder[] {
  let stored: RedeemOrder[] = []
  try {
    const raw = sessionStorage.getItem(REDEEMS_KEY)
    stored = raw ? (JSON.parse(raw) as RedeemOrder[]) : []
    if (!Array.isArray(stored) || stored.length === 0) stored = SEED.map((item) => ({ ...item }))
  } catch {
    stored = SEED.map((item) => ({ ...item }))
  }
  const map = new Map(stored.map((item) => [item.id, item]))
  for (const item of fromConsumer()) {
    const prev = map.get(item.id)
    map.set(item.id, {
      ...(prev ?? item),
      ...item,
      status: item.status === 'refunded' || prev?.status === 'refunded' ? 'refunded' : 'completed',
      refundedAt: item.status === 'refunded' ? prev?.refundedAt ?? '刚刚' : prev?.refundedAt,
    })
  }
  return [...map.values()]
}

function saveRedeems(items: RedeemOrder[]) {
  sessionStorage.setItem(REDEEMS_KEY, JSON.stringify(items))
}

function applyRefund(order: RedeemOrder) {
  if (order.status === 'refunded') return false
  const demo = order.phone.replace(/\D/g, '') === DEMO_PHONE
  if (demo) {
    const exists = peekConsumer().orders.some((item) => item.id === order.id)
    if (exists) refundConsumerOrder(order.id)
    else adjustConsumerPoints(order.cost, `退款${order.productName}`)
  } else {
    creditGeneralPoints(order.phone, order.cost, `退款${order.productName}`)
  }
  return true
}

export function RedeemsPage() {
  const [items, setItems] = useState(loadRedeems)
  const [pending, setPending] = useState<RedeemOrder | null>(null)

  useEffect(() => {
    const sync = () => setItems(loadRedeems())
    window.addEventListener('points-mall-sync', sync)
    return () => window.removeEventListener('points-mall-sync', sync)
  }, [])

  const rows = items

  const confirmRefund = () => {
    if (!pending) return
    applyRefund(pending)
    const next = loadRedeems().map((item) =>
      item.id === pending.id ? { ...item, status: 'refunded' as const, refundedAt: formatTime() } : item,
    )
    saveRedeems(next)
    setItems(next)
    setPending(null)
  }

  return (
    <>
      <div className="admin-crumb">积分商城 / 兑换订单</div>
      <div className="admin-panel">
        <h2 className="teal-title">兑换订单</h2>
        <p className="table-hint">仅记录通用积分兑换福多多商品。一笔订单只能整单退，不能退一部分；多笔订单可以分别退。</p>
        {rows.length === 0 ? <div className="empty-panel">暂无订单</div> : null}
        <table className="admin-table">
          <thead>
            <tr>
              <th>订单号</th>
              <th>用户</th>
              <th>商品</th>
              <th>消耗</th>
              <th>支付</th>
              <th>时间</th>
              <th>状态</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>
                  <strong>{item.name}</strong>
                  <div className="muted-line">{maskPhone(item.phone)}</div>
                </td>
                <td>
                  <div className="goods-cell">
                    <ProductIcon id={item.productId} />
                    <strong>{item.productName}</strong>
                  </div>
                </td>
                <td>-{item.cost}</td>
                <td>{item.payLabel}</td>
                <td>{item.time}</td>
                <td>
                  <span className={item.status === 'refunded' ? 'status-pill' : 'status-pill on'}>
                    {item.status === 'refunded' ? '已退款' : '已完成'}
                  </span>
                </td>
                <td>
                  {item.status === 'completed' ? (
                    <button className="link" type="button" onClick={() => setPending(item)}>
                      退货退款
                    </button>
                  ) : (
                    <span className="muted-line">{item.refundedAt ?? '已退回'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pending ? (
        <div className="admin-mask" onClick={() => setPending(null)}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <h2>确认退货退款</h2>
            <p className="modal-lead">
              {pending.name} 兑换的「{pending.productName}」将退回 {pending.cost} 通用积分，订单标记为已退款。
            </p>
            <div className="refund-actions">
              <button className="admin-ghost" type="button" onClick={() => setPending(null)}>
                取消
              </button>
              <button className="admin-primary" type="button" onClick={confirmRefund}>
                确认退款
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
