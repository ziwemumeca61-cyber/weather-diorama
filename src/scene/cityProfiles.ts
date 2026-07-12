import type { ComponentType } from 'react'
import { useMemo } from 'react'
import ShanghaiLandmarks from './landmarks/Shanghai'
import BeijingLandmarks from './landmarks/Beijing'
import { useStore } from '../data/store'
import type { ClearZone, CalmZone } from './cityData'
import type { GltfModelSpec } from './landmarks/GltfLandmark'

export interface CityProfile {
  id: string
  /** patterns matched (case-insensitively) against the geocoded place name */
  match: RegExp
  /** procedural landmark ensemble (used when `models` is absent, and as the
   *  fallback if a GLB fails to load) */
  Landmarks?: ComponentType
  /** GLB model landmarks — take priority over the procedural set when present */
  models?: GltfModelSpec[]
  /** optional on-screen asset credit (e.g. CC-BY attribution) */
  credit?: string
  /** footprints kept free of generated buildings for the landmark set */
  clearZones: ClearZone[]
  /** areas where generated buildings are height-capped so landmarks read clearly */
  calmZones?: CalmZone[]
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
      { x: -1.5, z: -2, r: 3.1 }, // 祈年殿 Temple of Heaven
      { x: 1.9, z: 2.6, r: 3.3 }, // 天安门 Tiananmen (incl. flanking walls)
      { x: -5.3, z: -5.2, r: 1.6 }, // 中国尊 CITIC Tower
      { x: 4.1, z: -4.6, r: 2.5 }, // 央视大楼 CCTV loop
    ],
    calmZones: [
      { x: -1.5, z: -2, r: 5.2, maxHeight: 2.0 }, // low-rise ring around the Temple
      { x: 1.9, z: 2.6, r: 4.4, maxHeight: 1.6 }, // open sightline to Tiananmen
      { x: 4.1, z: -4.6, r: 3.6, maxHeight: 3.0 }, // CCTV silhouette breathing room
    ],
  },
  {
    // GLB demo: the whole Littlest Tokyo model as a drop-in landmark, proving
    // the .glb pipeline (self-hosted Draco, animation, error fallback).
    id: 'tokyo',
    match: /東京|东京|tokyo/i,
    models: [
      { url: 'models/littlest-tokyo.glb', position: [-1.0, 0.02, -1.5], scale: 0.02, rotationY: 0.5 },
    ],
    credit: 'Littlest Tokyo · Glen Fox · CC-BY 4.0',
    clearZones: [{ x: -1.0, z: -1.5, r: 5.8 }],
    calmZones: [{ x: -1.0, z: -1.5, r: 8.5, maxHeight: 1.7 }],
  },
  {
    id: 'shanghai',
    match: /上海|shanghai/i,
    Landmarks: ShanghaiLandmarks,
    clearZones: [
      { x: -1.5, z: -2, r: 1.5 }, // 东方明珠 Oriental Pearl
      { x: -3.6, z: -3.4, r: 1.2 }, // 上海中心 Shanghai Tower
      { x: -1.7, z: -4.9, r: 1.1 }, // 金茂大厦 Jin Mao
      { x: 0.5, z: -4.1, r: 1.2 }, // 环球金融中心 SWFC
    ],
    calmZones: [
      { x: -1.5, z: -3.5, r: 3.6, maxHeight: 3.2 }, // keep the Lujiazui cluster readable
    ],
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
