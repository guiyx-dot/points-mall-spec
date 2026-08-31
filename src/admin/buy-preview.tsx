import { ProductIcon } from '../icons'
import { DEDICATED_SKUS, dedicatedLabel, type PurchaseKind } from './model'

export function BuyPreview({ kind, sku }: { kind: PurchaseKind; sku?: (typeof DEDICATED_SKUS)[number] }) {
  return (
    <div className="buy-visual">
      {kind === 'dedicated' && sku ? (
        <ProductIcon id={sku.id} />
      ) : (
        <div className="points-mark">积</div>
      )}
      <strong className="buy-visual-name">{kind === 'dedicated' && sku ? dedicatedLabel(sku.name) : '通用积分'}</strong>
      <div className="trust">
        {kind === 'dedicated' ? '专用券 · 兑成金/券后可在积分专区使用' : '正品保障 · 安全到账 · 可批量发放'}
      </div>
    </div>
  )
}
