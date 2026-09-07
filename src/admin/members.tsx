import { useState } from 'react'
import { maskPhone } from './model'
import { useMemberRows, type MemberGrant } from './member-data'
import { isExpireSoon, isPointsExpired } from '../points-expiry'

function grantStatus(item: MemberGrant) {
  if (isPointsExpired(item.expireDate)) return '已过期'
  return '已入账'
}

function expireClass(expireDate?: string) {
  if (isPointsExpired(expireDate)) return 'expire-warn'
  if (isExpireSoon(expireDate)) return 'expire-soon'
  return undefined
}

export function MembersPage({ startPhone }: { startPhone?: string } = {}) {
  const { rows } = useMemberRows()
  const [keyword, setKeyword] = useState('')
  const [openPhone, setOpenPhone] = useState<string | null>(startPhone ?? null)

  const shown = rows.filter((item) => {
    const q = keyword.trim()
    if (!q) return true
    return item.name.includes(q) || item.phone.includes(q) || maskPhone(item.phone).includes(q)
  })
  const current = shown.find((item) => item.phone === openPhone) ?? null

  if (current) {
    return (
      <>
        <div className="admin-crumb">
          <button type="button" onClick={() => setOpenPhone(null)}>
            积分商城 / 用户积分
          </button>
          <span> / {current.name}</span>
        </div>
        <div className="admin-panel">
          <div className="member-detail-head">
            <div>
              <h2>{current.name}</h2>
              <p>{maskPhone(current.phone)}</p>
            </div>
          </div>
          <div className="member-stat-grid is-two">
            <div>
              <span>通用积分</span>
              <b>{current.generalPoints}</b>
            </div>
            <div>
              <span>15 天内到期</span>
              <b>{current.expiringSoon}</b>
            </div>
          </div>
          <p className="member-expire-note">通用积分自发放起 90 天有效，到期未兑完的批次作废。</p>

          <h3 className="member-block-title">发放记录</h3>
          {current.grants.length === 0 ? (
            <p className="empty-panel">暂无发放</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>说明</th>
                  <th>积分</th>
                  <th>时间</th>
                  <th>有效期至</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {current.grants.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>{item.amount > 0 ? `+${item.amount}` : item.amount}</td>
                    <td>{item.time}</td>
                    <td className={expireClass(item.expireDate)}>{item.expireDate ?? '—'}</td>
                    <td className={expireClass(item.expireDate)}>{grantStatus(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="admin-crumb">积分商城 / 用户积分</div>
      <div className="admin-panel">
        <h2 className="teal-title">用户积分</h2>
        <p className="member-expire-note">通用积分自发放起 90 天有效。支付成功即入账。</p>
        <div className="member-search">
          <input
            value={keyword}
            placeholder="搜索姓名或手机号"
            onChange={(event) => setKeyword(event.target.value)}
          />
          <span>{shown.length} 人</span>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>通用积分</th>
              <th>15 天内到期</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((item) => (
              <tr key={item.phone}>
                <td>
                  <strong>{item.name}</strong>
                  <div className="muted-line">{maskPhone(item.phone)}</div>
                </td>
                <td>{item.generalPoints}</td>
                <td className={item.expiringSoon > 0 ? 'expire-soon' : undefined}>
                  {item.expiringSoon > 0 ? item.expiringSoon : '—'}
                </td>
                <td>
                  <button className="link" type="button" onClick={() => setOpenPhone(item.phone)}>
                    明细
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
