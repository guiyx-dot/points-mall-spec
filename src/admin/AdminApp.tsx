import { AdminProvider, useAdmin } from './store'
import { BuyPage, CatalogPage, IssuePage, OrdersPage, UsersPage } from './pages'
import { ApprovalBuyPage, ApprovalListPage, ApprovalPayPage } from './approval'
import type { AdminScreen } from './model'
import './admin.css'

const PRODUCT_NAV: { id: AdminScreen; label: string }[] = [
  { id: 'catalog', label: '商品中心' },
  { id: 'orders', label: '商品订单' },
  { id: 'issue', label: '批量发放' },
  { id: 'users', label: '用户积分' },
]

const MUTED = ['活动管理', '额度管理', '车险报价管理', '运管家', '订单管理', '数据中心', '用户中心']

function isApprovalScreen(screen: AdminScreen) {
  return screen === 'approval' || screen === 'approval-buy' || screen === 'approval-pay'
}

function Shell() {
  const { screen, go } = useAdmin()
  return (
    <div className="admin-root">
      <aside className="admin-side">
        <div className="admin-brand">商户后台</div>
        <button className="side-item muted" type="button">
          首页
        </button>
        <div className="side-group">商品管理</div>
        {PRODUCT_NAV.map((item) => (
          <button
            key={item.id}
            className={screen === item.id || (item.id === 'catalog' && screen === 'buy') ? 'side-item on' : 'side-item'}
            onClick={() => go(item.id)}
          >
            {item.label}
          </button>
        ))}
        <div className="side-group">审批管理</div>
        <button
          className={isApprovalScreen(screen) ? 'side-item on' : 'side-item'}
          type="button"
          onClick={() => go('approval')}
        >
          审批记录管理
        </button>
        <button className="side-item muted" type="button">
          提报人审批记录
        </button>
        {MUTED.map((label) => (
          <button key={label} className="side-item muted" type="button">
            {label}
          </button>
        ))}
        <a className="side-consumer" href="#/">
          打开用户端
        </a>
      </aside>
      <main className="admin-main">
        {screen === 'catalog' ? <CatalogPage /> : null}
        {screen === 'buy' ? <BuyPage /> : null}
        {screen === 'orders' ? <OrdersPage /> : null}
        {screen === 'issue' ? <IssuePage /> : null}
        {screen === 'users' ? <UsersPage /> : null}
        {screen === 'approval' ? <ApprovalListPage /> : null}
        {screen === 'approval-buy' ? <ApprovalBuyPage /> : null}
        {screen === 'approval-pay' ? <ApprovalPayPage /> : null}
      </main>
    </div>
  )
}

export default function AdminApp() {
  return (
    <AdminProvider>
      <Shell />
    </AdminProvider>
  )
}
