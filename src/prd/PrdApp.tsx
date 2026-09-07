import { useEffect, useMemo, useState } from 'react'
import { StoreProvider, useStore } from '../store'
import { TabBar } from '../pages'
import { Screen } from '../shell'
import { AdminProvider } from '../admin/store'
import { ApprovalBuyPage, ApprovalListPage, ApprovalPayPage } from '../admin/approval'
import { MembersPage } from '../admin/members'
import { RedeemsPage } from '../admin/redemptions'
import { SCENES, type PrdScene } from './scenes'
import './prd.css'

function sceneIdFromHash() {
  const raw = window.location.hash.replace(/^#\/prd\/?/, '')
  return raw || 'rules'
}

function ConsumerPreview({ scene }: { scene: PrdScene }) {
  return (
    <StoreProvider isolated initialScreen={scene.screen} seed={scene.seed}>
      <div className="phone prd-phone">
        <ConsumerShell />
      </div>
    </StoreProvider>
  )
}

function ConsumerShell() {
  const { screen } = useStore()
  const showTab = screen.name === 'mall' || screen.name === 'mine'
  return (
    <>
      <div className="phone-body">
        <Screen />
      </div>
      {showTab ? <TabBar current={screen.name === 'mine' ? 'mine' : 'mall'} /> : null}
    </>
  )
}

function AdminBody({ scene }: { scene: PrdScene }) {
  if (scene.adminScreen === 'approval-buy') return <ApprovalBuyPage />
  if (scene.adminScreen === 'approval-pay') return <ApprovalPayPage />
  if (scene.adminScreen === 'members') return <MembersPage startPhone={scene.startPhone} />
  if (scene.adminScreen === 'redeems') return <RedeemsPage />
  return <ApprovalListPage />
}

function AdminPreview({ scene }: { scene: PrdScene }) {
  return (
    <div className="prd-admin">
      <AdminProvider isolated initialScreen={scene.adminScreen} initialDraft={scene.draft ?? null}>
        <AdminBody scene={scene} />
      </AdminProvider>
    </div>
  )
}

function RulesPreview({ scene }: { scene: PrdScene }) {
  if (scene.id === 'timing') {
    return (
      <div className="prd-flow">
        <h2>用户点确认兑换之后</h2>
        <ol>
          <li>校验积分 / 通用金 / 券够不够</li>
          <li>调福多多下单（用户、商品、积分数额）</li>
          <li>对方成功后，再扣本地通用积分（或金/券）</li>
          <li>记下兑换订单，两边单号关联对账</li>
        </ol>
        <p>对方失败：不要扣积分；若已扣，加回去。</p>
        <p>退款：整单退，可退多笔。不能退一笔里的一部分。</p>
      </div>
    )
  }
  return (
    <div className="prd-flow">
      <h2>从审批到用户花掉</h2>
      <ol>
        <li>中台把「通用积分」这件商品配给商户</li>
        <li>商户走审批（场景 + 凭证 + 手机号）→ 通过</li>
        <li>权益下单：先选积分，再选通用积分或专用券</li>
        <li>收银台用账户余额支付（商品费 + 手续费）</li>
        <li>支付成功，额度立刻记到手机号，用户打开就能兑</li>
        <li>专用券兑成金/券后，去对应板块使用；通用积分兑福多多商品</li>
      </ol>
      <p>商品中心直采本期不做。</p>
    </div>
  )
}

export default function PrdApp() {
  const [id, setId] = useState(sceneIdFromHash)
  useEffect(() => {
    const onHash = () => setId(sceneIdFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const scene = useMemo(() => SCENES.find((item) => item.id === id) ?? SCENES[0], [id])
  const groups = useMemo(() => {
    const map = new Map<string, PrdScene[]>()
    for (const item of SCENES) {
      const list = map.get(item.group) ?? []
      list.push(item)
      map.set(item.group, list)
    }
    return [...map.entries()]
  }, [])

  const open = (next: PrdScene) => {
    window.location.hash = `#/prd/${next.id}`
  }

  return (
    <div className="prd-root">
      <aside className="prd-nav">
        <div className="prd-brand">通用积分商城 PRD</div>
        <p className="prd-lead">左边选页面，中间是原型，右边是这条要做什么。</p>
        {groups.map(([group, items]) => (
          <div key={group}>
            <div className="prd-group">{group}</div>
            {items.map((item) => (
              <button
                key={item.id}
                className={item.id === scene.id ? 'prd-item on' : 'prd-item'}
                type="button"
                onClick={() => open(item)}
              >
                {item.title}
              </button>
            ))}
          </div>
        ))}
        <div className="prd-nav-foot">
          <a href="#/">用户端全屏</a>
          <a href="#/admin">商户后台全屏</a>
        </div>
      </aside>
      <section className="prd-stage">
        <div className="prd-stage-label">{scene.kind === 'admin' ? '商户后台原型' : scene.kind === 'consumer' ? 'C 端原型' : '流程说明'}</div>
        {scene.kind === 'consumer' ? (
          <ConsumerPreview key={scene.id} scene={scene} />
        ) : scene.kind === 'admin' ? (
          <AdminPreview key={scene.id} scene={scene} />
        ) : (
          <RulesPreview scene={scene} />
        )}
      </section>
      <aside className="prd-notes">
        <h1>{scene.title}</h1>
        {scene.notes.map((text) => (
          <p key={text}>{text}</p>
        ))}
      </aside>
    </div>
  )
}
