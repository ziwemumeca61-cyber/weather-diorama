import { useStore } from '../data/store'

/** Full-screen boot loader shown until the first weather payload arrives. */
export default function Loading() {
  const status = useStore((s) => s.status)
  const hasData = useStore((s) => s.current !== null)
  if (hasData || status === 'error') return null
  return (
    <div className="boot">
      <div className="boot-inner">
        <div className="boot-spinner" />
        <div className="boot-text">正在生成微缩城市…</div>
      </div>
    </div>
  )
}
