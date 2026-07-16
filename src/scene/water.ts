import { CITY } from './cityData'

/**
 * Per-city water configuration. Every profile may declare what water (if any)
 * its diorama has; the base tray adapts: ground plane, block-grid extent,
 * boats and the truss bridge all derive from the resolved spec.
 */
export type WaterSpec =
  | {
      kind: 'river'
      /** where the river band starts (toward +z, up to the tray edge) */
      z0?: number
      /** show little boats (default true; disable for narrow moats) */
      boats?: boolean
      /** show the truss bridge (default true) */
      bridge?: boolean
    }
  | {
      kind: 'lake'
      x: number
      z: number
      rx: number
      rz: number
    }
  | { kind: 'none' }

export interface ResolvedWater {
  spec: WaterSpec
  /** river-band start; null when there is no band (lake / none) */
  riverZ0: number | null
  /** where buildable land ends (ground plane + snow cover extent) */
  groundZ1: number
  /** last block-grid row allowed (buildings stop short of the water) */
  cityMaxZ: number
  boats: boolean
  bridge: boolean
  lake: { x: number; z: number; rx: number; rz: number } | null
}

export const DEFAULT_WATER: WaterSpec = { kind: 'river', z0: CITY.riverZ }

/** How far land may extend when no river band claims the +z strip. */
const LAND_Z1 = 9.2
/** Furthest block row we ever place (keeps a quay in front of any water). */
const MAX_BLOCK_Z = 8.2

export function resolveWater(spec: WaterSpec = DEFAULT_WATER): ResolvedWater {
  if (spec.kind === 'river') {
    const z0 = spec.z0 ?? CITY.riverZ
    return {
      spec,
      riverZ0: z0,
      groundZ1: z0,
      cityMaxZ: Math.min(MAX_BLOCK_Z, z0 - 0.9),
      // three boat lanes need ~3 units of water; narrow moats go boatless
      boats: (spec.boats ?? true) && CITY.trayHalf - z0 > 2.9,
      bridge: spec.bridge ?? true,
      lake: null,
    }
  }
  if (spec.kind === 'lake') {
    return {
      spec,
      riverZ0: null,
      groundZ1: LAND_Z1,
      cityMaxZ: MAX_BLOCK_Z,
      boats: false,
      bridge: false,
      lake: { x: spec.x, z: spec.z, rx: spec.rx, rz: spec.rz },
    }
  }
  return {
    spec,
    riverZ0: null,
    groundZ1: LAND_Z1,
    cityMaxZ: MAX_BLOCK_Z,
    boats: false,
    bridge: false,
    lake: null,
  }
}

/** Is a ground point inside the lake footprint (with a small margin)? */
export function inLake(w: ResolvedWater, x: number, z: number, margin = 0.3): boolean {
  if (!w.lake) return false
  const dx = (x - w.lake.x) / (w.lake.rx + margin)
  const dz = (z - w.lake.z) / (w.lake.rz + margin)
  return dx * dx + dz * dz < 1
}

/** Does a ground path a→b wade through the lake? (sampled along the segment) */
export function pathCrossesLake(
  w: ResolvedWater,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  margin = 0.3,
): boolean {
  if (!w.lake) return false
  for (let i = 0; i <= 24; i++) {
    const t = i / 24
    if (inLake(w, ax + (bx - ax) * t, az + (bz - az) * t, margin)) return true
  }
  return false
}
