import { useEffect, useRef, useState } from 'react'
import { useStore } from '../data/store'
import {
  fetchWeather,
  fetchWeatherByCoords,
  geocodeCity,
  geolocate,
  type GeoPlace,
} from '../data/api'
import { writeCityParam } from '../data/urlCity'
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

/** "上海" → "上海 · 中国"; "Paris" → "Île-de-France · France". */
function placeSubtitle(p: GeoPlace): string {
  return [p.admin1, p.country].filter(Boolean).join(' · ')
}

export default function Controls() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(true)
  const [suggests, setSuggests] = useState<GeoPlace[]>([])
  const [showList, setShowList] = useState(false)
  const [searching, setSearching] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const reqId = useRef(0)
  const blurTimer = useRef<ReturnType<typeof setTimeout>>()

  const setLoading = useStore((s) => s.setLoading)
  const setError = useStore((s) => s.setError)
  const setCurrent = useStore((s) => s.setCurrent)
  const addRecent = useStore((s) => s.addRecent)
  const recents = useStore((s) => s.recents)
  const overrideKind = useStore((s) => s.overrideKind)
  const overrideTime = useStore((s) => s.overrideTime)
  const setOverrideKind = useStore((s) => s.setOverrideKind)
  const setOverrideTime = useStore((s) => s.setOverrideTime)
  const clearOverrides = useStore((s) => s.clearOverrides)
  const error = useStore((s) => s.error)
  const avatar = useStore((s) => s.avatar)
  const setAvatar = useStore((s) => s.setAvatar)

  // The dropdown shows live geocode matches while typing, else recent places.
  const list = query.trim() ? suggests : recents
  const listKind: 'suggest' | 'recent' = query.trim() ? 'suggest' : 'recent'

  // Debounced autocomplete: geocode as the user types, ignoring stale replies.
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setSuggests([])
      setSearching(false)
      return
    }
    setSearching(true)
    const id = ++reqId.current
    const t = setTimeout(async () => {
      try {
        const places = await geocodeCity(q)
        if (id === reqId.current) setSuggests(places)
      } catch {
        if (id === reqId.current) setSuggests([])
      } finally {
        if (id === reqId.current) setSearching(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  async function selectPlace(place: GeoPlace) {
    setShowList(false)
    setActiveIdx(-1)
    setQuery(place.name)
    setLoading()
    try {
      const w = await fetchWeather(place)
      setCurrent(w)
      addRecent(w.place)
      writeCityParam(w.place.name)
      clearOverrides()
    } catch (err: any) {
      setError(err?.message ?? '查询失败')
    }
  }

  async function search(e?: React.FormEvent) {
    e?.preventDefault()
    if (activeIdx >= 0 && list[activeIdx]) return selectPlace(list[activeIdx])
    if (suggests.length) return selectPlace(suggests[0])
    const q = query.trim()
    if (!q) return
    setLoading()
    try {
      const places = await geocodeCity(q)
      if (!places.length) throw new Error('未找到该城市')
      await selectPlace(places[0])
    } catch (err: any) {
      setError(err?.message ?? '查询失败')
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' && list.length) {
      e.preventDefault()
      setShowList(true)
      setActiveIdx((i) => (i + 1) % list.length)
    } else if (e.key === 'ArrowUp' && list.length) {
      e.preventDefault()
      setActiveIdx((i) => (i <= 0 ? list.length - 1 : i - 1))
    } else if (e.key === 'Escape') {
      setShowList(false)
      setActiveIdx(-1)
    }
  }

  async function locate() {
    setShowList(false)
    setLoading()
    try {
      const { latitude, longitude } = await geolocate()
      const w = await fetchWeatherByCoords(latitude, longitude)
      setCurrent(w)
      addRecent(w.place)
      writeCityParam(w.place.name)
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
          <form className="search-row" onSubmit={search} autoComplete="off">
            <div className="search-field">
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setShowList(true)
                  setActiveIdx(-1)
                }}
                onFocus={() => setShowList(true)}
                onBlur={() => {
                  // delay so a click on a suggestion still registers
                  blurTimer.current = setTimeout(() => setShowList(false), 140)
                }}
                onKeyDown={onKeyDown}
                placeholder="搜索城市，如 上海 / Tokyo"
                aria-label="搜索城市"
                role="combobox"
                aria-expanded={showList && list.length > 0}
                aria-autocomplete="list"
              />
              {showList && (list.length > 0 || searching) && (
                <ul className="suggests" role="listbox">
                  {listKind === 'recent' && list.length > 0 && (
                    <li className="suggests-head">最近搜索</li>
                  )}
                  {searching && list.length === 0 && (
                    <li className="suggests-empty">搜索中…</li>
                  )}
                  {list.map((p, i) => (
                    <li
                      key={`${p.name}-${p.latitude}-${p.longitude}-${i}`}
                      className={`suggest ${i === activeIdx ? 'active' : ''}`}
                      role="option"
                      aria-selected={i === activeIdx}
                      onMouseEnter={() => setActiveIdx(i)}
                      onMouseDown={(e) => {
                        // fire before input blur closes the list
                        e.preventDefault()
                        if (blurTimer.current) clearTimeout(blurTimer.current)
                        selectPlace(p)
                      }}
                    >
                      <span className="suggest-name">
                        {listKind === 'recent' && <span className="suggest-pin">🕘</span>}
                        {p.name}
                      </span>
                      {placeSubtitle(p) && (
                        <span className="suggest-sub">{placeSubtitle(p)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
