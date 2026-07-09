import { create } from 'zustand'
import type { CurrentWeather } from './api'
import type { WeatherKind, WeatherState, TimeOfDay } from '../weather/weatherCode'

type Status = 'idle' | 'loading' | 'ready' | 'error'

/** Look of the user's customizable chibi character (and defaults for NPCs). */
export interface Appearance {
  skin: string
  hair: string
  shirt: string
  pants: string
  umbrella: string
  hat: boolean
  hatColor: string
}

export const DEFAULT_AVATAR: Appearance = {
  skin: '#f2c9a0',
  hair: '#3a2a1a',
  shirt: '#4f8fe0',
  pants: '#33384a',
  umbrella: '#e0574f',
  hat: false,
  hatColor: '#e0574f',
}

const AVATAR_KEY = 'weather-diorama.avatar'

function loadAvatar(): Appearance {
  try {
    const raw = localStorage.getItem(AVATAR_KEY)
    if (raw) return { ...DEFAULT_AVATAR, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return DEFAULT_AVATAR
}

function saveAvatar(avatar: Appearance) {
  try {
    localStorage.setItem(AVATAR_KEY, JSON.stringify(avatar))
  } catch {
    /* ignore */
  }
}

interface AppState {
  status: Status
  error: string | null
  current: CurrentWeather | null

  /** Manual overrides (demo mode). When set, they win over live data. */
  overrideKind: WeatherKind | null
  overrideTime: TimeOfDay | null

  /** The user's customizable hero character appearance. */
  avatar: Appearance

  /** The effective weather driving the scene (live merged with overrides). */
  effectiveWeather: () => WeatherState

  setLoading: () => void
  setError: (msg: string) => void
  setCurrent: (c: CurrentWeather) => void
  setOverrideKind: (k: WeatherKind | null) => void
  setOverrideTime: (t: TimeOfDay | null) => void
  clearOverrides: () => void
  setAvatar: (patch: Partial<Appearance>) => void
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
  avatar: loadAvatar(),

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
  setAvatar: (patch) =>
    set((s) => {
      const avatar = { ...s.avatar, ...patch }
      saveAvatar(avatar)
      return { avatar }
    }),
}))
