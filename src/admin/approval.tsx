import { useMemo, useState } from 'react'
import { ProductIcon } from '../icons'
import { BuyPreview } from './buy-preview'
import { AccountViewButton } from './accounts'
import { EquityPicker } from './equity-picker'
import {
  APPROVAL_RECORDS,
  DEDICATED_SKUS,
  FEE_PCT,
  FEE_RATE,
  GENERAL_FEE_PCT,
  UNIT_PRICE,
  approvalById,
  dedicatedLabel,
  feePctFor,
  feeRateFor,
  money,
  planFromRows,
  quote,
  type ApprovalTab,
  type PurchaseKind,
} from './model'
import { maskPhone, useAdmin } from './store'

const ACCOUNT_BALANCE = 50000

function FeeSplitBar({
  feePct,
  merchantPct,
  locked,
  disabled,
  onChange,
}: {
  feePct: number
  merchantPct: number
  locked?: boolean
  disabled?: boolean
  onChange?: (value: number) => void
}) {
  const userPct = feePct - merchantPct
  return (
    <>
      <span>
        商户承担 {merchantPct}%　/　用户承担 {userPct}%
      </span>
      <input
        className={locked ? 'fee-range is-locked' : 'fee-range'}
        type="range"
        min={0}
        max={feePct}
        step={1}
        value={merchantPct}
        disabled={locked || disabled}
        onChange={(event) => onChange?.(Number(event.target.value))}
      />
    </>
  )
}

