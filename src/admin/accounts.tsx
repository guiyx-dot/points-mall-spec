import { useState } from 'react'
import { UNIT_PRICE, money, type ImportRow } from './model'

export function AccountInfoModal({
  rows,
  onClose,
}: {
  rows: ImportRow[]
  onClose: () => void
}) {
  return (
    <div className="admin-mask" onClick={onClose}>
      <div className="admin-modal account-modal" onClick={(event) => event.stopPropagation()}>
        <div className="account-modal-head">
          账号信息
          <button className="account-modal-x" type="button" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="account-modal-body">
          <table className="admin-table account-table">
            <thead>
              <tr>
                <th>手机号</th>
                <th>车牌</th>
                <th>姓名</th>
                <th>身份证号</th>
                <th>支付宝账号</th>
                <th>金额</th>
                <th>备注</th>
                <th>生效日期</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.phone}>
                  <td>{row.phone}</td>
                  <td>{row.plate || '—'}</td>
                  <td>{row.name ?? '—'}</td>
                  <td>{row.idNo || '—'}</td>
                  <td>{row.alipay || '—'}</td>
                  <td>{money(row.units * UNIT_PRICE)}</td>
                  <td>{row.remark || '—'}</td>
                  <td>{row.effectiveDate || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="account-modal-foot">
          <button className="admin-ghost" type="button" onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  )
}

export function AccountViewButton({ rows }: { rows: ImportRow[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="account-btn" type="button" onClick={() => setOpen(true)}>
        查看账号信息
      </button>
      {open ? <AccountInfoModal rows={rows} onClose={() => setOpen(false)} /> : null}
    </>
  )
}
