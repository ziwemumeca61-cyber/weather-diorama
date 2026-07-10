import type { ComponentType } from 'react'
import { useMemo } from 'react'
import ShanghaiLandmarks from './landmarks/Shanghai'
import BeijingLandmarks from './landmarks/Beijing'
import { useStore } from '../data/store'
import type { ClearZone } from './cityData'

export interface CityProfile {
  id: string
  /** patterns matched (case-insensitively) against the geocoded place name */
  match: RegExp
  Landmarks: ComponentType
  /** footprints kept free of generated buildings for the landmark set */
  clearZones: ClearZone[]
}

/**
 * Registry of city dioramas. Add an entry per city: a landmark ensemble
 * component plus the ground it needs. The first matching profile wins;
 * unlisted cities fall back to the generic (Shanghai-style) skyline.
 */
export const CITY_PROFILES: CityProfile[] = [
  {
    id: 'beijing',
    match: /北京|beijing/i,
    Landmarks: BeijingLandmarks,
    clearZones: [
      { x: -1.5, z: -2, r: 2.3 }, // 祈年殿 Temple of Heaven
      { x: 1.9, z: 2.6, r: 2.0 }, // 天安门 Tiananmen
      { x: -5.3, z: -5.2, r: 1.3 }, // 中国尊 CITIC Tower
      { x: 4.3, z: -5.1, r: 2.0 }, // 央视大楼 CCTV loop
    ],
  },
  {
    id: 'shanghai',
    match: /上海|shanghai/i,
    Landmarks: ShanghaiLandmarks,
    clearZones: [{ x: -1.5, z: -2, r: 1.5 }],
  },
]

/** Default profile for cities without a bespoke landmark set (yet). */
export const DEFAULT_PROFILE = CITY_PROFILES[CITY_PROFILES.length - 1]

export function profileForCity(name: string | undefined): CityProfile {
  if (!name) return DEFAULT_PROFILE
  return CITY_PROFILES.find((p) => p.match.test(name)) ?? DEFAULT_PROFILE
}

/** Reactive hook: the city profile for the currently loaded place. */
export function useCityProfile(): CityProfile {
  const name = useStore((s) => s.current?.place.name)
  return useMemo(() => profileForCity(name), [name])
}
