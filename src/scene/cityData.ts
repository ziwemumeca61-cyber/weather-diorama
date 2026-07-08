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

export function generateCity(seed = 20251225): BuildingInstance[] {
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
      // keep the plaza around the landmark clear-ish
      const dToCore = Math.hypot(x - CITY.landmark.x, z - CITY.landmark.z)
      if (dToCore < 1.5) continue
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

export interface PersonInstance {
  position: [number, number, number]
  color: THREE.Color
}

const PERSON_COLORS = ['#e05b5b', '#4f8fe0', '#e0a24f', '#5fbf7a', '#b06fd0', '#e8e8e8']

export function generatePeople(seed = 909): PersonInstance[] {
  const rand = mulberry32(seed)
  const people: PersonInstance[] = []
  for (let i = 0; i < 120; i++) {
    const x = THREE.MathUtils.lerp(CITY.minX, CITY.maxX, rand())
    const z = THREE.MathUtils.lerp(CITY.minZ, CITY.riverZ - 0.3, rand())
    people.push({
      position: [x, 0, z],
      color: new THREE.Color(PERSON_COLORS[Math.floor(rand() * PERSON_COLORS.length)]),
    })
  }
  return people
}
