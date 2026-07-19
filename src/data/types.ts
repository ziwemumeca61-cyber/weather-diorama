import type { WeatherState } from '../weather/weatherCode'

export interface GeoPlace {
  name: string
  country: string
  admin1?: string
  latitude: number
  longitude: number
  timezone?: string
  /** population, when the geocoder reports it — used to rank matches */
  population?: number
  /** provider place id (QWeather LocationID), when available */
  id?: string
  /** UTC offset string like "+08:00", when the geocoder reports it */
  utcOffset?: string
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

/** A pluggable weather backend (Open-Meteo / QWeather / …). */
export interface WeatherProvider {
  id: 'openmeteo' | 'qweather'
  /** on-screen attribution */
  creditName: string
  creditUrl: string
  /** whether the data licence requires the attribution to always show */
  creditRequired: boolean
  geocode(query: string): Promise<GeoPlace[]>
  current(place: GeoPlace): Promise<CurrentWeather>
}

/** UTC offset like "+08:00" / "-0500" → seconds. */
export function offsetToSeconds(s?: string): number {
  if (!s) return 0
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(s.trim())
  if (!m) return 0
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 3600 + Number(m[3]) * 60)
}

/** Local wall-clock hour + zh date label at a place, from its UTC offset. */
export function localTimeAt(utcOffsetSeconds: number): { hour: number; dateLabelZh: string } {
  const d = new Date(Date.now() + utcOffsetSeconds * 1000)
  return {
    hour: d.getUTCHours(),
    dateLabelZh: `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`,
  }
}

/** Coarse time-of-day bucket from the local hour + is_day flag. */
export function timeOfDayFromHour(hour: number, isDay: boolean): import('../weather/weatherCode').TimeOfDay {
  if (!isDay) return 'night'
  if (hour >= 17 || hour < 7) return 'dusk'
  return 'day'
}
