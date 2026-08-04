// Web 端城市地标的原生增强版。
// 目标：保持 Web 端的“每城一组地标”构图，同时用小程序可承受的基本体补足
// 幕墙分格、楼层腰线、塔冠、檐口、灯带和城市组合，不依赖 DOM、图片或 GLB。
import * as THREE from './three.core.js'
import { makeConcaveRoof, makeHipRoof } from './roofKit'
import { makeTileTexture, makeWindowTexture, darken } from './tileTexture'

const UP = new THREE.Vector3(0, 1, 0)

function std(color, opts) {
  return new THREE.MeshStandardMaterial(Object.assign({
    color: new THREE.Color(color),
    roughness: 0.62,
    metalness: 0.18,
  }, opts || {}))
}

function glow(color, emissive) {
  return std(color, {
    emissive: new THREE.Color(emissive == null ? color : emissive),
    emissiveIntensity: 0.08,
  })
}

function tile(base, rx, ry, extra) {
  return new THREE.MeshStandardMaterial(Object.assign({
    color: 0xffffff,
    map: makeTileTexture(base, darken(base, 0.66), rx || 8, ry || 1),
    roughness: 0.58,
    metalness: 0.18,
  }, extra || {}))
}

function add(g, geometry, material, x, y, z, ry, rx, rz) {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(x || 0, y || 0, z || 0)
  mesh.rotation.set(rx || 0, ry || 0, rz || 0)
  mesh.castShadow = true
  mesh.receiveShadow = true
  g.add(mesh)
  return mesh
}

function beam(g, from, to, radius, material) {
  const a = new THREE.Vector3(from[0], from[1], from[2])
  const b = new THREE.Vector3(to[0], to[1], to[2])
  const dir = new THREE.Vector3().subVectors(b, a)
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dir.length(), 6), material)
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize())
  mesh.castShadow = true
  g.add(mesh)
  return mesh
}

function pack(items) {
  const group = new THREE.Group()
  const glowList = []
  let animate = null
  items.forEach((item) => {
    const part = item.b()
    part.group.position.set(item.x || 0, item.y || 0, item.z || 0)
    part.group.scale.setScalar(item.s == null ? 1 : item.s)
    part.group.rotation.y = item.ry || 0
    group.add(part.group)
    ;(part.glow || []).forEach((m) => glowList.push(m))
    if (part.animate) animate = part.animate
  })
  return { group, glow: glowList, animate }
}

function glassMaterial(frame, pane, lit, rx, ry) {
  const texture = makeWindowTexture(frame, pane, lit)
  texture.map.repeat.set(rx || 2, ry || 6)
  texture.emissiveMap.repeat.copy(texture.map.repeat)
  return new THREE.MeshStandardMaterial({
    map: texture.map,
    emissive: new THREE.Color(0xffd58d),
    emissiveMap: texture.emissiveMap,
    emissiveIntensity: 0.025,
    roughness: 0.24,
    metalness: 0.72,
    envMapIntensity: 1.65,
  })
}

function glassTower(opts) {
  opts = opts || {}
  const g = new THREE.Group()
  const glowList = []
  const h = opts.h || 10
  const w = opts.w || 1.15
  const d = opts.d || w
  const sections = opts.sections || 10
  const sides = opts.sides || 4
  const taper = opts.taper == null ? 0.36 : opts.taper
  const twist = opts.twist || 0
  const skin = glassMaterial(
    opts.frame || 0xc4d4df,
    opts.pane || 0x7694ad,
    opts.lit || 0xffcf7a,
    opts.repeatX || 3,
    opts.repeatY || Math.max(4, Math.round(h * 1.2)),
  )
  glowList.push(skin)
  const frame = std(opts.frame || 0xc4d4df, { metalness: 0.66, roughness: 0.28 })
  const base = std(opts.base || 0x69727d, { roughness: 0.72, metalness: 0.22 })
  add(g, new THREE.BoxGeometry(w * 1.22, 0.28, d * 1.22), base, 0, 0.14, 0)
  const segH = h / sections
  for (let i = 0; i < sections; i++) {
    const t0 = i / sections
    const t1 = (i + 1) / sections
    const wb = w * (1 - taper * t0)
    const wt = w * (1 - taper * t1)
    const db = d * (1 - taper * t0)
    const dt = d * (1 - taper * t1)
    const mesh = add(
      g,
      new THREE.CylinderGeometry(0.5, 0.5, 1, sides),
      skin,
      0,
      0.28 + segH * i + segH / 2,
      0,
      (twist * t0) + (sides === 4 ? Math.PI / 4 : 0),
    )
    mesh.scale.set((wb + wt) * 0.5, segH * 1.02, (db + dt) * 0.5)
    const band = add(g, new THREE.BoxGeometry(wb * 1.06, 0.045, db * 1.06), frame, 0, 0.28 + segH * (i + 1), 0)
    band.rotation.y = twist * t1
    // 四条竖向结构肋，远景仍能读出立面比例。
    const sx = (wb + wt) * 0.25
    const sz = (db + dt) * 0.25
    ;[[-sx, -sz], [sx, -sz], [-sx, sz], [sx, sz]].forEach((p) => {
      const fin = add(g, new THREE.BoxGeometry(0.045, segH * 1.0, 0.045), frame, p[0], 0.28 + segH * i + segH / 2, p[1])
      fin.rotation.y = twist * t0
    })
  }
  const topW = w * (1 - taper)
  const crown = add(g, new THREE.BoxGeometry(topW * 1.16, 0.18, d * (1 - taper) * 1.16), frame, 0, 0.28 + h + 0.09, 0)
  crown.rotation.y = twist
  if (opts.crown === 'crown') {
    add(g, new THREE.CylinderGeometry(topW * 0.38, topW * 0.5, 0.42, 6), frame, 0, 0.28 + h + 0.38, 0, twist)
  }
  if (opts.spire !== false) {
    add(g, new THREE.CylinderGeometry(0.025, Math.max(0.07, topW * 0.16), opts.spireH || 1.8, 8), frame, 0, 0.28 + h + (opts.spireH || 1.8) / 2, 0)
  }
  return { group: g, glow: glowList }
}

