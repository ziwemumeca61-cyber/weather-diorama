// Deterministic procedural layout for the miniature city.
// Everything is seeded so the skyline is stable across reloads.

import * as THREE from 'three'

export interface BuildingInstance {
  position: [number, number, number]
  size: [number, number, number] // width, height, depth
  color: THREE.Color
  /** 0..1 how "downtown" — taller, glassier towers near the core */
  coreness: number
}

// mulberry32 — tiny deterministic PRNG
function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// City footprint (tray-local). River occupies the +z strip.
export const CITY = {
  minX: -9,
  maxX: 9,
  minZ: -9,
  maxZ: 4,
  riverZ: 4.4, // river starts here toward +z
  trayHalf: 10.5,
  landmark: new THREE.Vector3(-1.5, 0, -2), // downtown core focus
}

// Warm/cool low-poly building palette (like the reference diorama).
const PALETTE = [
  '#c9d3dd',
  '#b7c2cf',
  '#d8cdbf',
  '#e3d8c8',
  '#a9b6c4',
  '#cbb8a6',
  '#9fb0bd',
  '#d5c3b0',
  '#8fa0af',
  '#e6ddd0',
]
const CORE_PALETTE = ['#8ea6bd', '#7f97b4', '#9fb8cf', '#aebfce', '#c0cad6']

export interface ClearZone {
  x: number
  z: number
  r: number
}

const DEFAULT_CLEAR_ZONES: ClearZone[] = [{ x: CITY.landmark.x, z: CITY.landmark.z, r: 1.5 }]

export function generateCity(
  seed = 20251225,
  clearZones: ClearZone[] = DEFAULT_CLEAR_ZONES,
): BuildingInstance[] {
  const rand = mulberry32(seed)
  const buildings: BuildingInstance[] = []

  const step = 1.55
  const roadEvery = 4 // every Nth grid line is a street

  let ix = 0
  for (let x = CITY.minX; x <= CITY.maxX; x += step, ix++) {
    let iz = 0
    for (let z = CITY.minZ; z <= CITY.maxZ; z += step, iz++) {
      // leave street corridors
      if (ix % roadEvery === 0 || iz % roadEvery === 0) continue
      // keep landmark footprints clear
      const dToCore = Math.hypot(x - CITY.landmark.x, z - CITY.landmark.z)
      if (clearZones.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue
      // random gaps
      if (rand() < 0.12) continue

      // coreness: 1 at downtown, fading out to edges & waterfront
      const coreness = THREE.MathUtils.clamp(1 - dToCore / 11, 0, 1)

      const jitterX = (rand() - 0.5) * 0.5
      const jitterZ = (rand() - 0.5) * 0.5
      const footprint = 0.75 + rand() * 0.5

      // taller downtown, low-rise waterfront/edges
      const base = 0.6 + rand() * 0.8
      const height = base + Math.pow(coreness, 1.6) * (2.5 + rand() * 6.5)

      const isCore = coreness > 0.55 && rand() < 0.6
      const palette = isCore ? CORE_PALETTE : PALETTE
      const color = new THREE.Color(palette[Math.floor(rand() * palette.length)])

      buildings.push({
        position: [x + jitterX, height / 2, z + jitterZ],
        size: [footprint, height, footprint * (0.85 + rand() * 0.3)],
        color,
        coreness,
      })
    }
  }
  return buildings
}

export interface TreeInstance {
  position: [number, number, number]
  scale: number
}

export function generateTrees(seed = 77): TreeInstance[] {
  const rand = mulberry32(seed)
  const trees: TreeInstance[] = []
  for (let i = 0; i < 70; i++) {
    const x = THREE.MathUtils.lerp(CITY.minX - 0.5, CITY.maxX + 0.5, rand())
    const z = THREE.MathUtils.lerp(CITY.minZ - 0.5, CITY.riverZ - 0.6, rand())
    const dToCore = Math.hypot(x - CITY.landmark.x, z - CITY.landmark.z)
    if (dToCore < 2) continue
    trees.push({ position: [x, 0, z], scale: 0.7 + rand() * 0.7 })
  }
  return trees
}

export interface PedestrianAppearance {
  skin: string
  hair: string
  shirt: string
  pants: string
  umbrella: string
  hat: boolean
  hatColor: string
}

export interface Pedestrian {
  a: [number, number, number]
  b: [number, number, number]
  speed: number
  hasUmbrella: boolean
  appearance: PedestrianAppearance
  phase: number
}

const SKINS = ['#f2c9a0', '#e8b98a', '#d69f6e', '#c8824f']
const HAIRS = ['#2a1a12', '#3a2a1a', '#5a3a22', '#141414', '#7a5a3a', '#b0651f']
const SHIRTS = ['#e0574f', '#4f8fe0', '#5fbf7a', '#e0a24f', '#b06fd0', '#ececec', '#4fbfc0']
const PANTS = ['#33384a', '#4a3f2f', '#2f4a3f', '#555b66', '#6b4a2f']
const UMBRELLAS = ['#e0574f', '#4f8fe0', '#333842', '#5fbf7a', '#e0a24f', '#b06fd0']

// Streets align with the city grid (roadEvery=4, step=1.55 from CITY.minX/minZ).
const X_LINES = [-9, -2.8, 3.4]
const Z_LINES = [-9, -2.8, 3.4]

/** Chibi pedestrians walking along the street grid; one may be the hero. */
export function generatePedestrians(seed = 4242, count = 22): Pedestrian[] {
  const rand = mulberry32(seed)
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]
  const people: Pedestrian[] = []
  for (let i = 0; i < count; i++) {
    const horizontal = rand() < 0.5
    const sidewalk = (rand() < 0.5 ? 1 : -1) * 0.5
    let a: [number, number, number]
    let b: [number, number, number]
    if (horizontal) {
      const z = pick(Z_LINES) + sidewalk
      a = [CITY.minX + 0.6, 0, z]
      b = [CITY.maxX - 0.6, 0, z]
    } else {
      const x = pick(X_LINES) + sidewalk
      a = [x, 0, CITY.minZ + 0.6]
      b = [x, 0, CITY.riverZ - 0.7]
    }
    people.push({
      a,
      b,
      speed: 0.05 + rand() * 0.06,
      hasUmbrella: rand() < 0.6,
      phase: rand() * Math.PI * 2,
      appearance: {
        skin: pick(SKINS),
        hair: pick(HAIRS),
        shirt: pick(SHIRTS),
        pants: pick(PANTS),
        umbrella: pick(UMBRELLAS),
        hat: rand() < 0.25,
        hatColor: pick(SHIRTS),
      },
    })
  }
  return people
}
