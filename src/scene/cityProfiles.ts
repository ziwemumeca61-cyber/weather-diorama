import type { ComponentType } from 'react'
import { lazy, useMemo } from 'react'
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

// Each city's landmark ensemble is code-split into its own chunk and only
// fetched when that city loads. Landmark.tsx already renders these inside a
// <Suspense>, so lazy components suspend cleanly during the swap.
const ShanghaiLandmarks = lazy(() => import('./landmarks/Shanghai'))
const BeijingLandmarks = lazy(() => import('./landmarks/Beijing'))
const GuangzhouLandmarks = lazy(() => import('./landmarks/Guangzhou'))
const XianLandmarks = lazy(() => import('./landmarks/Xian'))
const HangzhouLandmarks = lazy(() => import('./landmarks/Hangzhou'))
const ChongqingLandmarks = lazy(() => import('./landmarks/Chongqing'))
const TianjinLandmarks = lazy(() => import('./landmarks/Tianjin'))
const Cc0Downtown = lazy(() => import('./landmarks/Cc0Downtown'))

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
      { x: -3.8, z: 1.4, r: 3.0 }, // 祈年殿 Temple of Heaven (front-left)
      { x: 3.9, z: 1.6, r: 3.2 }, // 天安门 Tiananmen (front-right, incl. flanking walls)
      { x: -5.3, z: -5.2, r: 1.6 }, // 中国尊 CITIC Tower (back-left)
      { x: 4.1, z: -4.6, r: 2.5 }, // 央视大楼 CCTV loop (back-right)
    ],
    calmZones: [
      { x: -3.8, z: 1.4, r: 4.6, maxHeight: 2.0 }, // low-rise ring around the Temple
      { x: 3.9, z: 1.6, r: 4.4, maxHeight: 1.6 }, // open sightline to Tiananmen
      { x: 4.1, z: -4.6, r: 3.6, maxHeight: 3.0 }, // CCTV silhouette breathing room
    ],
  },
  {
    id: 'guangzhou',
    match: /广州|guangzhou|canton/i,
    Landmarks: GuangzhouLandmarks,
    clearZones: [
      { x: -1.5, z: -2.5, r: 2.0 }, // 广州塔 Canton Tower
      { x: 3.2, z: -4.0, r: 1.2 }, // companion tower
    ],
    calmZones: [{ x: -1.5, z: -2.5, r: 5.5, maxHeight: 3.0 }],
  },
  {
    id: 'xian',
    match: /西安|xi'?an|xian/i,
    Landmarks: XianLandmarks,
    clearZones: [
      { x: -3.4, z: 0.8, r: 2.6 }, // 大雁塔 Wild Goose Pagoda
      { x: 3.6, z: -0.4, r: 2.2 }, // 钟楼 Bell Tower
    ],
    calmZones: [
      { x: -3.4, z: 0.8, r: 4.8, maxHeight: 2.2 },
      { x: 3.6, z: -0.4, r: 4.2, maxHeight: 2.2 },
    ],
  },
  {
    id: 'hangzhou',
    match: /杭州|hangzhou/i,
    Landmarks: HangzhouLandmarks,
    clearZones: [{ x: -1.0, z: -1.6, r: 3.6 }], // 雷峰塔 Leifeng Pagoda + hill
    calmZones: [{ x: -1.0, z: -1.6, r: 6.0, maxHeight: 2.2 }],
  },
  {
    id: 'chongqing',
    match: /重庆|chongqing/i,
    Landmarks: ChongqingLandmarks,
    clearZones: [{ x: 0, z: -3.2, r: 4.6 }], // 来福士 Raffles City cluster
    calmZones: [{ x: 0, z: -3.2, r: 7.5, maxHeight: 3.2 }],
  },
  {
    id: 'tianjin',
    match: /天津|tianjin/i,
    Landmarks: TianjinLandmarks,
    clearZones: [{ x: 0, z: 2.2, r: 5.0 }], // 天津之眼 Ferris wheel over the river
    calmZones: [{ x: 0, z: 0, r: 6.5, maxHeight: 2.6 }],
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
      { x: -3.7, z: -1.2, r: 2.2 }, // 东方明珠 Oriental Pearl (riverside, alone)
      { x: 1.7, z: -5.1, r: 1.6 }, // 上海中心 Shanghai Tower
      { x: -0.1, z: -4.2, r: 1.4 }, // 金茂大厦 Jin Mao
      { x: 2.9, z: -3.7, r: 1.4 }, // 环球金融中心 SWFC
    ],
    calmZones: [
      { x: 0.8, z: -4.3, r: 5.6, maxHeight: 3.2 }, // keep the Lujiazui trio dominant
      { x: -3.7, z: -1.2, r: 3.0, maxHeight: 2.0 }, // open sightline to the Pearl
    ],
  },
  {
    // Fallback for any city without a bespoke set: a modeled downtown built
    // from Kenney's CC0 City Kit (real .glb buildings, no attribution needed).
    id: 'generic',
    match: /__never_matches_by_name__/,
    Landmarks: Cc0Downtown,
    clearZones: [{ x: -0.5, z: -2, r: 5.6 }],
    calmZones: [{ x: -0.5, z: -2, r: 8.5, maxHeight: 2.2 }],
  },
]

/** Default profile for cities without a bespoke landmark set: the CC0 downtown. */
export const DEFAULT_PROFILE = CITY_PROFILES.find((p) => p.id === 'generic')!

export function profileForCity(name: string | undefined): CityProfile {
  if (!name) return DEFAULT_PROFILE
  return CITY_PROFILES.find((p) => p.match.test(name)) ?? DEFAULT_PROFILE
}

/** Reactive hook: the city profile for the currently loaded place. */
export function useCityProfile(): CityProfile {
  const name = useStore((s) => s.current?.place.name)
  return useMemo(() => profileForCity(name), [name])
}
