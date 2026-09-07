import { useEffect, useMemo, useState } from 'react'
import { ProductIcon } from '../icons'
import { CATEGORIES } from '../data'
import { loadCatalog, patchCatalog, CATALOG_EVENT, type CatalogProduct } from '../catalog'
import type { Category } from '../types'

const ZONE_TABS = [
  { id: 'benefit' as const, label: '权益专区' },
  { id: 'points' as const, label: '积分专区' },
]

type Draft = {
  name: string
  subtitle: string
  cost: string
  stock: string
  quota: string
  validityDays: string
  onShelf: boolean
  category: Category
  description: string
}

function toDraft(item: CatalogProduct): Draft {
  return {
    name: item.name,
    subtitle: item.subtitle,
    cost: String(item.cost),
    stock: String(item.stock),
    quota: String(item.quota ?? 0),
    validityDays: String(item.validityDays),
    onShelf: item.onShelf,
    category: item.category ?? 'life',
    description: item.description,
  }
}

export function GoodsPage() {
  const [catalog, setCatalog] = useState(loadCatalog)
  const [zone, setZone] = useState<'benefit' | 'points'>('benefit')
  const [editing, setEditing] = useState<CatalogProduct | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)

  useEffect(() => {
    const sync = () => setCatalog(loadCatalog())
    window.addEventListener(CATALOG_EVENT, sync)
    return () => window.removeEventListener(CATALOG_EVENT, sync)
  }, [])

  const rows = useMemo(() => catalog.filter((item) => item.zone === zone), [catalog, zone])

  const open = (item: CatalogProduct) => {
    setEditing(item)
    setDraft(toDraft(item))
  }

  const save = () => {
    if (!editing || !draft) return
    const cost = Math.max(1, Math.floor(Number(draft.cost) || 1))
    const stock = Math.max(0, Math.floor(Number(draft.stock) || 0))
    const validityDays = Math.max(1, Math.floor(Number(draft.validityDays) || 1))
    const quota = Math.max(0, Math.floor(Number(draft.quota) || 0))
    patchCatalog(editing.id, {
      name: draft.name.trim() || editing.name,
      subtitle: draft.subtitle.trim() || editing.subtitle,
      cost,
      stock,
      onShelf: draft.onShelf,
      validityDays,
      description: draft.description.trim() || editing.description,
      quota: editing.zone === 'benefit' ? quota : editing.quota,
      category: editing.zone === 'points' ? draft.category : undefined,
    })
    setEditing(null)
    setDraft(null)
  }

  return (
    <>
      <div className="admin-crumb">积分商城 / 商品配置</div>
      <div className="admin-panel">
        <div className="admin-toolbar">
          <div>
            <h2 className="teal-title">商城商品</h2>
            <p className="table-hint">配置权益专区与积分专区的价格、库存和上下架。保存后同一浏览器的用户端立即生效。</p>
          </div>
        </div>
        <div className="admin-tabs">
          {ZONE_TABS.map((item) => (
            <button key={item.id} className={zone === item.id ? 'on' : ''} type="button" onClick={() => setZone(item.id)}>
              {item.label}
              <em className="tab-count">{catalog.filter((row) => row.zone === item.id).length}</em>
            </button>
          ))}
        </div>
        <table className="admin-table goods-config-table">
          <thead>
            <tr>
              <th>商品</th>
              <th>积分价格</th>
              {zone === 'benefit' ? <th>每人可兑份数</th> : <th>类目</th>}
              <th>库存</th>
              <th>有效期</th>
              <th>状态</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="goods-cell">
                    <ProductIcon id={item.id} />
                    <div>
                      <strong>{item.name}</strong>
                      <p>{item.subtitle}</p>
                    </div>
                  </div>
                </td>
                <td>{item.cost} 积分</td>
                {zone === 'benefit' ? <td>{item.quota ?? 0} 份</td> : <td>{CATEGORIES.find((row) => row.id === item.category)?.label ?? '—'}</td>}
                <td>{item.stock}</td>
                <td>{item.validityDays} 天</td>
                <td>
                  <span className={item.onShelf && item.stock > 0 ? 'status-pill on' : 'status-pill'}>
                    {item.onShelf && item.stock > 0 ? '销售中' : item.onShelf ? '已售罄' : '已下架'}
                  </span>
                </td>
                <td>
                  <button className="link" type="button" onClick={() => open(item)}>
                    编辑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && draft ? (
        <div className="admin-mask" onClick={() => setEditing(null)}>
          <div className="admin-modal goods-modal" onClick={(event) => event.stopPropagation()}>
            <div className="account-modal-head">
              编辑商品
              <button className="account-modal-x" type="button" onClick={() => setEditing(null)} aria-label="关闭">
                ×
              </button>
            </div>
            <div className="goods-form">
              <div className="goods-form-hero">
                <ProductIcon id={editing.id} />
                <div>
                  <strong>{editing.zone === 'benefit' ? '权益专区' : '积分专区'}</strong>
                  <p>商品编号 {editing.id}</p>
                </div>
              </div>
              <label className="field">
                商品名称
                <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              </label>
              <label className="field">
                副标题
                <input value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} />
              </label>
              <div className="goods-form-grid">
                <label className="field">
                  积分价格
                  <input
                    type="number"
                    min={1}
                    value={draft.cost}
                    onChange={(event) => setDraft({ ...draft, cost: event.target.value })}
                  />
                  {editing.zone === 'benefit' ? <em>权益专区建议保持 1 积分 = 1 元</em> : <em>用户兑换时扣除的积分</em>}
                </label>
                <label className="field">
                  库存
                  <input
                    type="number"
                    min={0}
                    value={draft.stock}
                    onChange={(event) => setDraft({ ...draft, stock: event.target.value })}
                  />
                  <em>兑完即止，库存为 0 时前台显示兑换结束</em>
                </label>
                {editing.zone === 'benefit' ? (
                  <label className="field">
                    每人可兑份数
                    <input
                      type="number"
                      min={0}
                      value={draft.quota}
                      onChange={(event) => setDraft({ ...draft, quota: event.target.value })}
                    />
                    <em>用户首次领取积分时写入的可兑份数</em>
                  </label>
                ) : (
                  <label className="field">
                    类目
                    <select
                      value={draft.category}
                      onChange={(event) => setDraft({ ...draft, category: event.target.value as Category })}
                    >
                      {CATEGORIES.filter((item) => item.id !== 'all').map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="field">
                  兑换后有效期（天）
                  <input
                    type="number"
                    min={1}
                    value={draft.validityDays}
                    onChange={(event) => setDraft({ ...draft, validityDays: event.target.value })}
                  />
                </label>
              </div>
              <label className="field shelf-field">
                <input
                  type="checkbox"
                  checked={draft.onShelf}
                  onChange={(event) => setDraft({ ...draft, onShelf: event.target.checked })}
                />
                上架到用户端商城
              </label>
              <label className="field">
                权益说明
                <textarea
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </label>
            </div>
            <div className="goods-form-foot">
              <button className="admin-ghost" type="button" onClick={() => setEditing(null)}>
                取消
              </button>
              <button className="admin-primary" type="button" onClick={save}>
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
