import { useMemo, type ReactNode } from 'react'

export function StatusBar() {
  const time = useMemo(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }, [])

  return (
    <div className="status-bar">
      <span className="status-time">{time}</span>
      <span className="status-icons">
        <i className="sig" />
        <i className="wifi" />
        <i className="bat" />
      </span>
    </div>
  )
}

export function NavBar({
  title,
  onBack,
  right,
}: {
  title: string
  onBack?: () => void
  right?: ReactNode
}) {
  return (
    <div className="nav-bar">
      <button className="nav-side" onClick={onBack} disabled={!onBack} aria-label="返回">
        {onBack ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </button>
      <h1>{title}</h1>
      <div className="nav-side nav-right">{right}</div>
    </div>
  )
}
