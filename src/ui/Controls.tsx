import { useState } from 'react'
import { useStore } from '../data/store'
import {
  fetchWeatherByCity,
  fetchWeatherByCoords,
  geolocate,
} from '../data/api'
import type { WeatherKind, TimeOfDay } from '../weather/weatherCode'
import { labelForKind } from '../weather/weatherCode'
import type { Appearance } from '../data/store'

const KINDS: WeatherKind[] = ['clear', 'cloudy', 'overcast', 'fog', 'rain', 'snow', 'thunder']
const TIMES: { id: TimeOfDay; label: string }[] = [
  { id: 'day', label: '白天' },
  { id: 'dusk', label: '黄昏' },
  { id: 'night', label: '夜晚' },
]
const AVATAR_PARTS: { key: keyof Appearance; label: string }[] = [
  { key: 'skin', label: '肤色' },
  { key: 'hair', label: '头发' },
  { key: 'shirt', label: '上衣' },
  { key: 'pants', label: '裤子' },
  { key: 'umbrella', label: '雨伞' },
]

export default function Controls() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(true)
  const setLoading = useStore((s) => s.setLoading)
  const setError = useStore((s) => s.setError)
  const setCurrent = useStore((s) => s.setCurrent)
  const overrideKind = useStore((s) => s.overrideKind)
  const overrideTime = useStore((s) => s.overrideTime)
  const setOverrideKind = useStore((s) => s.setOverrideKind)
  const setOverrideTime = useStore((s) => s.setOverrideTime)
  const clearOverrides = useStore((s) => s.clearOverrides)
  const error = useStore((s) => s.error)
  const avatar = useStore((s) => s.avatar)
  const setAvatar = useStore((s) => s.setAvatar)

  async function search(e?: React.FormEvent) {
    e?.preventDefault()
    if (!query.trim()) return
    setLoading()
    try {
      const w = await fetchWeatherByCity(query.trim())
      setCurrent(w)
      clearOverrides()
    } catch (err: any) {
      setError(err?.message ?? '查询失败')
    }
  }

  async function locate() {
    setLoading()
    try {
      const { latitude, longitude } = await geolocate()
      const w = await fetchWeatherByCoords(latitude, longitude)
      setCurrent(w)
      clearOverrides()
    } catch (err: any) {
      setError(err?.message ?? '定位失败')
    }
  }

  return (
    <div className={`controls ${open ? 'open' : 'collapsed'}`}>
      <button className="controls-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? '×' : '☰'}
      </button>

      {open && (
        <div className="controls-body">
          <form className="search-row" onSubmit={search}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索城市，如 上海 / Tokyo"
              aria-label="搜索城市"
            />
            <button type="submit" title="查询">🔍</button>
            <button type="button" onClick={locate} title="定位">📍</button>
          </form>

          {error && <div className="err">{error}</div>}

          <div className="chips-label">天气特效</div>
          <div className="chips">
            {KINDS.map((k) => (
              <button
                key={k}
                className={`chip ${overrideKind === k ? 'active' : ''}`}
                onClick={() => setOverrideKind(overrideKind === k ? null : k)}
              >
                {labelForKind(k)}
              </button>
            ))}
          </div>

          <div className="chips-label">时段</div>
          <div className="chips">
            {TIMES.map((t) => (
              <button
                key={t.id}
                className={`chip ${overrideTime === t.id ? 'active' : ''}`}
                onClick={() => setOverrideTime(overrideTime === t.id ? null : t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {(overrideKind || overrideTime) && (
            <button className="reset" onClick={clearOverrides}>
              恢复实时天气
            </button>
          )}

          <div className="chips-label">我的小人</div>
          <div className="avatar-grid">
            {AVATAR_PARTS.map((part) => (
              <label key={part.key} className="swatch">
                <input
                  type="color"
                  value={avatar[part.key] as string}
                  onChange={(e) => setAvatar({ [part.key]: e.target.value })}
                />
                <span>{part.label}</span>
              </label>
            ))}
            <label className="swatch">
              <input
                type="color"
                value={avatar.hatColor}
                disabled={!avatar.hat}
                onChange={(e) => setAvatar({ hatColor: e.target.value })}
              />
              <span>帽子</span>
            </label>
          </div>
          <label className="hat-toggle">
            <input
              type="checkbox"
              checked={avatar.hat}
              onChange={(e) => setAvatar({ hat: e.target.checked })}
            />
            戴帽子
          </label>
          <div className="avatar-hint">拖动镜头找到脚下有光环的小人就是你 · 下雨会打伞</div>
        </div>
      )}
    </div>
  )
}