function steppedGlassTower(opts) {
  opts = Object.assign({ h: 10.5, w: 1.35, d: 1.35, sections: 8, taper: 0.28 }, opts || {})
  return glassTower(opts)
}

function pagoda(opts) {
  opts = opts || {}
  const g = new THREE.Group()
  const glowList = []
  const tiers = opts.tiers || 5
  const baseR = opts.baseR || 1.08
  const tierH = opts.tierH || 1.12
  const sides = opts.square ? 4 : 8
  const body = glow(opts.body || 0xc69b67, opts.bodyGlow || 0xffcf7a)
  const roof = tile(opts.roof || 0x76553c, 9, 1)
  glowList.push(body)
  add(g, new THREE.CylinderGeometry(baseR + 0.35, baseR + 0.55, 0.48, sides), std(0xbeb7aa, { roughness: 0.88 }), 0, 0.24, 0)
  let y = 0.48
  for (let i = 0; i < tiers; i++) {
    const r = baseR * (1 - i * 0.105)
    const bodyMesh = add(g, new THREE.CylinderGeometry(r * 0.72, r * 0.78, tierH * 0.7, sides), body, 0, y + tierH * 0.35, 0, Math.PI / sides)
    bodyMesh.castShadow = true
    add(g, new THREE.BoxGeometry(r * 1.85, 0.06, r * 1.85), roof, 0, y + tierH * 0.72, 0)
    add(g, makeConcaveRoof(r * 1.18, tierH * 0.5, 0.04, 36), roof, 0, y + tierH * 0.75, 0)
    // 檐下四角短柱和暖色窗格。
    const post = std(opts.post || 0x754633, { roughness: 0.72 })
    ;[[-r * 0.58, -r * 0.58], [r * 0.58, -r * 0.58], [-r * 0.58, r * 0.58], [r * 0.58, r * 0.58]].forEach((p) => {
      add(g, new THREE.BoxGeometry(0.045, tierH * 0.42, 0.045), post, p[0], y + tierH * 0.42, p[1])
    })
    y += tierH * 0.92
  }
  add(g, new THREE.SphereGeometry(0.16, 14, 10), std(0xe0b54f, { metalness: 0.65, roughness: 0.28 }), 0, y + 0.1, 0)
  add(g, new THREE.CylinderGeometry(0.025, 0.06, 0.9, 8), std(0xe0b54f, { metalness: 0.65, roughness: 0.28 }), 0, y + 0.58, 0)
  return { group: g, glow: glowList }
}

function imperialHall(opts) {
  opts = opts || {}
  const g = new THREE.Group()
  const glowList = []
  const wall = glow(opts.wall || 0x9b2f28, opts.wallGlow || 0xffa060)
  const roof = tile(opts.roof || 0xd9a441, 10, 2, { metalness: 0.28 })
  const stone = std(opts.stone || 0xe8e1d2, { roughness: 0.86 })
  glowList.push(wall)
  add(g, new THREE.BoxGeometry((opts.w || 4.8) + 0.8, 0.5, (opts.d || 2.2) + 0.8), stone, 0, 0.25, 0)
  add(g, new THREE.BoxGeometry(opts.w || 4.8, opts.h || 2.0, opts.d || 2.2), wall, 0, 0.5 + (opts.h || 2.0) / 2, 0)
  const h = 0.5 + (opts.h || 2.0)
  add(g, new THREE.BoxGeometry((opts.w || 4.8) + 0.28, 0.18, (opts.d || 2.2) + 0.28), roof, 0, h + 0.09, 0)
  add(g, makeHipRoof((opts.w || 4.8) + 0.55, (opts.d || 2.2) + 0.55, opts.roofH || 0.9), roof, 0, h + 0.18, 0)
  const door = glow(0xcaa24a, 0xffd24a)
  glowList.push(door)
  const columns = opts.columns || 5
  for (let i = 0; i < columns; i++) {
    const x = ((i / Math.max(1, columns - 1)) - 0.5) * (opts.w || 4.8) * 0.82
    add(g, new THREE.BoxGeometry(0.16, (opts.h || 2.0) * 0.78, 0.12), door, x, 0.5 + (opts.h || 2.0) * 0.42, (opts.d || 2.2) * 0.51)
  }
  return { group: g, glow: glowList }
}

