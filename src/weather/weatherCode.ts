// Open-Meteo uses WMO weather interpretation codes.
// https://open-meteo.com/en/docs
// We collapse them into a small set of visual weather "moods" that drive the scene.

export type WeatherKind =
  | 'clear'
  | 'cloudy'
  | 'overcast'
  | 'fog'
  | 'rain'
  | 'snow'
  | 'thunder'

export type TimeOfDay = 'day' | 'dusk' | 'night'

export interface WeatherState {
  kind: WeatherKind
  timeOfDay: TimeOfDay
  /** rough visual intensity 0..1, used by particle effects */
  intensity: number
}

const KIND_LABEL_ZH: Record<WeatherKind, string> = {
  clear: '晴',
  cloudy: '多云',
  overcast: '阴',
  fog: '雾',
  rain: '雨',
  snow: '雪',
  thunder: '雷阵雨',
}

const KIND_EMOJI: Record<WeatherKind, string> = {
  clear: '☀️',
  cloudy: '⛅',
  overcast: '☁️',
  fog: '🌫️',
  rain: '🌧️',
  snow: '❄️',
  thunder: '⛈️',
}

export function labelForKind(kind: WeatherKind): string {
  return KIND_LABEL_ZH[kind]
}

export function emojiForKind(kind: WeatherKind, timeOfDay: TimeOfDay): string {
  if (kind === 'clear' && timeOfDay === 'night') return '🌙'
  return KIND_EMOJI[kind]
}

/** Map a raw WMO weather_code + is_day flag to our internal weather kind. */
export function kindFromWmoCode(code: number, isDay: boolean): WeatherKind {
  // 0 clear, 1 mainly clear, 2 partly cloudy, 3 overcast
  if (code === 0 || code === 1) return 'clear'
  if (code === 2) return 'cloudy'
  if (code === 3) return 'overcast'
  // 45,48 fog
  if (code === 45 || code === 48) return 'fog'
  // 51-57 drizzle, 61-67 rain, 80-82 rain showers
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  // 71-77 snow, 85-86 snow showers
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  // 95,96,99 thunderstorm
  if (code >= 95) return 'thunder'
  void isDay
  return 'cloudy'
}

/** Rough intensity from the WMO code so heavier codes rain/snow harder. */
export function intensityFromWmoCode(code: number): number {
  // higher tens-digit within a family tends to mean heavier
  const heavyRain = [65, 67, 82, 63, 81].includes(code)
  const heavySnow = [75, 86].includes(code)
  if (heavyRain || heavySnow || code >= 96) return 1
  if ([61, 80, 71, 85, 95, 51, 53].includes(code)) return 0.55
  return 0.75
}
