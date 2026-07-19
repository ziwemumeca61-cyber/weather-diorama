// Open-Meteo API client — free, keyless, CORS-friendly.
import {
  kindFromWmoCode,
  intensityFromWmoCode,
  type WeatherState,
  type TimeOfDay,
} from '../weather/weatherCode'
import { getCurrentPosition } from './native'

export interface GeoPlace {
  name: string
  country: string
  admin1?: string
  latitude: number
  longitude: number
  timezone?: string
  /** population, when the geocoder reports it — used to rank matches */
  population?: number
}

export interface CurrentWeather {
  place: GeoPlace
  temperature: number
  weatherCode: number
  isDay: boolean
  /** seconds to add to UTC to get the place's local time (drives live day/night) */
  utcOffsetSeconds: number
  /** local date string of the place, e.g. 12月25日 */
  dateLabelZh: string
  weather: WeatherState
}

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

/** Merge result lists, drop near-duplicate coordinates, keep first-seen order. */
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
 * Look up a place by name. Chinese prefecture cities are indexed inconsistently:
 * some resolve bare (临沂), others only with a 市 suffix (枣庄市), and a bare
 * query can even surface a tiny same-named village in another province ahead of
 * the real city (枣庄 → 河南 枣庄村 before 山东 枣庄市). So for a bare CJK query
 * we fetch the 市 variant too, merge both, and rank by population — the
 * prefecture-level city carries real population data that the villages lack.
 */
export async function geocodeCity(query: string): Promise<GeoPlace[]> {
  const bareCjk = /[一-鿿]$/.test(query) && !/[市县区]$/.test(query)
  const [bare, city] = await Promise.all([
    geocodeOnce(query).catch(() => [] as GeoPlace[]),
    bareCjk ? geocodeOnce(query + '市').catch(() => [] as GeoPlace[]) : Promise.resolve([]),
  ])
  const merged = dedupePlaces(city, bare).sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
  if (merged.length) return merged
  // nothing matched — last resort, try the 县 (county) suffix
  if (bareCjk) {
    const county = await geocodeOnce(query + '县').catch(() => [] as GeoPlace[])
    if (county.length) return county
  }
  return merged
}

/** Derive a coarse time-of-day bucket from the local hour + is_day flag. */
function timeOfDayFromHour(hour: number, isDay: boolean): TimeOfDay {
  if (!isDay) return 'night'
  if (hour >= 17 || hour < 7) return 'dusk'
  return 'day'
}

function formatDateZh(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

/** Fetch current weather for a place. */
export async function fetchWeather(place: GeoPlace): Promise<CurrentWeather> {
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

  // local time from the API's ISO string (already in place timezone)
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
    dateLabelZh: formatDateZh(localDate),
    weather,
  }
}

/** Convenience: geocode then fetch weather for the top match. */
export async function fetchWeatherByCity(query: string): Promise<CurrentWeather> {
  const places = await geocodeCity(query)
  if (!places.length) throw new Error('未找到该城市')
  return fetchWeather(places[0])
}

/**
 * Ask for the user's coordinates. Routes through the native helper so it uses
 * the Capacitor Geolocation plugin (real permission prompt) inside the APK and
 * the browser Geolocation API on the web.
 */
export function geolocate(): Promise<{ latitude: number; longitude: number }> {
  return getCurrentPosition()
}

/** Reverse-geocode-ish: fetch weather from raw coords, labelling it generically. */
export async function fetchWeatherByCoords(
  latitude: number,
  longitude: number,
  name = '当前位置',
): Promise<CurrentWeather> {
  const place: GeoPlace = { name, country: '', latitude, longitude, timezone: 'auto' }
  return fetchWeather(place)
}
