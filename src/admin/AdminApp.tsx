import { AdminProvider, useAdmin } from './store'
import { ApprovalBuyPage, ApprovalListPage, ApprovalPayPage } from './approval'
import './admin.css'

const MUTED = ['活动管理', '额度管理', '车险报价管理', '运管家', '订单管理', '数据中心', '用户中心']

function isApprovalScreen(screen: string) {
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
        {screen === 'approval-buy' ? <ApprovalBuyPage /> : null}
        {screen === 'approval-pay' ? <ApprovalPayPage /> : null}
        {screen !== 'approval-buy' && screen !== 'approval-pay' ? <ApprovalListPage /> : null}
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
