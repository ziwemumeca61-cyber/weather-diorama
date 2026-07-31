// 各城市专属地标（小程序精简版）。用 Three.js 基本体拼出辨识度最高的标志建筑，
// 放在城市中心取代通用主塔。每个 builder 返回 { group, glow }：
// glow 是夜间会点亮的材质数组，交给 scene 统一在昼夜间调节自发光强度。
// 找不到对应城市时返回 null，scene 退回到通用主塔。
import * as THREE from './three.module.min.js'
import { makeConcaveRoof, makeHipRoof } from './roofKit'

function std(color, opts) {
  return new THREE.MeshStandardMaterial(
    Object.assign({ color: new THREE.Color(color), roughness: 0.6, metalness: 0.2 }, opts || {}),
  )
}
function glowMat(color, emissive) {
  const m = std(color, { emissive: new THREE.Color(emissive), emissiveIntensity: 0.15 })
  return m
}

// —— 东方明珠（上海）：三脚架 + 大小两球 + 天线 ——
function orientalPearl() {
  const g = new THREE.Group()
  const glow = []
  const steel = std(0xc8ccd6, { metalness: 0.35, roughness: 0.45 })
  const steelDk = std(0x9aa1ac, { metalness: 0.25, roughness: 0.6 })
  const pearl = glowMat(0xc9366b, 0xff4f92)
  glow.push(pearl)

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.25, 0.3, 20), steelDk)
  base.position.y = 0.15
  g.add(base)
  for (let i = 0; i < 3; i++) {
    const th = (i / 3) * Math.PI * 2 + Math.PI / 6
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, 2.9, 10), steel)
    leg.position.set(Math.cos(th) * 0.47, 1.5, Math.sin(th) * 0.47)
    leg.rotation.z = Math.cos(th) * 0.2
    leg.rotation.x = -Math.sin(th) * 0.2
    g.add(leg)
  }
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 7.2, 14), steel)
  shaft.position.y = 5.2
  g.add(shaft)
  const lower = new THREE.Mesh(new THREE.SphereGeometry(1.02, 24, 20), pearl)
  lower.position.y = 3.25
  g.add(lower)
  const upper = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 16), pearl)
  upper.position.y = 6.9
  g.add(upper)
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), pearl)
  bead.position.y = 8.6
  g.add(bead)
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.12, 2.6, 8), steelDk)
  ant.position.y = 10.1
  g.add(ant)
  return { group: g, glow }
}

// —— 广州塔「小蛮腰」：双环错扭的双曲面网格 ——
function cantonTower() {
  const g = new THREE.Group()
  const glow = []
  const N = 22
  const rb = 1.0
  const rt = 0.42
  const H = 8.4
  const twist = 1.1
  const strutMat = glowMat(0x8fb6d8, 0x59c6ff)
  glow.push(strutMat)
  const up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2
    const pb = new THREE.Vector3(Math.cos(a) * rb, 0, Math.sin(a) * rb)
    const pt = new THREE.Vector3(Math.cos(a + twist) * rt, H, Math.sin(a + twist) * rt)
    const dir = new THREE.Vector3().subVectors(pt, pb)
    const len = dir.length()
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, len, 5), strutMat)
    m.position.copy(pb).add(pt).multiplyScalar(0.5)
    m.quaternion.setFromUnitVectors(up, dir.clone().normalize())
    g.add(m)
  }
  ;[0.05, 0.32, 0.55, 0.78, 0.95].forEach((f) => {
    const p = new THREE.Vector3().lerpVectors(
      new THREE.Vector3(rb, 0, 0),
      new THREE.Vector3(Math.cos(twist) * rt, H, Math.sin(twist) * rt),
      f,
    )
    const r = Math.hypot(p.x, p.z)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 8, 28), strutMat)
    ring.position.y = f * H
    ring.rotation.x = Math.PI / 2
    g.add(ring)
  })
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.08, 2.4, 8), std(0xcfd6df, { metalness: 0.4 }))
  spire.position.y = H + 1.2
  g.add(spire)
  return { group: g, glow }
}

// —— 中式多檐塔（雷峰塔/黄鹤楼/大雁塔等复用）——
function pagoda(opts) {
  opts = opts || {}
  const g = new THREE.Group()
  const glow = []
  const tiers = opts.tiers || 5
  const baseR = opts.baseR || 1.15
  const tierH = opts.tierH || 1.25
  const sides = opts.square ? 4 : 8
  const bodyMat = glowMat(opts.body || 0xcb9a63, opts.bodyGlow || 0xffcf7a)
  const roofMat = std(opts.roof || 0x8a5a2f, { roughness: 0.7 })
  glow.push(bodyMat)

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(baseR + 0.35, baseR + 0.55, 0.5, sides), std(0xbdb4a4))
  plinth.position.y = 0.25
  g.add(plinth)
  let y = 0.5
  for (let i = 0; i < tiers; i++) {
    const r = baseR * (1 - i * 0.12)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r * 0.75, tierH * 0.72, sides), bodyMat)
    body.position.y = y + tierH * 0.36
    body.rotation.y = Math.PI / sides
    g.add(body)
    // 起翘飞檐（Web 版同款 LatheGeometry，原点在檐口）
    const roof = new THREE.Mesh(makeConcaveRoof(r * 1.2, tierH * 0.52, 0.04), roofMat)
    roof.position.y = y + tierH * 0.72
    g.add(roof)
    y += tierH * 0.92
  }
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), std(0xe0b54f, { metalness: 0.6, roughness: 0.3 }))
  finial.position.y = y + 0.1
  g.add(finial)
  const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 0.9, 8), std(0xe0b54f, { metalness: 0.6 }))
  spike.position.y = y + 0.6
  g.add(spike)
  return { group: g, glow }
}