export function ApprovalListPage() {
  const { go, setApprovalDraft } = useAdmin()
  const [tab, setTab] = useState<ApprovalTab>('discount')
  const [selectedId, setSelectedId] = useState<string | null>(APPROVAL_RECORDS.find((item) => item.tab === 'discount')?.id ?? null)
  const [keyword, setKeyword] = useState('')
  const [picker, setPicker] = useState(false)

  const rows = useMemo(() => {
    const list = APPROVAL_RECORDS.filter((item) => item.tab === tab)
    const q = keyword.trim()
    if (!q) return list
    return list.filter(
      (item) =>
        item.approvalNo.includes(q) ||
        item.batchNo.includes(q) ||
        item.customerName.includes(q) ||
        item.applicant.includes(q),
    )
  }, [tab, keyword])

  const selected = rows.find((item) => item.id === selectedId) ?? null

  const openBuy = () => {
    if (!selected) return
    setApprovalDraft({
      recordId: selected.id,
      kind: 'dedicated',
      productId: DEDICATED_SKUS[0]?.id,
      merchantFeeRate: FEE_RATE,
      rows: selected.users.map((row) => ({ ...row })),
      paid: false,
    })
    setPicker(false)
    go('approval-buy')
  }

  return (
    <>
      <div className="admin-crumb">审批管理 / 审批记录管理</div>
      <div className="admin-panel">
        <div className="admin-tabs">
          <button
            className={tab === 'discount' ? 'on' : ''}
            type="button"
            onClick={() => {
              setTab('discount')
              setSelectedId(APPROVAL_RECORDS.find((item) => item.tab === 'discount')?.id ?? null)
            }}
          >
            营销折扣
          </button>
          <button
            className={tab === 'car' ? 'on' : ''}
            type="button"
            onClick={() => {
              setTab('car')
              setSelectedId(APPROVAL_RECORDS.find((item) => item.tab === 'car')?.id ?? null)
            }}
          >
            新车销售
          </button>
        </div>

        <div className="appr-toolbar">
          <div className="appr-filters">
            <input
              className="appr-search"
              value={keyword}
              placeholder="审批单号 / 批次号 / 客户 / 提报人"
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          <button className="admin-primary" disabled={!selected} type="button" onClick={() => setPicker(true)}>
            权益下单
          </button>
        </div>

        <div className="appr-table-wrap">
          <table className="admin-table appr-table">
            <thead>
              <tr>
                <th className="col-check" />
                <th>审批单号</th>
                <th>客户</th>
                <th>手机号</th>
                <th>提报链路</th>
                <th>提报人</th>
                <th>提报时间</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr
                  key={item.id}
                  className={selectedId === item.id ? 'is-selected' : ''}
                  onClick={() => setSelectedId(item.id)}
                >
                  <td className="col-check">
                    <span className={selectedId === item.id ? 'radio on' : 'radio'} />
                  </td>
                  <td>{item.approvalNo}</td>
                  <td>{item.customerName}</td>
                  <td>{maskPhone(item.customerPhone)}</td>
                  <td>{item.chainName}</td>
                  <td>{item.applicant}</td>
                  <td>{item.submittedAt}</td>
                  <td>
                    <em className="status-ok">{item.status}</em>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? <div className="empty-panel">没有匹配的审批记录</div> : null}
      </div>

      {picker ? (
        <div className="admin-mask" onClick={() => setPicker(false)}>
          <div className="admin-modal pick-modal" onClick={(event) => event.stopPropagation()}>
            <h2>选择商品</h2>
            <p className="modal-lead">审批下单仅可采购积分，选定后进入采购配置。</p>
            <div className="admin-tabs">
              <button className="on" type="button">
                会员积分
              </button>
            </div>
            <div className="sku-grid">
              <button className="sku-card is-picked" type="button" onClick={openBuy}>
                <div className="sku-art">
                  <strong>积分</strong>
                  <p>采购后发放给审批单用户。可绑一种专用券，或作为积分专区通用积分。</p>
                </div>
                <div className="sku-meta">
                  <em>去下单</em>
                </div>
              </button>
            </div>
            <div className="modal-actions">
              <button className="admin-ghost" type="button" onClick={() => setPicker(false)}>
                取消
              </button>
              <button className="admin-primary" type="button" onClick={openBuy}>
                下一步
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export function ApprovalBuyPage() {
  const { go, approvalDraft, setApprovalDraft } = useAdmin()
  const record = approvalDraft ? approvalById(approvalDraft.recordId) : undefined
  const [kind, setKind] = useState<PurchaseKind>(approvalDraft?.kind ?? 'dedicated')
  const [productId, setProductId] = useState(approvalDraft?.productId ?? DEDICATED_SKUS[0]?.id ?? 'gold')
  const [equityOpen, setEquityOpen] = useState(false)
  const [dedicatedPct, setDedicatedPct] = useState(() =>
    approvalDraft?.kind === 'general'
      ? FEE_PCT
      : Math.round((approvalDraft?.merchantFeeRate ?? FEE_RATE) * 100),
  )

  if (!approvalDraft || !record) {
    return (
      <>
        <div className="admin-crumb">审批管理 / 审批记录管理</div>
        <div className="admin-panel empty-panel">
          请先在审批记录中选择一条记录并权益下单。
          <div className="issue-actions">
            <button className="admin-primary" type="button" onClick={() => go('approval')}>
              返回审批记录
            </button>
          </div>
        </div>
      </>
    )
  }

  const rows = approvalDraft.rows
  const feePct = feePctFor(kind)
  const merchantPct = kind === 'general' ? GENERAL_FEE_PCT : dedicatedPct
  const merchantFeeRate = merchantPct / 100
  const plan = planFromRows(rows)
  const costAmount = plan.costAmount
  const q = quote(costAmount, merchantFeeRate, feeRateFor(kind))
  const sku = DEDICATED_SKUS.find((item) => item.id === productId)
  const canSubmit = plan.rows.length > 0 && costAmount > 0 && !approvalDraft.paid

  const toCashier = () => {
    setApprovalDraft({
      ...approvalDraft,
      kind,
      productId: kind === 'dedicated' ? productId : undefined,
      merchantFeeRate,
      rows,
      ticketNo: approvalDraft.ticketNo ?? `2026${Date.now().toString().slice(-12)}`,
    })
    go('approval-pay')
  }

  return (
    <>
      <div className="admin-crumb">
        <button type="button" onClick={() => go('approval')}>
          审批管理 / 审批记录管理
        </button>
        <span> / 采购积分</span>
      </div>
      <div className="admin-panel">
        <div className="buy-hero">
          <BuyPreview kind={kind} sku={sku} />
          <div className="buy-form">
            <h1>会员积分</h1>
            <p className="sku-no">
              来自审批单 {record.approvalNo} · {record.chainName}
            </p>
            <div className="price-box">
              <div className="price-row">
                商品价格
                <strong>¥ {money(UNIT_PRICE)}</strong>
              </div>
              <div className="fee-line">
                单价 · 1 份 = 1 元
                <span>
                  {kind === 'general'
                    ? `手续费率 ${GENERAL_FEE_PCT}.00% · 全部商户承担 · 不可调整`
                    : `手续费率 ${FEE_PCT}.00% · 必须拆满 · 默认商户全部承担`}
                </span>
              </div>
            </div>

            <div className="field">
              <span>采购类型</span>
              <div className="seg">
                <button type="button" className={kind === 'dedicated' ? 'on' : ''} onClick={() => setKind('dedicated')}>
                  专用券
                </button>
                <button type="button" className={kind === 'general' ? 'on' : ''} onClick={() => setKind('general')}>
                  通用积分
                </button>
              </div>
              <em>
                {kind === 'general'
                  ? '用户可直接用积分兑换积分专区商品'
                  : '一次只能选一种。用户先在权益专区兑成通用金余额或抵扣券，再去积分专区选对应支付方式'}
              </em>
            </div>

            {kind === 'dedicated' ? (
              <div className="field">
                <span>绑定商品</span>
                <div className="bound-sku">
                  {sku ? <ProductIcon id={sku.id} /> : null}
                  <div>
                    <strong>{dedicatedLabel(sku?.name)}</strong>
                    <em>一次只能绑定一种专用券</em>
                  </div>
                  <button className="account-btn" type="button" onClick={() => setEquityOpen(true)}>
                    选择商品
                  </button>
                </div>
              </div>
            ) : null}

            {equityOpen ? (
              <EquityPicker
                value={productId}
                onSelect={(id) => {
                  setProductId(id)
                  setEquityOpen(false)
                }}
                onClose={() => setEquityOpen(false)}
              />
            ) : null}

            <div className="field">
              <span>账号信息</span>
              <em>由审批单带入，共 {plan.rows.length} 人</em>
              <AccountViewButton rows={rows} />
            </div>

            <div className="calc-box">
              <div>
                <span>审批用户</span>
                <b>{plan.rows.length} 人</b>
              </div>
              <div>
                <span>{kind === 'dedicated' ? '需发放专用券' : '需采购积分'}</span>
                <b>
                  {plan.units} {kind === 'dedicated' ? `份${dedicatedLabel(sku?.name)}` : '分'}
                </b>
              </div>
              <div>
                <span>采购金额</span>
                <b>¥ {money(costAmount)}</b>
              </div>
            </div>

            <label className="field">
              <span>手续费拆分</span>
              {kind === 'general' ? (
                <em>
                  {costAmount > 0
                    ? `按本次采购金额 ¥${money(costAmount)} 计，固定 ${GENERAL_FEE_PCT}%，全部由商户承担，不可调整。`
                    : `通用积分固定 ${GENERAL_FEE_PCT}%，全部由商户承担，不可调整。`}
                </em>
              ) : (
                <em>
                  {costAmount > 0
                    ? `按本次采购金额 ¥${money(costAmount)} 计算 ${FEE_PCT}% 如何分配`
                    : `按审批名单金额计算 ${FEE_PCT}% 如何分配`}
                </em>
              )}
              <FeeSplitBar
                feePct={feePct}
                merchantPct={merchantPct}
                locked={kind === 'general'}
                disabled={approvalDraft.paid}
                onChange={kind === 'dedicated' ? setDedicatedPct : undefined}
              />
            </label>

            {costAmount > 0 ? (
              <div className="split-preview">
                <div>
                  <span>商户应付</span>
                  <b>¥ {money(q.merchantPay)}</b>
                </div>
                <div>
                  <span>用户兑换时扣除</span>
                  <b>¥ {money(q.userFeeAmount)}</b>
                </div>
              </div>
            ) : (
              <div className="calc-box is-empty">按审批名单金额计算商户应付与用户扣除</div>
            )}

            <div className="issue-actions">
              <button className="admin-ghost" type="button" onClick={() => go('approval')}>
                返回
              </button>
              <button className="admin-primary" disabled={!canSubmit} type="button" onClick={toCashier}>
                去收银台
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export function ApprovalPayPage() {
  const { go, approvalDraft, createOrder, orders } = useAdmin()
  const record = approvalDraft ? approvalById(approvalDraft.recordId) : undefined
  const [paying, setPaying] = useState(false)

  if (!approvalDraft || !record) {
    return (
      <>
        <div className="admin-crumb">审批管理 / 审批记录管理</div>
        <div className="admin-panel empty-panel">
          没有待支付的审批订单。
          <div className="issue-actions">
            <button className="admin-primary" type="button" onClick={() => go('approval')}>
              返回审批记录
            </button>
          </div>
        </div>
      </>
    )
  }

  const plan = planFromRows(approvalDraft.rows)
  const q = quote(plan.costAmount, approvalDraft.merchantFeeRate, feeRateFor(approvalDraft.kind))
  const sku = approvalDraft.productId ? DEDICATED_SKUS.find((item) => item.id === approvalDraft.productId) : undefined
  const productName = approvalDraft.kind === 'general' ? '通用积分' : dedicatedLabel(sku?.name)
  const paidOrder = approvalDraft.orderId ? orders.find((item) => item.id === approvalDraft.orderId) : undefined
  const paid = approvalDraft.paid
  const ticketNo = paidOrder?.id ?? approvalDraft.ticketNo ?? record.approvalNo

  const pay = () => {
    if (paid || paying) return
    setPaying(true)
    createOrder({
      kind: approvalDraft.kind,
      productId: approvalDraft.productId,
      costAmount: plan.costAmount,
      merchantFeeRate: approvalDraft.merchantFeeRate,
      grants: plan.rows,
      source: 'approval',
    })
  }

  return (
    <>
      <div className="admin-crumb">
        <button type="button" onClick={() => go(paid ? 'approval' : 'approval-buy')}>
          审批管理 / 审批记录管理
        </button>
        <span> / 收银台</span>
      </div>
      <div className={paid ? 'pay-banner is-ok' : 'pay-banner'}>
        {paid ? '支付成功，权益已发放至审批用户，可到用户端领取。' : '提交成功，请尽快完成付款。超时未支付订单将自动关闭。'}
      </div>
      <div className="cashier-grid">
        <div className="admin-panel">
          <h2 className="teal-title">商品清单</h2>
          <div className="order-bar">订单号：{ticketNo}</div>
          <table className="admin-table goods-table">
            <thead>
              <tr>
                <th>商品信息</th>
                <th>账号信息</th>
                <th>手续费率</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="goods-cell">
                    <div className="points-mark sm">积</div>
                    <div>
                      <strong>{productName}</strong>
                      <p>商品编号 PO-POINTS-001</p>
                      <p>提货方式：批量发放</p>
                      <p>¥ {money(plan.costAmount)}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <AccountViewButton rows={approvalDraft.rows} />
                </td>
                <td>{(approvalDraft.merchantFeeRate * 100).toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="admin-panel cashier-side">
          <h2 className="teal-title">支付信息</h2>
          <dl className="cashier-dl">
            <div>
              <dt>账户余额</dt>
              <dd>¥ {money(ACCOUNT_BALANCE)}</dd>
            </div>
            <div>
              <dt>商品金额</dt>
              <dd>¥ {money(plan.costAmount)}</dd>
            </div>
            <div>
              <dt>商户手续费 {(approvalDraft.merchantFeeRate * 100).toFixed(0)}%</dt>
              <dd>¥ {money(q.merchantFeeAmount)}</dd>
            </div>
            <div>
              <dt>用户承担 {(q.userFeeRate * 100).toFixed(0)}%</dt>
              <dd>¥ {money(q.userFeeAmount)}</dd>
            </div>
            <div className="total">
              <dt>应付金额</dt>
              <dd>¥ {money(q.merchantPay)}</dd>
            </div>
          </dl>
          {paidOrder ? <p className="table-hint">订单号 {paidOrder.id} · 已支付</p> : null}
          <div className="issue-actions">
            {paid ? (
              <button className="admin-primary" type="button" onClick={() => go('approval')}>
                返回审批记录
              </button>
            ) : (
              <>
                <button className="admin-ghost" type="button" onClick={() => go('approval-buy')}>
                  返回修改
                </button>
                <button className="admin-primary" disabled={paying} type="button" onClick={pay}>
                  确认支付 ¥ {money(q.merchantPay)}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
