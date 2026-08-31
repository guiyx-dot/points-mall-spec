import type { ReactNode } from 'react'

function logo(file: string) {
  return `${import.meta.env.BASE_URL}logos/${file}?v=3`
}

const wrap = (bg: string, children: ReactNode) => (
  <div className="icon-plate" style={{ background: bg }}>
    {children}
  </div>
)

function BrandMark({ src, bg, invert = true }: { src: string; bg: string; invert?: boolean }) {
  return wrap(
    bg,
    <img src={src} alt="" className={invert ? 'brand-logo is-invert' : 'brand-logo'} />,
  )
}

export function ProductIcon({ id }: { id: string }) {
  switch (id) {
    case 'alipay':
      return <BrandMark src={logo('alipay.svg')} bg="#1677FF" />
    case 'alipay-plus':
      return <BrandMark src={logo('alipay.svg')} bg="#0A5CFF" />
    case 'gold':
      return wrap(
        'linear-gradient(145deg, #FFD56A, #F5A623)',
        <svg viewBox="0 0 48 48" className="icon-svg">
          <circle cx="24" cy="24" r="14" fill="none" stroke="#fff" strokeWidth="2.4" />
          <text x="24" y="29" textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff">
            金
          </text>
        </svg>,
      )
    case 'wechat':
      return <BrandMark src={logo('wechat.svg')} bg="#07C160" />
    case 'jd':
      return <BrandMark src={logo('jd.svg')} bg="#E1251B" />
    case 'starbucks':
      return <BrandMark src={logo('starbucks.svg')} bg="#006241" />
    case 'takeout':
      return <BrandMark src={logo('meituan.svg')} bg="#FFD100" invert={false} />
    case 'hotpot':
      return <BrandMark src={logo('haidilao.svg')} bg="#C41A1A" />
    case 'movie':
      return <BrandMark src={logo('maoyan.svg')} bg="#E23D2A" />
    case 'video':
      return <BrandMark src={logo('iqiyi.svg')} bg="#00C853" />
    case 'market':
      return <BrandMark src={logo('walmart.svg')} bg="#0071CE" />
    case 'ride':
      return <BrandMark src={logo('didi.svg')} bg="#FF6600" />
    case 'hotel':
      return <BrandMark src={logo('trip.svg')} bg="#287DFA" />
    case 'digital':
      return <BrandMark src={logo('xiaomi.svg')} bg="#FF6900" />
    default:
      return wrap('linear-gradient(145deg, #FFB347, #FF8A00)', <span className="icon-fallback">兑</span>)
  }
}

export function NavIcon({ name, active }: { name: 'mall' | 'mine'; active: boolean }) {
  const color = active ? '#FF8A00' : '#B0B0B0'
  if (name === 'mall') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 8.5 12 4l8 4.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8.5Z"
          stroke={color}
          strokeWidth="1.8"
          fill={active ? 'rgba(255,138,0,.12)' : 'none'}
        />
        <path d="M9 20v-6h6v6" stroke={color} strokeWidth="1.8" />
      </svg>
    )
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.2" stroke={color} strokeWidth="1.8" fill={active ? 'rgba(255,138,0,.12)' : 'none'} />
      <path d="M5 19.5c1.2-3.2 3.6-4.8 7-4.8s5.8 1.6 7 4.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