// —— 天安门（北京）：红台 + 金色重檐 ——
function tiananmen() {
  const g = new THREE.Group()
  const glow = []
  const wall = std(0x9e2f28, { roughness: 0.75 })
  const gold = std(0xd9a441, { roughness: 0.55, metalness: 0.15 })
  const marble = std(0xece7dc, { roughness: 0.8 })
  const win = glowMat(0xcaa24a, 0xffd24a)
  glow.push(win)

  const terrace = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.6, 2.6), marble)
  terrace.position.y = 0.8
  g.add(terrace)
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.2, 1.9), wall)
  body.position.y = 2.5
  g.add(body)
  // 门洞暖光
  for (let i = -2; i <= 2; i++) {
    const arch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.1), win)
    arch.position.set(i * 1.0, 2.0, 0.96)
    g.add(arch)
  }
  // 重檐庑殿顶（Web 版同款 makeHipRoof：屋面下凹 + 四角起翘）
  const eave1 = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.5, 2.5), gold)
  eave1.position.y = 3.9
  g.add(eave1)
  const roof1 = new THREE.Mesh(makeHipRoof(6.4, 2.8, 1.1), gold)
  roof1.position.y = 4.15
  g.add(roof1)
  const eave2 = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.4, 1.9), gold)
  eave2.position.y = 5.45
  g.add(eave2)
  const roof2 = new THREE.Mesh(makeHipRoof(4.9, 2.1, 0.95), gold)
  roof2.position.y = 5.65
  g.add(roof2)
  return { group: g, glow }
}

// —— 天津之眼：横跨的摩天轮 ——
function ferrisWheel() {
  const g = new THREE.Group()
  const glow = []
  const R = 3.6
  const steel = std(0xd8dde4, { metalness: 0.4, roughness: 0.4 })
  const rim = glowMat(0x6fc3ff, 0x6fc3ff)
  glow.push(rim)
  const cy = R + 1.2
  const wheel = new THREE.Group()
  wheel.position.set(0, cy, 0)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.09, 10, 40), rim)
  wheel.add(ring)
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(R - 0.35, 0.06, 8, 40), rim)
  wheel.add(ring2)
  const SPOKES = 18
  for (let i = 0; i < SPOKES; i++) {
    const a = (i / SPOKES) * Math.PI * 2
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, R * 2, 6), steel)
    spoke.rotation.z = a
    wheel.add(spoke)
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), glowMat(0xffffff, 0xffe08a))
    cab.position.set(Math.cos(a) * R, Math.sin(a) * R, 0)
    wheel.add(cab)
    glow.push(cab.material)
  }
  g.add(wheel)
  // A 形支架
  for (const sx of [-1, 1]) {
    const legF = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, cy * 1.42, 8), steel)
    legF.position.set(sx * 1.4, cy / 2, 0.7)
    legF.rotation.z = sx * 0.28
    legF.rotation.x = -0.18
    g.add(legF)
    const legB = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, cy * 1.42, 8), steel)
    legB.position.set(sx * 1.4, cy / 2, -0.7)
    legB.rotation.z = sx * 0.28
    legB.rotation.x = 0.18
    g.add(legB)
  }
  g.userData.spin = wheel // 供 scene 每帧缓慢转动
  return { group: g, glow, spin: wheel }
}

// —— 通用现代高塔（深圳/默认高层意象）——
function modernTower(opts) {
  opts = opts || {}
  const g = new THREE.Group()
  const glow = []
  const body = glowMat(opts.color || 0x5f86ad, 0xffcf7a)
  glow.push(body)
  const seg = opts.tapered !== false ? 5 : 1
  let y = 0
  let r = 0.85
  for (let i = 0; i < seg; i++) {
    const h = 2.0
    const rt = r * 0.86
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, r, h, 6), body)
    m.position.y = y + h / 2
    g.add(m)
    y += h
    r = rt
  }
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.1, 2.0, 8), std(0xcfd6df, { metalness: 0.5 }))
  spire.position.y = y + 1.0
  g.add(spire)
  return { group: g, glow }
}

// 城市名（中文，Open-Meteo language=zh 返回）→ builder
const BUILDERS = {
  上海: orientalPearl,
  广州: cantonTower,
  北京: tiananmen,
  天津: ferrisWheel,
  杭州: () => pagoda({ tiers: 5, body: 0xcaa06a, roof: 0x8a5a2f, bodyGlow: 0xffcf7a }),
  武汉: () => pagoda({ tiers: 5, body: 0xd8b878, roof: 0xc9a227, bodyGlow: 0xffe0a0 }),
  西安: () => pagoda({ tiers: 6, baseR: 1.1, tierH: 1.15, square: true, body: 0xb9a68c, roof: 0x6f5a44 }),
  南京: () => pagoda({ tiers: 6, body: 0xd7cbb2, roof: 0x7a6248 }),
  开封: () => pagoda({ tiers: 6, body: 0x7a6a55, roof: 0x4a3d2f }),
  苏州: () => pagoda({ tiers: 7, baseR: 1.0, tierH: 1.0, body: 0xcfc3aa, roof: 0x6f5a44 }),
  深圳: () => modernTower({ color: 0x6f9ec4 }),
  重庆: () => modernTower({ color: 0x7f93a8 }),
  成都: () => pagoda({ tiers: 4, body: 0xc7a878, roof: 0x7a5a34 }),
}

// 去掉「市/区/县」等后缀，做包含匹配，提升命中率
export function buildLandmark(name) {
  if (!name) return null
  const key = ('' + name).replace(/[市区县省]/g, '').trim()
  for (const k in BUILDERS) {
    if (key.indexOf(k) !== -1) {
      try {
        return BUILDERS[k]()
      } catch (e) {
        return null
      }
    }
  }
  return null
}
