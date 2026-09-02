import { useState } from 'react'
import { ProductIcon } from '../icons'
import { DEDICATED_SKUS, FEE_PCT, UNIT_PRICE, dedicatedLabel, money } from './model'

const TABS: { id: string; label: string; ids: string[] }[] = [
  { id: 'gold', label: '通用金', ids: ['gold'] },
  { id: 'alipay', label: '支付宝', ids: ['alipay', 'alipay-plus'] },
  { id: 'wechat', label: '微信', ids: ['wechat'] },
]

function tabFor(productId: string) {
  return TABS.find((item) => item.ids.includes(productId))?.id ?? TABS[0].id
}

export function EquityPicker({
  value,
  onSelect,
  onClose,
}: {
  value: string
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState(() => tabFor(value))
  const ids = TABS.find((item) => item.id === tab)?.ids ?? []
  const items = DEDICATED_SKUS.filter((item) => ids.includes(item.id))

  return (
    <div className="admin-mask" onClick={onClose}>
      <div className="admin-modal equity-modal" onClick={(event) => event.stopPropagation()}>
        <div className="account-modal-head">
          主权益
          <button className="account-modal-x" type="button" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="equity-tabs">
          {TABS.map((item) => (
            <button key={item.id} className={tab === item.id ? 'on' : ''} type="button" onClick={() => setTab(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="equity-list">
          {items.map((item) => (
            <button
              key={item.id}
              className={value === item.id ? 'equity-card on' : 'equity-card'}
              type="button"
              onClick={() => onSelect(item.id)}
            >
              <ProductIcon id={item.id} />
              <div className="equity-card-body">
                <strong>{dedicatedLabel(item.name)}</strong>
                <div className="equity-metrics">
                  <div>
                    <b>{money(UNIT_PRICE)}</b>
                    <span>单价</span>
                  </div>
                  <div>
                    <b>{FEE_PCT.toFixed(2)}%</b>
                    <span>手续费率</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
