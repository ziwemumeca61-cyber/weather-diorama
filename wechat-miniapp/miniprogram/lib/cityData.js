// Web 端 cityData.ts 的原生 Three.js 版本。所有布局均由种子生成，切城和重载后保持稳定。
import * as THREE from './three.core.js'

export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashName(name) {
  let h = 2166136261 >>> 0
  const value = name || 'City'
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) || 20251225
}

export const CITY = {
  minX: -9,
  maxX: 9,
  minZ: -9,
  maxZ: 6.6,
  riverZ: 7.4,
  trayHalf: 10.5,
  landmark: { x: -1.5, y: 0, z: -2 },
}

export const GRID = { step: 1.55, min: CITY.minX, max: CITY.maxX, roadEvery: 4 }
export const STREET_HALF_W = 0.425
const X_LINES = [-9, -2.8, 3.4]
const Z_LINES = [-9, -2.8, 3.4]

export function streetLines() {
  return { xs: X_LINES.slice(), zs: Z_LINES.slice() }
}

const PALETTE = [
  '#c9d3dd', '#b7c2cf', '#d8cdbf', '#e3d8c8', '#a9b6c4',
  '#cbb8a6', '#9fb0bd', '#d5c3b0', '#8fa0af', '#e6ddd0',
]
const CORE = ['#8ea6bd', '#7f97b4', '#9fb8cf', '#aebfce', '#c0cad6']

export function generateCity(seed, clearZones, calmZones, maxZ, hueShift) {
  const rand = mulberry32(seed == null ? 20251225 : seed)
  const out = []
  const clear = clearZones || [{ x: CITY.landmark.x, z: CITY.landmark.z, r: 1.5 }]
  const calm = calmZones || []
  const zEnd = maxZ == null ? CITY.maxZ : maxZ
  const shift = hueShift || 0
  const hsl = { h: 0, s: 0, l: 0 }
  let ix = 0
  for (let x = CITY.minX; x <= CITY.maxX; x += GRID.step, ix++) {
    let iz = 0
    for (let z = CITY.minZ; z <= zEnd; z += GRID.step, iz++) {
      if (ix % GRID.roadEvery === 0 || iz % GRID.roadEvery === 0) continue
      const dToCore = Math.hypot(x - CITY.landmark.x, z - CITY.landmark.z)
      let blocked = false
      for (let i = 0; i < clear.length; i++) {
        const zone = clear[i]
        if (Math.hypot(x - zone.x, z - zone.z) < zone.r) {
          blocked = true
          break
        }
      }
      if (blocked || rand() < 0.015) continue

      const coreness = THREE.MathUtils.clamp(1 - dToCore / 11, 0, 1)
      const jitterX = (rand() - 0.5) * 0.5
      const jitterZ = (rand() - 0.5) * 0.5
      let footprint = 0.72 + rand() * 0.5
      // 一部分地块拆成主楼 + 附楼，补足城区密度而不挤占道路。
      const splitLot = footprint > 0.84 && rand() < 0.44
      if (splitLot) footprint *= 0.72
      const base = 0.82 + rand() * 1.2
      let height = base + Math.pow(coreness, 1.46) * (5.25 + rand() * 11.8)
      if (coreness > 0.48 && rand() < 0.36) {
        footprint *= 0.6
        height *= 1.62
      }
      for (let i = 0; i < calm.length; i++) {
        const zone = calm[i]
        const d = Math.hypot(x - zone.x, z - zone.z)
        if (d < zone.r) {
          const t = THREE.MathUtils.smoothstep(d, zone.r * 0.45, zone.r)
          height = Math.min(height, zone.maxHeight + (height - zone.maxHeight) * t)
        }
      }

      const isCore = coreness > 0.5 && rand() < 0.66
      const palette = isCore ? CORE : PALETTE
      const color = new THREE.Color(palette[Math.floor(rand() * palette.length)])
      if (shift) {
        color.getHSL(hsl)
        color.setHSL((hsl.h + shift + 1) % 1, hsl.s, hsl.l)
      }
      const depth = footprint * (0.85 + rand() * 0.3)
      let roof = 'flat'
      const rr = rand()
      let style = isCore ? 'office' : 'residential'
      if (height > 7.0 || (coreness > 0.56 && footprint < 0.88)) style = 'tower'
      if (height <= 5.5) {
        if (coreness < 0.42 && height < 2.4) roof = rr < 0.22 ? 'gable' : rr < 0.4 ? 'hip' : 'flat'
        else roof = rr < 0.12 ? 'hip' : 'flat'
      } else if (style === 'tower' && rr < 0.76) {
        // 与 Web 版 City 的高层退台同源：让核心区天际线有可读的高低层次。
        roof = 'setback'
      }
      const px = x + jitterX
      const pz = z + jitterZ
      out.push({
        x: px,
        z: pz,
        w: footprint,
        d: depth,
        h: height,
        color: color.getHex(),
        core: coreness,
        roof,
        style,
      })
      if (splitLot) {
        const alongX = rand() < 0.5
        const annexW = alongX ? footprint * (0.48 + rand() * 0.1) : footprint * (0.82 + rand() * 0.1)
        const annexD = alongX ? depth * (0.78 + rand() * 0.1) : depth * (0.48 + rand() * 0.1)
        const annexH = Math.max(0.86, height * (0.32 + rand() * 0.28))
        const side = rand() < 0.5 ? -1 : 1
        const annexX = px + (alongX ? side * (footprint * 0.54 + annexW * 0.55 + 0.04) : 0)
        const annexZ = pz + (!alongX ? side * (depth * 0.54 + annexD * 0.55 + 0.04) : 0)
        const annexColor = color.clone().offsetHSL(0, -0.02, side * 0.035)
        out.push({
          x: annexX,
          z: annexZ,
          w: annexW,
          d: annexD,
          h: annexH,
          color: annexColor.getHex(),
          core: Math.max(0, coreness - 0.18),
          roof: annexH < 2.1 && coreness < 0.45 ? (rand() < 0.45 ? 'hip' : 'gable') : 'flat',
          style: annexH > 4.4 ? 'office' : 'residential',
        })
      }
    }
  }
  return out
}