function cityGate(opts) {
  opts = opts || {}
  const g = new THREE.Group()
  const glowList = []
  const wall = std(opts.wall || 0xb37a59, { roughness: 0.82 })
  const roof = tile(opts.roof || 0x385b70, 7, 1)
  const gold = glow(opts.gold || 0xd19b43, 0xffd46b)
  glowList.push(gold)
  const h = opts.h || 2.4
  add(g, new THREE.BoxGeometry(0.45, h, 0.48), wall, -1.1, h / 2, 0)
  add(g, new THREE.BoxGeometry(0.45, h, 0.48), wall, 1.1, h / 2, 0)
  add(g, new THREE.BoxGeometry(2.85, 0.55, 0.6), wall, 0, h - 0.15, 0)
  add(g, new THREE.BoxGeometry(3.1, 0.12, 0.9), roof, 0, h + 0.15, 0)
  add(g, makeHipRoof(3.25, 1.05, 0.72), roof, 0, h + 0.24, 0)
  const gate = add(g, new THREE.BoxGeometry(0.72, 1.45, 0.1), gold, 0, 0.78, 0.34)
  gate.castShadow = false
  return { group: g, glow: glowList }
}

function cantonTower() {
  const g = new THREE.Group()
  const glowList = []
  const strut = glow(0x8fb6d8, 0x59c6ff)
  const rim = std(0xcfd8e2, { metalness: 0.6, roughness: 0.28 })
  glowList.push(strut)
  const h = 9.6
  const n = 28
  const rb = 1.12
  const rt = 0.34
  const twist = 1.2
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    beam(g, [Math.cos(a) * rb, 0.3, Math.sin(a) * rb], [Math.cos(a + twist) * rt, h, Math.sin(a + twist) * rt], 0.042, strut)
  }
  ;[0.05, 0.25, 0.48, 0.72, 0.94].forEach((f) => {
    const a = twist * f
    const r = rb * (1 - f) + rt * f
    add(g, new THREE.TorusGeometry(r, 0.055, 8, 32), rim, 0, 0.3 + h * f, 0, 0)
    g.children[g.children.length - 1].rotation.x = Math.PI / 2
    // 每层观景平台的薄环，强化真实结构比例。
    add(g, new THREE.CylinderGeometry(r * 0.72, r * 0.72, 0.08, 24), std(0x75889a, { metalness: 0.35, roughness: 0.45 }), 0, 0.3 + h * f, 0)
  })
  add(g, new THREE.CylinderGeometry(0.08, 0.16, 0.42, 16), rim, 0, 0.48, 0)
  add(g, new THREE.CylinderGeometry(0.025, 0.08, 2.8, 8), rim, 0, h + 1.4, 0)
  return {
    group: g,
    glow: glowList,
    animate(t, base, nf) {
      strut.emissive.setHSL(nf > 0.25 ? (t * 0.04) % 1 : 0.58, 0.78, 0.58)
    },
  }
}

function orientalPearl() {
  const g = new THREE.Group()
  const glowList = []
  const steel = std(0xc8ccd6, { metalness: 0.42, roughness: 0.36 })
  const darker = std(0x8d96a1, { metalness: 0.28, roughness: 0.56 })
  const pearl = glow(0xc9366b, 0xff4f92)
  glowList.push(pearl)
  add(g, new THREE.CylinderGeometry(1.12, 1.32, 0.28, 24), darker, 0, 0.14, 0)
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + Math.PI / 6
    const leg = add(g, new THREE.CylinderGeometry(0.13, 0.19, 3.1, 10), steel, Math.cos(a) * 0.5, 1.55, Math.sin(a) * 0.5)
    leg.rotation.z = Math.cos(a) * 0.2
    leg.rotation.x = -Math.sin(a) * 0.2
  }
  add(g, new THREE.CylinderGeometry(0.1, 0.16, 7.6, 16), steel, 0, 5.2, 0)
  add(g, new THREE.SphereGeometry(0.86, 24, 18), pearl, 0, 3.25, 0)
  add(g, new THREE.TorusGeometry(0.84, 0.045, 8, 24), std(0xe4e9f0, { metalness: 0.6, roughness: 0.28 }), 0, 3.25, 0, 0)
  g.children[g.children.length - 1].rotation.x = Math.PI / 2
  add(g, new THREE.SphereGeometry(0.56, 20, 16), pearl, 0, 6.9, 0)
  add(g, new THREE.SphereGeometry(0.27, 16, 12), pearl, 0, 8.35, 0)
  add(g, new THREE.CylinderGeometry(0.025, 0.1, 2.7, 10), darker, 0, 10.0, 0)
  add(g, new THREE.SphereGeometry(0.09, 12, 10), glow(0xff6b55, 0xff3a2a), 0, 11.42, 0)
  return { group: g, glow: glowList }
}

