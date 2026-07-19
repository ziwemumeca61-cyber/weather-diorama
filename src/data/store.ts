import { create } from 'zustand'
import type { CurrentWeather, GeoPlace } from './api'
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

const RECENTS_KEY = 'weather-diorama.recents'
const RECENTS_MAX = 6

// Privacy consent (PIPL): the app must not collect anything until the user
// agrees on first launch. Bump the version to re-prompt if the policy changes.
const CONSENT_KEY = 'weather-diorama.consent.v1'

function loadConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === '1'
  } catch {
    return false
  }
}

function saveConsent() {
  try {
    localStorage.setItem(CONSENT_KEY, '1')
  } catch {
    /* ignore */
  }
}

function loadRecents(): GeoPlace[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY)
    if (raw) return JSON.parse(raw) as GeoPlace[]
  } catch {
    /* ignore */
  }
  return []
}

function saveRecents(recents: GeoPlace[]) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents))
  } catch {
    /* ignore */
  }
}

/** Same place if name + country + admin1 line up (coords may jitter). */
function samePlace(a: GeoPlace, b: GeoPlace): boolean {
  return a.name === b.name && a.country === b.country && a.admin1 === b.admin1
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

  /** Recently viewed places (most-recent first), persisted for quick recall. */
  recents: GeoPlace[]

  /** Whether the user has accepted the privacy policy (gates all data use). */
  consented: boolean

  /** The effective weather driving the scene (live merged with overrides). */
  effectiveWeather: () => WeatherState

  setLoading: () => void
  setError: (msg: string) => void
  setCurrent: (c: CurrentWeather) => void
  setOverrideKind: (k: WeatherKind | null) => void
  setOverrideTime: (t: TimeOfDay | null) => void
  clearOverrides: () => void
  setAvatar: (patch: Partial<Appearance>) => void
  addRecent: (place: GeoPlace) => void
  grantConsent: () => void
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

/**
 * Reactive inputs for the continuous day/night clock: the demo-mode time
 * override (locks the hour when set) and the loaded city's UTC offset (drives
 * real local time when no override is active).
 */
export function useClockInputs(): { overrideTime: TimeOfDay | null; utcOffset: number | null } {
  const overrideTime = useStore((s) => s.overrideTime)
  const utcOffset = useStore((s) => s.current?.utcOffsetSeconds ?? null)
  return { overrideTime, utcOffset }
}

export const useStore = create<AppState>((set, get) => ({
  status: 'idle',
  error: null,
  current: null,
  overrideKind: null,
  overrideTime: null,
  avatar: loadAvatar(),
  recents: loadRecents(),
  consented: loadConsent(),

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
  addRecent: (place) =>
    set((s) => {
      const recents = [place, ...s.recents.filter((p) => !samePlace(p, place))].slice(
        0,
        RECENTS_MAX,
      )
      saveRecents(recents)
      return { recents }
    }),
  grantConsent: () => {
    saveConsent()
    set({ consented: true })
  },
}))
