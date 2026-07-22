import { useState } from 'react'
import { useStore } from '../data/store'
import { emojiForKind } from '../weather/weatherCode'

const COLLAPSE_KEY = 'weather-diorama.fstrip-collapsed'

/**
 * Slim glass strip under the forecast card: the next 24 hours (scrollable),
 * toggleable to the 7-day outlook, and collapsible to a small handle.
 * Hidden entirely until the provider supplies data.
 */
export default function ForecastStrip() {
  const forecast = useStore((s) => s.current?.forecast)
  const [tab, setTab] = useState<'hourly' | 'daily'>('hourly')
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  if (!forecast || (!forecast.hourly.length && !forecast.daily.length)) return null

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  if (collapsed) {
    return (
      <button className="fstrip-handle" onClick={toggle} aria-label="展开预报">
        预报 <span aria-hidden>▾</span>
      </button>
    )
  }

  return (
    <div className="fstrip">
      <div className="fstrip-tabs">
        <button
          className={`fstrip-tab${tab === 'hourly' ? ' active' : ''}`}
          onClick={() => setTab('hourly')}
        >
          24小时
        </button>
        <button
          className={`fstrip-tab${tab === 'daily' ? ' active' : ''}`}
          onClick={() => setTab('daily')}
        >
          7天
        </button>
        <button className="fstrip-collapse" onClick={toggle} aria-label="收起预报">
          ▴
        </button>
      </div>
      {tab === 'hourly' ? (
        <div className="fstrip-row" role="list">
          {forecast.hourly.map((h, i) => (
            <div className="fstrip-cell" role="listitem" key={i}>
              <div className="fstrip-label">{h.label}</div>
              <div className="fstrip-emoji" aria-hidden>
                {emojiForKind(h.kind, h.isDay ? 'day' : 'night')}
              </div>
              <div className="fstrip-temp">{h.temp}°</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="fstrip-row" role="list">
          {forecast.daily.map((d, i) => (
            <div className="fstrip-cell" role="listitem" key={i}>
              <div className="fstrip-label">{d.label}</div>
              <div className="fstrip-date">{d.dateLabel}</div>
              <div className="fstrip-emoji" aria-hidden>
                {emojiForKind(d.kind, 'day')}
              </div>
              <div className="fstrip-temp">
                {d.tMax}° <span className="fstrip-min">{d.tMin}°</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