export function generateTrees(seed) {
  const rand = mulberry32(seed == null ? 77 : seed)
  const trees = []
  const zMax = CITY.riverZ - 0.6
  function push(x, z, scale) {
    if (Math.hypot(x - CITY.landmark.x, z - CITY.landmark.z) < 2) return
    trees.push({ x, z, scale, kind: rand() < 0.55 ? 'broad' : 'pine' })
  }
  for (let i = 0; i < 70; i++) {
    push(
      THREE.MathUtils.lerp(CITY.minX - 0.5, CITY.maxX + 0.5, rand()),
      THREE.MathUtils.lerp(CITY.minZ - 0.5, zMax, rand()),
      0.7 + rand() * 0.7,
    )
  }
  const inner = CITY.maxX - 1.5
  const outer = CITY.trayHalf - 0.5
  for (let i = 0; i < 55; i++) {
    const angle = rand() * Math.PI * 2
    const radius = inner + rand() * (outer - inner)
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    if (z > zMax || x < CITY.minX - 0.8 || x > CITY.maxX + 0.8) continue
    push(x, z, 0.85 + rand() * 0.9)
  }
  return trees
}

const SKINS = [0xf2c9a0, 0xe8b98a, 0xd69f6e, 0xc8824f]
const HAIRS = [0x2a1a12, 0x3a2a1a, 0x5a3a22, 0x141414, 0x7a5a3a, 0xb0651f]
const SHIRTS = [0xe0574f, 0x4f8fe0, 0x5fbf7a, 0xe0a24f, 0xb06fd0, 0xececec, 0x4fbfc0]
const PANTS = [0x33384a, 0x4a3f2f, 0x2f4a3f, 0x555b66, 0x6b4a2f]
const UMBRELLAS = [0xe0574f, 0x4f8fe0, 0x333842, 0x5fbf7a, 0xe0a24f, 0xb06fd0]

export function generatePedestrians(seed, count) {
  const rand = mulberry32(seed == null ? 4242 : seed)
  const n = count == null ? 22 : count
  const pick = (arr) => arr[Math.floor(rand() * arr.length)]
  const people = []
  for (let i = 0; i < n; i++) {
    const horizontal = rand() < 0.5
    const sidewalk = (rand() < 0.5 ? 1 : -1) * 0.5
    let a
    let b
    if (horizontal) {
      const z = pick(Z_LINES) + sidewalk
      a = [CITY.minX + 0.6, z]
      b = [CITY.maxX - 0.6, z]
    } else {
      const x = pick(X_LINES) + sidewalk
      a = [x, CITY.minZ + 0.6]
      b = [x, CITY.riverZ - 0.7]
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
