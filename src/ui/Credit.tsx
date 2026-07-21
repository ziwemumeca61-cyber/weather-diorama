import { useCityProfile } from '../scene/cityProfiles'
import { weatherCredit } from '../data/api'

/**
 * Corner attribution line. The weather source (Open-Meteo CC-BY / 和风天气)
 * requires attribution, so it's always shown; a per-city model credit (e.g.
 * CC-BY GLB assets) is appended when the current profile declares one.
 */
export default function Credit() {
  const profile = useCityProfile()
  const isOpenMeteo = weatherCredit.name.includes('Open-Meteo')
  return (
    <div className="credit">
      {profile.credit ? `${profile.credit} · ` : ''}
      天气数据{' '}
      <a href={weatherCredit.url} target="_blank" rel="noreferrer">
        {weatherCredit.name}
      </a>
      {isOpenMeteo ? ' (CC-BY 4.0)' : ''} · 定位仅用于查询本地天气，不会上传 ·{' '}
      <span className="credit-ver">v{__BUILD_ID__}</span>
    </div>
  )
}
