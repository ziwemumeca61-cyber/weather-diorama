// Weather data facade. Selects a backend provider (domestic 和风天气 when a key
// is configured, else keyless Open-Meteo) and exposes a stable API to the app.
import { getCurrentPosition } from './native'
import { openMeteoProvider } from './providers/openmeteo'
import { qweatherProvider, hasQWeatherKey } from './providers/qweather'
import type { CurrentWeather, GeoPlace, WeatherProvider } from './types'

export type { CurrentWeather, GeoPlace } from './types'

/**
 * Active provider:
 *  - VITE_WEATHER_PROVIDER='qweather'|'openmeteo' forces a choice;
 *  - otherwise QWeather is used when VITE_QWEATHER_KEY is set, else Open-Meteo.
 * So switching to the domestic source is just setting the key — no code change.
 */
function selectProvider(): WeatherProvider {
  const explicit = (import.meta.env.VITE_WEATHER_PROVIDER as string | undefined)?.trim()
  if (explicit === 'openmeteo') return openMeteoProvider
  if (explicit === 'qweather') return qweatherProvider
  return hasQWeatherKey() ? qweatherProvider : openMeteoProvider
}

export const provider: WeatherProvider = selectProvider()

/** Attribution for the active data source (shown in the corner credit). */
export const weatherCredit = {
  name: provider.creditName,
  url: provider.creditUrl,
  required: provider.creditRequired,
}

/** Look up a place by name. */
export function geocodeCity(query: string): Promise<GeoPlace[]> {
  return provider.geocode(query)
}

/** Fetch current weather for a place. */
export function fetchWeather(place: GeoPlace): Promise<CurrentWeather> {
  return provider.current(place)
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

/** Fetch weather from raw coordinates, labelling it generically. */
export function fetchWeatherByCoords(
  latitude: number,
  longitude: number,
  name = '当前位置',
): Promise<CurrentWeather> {
  const place: GeoPlace = { name, country: '', latitude, longitude, timezone: 'auto' }
  return fetchWeather(place)
}
