import { useEffect, useState } from 'react'
import AdminApp from './admin/AdminApp'
import PrdApp from './prd/PrdApp'
import { ConsumerApp } from './shell'

function useHashMode() {
  const read = () => {
    const hash = window.location.hash
    if (hash.startsWith('#/prd')) return 'prd' as const
    if (hash.startsWith('#/admin')) return 'admin' as const
    return 'app' as const
  }
  const [mode, setMode] = useState(read)
  useEffect(() => {
    const onHash = () => setMode(read())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return mode
}

export default function App() {
  const mode = useHashMode()
  if (mode === 'prd') return <PrdApp />
  if (mode === 'admin') return <AdminApp />
  return <ConsumerApp />
}
