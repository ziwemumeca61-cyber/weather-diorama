import * as THREE from 'three'
import type { TimeOfDay } from '../weather/weatherCode'

/**
 * Continuous day/night driver. Instead of snapping the scene to one of three
 * frozen looks, we read the *city's* real local hour and blend smoothly across
 * dawn → day → dusk → night, so a place loaded at 17:30 actually looks like late
 * afternoon and keeps drifting as real time passes.
 *
 * The demo time chips map to representative hours so they reuse the same curve.
 */

export interface Look {
  sky: THREE.Color
  sun: THREE.Color
  sunIntensity: number
  ambient: THREE.Color
  ambientIntensity: number
  sunPos: THREE.Vector3
}

type Phase = 'day' | 'dusk' | 'night'

interface Keyframe {
  sky: THREE.Color
  sun: THREE.Color
  sunIntensity: number
  ambient: THREE.Color
  ambientIntensity: number
  sunPos: THREE.Vector3
}

const KEYFRAMES: Record<Phase, Keyframe> = {
  day: {
    sky: new THREE.Color('#bcd9ec'),
    sun: new THREE.Color('#fff4e2'),
    sunIntensity: 2.4,
    ambient: new THREE.Color('#aecbe6'),
    ambientIntensity: 0.55,
    sunPos: new THREE.Vector3(9, 14, 6),
  },
  dusk: {
    // golden hour — a warm, glowing low sun for both sunrise (朝阳) and
    // sunset (夕阳)
    sky: new THREE.Color('#ff9e5e'),
    sun: new THREE.Color('#ff7a2e'),
    sunIntensity: 2.1,
    ambient: new THREE.Color('#c78a6a'),
    ambientIntensity: 0.55,
    sunPos: new THREE.Vector3(-15, 4, 8),
  },
  night: {
    sky: new THREE.Color('#0c1524'),
    sun: new THREE.Color('#546891'),
    sunIntensity: 0.35,
    ambient: new THREE.Color('#243049'),
    ambientIntensity: 0.4,
    sunPos: new THREE.Vector3(-8, 12, -6),
  },
}

/** Representative hour for each demo-mode time chip. */
export const OVERRIDE_HOUR: Record<TimeOfDay, number> = { day: 12, dusk: 18.3, night: 23 }

/** The city's current local hour (fractional 0..24) from its UTC offset. */
export function localHourNow(utcOffsetSeconds: number | null | undefined): number {
  // No place loaded yet → hold a pleasant midday default rather than the
  // viewer's own clock (which could be the middle of the night).
  if (utcOffsetSeconds == null) return 12
  const localMs = Date.now() + utcOffsetSeconds * 1000
  const h = (localMs / 3_600_000) % 24
  return h < 0 ? h + 24 : h
}

/** Which two keyframes the hour sits between, and how far (0..1). */
function segment(hour: number): [Phase, Phase, number] {
  if (hour < 5) return ['night', 'night', 0]
  if (hour < 7) return ['night', 'dusk', (hour - 5) / 2] // pre-dawn
  if (hour < 9) return ['dusk', 'day', (hour - 7) / 2] // sunrise
  if (hour < 16) return ['day', 'day', 0] // full day
  if (hour < 18.5) return ['day', 'dusk', (hour - 16) / 2.5] // golden hour
  if (hour < 20.5) return ['dusk', 'night', (hour - 18.5) / 2] // sunset
  return ['night', 'night', 0]
}

/** 0 at midday → 1 in deep night, following the same curve as the sky blend. */
export function nightFactorAtHour(hour: number): number {
  const level: Record<Phase, number> = { day: 0, dusk: 0.5, night: 1 }
  const [a, b, t] = segment(hour)
  return THREE.MathUtils.lerp(level[a], level[b], t)
}

/** Blend the base (weather-free) look for an hour into `out` (no allocations). */
export function fillBaseLook(out: Look, hour: number): void {
  const [a, b, t] = segment(hour)
  const ka = KEYFRAMES[a]
  const kb = KEYFRAMES[b]
  out.sky.copy(ka.sky).lerp(kb.sky, t)
  out.sun.copy(ka.sun).lerp(kb.sun, t)
  out.ambient.copy(ka.ambient).lerp(kb.ambient, t)
  out.sunIntensity = THREE.MathUtils.lerp(ka.sunIntensity, kb.sunIntensity, t)
  out.ambientIntensity = THREE.MathUtils.lerp(ka.ambientIntensity, kb.ambientIntensity, t)
  out.sunPos.copy(ka.sunPos).lerp(kb.sunPos, t)
}

export function makeLook(): Look {
  return {
    sky: new THREE.Color('#bcd9ec'),
    sun: new THREE.Color('#fff4e2'),
    sunIntensity: 2.4,
    ambient: new THREE.Color('#aecbe6'),
    ambientIntensity: 0.55,
    sunPos: new THREE.Vector3(9, 14, 6),
  }
}