function tiananmen() {
  return imperialHall({ w: 5.4, d: 2.1, h: 2.25, roofH: 1.12, columns: 7, wall: 0x9b2f28 })
}

function templeOfHeaven() {
  const g = new THREE.Group()
  const glowList = []
  const body = glow(0x9e3d2d, 0xffaa62)
  const roof = tile(0x2b5794, 7, 2, { metalness: 0.28 })
  glowList.push(body)
  add(g, new THREE.CylinderGeometry(1.9, 2.05, 0.48, 24), std(0xd4c8b5, { roughness: 0.82 }), 0, 0.24, 0)
  ;[1.55, 1.18, 0.82].forEach((r, i) => {
    const y = 0.48 + i * 1.1
    add(g, new THREE.CylinderGeometry(r * 0.72, r * 0.78, 0.82, 24), body, 0, y + 0.41, 0)
    add(g, makeConcaveRoof(r, 0.58, 0.03, 40), roof, 0, y + 0.82, 0)
  })
  add(g, new THREE.CylinderGeometry(0.04, 0.1, 0.9, 8), std(0xd9a441, { metalness: 0.6 }), 0, 4.05, 0)
  return { group: g, glow: glowList }
}

function cctvLoop() {
  const g = new THREE.Group()
  const glass = glassMaterial(0x9ba9b8, 0x4d6175, 0xffd58d, 3, 8)
  const frame = std(0xb9c6d1, { metalness: 0.7, roughness: 0.24 })
  add(g, new THREE.BoxGeometry(0.62, 5.4, 0.62), glass, -0.56, 2.7, 0)
  add(g, new THREE.BoxGeometry(0.62, 5.4, 0.62), glass, 0.56, 2.7, 0)
  add(g, new THREE.BoxGeometry(1.75, 0.62, 0.62), glass, 0, 5.25, 0)
  add(g, new THREE.BoxGeometry(0.2, 5.6, 0.16), frame, -0.87, 2.7, 0)
  add(g, new THREE.BoxGeometry(0.2, 5.6, 0.16), frame, 0.87, 2.7, 0)
  add(g, new THREE.BoxGeometry(2.05, 0.18, 0.16), frame, 0, 5.55, 0)
  return { group: g, glow: [glass] }
}

function bridgeLandmark(opts) {
  opts = opts || {}
  const g = new THREE.Group()
  const glowList = []
  const steel = std(opts.steel || 0xdbe3ea, { metalness: 0.65, roughness: 0.3 })
  const deck = std(opts.deck || 0x737f89, { roughness: 0.74 })
  const light = glow(opts.light || 0x79b7d9, opts.emissive || 0x9fd8ff)
  glowList.push(light)
  add(g, new THREE.BoxGeometry(opts.w || 7.2, 0.24, opts.d || 1.1), deck, 0, 0.34, 0)
  ;[-2.6, 0, 2.6].forEach((x) => add(g, new THREE.CylinderGeometry(0.12, 0.16, 0.72, 8), steel, x, 0.0, 0))
  ;[-1, 1].forEach((side) => {
    add(g, new THREE.BoxGeometry((opts.w || 7.2) * 0.98, 0.06, 0.06), light, 0, 0.92, side * (opts.d || 1.1) * 0.38)
    for (let i = 0; i < 8; i++) {
      const x = -((opts.w || 7.2) * 0.42) + i * ((opts.w || 7.2) * 0.12)
      add(g, new THREE.BoxGeometry(0.05, 0.62, 0.05), steel, x, 0.62, side * (opts.d || 1.1) * 0.38, i % 2 ? 0.42 : -0.42)
    }
  })
  return { group: g, glow: glowList }
}

function lighthouse() {
  const g = new THREE.Group()
  const glowList = []
  const hill = std(0x7da26a, { roughness: 0.96 })
  const stone = glow(0xf0eee6, 0xffe9c4)
  const red = std(0xb03a2e, { roughness: 0.52, metalness: 0.18 })
  const dark = std(0x5f6a75, { metalness: 0.5, roughness: 0.42 })
  const beacon = glow(0xff6a4d, 0xff2a1a)
  glowList.push(stone, beacon)
  add(g, new THREE.SphereGeometry(2.3, 20, 12), hill, 0, 0.0, 0)
  g.children[g.children.length - 1].scale.set(1, 0.28, 1)
  add(g, new THREE.BoxGeometry(0.82, 0.5, 0.58), std(0xefece3, { roughness: 0.86 }), -1.05, 0.62, 0.5, 0.4)
  add(g, new THREE.CylinderGeometry(0.42, 0.42, 0.5, 4), red, -1.05, 0.97, 0.5, Math.PI / 4)
  add(g, new THREE.CylinderGeometry(0.3, 0.42, 3.85, 8), stone, 0.3, 2.5, -0.2, Math.PI / 8)
  add(g, new THREE.CylinderGeometry(0.45, 0.38, 0.1, 8), dark, 0.3, 4.46, -0.2, Math.PI / 8)
  add(g, new THREE.CylinderGeometry(0.44, 0.44, 0.24, 12), std(0x8e99a4, { metalness: 0.5, roughness: 0.5, transparent: true, opacity: 0.52 }), 0.3, 4.6, -0.2)
  add(g, new THREE.CylinderGeometry(0.26, 0.26, 0.4, 10), glow(0xdfe9ef, 0xffd98a), 0.3, 4.78, -0.2)
  add(g, new THREE.SphereGeometry(0.3, 14, 10), red, 0.3, 5.05, -0.2)
  add(g, new THREE.SphereGeometry(0.06, 8, 8), beacon, 0.3, 5.35, -0.2)
  return { group: g, glow: glowList }
}

