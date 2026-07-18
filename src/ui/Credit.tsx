import { useCityProfile } from '../scene/cityProfiles'

/**
 * Corner attribution line. Open-Meteo data is CC-BY 4.0, so the credit is
 * always shown; a per-city model credit (e.g. CC-BY GLB assets) is appended
 * when the current profile declares one.
 */
export default function Credit() {
  const profile = useCityProfile()
  return (
    <div className="credit">
      {profile.credit ? `${profile.credit} · ` : ''}
      天气数据{' '}
      <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
        © Open-Meteo
      </a>{' '}
      (CC-BY 4.0) · 定位仅用于查询本地天气，不会上传
    </div>
  )
}
