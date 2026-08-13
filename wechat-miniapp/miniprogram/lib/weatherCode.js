// 与框架无关的天气码工具（web / 小程序 / 未来 App 三端可共享）。
export const KINDS = ['clear', 'cloudy', 'overcast', 'fog', 'rain', 'snow', 'thunder']

export const KIND_LABEL = {
  clear: '晴',
  cloudy: '多云',
  overcast: '阴',
  fog: '雾',
  rain: '雨',
  snow: '雪',
  thunder: '雷阵雨',
}

export const KIND_EMOJI = {
  clear: '☀️',
  cloudy: '⛅',
  overcast: '☁️',
  fog: '🌫️',
  rain: '🌧️',
  snow: '❄️',
  thunder: '⛈️',
}

export function kindFromCode(code) {
  if (code === 0) return 'clear'
  if (code === 1 || code === 2) return 'cloudy'
  if (code === 3) return 'overcast'
  if (code === 45 || code === 48) return 'fog'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'thunder'
  return 'clear'
}

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 把云函数返回的 daily 整理成七天预报卡片数据 */
export function buildForecast(daily) {
  if (!daily || !daily.time || !daily.time.length) return []
  const code = daily.weather_code || []
  const hi = daily.temperature_2m_max || []
  const lo = daily.temperature_2m_min || []
  const out = []
  for (let i = 0; i < daily.time.length && i < 7; i++) {
    const kind = kindFromCode(code[i])
    const d = new Date(daily.time[i] + 'T00:00:00Z')
    const wd = isNaN(d.getTime()) ? '' : WEEK[d.getUTCDay()]
    out.push({
      label: i === 0 ? '今天' : i === 1 ? '明天' : wd,
      emoji: KIND_EMOJI[kind],
      kind: kind,
      hi: hi[i] == null ? '—' : Math.round(hi[i]),
      lo: lo[i] == null ? '—' : Math.round(lo[i]),
    })
  }
  return out
}

/** 由 UTC 偏移得到当地小时 + 中文日期 */
export function localTime(utcOffsetSeconds, localISO) {
  const match = String(localISO || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})/)
  if (match) {
    return {
      hour: Number(match[4]),
      dateLabel: `${Number(match[2])}月${Number(match[3])}日`,
    }
  }
  const d = new Date(Date.now() + (utcOffsetSeconds || 0) * 1000)
  return {
    hour: d.getUTCHours(),
    dateLabel: `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`,
  }
}

/** 直接使用 Open-Meteo 返回的当地时间，生成未来 24 小时横向卡片。 */
export function buildHourly(hourly) {
  if (!hourly || !Array.isArray(hourly.time) || !hourly.time.length) return []
  const times = hourly.time
  const codes = hourly.weather_code || []
  const temps = hourly.temperature_2m || []
  const rains = hourly.precipitation_probability || []
  const isDay = hourly.is_day || []
  const firstDate = String(times[0]).slice(0, 10)
  const out = []
  for (let i = 0; i < times.length && i < 24; i++) {
    const time = String(times[i] || '')
    const kind = kindFromCode(codes[i])
    const hour = time.slice(11, 13)
    const nextDate = time.slice(0, 10)
    const rain = rains[i] == null ? null : Math.max(0, Math.min(100, Math.round(rains[i])))
    out.push({
      time,
      label: i === 0 ? '现在' : nextDate !== firstDate && hour === '00' ? '明天' : `${hour || '--'}时`,
      emoji: kind === 'clear' && isDay[i] === 0 ? '🌙' : KIND_EMOJI[kind],
      kind,
      temp: temps[i] == null ? '—' : Math.round(temps[i]),
      rain,
      rainLabel: rain == null ? '降水 —' : `降水 ${rain}%`,
    })
  }
  return out
}
