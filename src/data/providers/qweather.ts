// 和风天气 (QWeather) backend — domestic source for China. Requires a free
// developer key from https://dev.qweather.com and (for new accounts) a
// dedicated API host. Config via Vite env:
//   VITE_QWEATHER_KEY       your key
//   VITE_QWEATHER_HOST      weather host (default https://devapi.qweather.com)
//   VITE_QWEATHER_GEO_HOST  geo host     (default https://geoapi.qweather.com)
// New QWeather accounts get one host like https://xxxx.qweatherapi.com — set
// both HOST and GEO_HOST to it.
import type { WeatherKind, WeatherState } from '../../weather/weatherCode'
import {
  localTimeAt,
  offsetToSeconds,
  timeOfDayFromHour,
  type CurrentWeather,
  type GeoPlace,
  type WeatherProvider,
} from '../types'

const KEY = (import.meta.env.VITE_QWEATHER_KEY as string | undefined) ?? ''
const HOST = (
  (import.meta.env.VITE_QWEATHER_HOST as string | undefined) ?? 'https://devapi.qweather.com'
).replace(/\/$/, '')
const GEO_HOST = (
  (import.meta.env.VITE_QWEATHER_GEO_HOST as string | undefined) ?? 'https://geoapi.qweather.com'
).replace(/\/$/, '')

/** Whether a QWeather key is configured (drives provider auto-selection). */
export function hasQWeatherKey(): boolean {
  return KEY.trim().length > 0
}

/** Map a QWeather icon code to our internal weather kind. */
export function kindFromQwIcon(code: number): WeatherKind {
  if (code === 302 || code === 303 || code === 304) return 'thunder' // 雷阵雨系列
  if (code >= 300 && code <= 399) return 'rain' // 雨
  if (code >= 400 && code <= 499) return 'snow' // 雪
  if (code >= 500 && code <= 515) return 'fog' // 雾/霾/沙尘
  if (code === 100 || code === 150) return 'clear' // 晴（昼/夜）
  if (code === 104 || code === 154) return 'overcast' // 阴
  if ((code >= 101 && code <= 103) || (code >= 151 && code <= 153)) return 'cloudy' // 多云
  return 'cloudy'
}

/** Rough particle intensity from a QWeather icon code. */
export function intensityFromQwIcon(code: number): number {
  const heavy = [308, 309, 310, 311, 312, 313, 317, 318, 304, 404, 405, 406, 410]
  const light = [300, 305, 306, 350, 351, 399, 400, 401, 407, 408, 457, 456]
  if (heavy.includes(code)) return 1
  if (light.includes(code)) return 0.55
  return 0.75
}

async function qwFetch(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`qweather ${res.status}`)
  const data = await res.json()
  if (data.code && data.code !== '200') throw new Error(`qweather code ${data.code}`)
  return data
}

async function geocode(query: string): Promise<GeoPlace[]> {
  const url = `${GEO_HOST}/geo/v2/city/lookup?location=${encodeURIComponent(query)}&key=${KEY}&lang=zh&number=8`
  const data = await qwFetch(url).catch(() => null)
  const list = (data?.location ?? []) as any[]
  return list.map((r) => ({
    name: r.name,
    country: r.country ?? '',
    admin1: r.adm1,
    latitude: Number(r.lat),
    longitude: Number(r.lon),
    timezone: r.tz,
    id: r.id,
    utcOffset: r.utcOffset,
    // QWeather ranks by relevance already; keep order via a descending rank
    population: undefined,
  }))
}

async function current(place: GeoPlace): Promise<CurrentWeather> {
  // Prefer the precise LocationID; fall back to "lon,lat".
  const loc = place.id ?? `${place.longitude.toFixed(4)},${place.latitude.toFixed(4)}`
  const data = await qwFetch(
    `${HOST}/v7/weather/now?location=${encodeURIComponent(loc)}&key=${KEY}&lang=zh`,
  )
  const now = data.now ?? {}
  const iconCode = Number(now.icon)

  // day/night from the place's local hour (QWeather offset if known, else obsTime)
  const utcOffsetSeconds = place.utcOffset
    ? offsetToSeconds(place.utcOffset)
    : offsetToSeconds(String(now.obsTime).slice(-6))
  const { hour, dateLabelZh } = localTimeAt(utcOffsetSeconds)
  const isDay = hour >= 6 && hour < 18

  const kind = kindFromQwIcon(iconCode)
  const weather: WeatherState = {
    kind,
    timeOfDay: timeOfDayFromHour(hour, isDay),
    intensity: intensityFromQwIcon(iconCode),
  }
  return {
    place,
    temperature: Math.round(Number(now.temp)),
    weatherCode: iconCode,
    isDay,
    utcOffsetSeconds,
    dateLabelZh,
    weather,
  }
}

export const qweatherProvider: WeatherProvider = {
  id: 'qweather',
  creditName: '和风天气',
  creditUrl: 'https://www.qweather.com/',
  creditRequired: true,
  geocode,
  current,
}
