import { useState } from 'react'
import { useStore } from '../data/store'
import { emojiForKind } from '../weather/weatherCode'

/**
 * Slim glass strip under the forecast card: the next 24 hours (scrollable),
 * toggleable to the 7-day outlook. Hidden until the provider supplies data.
 */
export default function ForecastStrip() {
  const forecast = useStore((s) => s.current?.forecast)
  const [tab, setTab] = useState<'hourly' | 'daily'>('hourly')
  if (!forecast || (!forecast.hourly.length && !forecast.daily.length)) return null

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
