import { StoreProvider, useStore } from './store'
import { DetailPage, GoldWalletPage, MallPage, MemberPage, MinePage, PointsZonePage, RecordsPage, RightsPage, SuccessPage, TabBar } from './pages'

export function Screen() {
  const { screen } = useStore()
  if (screen.name === 'detail') return <DetailPage productId={screen.productId} />
  if (screen.name === 'success') return <SuccessPage orderId={screen.orderId} />
  if (screen.name === 'gold-wallet') return <GoldWalletPage fromOrderId={screen.fromOrderId} />
  if (screen.name === 'my-benefits') return <RightsPage fromOrderId={screen.fromOrderId} />
  if (screen.name === 'mine') return <MinePage />
  if (screen.name === 'records') return <RecordsPage />
  if (screen.name === 'mall') return <MallPage />
  if (screen.name === 'points-zone') return <PointsZonePage />
  return <MemberPage />
}

export function PhoneShell() {
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

export function ConsumerApp() {
  return (
    <div className="stage">
      <a className="admin-entry" href="#/prd">
        PRD 对照
      </a>
      <a className="admin-entry is-second" href="#/admin">
        商户后台
      </a>
      <div className="phone">
        <StoreProvider>
          <PhoneShell />
        </StoreProvider>
      </div>
    </div>
  )
}
