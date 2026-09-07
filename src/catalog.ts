import { PRODUCTS } from './data'
import type { Product } from './types'

export const CATALOG_KEY = 'points-mall-spec-catalog-v1'
export const CATALOG_EVENT = 'points-mall-catalog'

export type CatalogProduct = Product & {
  stock: number
  onShelf: boolean
}

function defaultStock(product: Product) {
  if (product.ended) return 0
  if (typeof product.stock === 'number') return product.stock
  return product.zone === 'benefit' ? 2000 : 999
}

export function stockLabelOf(product: Pick<CatalogProduct, 'onShelf' | 'stock'>) {
  if (!product.onShelf || product.stock <= 0) return '已售罄'
  if (product.stock >= 200) return '充足'
  return `剩余 ${product.stock}`
}

export function normalizeProduct(product: Product & Partial<CatalogProduct>): CatalogProduct {
  const stock = Math.max(0, Math.floor(product.stock ?? defaultStock(product)))
  const onShelf = product.onShelf ?? !product.ended
  return {
    ...product,
    stock,
    onShelf,
    ended: !onShelf || stock <= 0,
    stockLabel: stockLabelOf({ onShelf, stock }),
  }
}

export function defaultCatalog(): CatalogProduct[] {
  return PRODUCTS.map((item) => normalizeProduct(item))
}

export function loadCatalog(): CatalogProduct[] {
  const defaults = defaultCatalog()
  try {
    const raw = sessionStorage.getItem(CATALOG_KEY)
    if (!raw) return defaults
    const saved = JSON.parse(raw) as CatalogProduct[]
    if (!Array.isArray(saved)) return defaults
    const map = new Map(saved.map((item) => [item.id, item]))
    return defaults.map((item) => {
      const next = map.get(item.id)
      if (!next) return item
      return normalizeProduct({
        ...item,
        ...next,
        id: item.id,
        zone: item.zone,
        category: item.zone === 'points' ? (next.category ?? item.category) : undefined,
      })
    })
  } catch {
    return defaults
  }
}

export function saveCatalog(items: CatalogProduct[]) {
  const next = items.map((item) => normalizeProduct(item))
  sessionStorage.setItem(CATALOG_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(CATALOG_EVENT))
  return next
}

export function patchCatalog(productId: string, patch: Partial<CatalogProduct>) {
  const next = loadCatalog().map((item) => (item.id === productId ? normalizeProduct({ ...item, ...patch }) : item))
  return saveCatalog(next)
}

export function adjustStock(productId: string, delta: number) {
  const current = loadCatalog().find((item) => item.id === productId)
  if (!current) return loadCatalog()
  return patchCatalog(productId, { stock: Math.max(0, current.stock + delta) })
}

export function catalogProduct(id: string) {
  return loadCatalog().find((item) => item.id === id)
}