function openGate() {
  const g = new THREE.Group()
  const glowList = []
  const stone = std(0xc5b9a4, { roughness: 0.82 })
  const roof = tile(0x7b533e, 8, 1)
  const gold = glow(0xb84732, 0xff8f55)
  glowList.push(gold)
  ;[-1.8, 1.8].forEach((x) => {
    add(g, new THREE.BoxGeometry(0.34, 3.2, 0.5), stone, x, 1.6, 0)
    add(g, makeConcaveRoof(0.62, 0.42, 0.03, 28), roof, x, 3.3, 0)
  })
  add(g, new THREE.BoxGeometry(3.95, 0.36, 0.58), gold, 0, 2.72, 0)
  add(g, new THREE.BoxGeometry(0.58, 1.9, 0.12), gold, 0, 1.22, 0.33)
  add(g, makeHipRoof(4.2, 1.15, 0.74), roof, 0, 3.0, 0)
  return { group: g, glow: glowList }
}

function centralPavilion(opts) {
  return pagoda(Object.assign({
    tiers: 4,
    baseR: 1.25,
    tierH: 1.28,
    body: 0xb45d39,
    roof: 0x3e6385,
  }, opts || {}))
}

function cityBuilders() {
  return {
    上海: () => pack([
      { b: orientalPearl, x: -2.7, z: 1.2, s: 0.86 },
      { b: () => glassTower({ h: 12.6, w: 1.15, d: 1.05, sides: 3, taper: 0.62, twist: 2.35, frame: 0xc2d7e4, pane: 0x6f91aa, repeatY: 10, crown: 'crown' }), x: 1.35, z: -1.6, s: 0.92 },
      { b: () => steppedGlassTower({ h: 9.4, w: 1.28, d: 1.28, sections: 8, frame: 0xb6c0cb, pane: 0x7f8998, crown: 'crown', spireH: 1.15 }), x: 3.0, z: 1.1, s: 0.86 },
      { b: cctvLoop, x: 0.1, z: 2.55, s: 0.95, ry: 0.45 },
    ]),
    北京: () => pack([
      { b: () => imperialHall({ w: 5.8, d: 2.3, h: 2.1, roofH: 1.1, columns: 7 }), x: 2.2, z: 1.7, s: 0.88 },
      { b: templeOfHeaven, x: -2.9, z: -1.6, s: 0.82 },
      { b: () => glassTower({ h: 8.1, w: 1.18, d: 1.18, sides: 6, taper: 0.28, frame: 0xbccbd8, pane: 0x70889e, crown: 'crown' }), x: -4.1, z: -4.1, s: 0.72 },
      { b: cctvLoop, x: 3.9, z: -3.8, s: 0.78, ry: -0.5 },
    ]),
    广州: () => pack([
      { b: cantonTower, x: -1.7, z: 0.6, s: 0.88 },
      { b: () => glassTower({ h: 10.2, w: 1.2, d: 1.0, sides: 4, taper: 0.24, frame: 0xb3c4d5, pane: 0x6f8da7, crown: 'crown' }), x: 1.75, z: -1.0, s: 0.82 },
      { b: () => glassTower({ h: 8.6, w: 0.95, d: 0.95, sides: 6, taper: 0.18, frame: 0xa8b8c6, pane: 0x55758f }), x: 3.2, z: 1.8, s: 0.72 },
    ]),
    深圳: () => pack([
      { b: () => glassTower({ h: 13.2, w: 1.35, d: 1.2, sides: 4, taper: 0.34, frame: 0xc6d7e5, pane: 0x6282a0, crown: 'crown', spireH: 2.3 }), x: -1.7, z: -0.8, s: 0.86 },
      { b: () => steppedGlassTower({ h: 10.2, w: 1.05, d: 1.05, frame: 0xa9bfce, pane: 0x52758f, crown: 'crown' }), x: 1.5, z: 1.35, s: 0.84 },
      { b: () => glassTower({ h: 8.5, w: 0.9, d: 0.9, sides: 6, taper: 0.22, frame: 0xb8c7d4, pane: 0x6d8da7 }), x: 3.0, z: -1.7, s: 0.74 },
    ]),
    杭州: () => pack([
      { b: () => pagoda({ tiers: 6, baseR: 1.0, tierH: 1.1, body: 0xc49a68, roof: 0x76523c }), x: -1.8, z: 0.8, s: 0.92 },
      { b: () => glassTower({ h: 8.5, w: 1.0, d: 1.0, sides: 6, taper: 0.3, frame: 0xb8d0de, pane: 0x6d91a7 }), x: 1.4, z: -1.4, s: 0.8 },
      { b: () => glassTower({ h: 7.1, w: 0.82, d: 0.82, sides: 4, taper: 0.16, frame: 0xc6d6df, pane: 0x718aa0 }), x: 2.8, z: 1.25, s: 0.72 },
    ]),
    武汉: () => pack([
      { b: () => pagoda({ tiers: 5, baseR: 1.18, tierH: 1.18, body: 0xd3ae76, roof: 0xb0832e }), x: -1.8, z: 0.7, s: 0.9 },
      { b: () => glassTower({ h: 10.2, w: 1.02, d: 1.02, sides: 4, taper: 0.36, frame: 0xc5d5e2, pane: 0x6688a2, crown: 'crown' }), x: 1.8, z: -1.1, s: 0.82 },
      { b: () => bridgeLandmark({ w: 6.5, d: 0.8, steel: 0xd8b24d, light: 0xc69a4b }), x: 0, z: 2.75, s: 0.58, ry: Math.PI / 2 },
    ]),
    南京: () => pack([
      { b: () => glassTower({ h: 11.3, w: 1.2, d: 1.1, sides: 4, taper: 0.38, frame: 0xb9cbd8, pane: 0x657f98, crown: 'crown', spireH: 1.6 }), x: -1.8, z: -0.8, s: 0.82 },
      { b: () => cityGate({ h: 2.8, wall: 0x9a806a, roof: 0x475d70 }), x: 1.7, z: 1.6, s: 0.9, ry: -0.25 },
      { b: () => pagoda({ tiers: 4, body: 0xb69063, roof: 0x6d5943 }), x: -3.1, z: 2.1, s: 0.65 },
    ]),
    重庆: () => pack([
      { b: () => glassTower({ h: 11.8, w: 1.2, d: 1.1, sides: 6, taper: 0.3, frame: 0xaec0ce, pane: 0x5d7891, crown: 'crown' }), x: -2.2, z: -1.4, s: 0.84 },
      { b: () => glassTower({ h: 9.4, w: 1.0, d: 1.0, sides: 4, taper: 0.22, frame: 0xb5c7d5, pane: 0x627f98 }), x: 0.7, z: 0.8, s: 0.86 },
      { b: () => bridgeLandmark({ w: 7.2, d: 0.85, steel: 0xc8d1da, light: 0x87bce6 }), x: 1.0, z: 2.8, s: 0.62, ry: Math.PI / 2 },
      { b: () => centralPavilion({ body: 0xb45e3e, roof: 0x455b70 }), x: -2.8, z: 2.2, s: 0.62 },
    ]),
    成都: () => pack([
      { b: () => centralPavilion({ tiers: 4, body: 0xc69b68, roof: 0x5f493a }), x: -1.8, z: 0.9, s: 0.86 },
      { b: () => glassTower({ h: 9.4, w: 1.1, d: 1.0, sides: 4, taper: 0.24, frame: 0xb7cbd8, pane: 0x6a8da7, crown: 'crown' }), x: 1.65, z: -1.2, s: 0.84 },
      { b: () => glassTower({ h: 7.4, w: 0.84, d: 0.84, sides: 6, taper: 0.16, frame: 0xc0d0da, pane: 0x718da0 }), x: 2.8, z: 1.45, s: 0.7 },
    ]),
    西安: () => pack([
      { b: () => pagoda({ tiers: 7, baseR: 1.0, tierH: 1.05, square: true, body: 0xb69e83, roof: 0x57483e }), x: -2.0, z: 1.0, s: 0.84 },
      { b: () => imperialHall({ w: 2.6, d: 2.4, h: 1.7, roof: 0x4c5d68, roofH: 0.68, wall: 0xb97d4e, columns: 4 }), x: 1.7, z: -1.3, s: 0.72 },
      { b: () => cityGate({ h: 2.5, wall: 0x8c765f, roof: 0x4d5968 }), x: 2.1, z: 1.9, s: 0.7 },
    ]),
    苏州: () => pack([
      { b: () => glassTower({ h: 9.2, w: 1.05, d: 0.85, sides: 4, taper: 0.18, frame: 0xb8c8d5, pane: 0x63849c, crown: 'crown' }), x: 1.65, z: -1.1, s: 0.82 },
      { b: () => pagoda({ tiers: 7, baseR: 0.9, tierH: 0.94, body: 0xb2a58e, roof: 0x57534b }), x: -2.1, z: 1.2, s: 0.88 },
      { b: cityGate, x: 2.0, z: 1.65, s: 0.7, ry: 0.4 },
    ]),
    天津: () => pack([
      { b: () => bridgeLandmark({ w: 7.2, d: 0.8, steel: 0xd6dde5, light: 0x70bff4 }), x: 0, z: 1.7, s: 0.7, ry: Math.PI / 2 },
      { b: () => glassTower({ h: 8.8, w: 0.95, d: 0.95, sides: 6, taper: 0.25, frame: 0xb7c9d7, pane: 0x688aa1 }), x: -2.4, z: -1.3, s: 0.78 },
    ]),
    哈尔滨: () => pack([
      { b: () => imperialHall({ w: 3.8, d: 2.8, h: 2.2, roof: 0x3d806e, roofH: 1.0, wall: 0x9e5038, columns: 5 }), x: -1.1, z: 0.2, s: 0.88 },
      { b: () => pagoda({ tiers: 4, body: 0x9d4e37, roof: 0x3d806e }), x: 1.9, z: 1.1, s: 0.72 },
    ]),
    香港: () => pack([
      { b: () => glassTower({ h: 11.0, w: 1.1, d: 1.0, sides: 4, taper: 0.4, frame: 0xc6d6e2, pane: 0x5d7891, crown: 'crown', spireH: 1.9 }), x: -1.9, z: -1.1, s: 0.84 },
      { b: () => glassTower({ h: 8.2, w: 0.9, d: 0.9, sides: 6, taper: 0.18, frame: 0xb6c6d1, pane: 0x68859c }), x: 1.2, z: 1.2, s: 0.8 },
      { b: () => cityGate({ h: 2.1, wall: 0x8c7b6f, roof: 0x455c6e }), x: 2.7, z: -1.5, s: 0.56 },
    ]),
    台北: () => pack([
      { b: () => steppedGlassTower({ h: 12.6, w: 1.5, d: 1.5, sections: 9, taper: 0.18, frame: 0xb7c7d4, pane: 0x6d928c, crown: 'crown', spireH: 2.4 }), x: 0, z: 0, s: 0.88 },
      { b: () => cityGate({ h: 2.2, wall: 0xd0c0a2, roof: 0x8b3d35 }), x: -2.4, z: 1.8, s: 0.64 },
    ]),
    郑州: () => pack([
      { b: () => pagoda({ tiers: 6, body: 0xe0d9cc, roof: 0x315c4d }), x: -1.1, z: 0.4, s: 0.88 },
      { b: () => glassTower({ h: 9.0, w: 1.0, d: 0.95, sides: 6, taper: 0.25, frame: 0xb8cbd9, pane: 0x63839a }), x: 1.8, z: -1.2, s: 0.8 },
      { b: () => glassTower({ h: 7.4, w: 0.82, d: 0.82, sides: 4, taper: 0.2, frame: 0xc1d1dc, pane: 0x7690a4 }), x: 2.5, z: 1.5, s: 0.68 },
    ]),
    青岛: () => pack([
      { b: () => bridgeLandmark({ w: 6.8, d: 0.85, steel: 0xd4dce3, light: 0xbf7961 }), x: 0, z: 1.2, s: 0.68, ry: Math.PI / 2 },
      { b: () => imperialHall({ w: 2.7, d: 2.5, h: 1.6, roof: 0xa33b31, roofH: 0.72, wall: 0xe3d6bd, columns: 4 }), x: 0, z: -1.2, s: 0.7 },
      { b: () => glassTower({ h: 7.2, w: 0.85, d: 0.85, sides: 6, taper: 0.2, frame: 0xb5c5d0, pane: 0x6e8aa0 }), x: 2.5, z: -2.0, s: 0.68 },
    ]),
    济南: () => pack([
      { b: () => centralPavilion({ tiers: 5, body: 0xb25b3e, roof: 0x3f6986 }), x: -1.4, z: 0.8, s: 0.86 },
      { b: () => glassTower({ h: 8.8, w: 0.92, d: 0.92, sides: 6, taper: 0.25, frame: 0xb2c4d1, pane: 0x68869c }), x: 1.8, z: -1.5, s: 0.8 },
      { b: () => cityGate({ h: 2.3, wall: 0x9b7e62, roof: 0x4b6372 }), x: 2.4, z: 1.7, s: 0.66 },
    ]),
    烟台: () => pack([
      { b: lighthouse, x: -2.25, z: 1.6, s: 0.94 },
      { b: () => glassTower({ h: 8.4, w: 0.9, d: 0.9, sides: 6, taper: 0.2, frame: 0xc0d2df, pane: 0x6f8fa7, crown: 'crown' }), x: 1.45, z: -1.3, s: 0.78 },
      { b: () => bridgeLandmark({ w: 5.6, d: 0.72, steel: 0xc8d0d8, light: 0xb9d3e6 }), x: 1.3, z: 1.9, s: 0.52, ry: Math.PI / 2 },
    ]),
    威海: () => pack([
      { b: () => openGate(), x: 0, z: 0.1, s: 0.9 },
      { b: () => glassTower({ h: 7.5, w: 0.9, d: 0.9, sides: 6, taper: 0.18, frame: 0xc2d5df, pane: 0x688da3 }), x: 2.1, z: -1.8, s: 0.7 },
    ]),
    日照: () => pack([
      { b: () => bridgeLandmark({ w: 5.2, d: 0.8, steel: 0xc5d2dc, light: 0xb9d8ee }), x: 0, z: 1.4, s: 0.64, ry: Math.PI / 2 },
      { b: () => glassTower({ h: 7.6, w: 0.92, d: 0.92, sides: 6, taper: 0.22, frame: 0xb6cbd9, pane: 0x66889d }), x: 2.0, z: -1.5, s: 0.7 },
    ]),
    曲阜: () => pack([
      { b: () => imperialHall({ w: 3.9, d: 2.5, h: 1.9, roof: 0x315f74, roofH: 0.9, wall: 0x9e3c2e, columns: 5 }), x: 0, z: 0, s: 0.88 },
      { b: () => cityGate({ h: 2.3, wall: 0xb48b59, roof: 0x3b5d6d }), x: 2.3, z: 1.7, s: 0.62 },
    ]),
    泰安: () => pack([
      { b: () => centralPavilion({ tiers: 5, body: 0xb58255, roof: 0x4b4f52 }), x: 0, z: 0.3, s: 0.85 },
      { b: () => pagoda({ tiers: 4, body: 0x9f8569, roof: 0x5e5248 }), x: -2.4, z: 1.2, s: 0.58 },
      { b: () => glassTower({ h: 7.0, w: 0.8, d: 0.8, sides: 6, taper: 0.18, frame: 0xb9c9d5, pane: 0x6c899d }), x: 2.1, z: -1.4, s: 0.68 },
    ]),
    兰州: () => pack([
      { b: () => bridgeLandmark({ w: 7.8, d: 0.86, steel: 0xd8dde3, light: 0xd6b15c }), x: 0, z: 0.5, s: 0.72, ry: Math.PI / 2 },
      { b: () => pagoda({ tiers: 5, body: 0xe2d1af, roof: 0x6e5d4c }), x: 2.0, z: -1.9, s: 0.7 },
    ]),
    海口: () => pack([
      { b: () => bridgeLandmark({ w: 7.4, d: 0.9, steel: 0xd4dbe2, light: 0xa3cde7 }), x: 0, z: 1.0, s: 0.68, ry: Math.PI / 2 },
      { b: () => glassTower({ h: 8.4, w: 0.95, d: 0.95, sides: 6, taper: 0.2, frame: 0xb8d0dc, pane: 0x6e9bae }), x: -2.2, z: -1.4, s: 0.74 },
    ]),
    南昌: () => pack([
      { b: () => centralPavilion({ tiers: 4, body: 0xb34732, roof: 0x2f654e }), x: -1.1, z: 0.5, s: 0.86 },
      { b: () => glassTower({ h: 8.7, w: 0.95, d: 0.95, sides: 6, taper: 0.2, frame: 0xb9ceda, pane: 0x678ca1 }), x: 1.8, z: -1.4, s: 0.78 },
    ]),
    长沙: () => pack([
      { b: () => centralPavilion({ tiers: 4, body: 0xa94536, roof: 0x405a52 }), x: -1.0, z: 0.6, s: 0.84 },
      { b: () => glassTower({ h: 9.2, w: 0.98, d: 0.98, sides: 4, taper: 0.25, frame: 0xb7c9d6, pane: 0x617f98 }), x: 1.8, z: -1.4, s: 0.78 },
    ]),
    福州: () => pack([
      { b: () => centralPavilion({ tiers: 3, body: 0x9f3e32, roof: 0x3b5150 }), x: -1.0, z: 0.7, s: 0.85 },
      { b: () => glassTower({ h: 8.0, w: 0.9, d: 0.9, sides: 6, taper: 0.2, frame: 0xb6cbd6, pane: 0x6e8fa1 }), x: 1.8, z: -1.3, s: 0.76 },
    ]),
    澳门: () => pack([
      { b: () => bridgeLandmark({ w: 7.0, d: 0.78, steel: 0xd4dce5, light: 0xd6a45c }), x: 0, z: 1.2, s: 0.65, ry: Math.PI / 2 },
      { b: () => glassTower({ h: 8.6, w: 1.0, d: 0.9, sides: 6, taper: 0.25, frame: 0xbacbd6, pane: 0x6b8da0, crown: 'crown' }), x: 1.9, z: -1.3, s: 0.76 },
    ]),
  }
}

const BUILDERS = cityBuilders()

export function buildEnhancedLandmark(name) {
  const key = ('' + (name || '')).replace(/[市区县省]/g, '').trim()
  const keys = Object.keys(BUILDERS).sort((a, b) => b.length - a.length)
  for (let i = 0; i < keys.length; i++) {
    if (key.indexOf(keys[i]) !== -1) {
      try {
        return BUILDERS[keys[i]]()
      } catch (e) {
        return null
      }
    }
  }
  return null
}
