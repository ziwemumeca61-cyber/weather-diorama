import { create } from 'zustand'
import type { CurrentWeather } from './api'
import type { WeatherKind, WeatherState, TimeOfDay } from '../weather/weatherCode'

type Status = 'idle' | 'loading' | 'ready' | 'error'

interface AppState {
  status: Status
  error: string | null
  current: CurrentWeather | null

  /** Manual overrides (demo mode). When set, they win over live data. */
  overrideKind: WeatherKind | null
  overrideTime: TimeOfDay | null

  /** The effective weather driving the scene (live merged with overrides). */
  effectiveWeather: () => WeatherState

  setLoading: () => void
  setError: (msg: string) => void
  setCurrent: (c: CurrentWeather) => void
  setOverrideKind: (k: WeatherKind | null) => void
  setOverrideTime: (t: TimeOfDay | null) => void
  clearOverrides: () => void
}

const DEFAULT_WEATHER: WeatherState = {
  kind: 'clear',
  timeOfDay: 'day',
  intensity: 0.7,
}

/**
 * Reactive hook that returns the effective weather driving the scene,
 * selecting primitives individually so components only re-render when
 * a value they care about actually changes.
 */
export function useEffectiveWeather(): WeatherState {
  const kind = useStore((s) => s.overrideKind ?? s.current?.weather.kind ?? DEFAULT_WEATHER.kind)
  const timeOfDay = useStore(
    (s) => s.overrideTime ?? s.current?.weather.timeOfDay ?? DEFAULT_WEATHER.timeOfDay,
  )
  const intensity = useStore((s) => s.current?.weather.intensity ?? DEFAULT_WEATHER.intensity)
  return { kind, timeOfDay, intensity }
}

export const useStore = create<AppState>((set, get) => ({
  status: 'idle',
  error: null,
  current: null,
  overrideKind: null,
  overrideTime: null,

  effectiveWeather: () => {
    const s = get()
    const base = s.current?.weather ?? DEFAULT_WEATHER
    return {
      kind: s.overrideKind ?? base.kind,
      timeOfDay: s.overrideTime ?? base.timeOfDay,
      intensity: base.intensity,
    }
  },

  setLoading: () => set({ status: 'loading', error: null }),
  setError: (msg) => set({ status: 'error', error: msg }),
  setCurrent: (c) => set({ status: 'ready', current: c, error: null }),
  setOverrideKind: (k) => set({ overrideKind: k }),
  setOverrideTime: (t) => set({ overrideTime: t }),
  clearOverrides: () => set({ overrideKind: null, overrideTime: null }),
}))
