import { useEffect, useState } from 'react'
import { useStore } from '../data/store'

/**
 * Brief boot loader. The city renders immediately regardless of network, so we
 * dismiss once the first weather payload arrives, on error, or after a short
 * fallback timeout (keeps the scene reachable even if the API is unreachable).
 */
export default function Loading() {
  const status = useStore((s) => s.status)
  const hasData = useStore((s) => s.current !== null)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 2500)
    return () => clearTimeout(t)
  }, [])

  if (hasData || status === 'error' || timedOut) return null
  return (
    <div className="boot">
      <div className="boot-inner">
        <div className="boot-spinner" />
        <div className="boot-text">正在生成微缩城市…</div>
      </div>
    </div>
  )
}
