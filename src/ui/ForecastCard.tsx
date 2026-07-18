import { useStore, useEffectiveWeather } from '../data/store'
import { emojiForKind, labelForKind } from '../weather/weatherCode'

/** Top overlay card mirroring the reference video: city · icon · date · temp. */
export default function ForecastCard() {
  const current = useStore((s) => s.current)
  const status = useStore((s) => s.status)
  const { kind, timeOfDay } = useEffectiveWeather()

  const cityName = current?.place.name ?? '上海'
  const temp = current ? `${current.temperature}°` : '—'
  const date =
    current?.dateLabelZh ??
    `${new Date().getMonth() + 1}月${new Date().getDate()}日`

  return (
    <div className="forecast-card">
      <div className="fc-city">{cityName}</div>
      <div className="fc-icon" aria-hidden>
        {emojiForKind(kind, timeOfDay)}
      </div>
      <div className="fc-date">{date}</div>
      <div className="fc-temp">{temp}</div>
      <div className="fc-desc">
        {labelForKind(kind)}
        {status === 'loading' && ' · 加载中…'}
      </div>
    </div>
  )
}
