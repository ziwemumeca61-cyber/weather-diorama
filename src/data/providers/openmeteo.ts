// Open-Meteo backend — free, keyless, CORS-friendly. WMO weather codes.
import { kindFromWmoCode, intensityFromWmoCode, type WeatherState } from '../../weather/weatherCode'
import {
  timeOfDayFromHour,
  type CurrentWeather,
  type GeoPlace,
  type WeatherProvider,
} from '../types'

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

async function geocodeOnce(query: string): Promise<GeoPlace[]> {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=6&language=zh&format=json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`geocode failed: ${res.status}`)
  const data = await res.json()
  const results = (data?.results ?? []) as any[]
  return results.map((r) => ({
    name: r.name,
    country: r.country ?? '',
    admin1: r.admin1,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
    population: typeof r.population === 'number' ? r.population : undefined,
  }))
}

function dedupePlaces(...lists: GeoPlace[][]): GeoPlace[] {
  const seen = new Set<string>()
  const out: GeoPlace[] = []
  for (const list of lists)
    for (const p of list) {
      const key = `${p.latitude.toFixed(2)},${p.longitude.toFixed(2)}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(p)
    }
  return out
}

/**
 * Chinese prefecture cities are indexed inconsistently: some resolve bare
 * (临沂), others only with a 市 suffix (枣庄市), and a bare query can surface a
 * tiny same-named village in another province first (枣庄 → 河南 枣庄村 before
 * 山东 枣庄市). So for a bare CJK query we fetch the 市 variant too, merge, and
 * rank by population — the prefecture city carries population the village lacks.
 */
async function geocode(query: string): Promise<GeoPlace[]> {
  const bareCjk = /[一-鿿]$/.test(query) && !/[市县区]$/.test(query)
  const [bare, city] = await Promise.all([
    geocodeOnce(query).catch(() => [] as GeoPlace[]),
    bareCjk ? geocodeOnce(query + '市').catch(() => [] as GeoPlace[]) : Promise.resolve([]),
  ])
  const merged = dedupePlaces(city, bare).sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
  if (merged.length) return merged
  if (bareCjk) {
    const county = await geocodeOnce(query + '县').catch(() => [] as GeoPlace[])
    if (county.length) return county
  }
  return merged
}

async function current(place: GeoPlace): Promise<CurrentWeather> {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: 'temperature_2m,weather_code,is_day',
    timezone: place.timezone || 'auto',
  })
  const res = await fetch(`${FORECAST_URL}?${params.toString()}`)
  if (!res.ok) throw new Error(`forecast failed: ${res.status}`)
  const data = await res.json()
  const cur = data.current
  const code = Number(cur.weather_code)
  const isDay = Number(cur.is_day) === 1
  const utcOffsetSeconds = Number(data.utc_offset_seconds ?? 0)
  const localDate = new Date(cur.time)
  const localHour = localDate.getHours()

  const weather: WeatherState = {
    kind: kindFromWmoCode(code, isDay),
    timeOfDay: timeOfDayFromHour(localHour, isDay),
    intensity: intensityFromWmoCode(code),
  }
  return {
    place,
    temperature: Math.round(Number(cur.temperature_2m)),
    weatherCode: code,
    isDay,
    utcOffsetSeconds,
    dateLabelZh: `${localDate.getMonth() + 1}月${localDate.getDate()}日`,
    weather,
  }
}

export const openMeteoProvider: WeatherProvider = {
  id: 'openmeteo',
  creditName: '© Open-Meteo',
  creditUrl: 'https://open-meteo.com/',
  creditRequired: true,
  geocode,
  current,
}
