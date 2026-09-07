import { USER, PRODUCT_TONES } from './data'
import { NavIcon, ProductIcon } from './icons'
import { NavBar, StatusBar } from './components'
import { GOLD_PRODUCT_ID, useStore } from './store'
import { pointsExpiryHint } from './points-expiry'
import { useState, type CSSProperties } from 'react'
import type { PayMethod, Product, Screen } from './types'

function money(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function zonePayHint(generalPoints: number, goldBalance: number, couponTotal: number) {
  const parts = [`${generalPoints} 积分`]
  if (goldBalance > 0) parts.push(`通用金 ${money(goldBalance)}`)
  if (couponTotal > 0) parts.push(`券 ${money(couponTotal)}`)
  return `任选一种支付 · ${parts.join(' · ')}`
}

function PayMark({ id }: { id: 'points' | string }) {
  if (id === 'points') {
    return (
      <div className="icon-plate" style={{ background: 'linear-gradient(145deg, #FFB347, #FF8A00)' }}>
        <span className="icon-fallback">积</span>
      </div>
    )
  }
  return <ProductIcon id={id} />
}

function PayRadio({ on }: { on: boolean }) {
  return <span className={on ? 'pay-radio on' : 'pay-radio'} />
}

export function TabBar({ current }: { current: 'mall' | 'mine' }) {
  const { go } = useStore()
  return (
    <div className="tab-bar">
      <button className={current === 'mall' ? 'tab active' : 'tab'} onClick={() => go({ name: 'mall' })}>
        <NavIcon name="mall" active={current === 'mall'} />
        商城
      </button>
      <button className={current === 'mine' ? 'tab active' : 'tab'} onClick={() => go({ name: 'mine' })}>
        <NavIcon name="mine" active={current === 'mine'} />
        我的
      </button>
    </div>
  )
}

function ReasonTag({ product }: { product: Product }) {
  const { unavailable } = useStore()
  const reason = unavailable(product)
  if (!reason) return <span className="link-redeem">立即兑换</span>
  return <span className="reason-text">{reason.label}</span>
}

export function MemberPage() {
  const { go, goldBalance, coupons } = useStore()
  const [hide, setHide] = useState(false)
  const goldText = hide ? '****' : Number(goldBalance).toFixed(2)
  const perkCount = hide ? '**' : String(coupons.length)
  const corpText = hide ? '****' : '0.00'

  return (
    <div className="page member-page">
      <div className="member-hero">
        <StatusBar />
        <div className="member-nav">
          <span className="member-nav-title">会员服务</span>
          <div className="member-nav-tools" aria-hidden="true">
            <span>☆</span>
            <span>⋯</span>
            <span>○</span>
          </div>
        </div>
        <div className="member-center-card">
          <div>
            <h2>支车宝会员中心</h2>
            <div className="member-user">
              <span className="member-avatar">{USER.name.slice(0, 1)}</span>
              <span>{USER.name}</span>
              <span className="member-info-pill">个人信息 ›</span>
            </div>
          </div>
          <div className="member-gem" aria-hidden="true" />
        </div>
      </div>

      <section className="member-mall">
        <button className="mall-banner" type="button" onClick={() => go({ name: 'mall' })}>
          <div className="mall-banner-copy">
            <span className="mall-banner-kicker">品牌好物 · 专用券</span>
            <strong>积分商城</strong>
            <span className="mall-banner-sub">兑换星巴克、立减金与通用金</span>
            <span className="mall-banner-go">进入 ›</span>
          </div>
          <div className="mall-banner-visual" aria-hidden="true">
            <span className="mall-chip mall-chip-a">
              <ProductIcon id="starbucks" />
            </span>
            <span className="mall-chip mall-chip-b">
              <ProductIcon id="wechat" />
            </span>
            <span className="mall-chip mall-chip-c">
              <ProductIcon id="alipay" />
            </span>
            <span className="mall-chip mall-chip-d">
              <ProductIcon id="gold" />
            </span>
          </div>
        </button>
      </section>

      <section className="member-perks">
        <div className="member-perks-head">
          <h3>专属福利</h3>
          <button type="button" className="member-eye" onClick={() => setHide((v) => !v)}>
            {hide ? '隐藏' : '显示'}
          </button>
        </div>
        <div className="perk-grid">
          <button className="perk-card perk-gold" type="button" onClick={() => go({ name: 'gold-wallet' })}>
            <div className="perk-gold-label">通用金</div>
            <div className="perk-coin" aria-hidden="true" />
            <p>您的专属积分</p>
            <strong>{goldText}</strong>
            <span className="perk-more">去使用 ›</span>
          </button>
          <button className="perk-card perk-lite" type="button" onClick={() => go({ name: 'my-benefits' })}>
            <div className="perk-lite-title">我的权益</div>
            <b>{perkCount} 项</b>
            <span className="perk-more">去使用 ›</span>
          </button>
          <div className="perk-card perk-lite">
            <div className="perk-lite-title">因公付</div>
            <b>¥ {corpText}</b>
            <span className="perk-more">查看更多</span>
          </div>
        </div>
      </section>
    </div>
  )
}

export function MallPage() {
  const { points, go, nearestExpire, generalPoints, goldBalance, couponTotal, catalog } = useStore()
  const [category, setCategory] = useState<'all' | 'dining' | 'life' | 'travel'>('all')

  const benefitList = catalog.filter((item) => item.zone === 'benefit')
  const pointsList = catalog.filter((item) => {
    if (item.zone !== 'points') return false
    if (category !== 'all' && item.category !== category) return false
    return true
  })

  return (
    <div className="page mall-page">
      <StatusBar />
      <NavBar title="积分兑换商城" onBack={() => go({ name: 'member' })} />
      <div className="mall-balance">
        <div className="mall-balance-row">
          <span>当前会员积分</span>
          <strong>{points}</strong>
        </div>
        <p className="mall-balance-expire">{pointsExpiryHint(nearestExpire)}</p>
      </div>

      <section className="mall-section">
        <div className="mall-section-head">
          <h2>权益专区</h2>
        </div>
        <div className="product-grid">
          {benefitList.map((item) => (
            <button key={item.id} className="product-card" onClick={() => go({ name: 'detail', productId: item.id })}>
              <ProductCardBody product={item} />
            </button>
          ))}
        </div>
      </section>

      <section className="mall-section">
        <div className="mall-section-head">
          <h2>积分专区</h2>
          <p>{zonePayHint(generalPoints, goldBalance, couponTotal)}</p>
        </div>
        <div className="cat-row">
          {[
            ['all', '全部'],
            ['dining', '餐饮'],
            ['life', '生活'],
            ['travel', '出行'],
          ].map(([id, label]) => (
            <button
              key={id}
              className={category === id ? 'cat on' : 'cat'}
              onClick={() => setCategory(id as typeof category)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="product-grid">
          {pointsList.map((item) => (
            <button key={item.id} className="product-card" onClick={() => go({ name: 'detail', productId: item.id })}>
              <ProductCardBody product={item} />
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function ProductCardBody({ product }: { product: Product }) {
  const { unavailable, remainingQuota } = useStore()
  const reason = unavailable(product)
  const tone = PRODUCT_TONES[product.id] ?? ['#FFB347', '#FF8A00']
  const left = product.zone === 'benefit' ? remainingQuota(product.id) : 0
  return (
    <div
      className={`card-inner card-poster${reason ? ' is-disabled' : ''}`}
      style={{ '--c1': tone[0], '--c2': tone[1] } as CSSProperties}
    >
      <ProductIcon id={product.id} />
      <div className="card-meta">
        <div className="card-name">{product.name}</div>
        <div className="card-price">
          <em>{product.zone === 'benefit' && left > 0 ? left * product.cost : product.cost}</em> 积分
          {left > 0 && !reason ? <span className="card-quota">兑完 {left} 份</span> : null}
        </div>
        <ReasonTag product={product} />
      </div>
    </div>
  )
}

function openBenefitAsset(go: (screen: Screen) => void, productId: string, fromOrderId?: string) {
  go(
    productId === GOLD_PRODUCT_ID
      ? { name: 'gold-wallet', fromOrderId }
      : { name: 'my-benefits', fromOrderId },
  )
}

export function DetailPage({ productId }: { productId: string }) {
  const {
    go,
    points,
    generalPoints,
    productById,
    unavailable,
    redeem,
    remainingQuota,
    goldBalance,
    coupons,
    couponTotal,
    userFeeRate,
    quotePay,
    orders,
  } = useStore()
  const [confirm, setConfirm] = useState(false)
  const [payWith, setPayWith] = useState<PayMethod>('points')
  const [couponId, setCouponId] = useState<string | undefined>(undefined)
  const product = productById(productId)
  if (!product) return null
  const reason = unavailable(product)
  const quotaLeft = remainingQuota(product.id)
  const batchCost = product.zone === 'benefit' ? quotaLeft * product.cost : product.cost
  const received =
    product.zone === 'benefit' ? Math.round(batchCost * (1 - userFeeRate) * 100) / 100 : product.cost
  const pointsQuote = quotePay(product, 'points')
  const goldQuote = quotePay(product, 'gold')
  const couponQuote = quotePay(product, 'coupon', couponId)
  const quote = payWith === 'gold' ? goldQuote : payWith === 'coupon' ? couponQuote : pointsQuote
  const canAny = product.zone === 'benefit' ? !reason : pointsQuote.ok || goldQuote.ok || couponQuote.ok
  const latestBenefitOrder = orders.find((item) => item.productId === product.id && (item.received ?? 0) > 0)
  const benefitFinished = product.zone === 'benefit' && quotaLeft <= 0 && Boolean(latestBenefitOrder)
  const afterPoints = (product.zone === 'points' ? generalPoints : points) - (product.zone === 'benefit' ? batchCost : quote.pointsPaid)
  const selectedCouponId = couponId ?? couponQuote.couponProductId
  const payUnit = payWith === 'gold' ? '通用金' : payWith === 'coupon' ? couponQuote.label : '积分'

  return (
    <div className="page detail-page">
      <StatusBar />
      <NavBar title="商品详情" onBack={() => go({ name: 'mall' })} />
      <div className="hero-block">
        <ProductIcon id={product.id} />
        <h2>{product.name}</h2>
        <p>{product.subtitle}</p>
      </div>
      <div className="info-card">
        <Row label="所需积分" value={`${batchCost} 积分`} accent />
        {product.zone === 'points' ? (
          <Row label="本专区可用积分" value={`${generalPoints} 积分`} />
        ) : (
          <Row label="当前会员积分" value={`${points} 积分`} />
        )}
        {product.zone === 'points' ? <Row label="通用金余额" value={`${money(goldBalance)}`} /> : null}
        {product.zone === 'points' ? (
          <Row
            label="抵扣券"
            value={couponTotal > 0 ? coupons.map((item) => `${item.name} ${money(item.value)}`).join(' / ') : '0'}
          />
        ) : null}
        {product.zone === 'benefit' && quotaLeft > 0 ? (
          <Row label="可兑数量" value={`剩余 ${quotaLeft} 份`} />
        ) : null}
        {product.zone === 'benefit' && userFeeRate > 0 ? (
          <Row label="用户承担后到账" value={`${received} 元${product.name}`} />
        ) : null}
        {product.zone === 'benefit' ? (
          <Row label="兑后用途" value={product.id === 'gold' ? '入通用金余额，可兑积分专区' : '入抵扣券，可兑积分专区'} />
        ) : null}
        {product.zone === 'points' ? (
          <Row
            label="本次支付"
            value={
              payWith === 'gold'
                ? `通用金 ${money(product.cost)}（余额 ${money(goldBalance)}）`
                : payWith === 'coupon'
                  ? `${couponQuote.label} ${money(product.cost)}（持有 ${money(coupons.find((item) => item.productId === (couponId ?? couponQuote.couponProductId))?.value ?? couponTotal)}）`
                  : `${product.cost} 积分`
            }
          />
        ) : canAny ? (
          <Row label="本次支付" value={`${batchCost} 积分`} />
        ) : null}
        {product.zone !== 'points' && canAny ? (
          <Row label="兑后剩余积分" value={`${afterPoints} 积分`} />
        ) : null}
        {product.zone === 'points' && payWith === 'points' && pointsQuote.ok ? (
          <Row label="兑后剩余积分" value={`${generalPoints - product.cost} 积分`} />
        ) : null}
        <Row label="有效期" value={`兑换后 ${product.validityDays} 天`} />
        <Row label="库存" value={product.stockLabel} />
      </div>
      <div className="desc-card">
        <h3>权益说明</h3>
        <p>{product.description}</p>
        <p className="desc-note">
          {reason
            ? reason.hint
            : product.zone === 'benefit'
              ? `${product.usage} 兑成${product.id === 'gold' ? '通用金余额' : '抵扣券'}后，可在积分专区选择对应方式支付。`
              : '支付时竖向选择积分、通用金或抵扣券，一次只用一种。余额不够请先兑权益专区，或改用其他方式。'}
        </p>
      </div>
      <div className="bottom-cta">
        {benefitFinished ? (
          <button className="btn-primary" type="button" onClick={() => openBenefitAsset(go, product.id)}>
            去使用
          </button>
        ) : !canAny ? (
          <button className="btn-primary is-disabled" disabled>
            {reason?.label ?? '兑换结束'}
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={() => {
              if (product.zone === 'points' && !pointsQuote.ok) {
                if (goldQuote.ok) setPayWith('gold')
                else if (couponQuote.ok) setPayWith('coupon')
              }
              setConfirm(true)
            }}
          >
            {product.zone === 'benefit' && quotaLeft > 1 ? `兑换全部 ${quotaLeft} 份` : '立即兑换'}
          </button>
        )}
      </div>
      {confirm ? (
        <div className="modal-mask" onClick={() => setConfirm(false)}>
          <div className={`modal${product.zone === 'points' ? ' modal-pay' : ''}`} onClick={(event) => event.stopPropagation()}>
            <h3>确认兑换</h3>
            <p className="modal-name">{product.name}</p>
            <div className="modal-amount">
              <span className="modal-pay-label">需支付</span>
              <em>{money(batchCost)}</em> {product.zone === 'points' ? payUnit : '积分'}
            </div>
            {product.zone === 'points' ? (
              <div className="pay-list">
                <button
                  type="button"
                  className={`pay-row${payWith === 'points' ? ' on' : ''}${pointsQuote.ok ? '' : ' is-short'}`}
                  onClick={() => setPayWith('points')}
                >
                  <PayMark id="points" />
                  <span className="pay-row-body">
                    <span className="pay-row-title">积分</span>
                    <span className="pay-row-sub">
                      {pointsQuote.ok ? `可用 ${generalPoints} 积分` : `可用 ${generalPoints} 积分，不足 ${product.cost}`}
                    </span>
                  </span>
                  <PayRadio on={payWith === 'points'} />
                </button>
                <button
                  type="button"
                  className={`pay-row${payWith === 'gold' ? ' on' : ''}${goldQuote.ok ? '' : ' is-short'}`}
                  onClick={() => setPayWith('gold')}
                >
                  <PayMark id="gold" />
                  <span className="pay-row-body">
                    <span className="pay-row-title">通用金</span>
                    <span className="pay-row-sub">
                      {goldQuote.ok ? `余额 ${money(goldBalance)}` : `余额 ${money(goldBalance)}，不足 ${money(product.cost)}`}
                    </span>
                  </span>
                  <PayRadio on={payWith === 'gold'} />
                </button>
                {coupons.length > 0 ? (
                  coupons.map((item) => {
                    const selected = payWith === 'coupon' && selectedCouponId === item.productId
                    const enough = item.value >= product.cost
                    return (
                      <button
                        key={item.productId}
                        type="button"
                        className={`pay-row${selected ? ' on' : ''}${enough ? '' : ' is-short'}`}
                        onClick={() => {
                          setPayWith('coupon')
                          setCouponId(item.productId)
                        }}
                      >
                        <PayMark id={item.productId} />
                        <span className="pay-row-body">
                          <span className="pay-row-title">{item.name}</span>
                          <span className="pay-row-sub">
                            {enough ? `余额 ${money(item.value)}` : `余额 ${money(item.value)}，不足 ${money(product.cost)}`}
                          </span>
                        </span>
                        <PayRadio on={selected} />
                      </button>
                    )
                  })
                ) : (
                  <button
                    type="button"
                    className={`pay-row${payWith === 'coupon' ? ' on' : ''} is-short`}
                    onClick={() => setPayWith('coupon')}
                  >
                    <PayMark id="alipay" />
                    <span className="pay-row-body">
                      <span className="pay-row-title">抵扣券</span>
                      <span className="pay-row-sub">暂无可用券，请先兑权益专区</span>
                    </span>
                    <PayRadio on={payWith === 'coupon'} />
                  </button>
                )}
              </div>
            ) : (
              <p className="modal-sub">当前会员积分：{points}，一次兑完剩余 {quotaLeft} 份</p>
            )}
            {product.zone === 'benefit' ? (
              <p className="modal-tip">
                到账约 {received} 元{product.name}
                {product.id === 'gold' ? '（计入通用金余额）' : '（计入抵扣券）'}，之后可在积分专区支付
              </p>
            ) : null}
            <button
              className="btn-primary"
              disabled={product.zone === 'points' ? !quote.ok : Boolean(reason)}
              onClick={() => {
                setConfirm(false)
                redeem(product.id, product.zone === 'points' ? payWith : 'points', couponId)
              }}
            >
              {product.zone === 'points' && !quote.ok ? '余额不足' : '确认兑换'}
            </button>
            <button className="btn-text" onClick={() => setConfirm(false)}>
              取消
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Row({
  label,
  value,
  accent,
  success,
}: {
  label: string
  value: string
  accent?: boolean
  success?: boolean
}) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong className={accent ? 'accent' : success ? 'plus' : ''}>{value}</strong>
    </div>
  )
}

export function SuccessPage({ orderId }: { orderId: string }) {
  const { go, orders, productById } = useStore()
  const order = orders.find((item) => item.id === orderId)
  if (!order) return null
  const product = productById(order.productId)

  return (
    <div className="page success-page">
      <StatusBar />
      <NavBar
        title="兑换详情"
        onBack={() => go({ name: 'mall' })}
        right={
          <button className="nav-text" onClick={() => go({ name: 'records' })}>
            记录
          </button>
        }
      />
      <div className="success-head">
        <div className="check">✓</div>
        <h2>兑换成功</h2>
        <p>
          {order.payWith === 'gold'
            ? `已用通用金 ${money(order.goldPaid ?? 0)}${(order.pointsPaid ?? 0) > 0 ? `，积分补 ${money(order.pointsPaid ?? 0)}` : ''}`
            : order.payWith === 'coupon'
              ? `已用${order.payLabel ?? '抵扣券'}抵扣 ${money(order.couponPaid ?? 0)}${(order.pointsPaid ?? 0) > 0 ? `，积分补 ${money(order.pointsPaid ?? 0)}` : ''}`
              : `${order.cost} 积分已扣除`}
        </p>
        {order.received ? (
          <p>
            到账 {order.received} 元{order.productId === 'gold' ? '通用金' : '抵扣券'}，可在积分专区支付
          </p>
        ) : null}
      </div>
      <div className="ticket">
        {product ? <ProductIcon id={product.id} /> : null}
        <div>
          <div className="ticket-name">{order.productName}</div>
          <div className="ticket-sub">有效期至 {order.expireDate}</div>
        </div>
      </div>
      <div className="info-card">
        <Row label="订单编号" value={order.id} />
        <Row label="兑换时间" value={order.time} />
        <Row
          label="支付方式"
          value={
            order.payWith === 'gold' ? '通用金余额' : order.payWith === 'coupon' ? `${order.payLabel ?? '抵扣券'}` : '积分'
          }
        />
        {(order.pointsPaid ?? order.cost) > 0 && order.payWith !== 'gold' && order.payWith !== 'coupon' ? (
          <Row label="消耗积分" value={`-${order.cost} 积分`} accent />
        ) : null}
        {(order.goldPaid ?? 0) > 0 ? <Row label="消耗通用金" value={`-${money(order.goldPaid ?? 0)}`} accent /> : null}
        {(order.couponPaid ?? 0) > 0 ? (
          <Row label={`消耗${order.payLabel ?? '抵扣券'}`} value={`-${money(order.couponPaid ?? 0)}`} accent />
        ) : null}
        {(order.pointsPaid ?? 0) > 0 && (order.payWith === 'gold' || order.payWith === 'coupon') ? (
          <Row label="积分补差" value={`-${money(order.pointsPaid ?? 0)} 积分`} accent />
        ) : null}
        {order.received ? <Row label="到账" value={`${order.received} 元`} success /> : null}
        <Row label="状态" value="已完成" success />
      </div>
      <div className="bottom-cta">
        {product?.zone === 'benefit' || (order.received ?? 0) > 0 ? (
          <button
            className="btn-primary"
            type="button"
            onClick={() => openBenefitAsset(go, order.productId, order.id)}
          >
            去使用
          </button>
        ) : null}
        <button
          className={product?.zone === 'benefit' || (order.received ?? 0) > 0 ? 'btn-text' : 'btn-primary'}
          onClick={() => go({ name: 'mall' })}
        >
          返回商城
        </button>
      </div>
    </div>
  )
}

export function GoldWalletPage({ fromOrderId }: { fromOrderId?: string }) {
  const { go, goldBalance, orders } = useStore()
  const rows = orders.filter((item) => item.productId === GOLD_PRODUCT_ID || item.payWith === 'gold')

  return (
    <div className="page gold-wallet-page">
      <StatusBar />
      <NavBar
        title="通用金"
        onBack={() => (fromOrderId ? go({ name: 'success', orderId: fromOrderId }) : go({ name: 'mall' }))}
      />
      <p className="gold-kicker">通用金 | 您的专属积分</p>
      <div className="gold-card">
        <div className="gold-card-top">
          <span>可用额度</span>
          <span className="gold-hint">提取说明</span>
        </div>
        <div className="gold-amount">{money(goldBalance)}</div>
        <div className="gold-coin" aria-hidden>
          <ProductIcon id="gold" />
        </div>
      </div>
      <button className="gold-transfer" type="button">
        <span className="gold-transfer-mark">¥</span>
        转出
      </button>
      <div className="gold-ledger-head">
        <h3>额度变动明细</h3>
        <span>全部</span>
      </div>
      <div className="gold-ledger">
        {rows.length === 0 ? (
          <p className="empty">暂无明细</p>
        ) : (
          rows.map((item) => {
            const inGold = item.productId === GOLD_PRODUCT_ID
            const amount = inGold ? item.received ?? item.cost : -(item.goldPaid ?? 0)
            return (
              <div key={item.id} className="gold-ledger-row">
                <div>
                  <div className="ledger-title">{inGold ? '兑换入账' : `兑换${item.productName}`}</div>
                  <div className="ledger-time">{item.time}</div>
                </div>
                <strong className={amount > 0 ? 'plus' : 'accent'}>
                  {amount > 0 ? '+' : ''}
                  {money(amount)}
                </strong>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export function RightsPage({ fromOrderId }: { fromOrderId?: string }) {
  const { go, coupons, orders } = useStore()
  const [tab, setTab] = useState<'cards' | 'packs'>('cards')
  const [filter, setFilter] = useState<'all' | 'unused' | 'charging' | 'used'>('all')
  const unused = coupons.filter((item) => item.value > 0)
  const used = orders.filter((item) => item.payWith === 'coupon' && (item.couponPaid ?? 0) > 0)
  const shown =
    filter === 'used'
      ? []
      : filter === 'charging'
        ? []
        : unused

  return (
    <div className="page rights-page">
      <StatusBar />
      <NavBar
        title="我的权益"
        onBack={() => (fromOrderId ? go({ name: 'success', orderId: fromOrderId }) : go({ name: 'mall' }))}
      />
      <div className="rights-tabs">
        <button type="button" className={tab === 'cards' ? 'on' : ''} onClick={() => setTab('cards')}>
          我的卡券
        </button>
        <button type="button" className={tab === 'packs' ? 'on' : ''} onClick={() => setTab('packs')}>
          我的礼包
        </button>
      </div>
      {tab === 'cards' ? (
        <>
          <div className="rights-filters">
            {(
              [
                ['all', '全部'],
                ['unused', '未使用'],
                ['charging', '充值中'],
                ['used', '已使用'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="rights-list">
            {filter === 'used' && used.length > 0
              ? used.map((item) => (
                  <div key={item.id} className="rights-group">
                    <div className="rights-brand">
                      <ProductIcon id={item.productId} />
                      <span>{item.payLabel ?? '抵扣券'}</span>
                    </div>
                    <div className="rights-coupon is-used">
                      <div className="rights-value">
                        <em>¥{money(item.couponPaid ?? 0)}</em>
                      </div>
                      <div className="rights-copy">
                        <div>{item.payLabel ?? '抵扣券'}</div>
                        <p>用于兑换 {item.productName}</p>
                        <p>有效期至 {item.expireDate}</p>
                      </div>
                      <span className="rights-stamp">已使用</span>
                    </div>
                  </div>
                ))
              : shown.length === 0
                ? (
                    <p className="empty">{filter === 'charging' ? '暂无充值中的卡券' : '暂无卡券'}</p>
                  )
                : shown.map((item) => (
                    <div key={item.productId} className="rights-group">
                      <div className="rights-brand">
                        <ProductIcon id={item.productId} />
                        <span>{item.productId === 'wechat' ? '微信' : '支付宝'}</span>
                      </div>
                      <div className="rights-coupon">
                        <div className="rights-value">
                          <em>¥{money(item.value)}</em>
                        </div>
                        <div className="rights-copy">
                          <div>{item.name}</div>
                          <p>可在积分专区支付时全额抵扣</p>
                          <p>兑换后 90 天内有效</p>
                        </div>
                      </div>
                    </div>
                  ))}
          </div>
        </>
      ) : (
        <p className="empty">暂无礼包</p>
      )}
    </div>
  )
}

export function MinePage() {
  const { points, go, ledger, nearestExpire, reset, goldBalance, coupons, couponTotal } = useStore()

  return (
    <div className="page mine-page">
      <StatusBar />
      <NavBar title="会员" onBack={() => go({ name: 'member' })} />
      <div className="user-row">
        <div className="avatar">{USER.name.slice(0, 1)}</div>
        <div>
          <div className="user-name">{USER.name}</div>
          <div className="user-phone">{USER.phone}</div>
        </div>
      </div>
      <div className="account-card">
        <div className="account-top">我的账户</div>
        <div className="account-grid is-three">
          <div>
            <span>可用积分</span>
            <strong>{points}</strong>
          </div>
          <div>
            <span>通用金余额</span>
            <strong>{money(goldBalance)}</strong>
          </div>
          <div>
            <span>抵扣券</span>
            <strong>{money(couponTotal)}</strong>
          </div>
        </div>
        {coupons.length > 0 ? (
          <div className="voucher-line">
            {coupons.map((item) => `${item.name} ${money(item.value)}`).join(' · ')}
            ，可在积分专区抵扣
          </div>
        ) : goldBalance > 0 ? (
          <div className="voucher-line">通用金可在积分专区作为余额支付</div>
        ) : null}
        <div className="voucher-line">{pointsExpiryHint(nearestExpire)}</div>
      </div>
      <div className="corp-card">
        <span className="ok">✓</span>
        {USER.corp}
      </div>
      <button className="plain-card" onClick={() => go({ name: 'records' })}>
        <div>
          <div className="plain-title">兑换记录</div>
          <div className="plain-sub">查看已兑换商品与订单详情</div>
        </div>
        <span className="chev">›</span>
      </button>
      <div className="section-head">
        <span>额度变动明细</span>
      </div>
      <div className="ledger">
        {ledger.length === 0 ? <div className="empty">暂无变动</div> : null}
        {ledger.map((item) => (
          <div key={item.id} className="ledger-row">
            <div>
              <div className="ledger-title">{item.title}</div>
              <div className="ledger-time">{item.time}</div>
            </div>
            <strong className={item.amount > 0 ? 'plus' : 'accent'}>
              {item.amount > 0 ? `+${item.amount}` : item.amount}
            </strong>
          </div>
        ))}
      </div>
      <button className="reset-demo" onClick={reset}>
        重置演示数据
      </button>
    </div>
  )
}

export function RecordsPage() {
  const { go, orders } = useStore()
  return (
    <div className="page records-page">
      <StatusBar />
      <NavBar title="兑换记录" onBack={() => go({ name: 'mine' })} />
      <div className="ledger">
        {orders.length === 0 ? <div className="empty">暂无兑换记录</div> : null}
        {orders.map((item) => (
          <button key={item.id} className="ledger-row as-btn" onClick={() => go({ name: 'success', orderId: item.id })}>
            <div>
              <div className="ledger-title">{item.productName}</div>
              <div className="ledger-time">
                {item.time} · {item.id}
                {item.status === 'refunded'
                  ? ' · 已退款'
                  : item.payWith === 'gold'
                    ? ' · 通用金'
                    : item.payWith === 'coupon'
                      ? ` · ${item.payLabel ?? '券'}`
                      : ' · 积分'}
              </div>
            </div>
            <strong className={item.status === 'refunded' ? 'plus' : 'accent'}>
              {item.status === 'refunded' ? `+${item.cost}` : `-${item.cost}`}
            </strong>
          </button>
        ))}
      </div>
    </div>
  )
}
