// 确定性程序化城市布局（精简版，供小程序原生 Three.js 使用）。
// 与 web 版同源思路：mulberry32 种子 + 网格生成，保证同名城市天际线稳定。

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

/** FNV-1a：城市名 → 稳定种子 */
export function hashName(name) {
  let h = 2166136261 >>> 0
  const s = name || 'City'
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) || 20251225
}

const PALETTE = ['#c9d3dd', '#b7c2cf', '#d8cdbf', '#a9b6c4', '#9fb0bd', '#8fa0af', '#e6ddd0']
const CORE = ['#8ea6bd', '#7f97b4', '#9fb8cf', '#aebfce']

/**
 * 生成一批楼房 { x, z, w, d, h, color, core }。中心高、边缘低。
 * 返回纯数据，渲染层（scene.js）据此建 InstancedMesh。
 */
export const GRID = { step: 1.55, min: -7, max: 7 }

/**
 * 街道中心线坐标。generateCity 每隔 4 格跳过一行/列当街道，
 * 这里把那些坐标导出来，好让路面、行人、车、路灯都对齐同一套网格。
 */
export function streetLines() {
  const xs = []
  const zs = []
  let i = 0
  for (let x = GRID.min; x <= GRID.max; x += GRID.step, i++) if (i % 4 === 0) xs.push(x)
  i = 0
  for (let z = GRID.min; z <= GRID.max; z += GRID.step, i++) if (i % 4 === 0) zs.push(z)
  return { xs, zs }
}

export function generateCity(seed) {
  const rand = mulberry32(seed)
  const out = []
  const step = GRID.step
  const min = GRID.min,
    max = GRID.max
  let ix = 0
  for (let x = min; x <= max; x += step, ix++) {
    let iz = 0
    for (let z = min; z <= max; z += step, iz++) {
      if (ix % 4 === 0 || iz % 4 === 0) continue // 留街道
      const d2 = Math.hypot(x, z)
      const coreness = Math.max(0, Math.min(1, 1 - d2 / 9))
      if (rand() < 0.08) continue
      let foot = 0.7 + rand() * 0.5
      const base = 0.7 + rand() * 1.0
      let h = base + Math.pow(coreness, 1.5) * (2.4 + rand() * 6)
      if (coreness > 0.5 && rand() < 0.25) {
        foot *= 0.62
        h *= 1.4
      }
      const isCore = coreness > 0.55 && rand() < 0.6
      const pal = isCore ? CORE : PALETTE
      out.push({
        x: x + (rand() - 0.5) * 0.4,
        z: z + (rand() - 0.5) * 0.4,
        w: foot,
        d: foot * (0.85 + rand() * 0.3),
        h,
        color: pal[Math.floor(rand() * pal.length)],
        core: coreness,
      })
    }
  }
  return out
}
