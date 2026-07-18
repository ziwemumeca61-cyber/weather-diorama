// Open-Meteo API client — free, keyless, CORS-friendly.
import {
  kindFromWmoCode,
  intensityFromWmoCode,
  type WeatherState,
  type TimeOfDay,
} from '../weather/weatherCode'

export interface GeoPlace {
  name: string
  country: string
  admin1?: string
  latitude: number
  longitude: number
  timezone?: string
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
  }))
}

/**
 * Look up a place by name. County-level Chinese cities are often indexed with
 * an administrative suffix (曲阜 → 曲阜市), so a bare CJK query that comes up
 * empty is retried with 市 / 县 appended.
 */
export async function geocodeCity(query: string): Promise<GeoPlace[]> {
  const first = await geocodeOnce(query)
  if (first.length) return first
  if (/[一-鿿]$/.test(query) && !/[市县区]$/.test(query)) {
    for (const suffix of ['市', '县']) {
      const retry = await geocodeOnce(query + suffix)
      if (retry.length) return retry
    }
  }
  return first
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

/** Ask the browser for the user's coordinates. */
export function geolocate(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('浏览器不支持定位'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 8000 },
    )
  })
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
