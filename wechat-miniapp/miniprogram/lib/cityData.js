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
  '#d8d0c3', '#c9d4dc', '#d9c1aa', '#bcc9c2', '#dfd8c8',
  '#b9c5d2', '#cbb6a2', '#aebcc6', '#d6c8b5', '#c6c0b6',
]
const CORE = ['#82a6c1', '#6e91ad', '#94b5c8', '#7f9fb7', '#adc3cf', '#6f879e']

export function generateCity(seed, clearZones, calmZones, maxZ, hueShift, skylineProfile) {
  const rand = mulberry32(seed == null ? 20251225 : seed)
  const out = []
  const skyline = skylineProfile || {}
  const densityScale = THREE.MathUtils.clamp(Number(skyline.densityScale) || 1, 0.75, 1.6)
  const heightScale = THREE.MathUtils.clamp(Number(skyline.heightScale) || 1, 0.85, 1.3)
  const heightCapScale = THREE.MathUtils.clamp(Number(skyline.heightCapScale) || 1, 0.9, 1.2)
  const absoluteHeightCap = Number(skyline.absoluteHeightCap) || Infinity
  const footprintScale = THREE.MathUtils.clamp(Number(skyline.footprintScale) || 1, 0.88, 1.08)
  const towerBias = THREE.MathUtils.clamp(Number(skyline.towerBias) || 1, 0.8, 1.35)
  const clearPadding = THREE.MathUtils.clamp(Number(skyline.clearPadding) || 0.38, 0.25, 0.9)
  const splitThreshold = 0.86 - Math.max(0, densityScale - 1) * 0.09
  const clear = clearZones || [{ x: CITY.landmark.x, z: CITY.landmark.z, r: 1.5 }]
  const calm = calmZones || []
  // 多地标组合的视觉中心不一定等于旧版 CITY.landmark。楼群围绕第一块
  // 地标净空区生长，核心高度梯度才会真正衬托当前城市的主角。
  const focus = clear[0] || CITY.landmark
  const zEnd = maxZ == null ? CITY.maxZ : maxZ
  const shift = hueShift || 0
  const hsl = { h: 0, s: 0, l: 0 }
  let ix = 0
  for (let x = CITY.minX; x <= CITY.maxX; x += GRID.step, ix++) {
    let iz = 0
    for (let z = CITY.minZ; z <= zEnd; z += GRID.step, iz++) {
      if (ix % GRID.roadEvery === 0 || iz % GRID.roadEvery === 0) continue
      const dToCore = Math.hypot(x - focus.x, z - focus.z)
      let blocked = false
      for (let i = 0; i < clear.length; i++) {
        const zone = clear[i]
        // clearZones 是地标中心的净空半径；再加一圈 lot padding，避免
        // 楼体底座和 splitLot 附楼从圆边缘探进广场。
        if (Math.hypot(x - zone.x, z - zone.z) < zone.r + clearPadding) {
          blocked = true
          break
        }
      }
      if (blocked || rand() < 0.015 / densityScale) continue

      const coreness = THREE.MathUtils.clamp(1 - dToCore / 11, 0, 1)
      const jitterX = (rand() - 0.5) * 0.5
      const jitterZ = (rand() - 0.5) * 0.5
      let footprint = (0.74 + rand() * 0.48) * footprintScale
      // densityScale 主要提高主楼 + 附楼地块比例，仍沿用同一网格和 InstancedMesh，
      // 烟台看起来更密，但不会按栋增加独立 draw call。
      const splitLot = footprint > splitThreshold && rand() < Math.min(0.58, 0.34 * densityScale)
      if (splitLot) footprint *= 0.74
      const base = 0.82 + rand() * 1.05
      // 旧公式在极端随机值下会生成接近 30 单位的普通楼，而专属地标通常只有
      // 8–13 单位，随机楼反客为主。这里把背景天际线控制在地标之下。
      let height = (base + Math.pow(coreness, 1.22) * (4.8 + rand() * 10.4)) * heightScale
      if (coreness > 0.5 && rand() < Math.min(0.48, 0.3 * towerBias)) {
        footprint *= 0.68
        height *= 1.16 + rand() * 0.14
      }
      const skylineHeight = height
      for (let i = 0; i < calm.length; i++) {
        const zone = calm[i]
        const d = Math.hypot(x - zone.x, z - zone.z)
        if (d < zone.r) {
          const t = THREE.MathUtils.smoothstep(d, zone.r * 0.45, zone.r)
          height = Math.min(height, zone.maxHeight + (height - zone.maxHeight) * t)
        }
      }
      height = Math.max(0.82, Math.min(height, (10.2 + coreness * 2.1) * heightCapScale, absoluteHeightCap))

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
      if (skylineHeight > 7.0 || (coreness > 0.56 && footprint < 0.88)) style = 'tower'
      if (height <= 5.5) {
        if (coreness < 0.42 && height < 2.4) roof = rr < 0.22 ? 'gable' : rr < 0.4 ? 'hip' : 'flat'
        else roof = rr < 0.12 ? 'hip' : 'flat'
      } else if (style === 'tower' && rr < 0.76) {
        roof = 'setback'
      }
      // 主体不再全部使用 BoxGeometry：高层混入收分塔、八边塔和菱形塔，
      // 仍然按类型 InstancedMesh 合批，不用外部模型也能打破“灰盒阵列”。
      const formRoll = rand()
      let form = 'box'
      if (style === 'tower') form = formRoll < 0.34 ? 'taper' : formRoll < 0.62 ? 'octagon' : formRoll < 0.78 ? 'diamond' : 'box'
      else if (style === 'office') form = formRoll < 0.22 ? 'octagon' : formRoll < 0.32 ? 'diamond' : 'box'
      const yaw = form === 'diamond' ? Math.PI / 4 : (rand() < 0.18 ? Math.PI / 2 : 0)
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
        form,
        yaw,
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
          form: annexH > 4.4 && rand() < 0.3 ? 'octagon' : 'box',
          yaw: rand() < 0.22 ? Math.PI / 2 : 0,
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
  for (let i = 0; i < 54; i++) {
    push(
      THREE.MathUtils.lerp(CITY.minX - 0.5, CITY.maxX + 0.5, rand()),
      THREE.MathUtils.lerp(CITY.minZ - 0.5, zMax, rand()),
      0.58 + rand() * 0.58,
    )
  }
  const inner = CITY.maxX - 1.5
  const outer = CITY.trayHalf - 0.5
  for (let i = 0; i < 40; i++) {
    const angle = rand() * Math.PI * 2
    const radius = inner + rand() * (outer - inner)
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    if (z > zMax || x < CITY.minX - 0.8 || x > CITY.maxX + 0.8) continue
    push(x, z, 0.72 + rand() * 0.66)
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
