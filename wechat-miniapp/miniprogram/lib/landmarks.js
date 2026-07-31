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
  // 球体「呼吸」灯：夜里明暗缓缓起伏
  return {
    group: g,
    glow: [],
    animate(t, base, nf) {
      const breathe = 0.72 + 0.28 * Math.sin(t * 1.6)
      pearl.emissiveIntensity = base * (1 - nf * (1 - breathe))
    },
  }
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
  // 夜里 LED 彩虹流光（白天恒定淡蓝），还原小蛮腰的灯光秀
  return {
    group: g,
    glow,
    animate(t, base, nf) {
      if (nf > 0.25) strutMat.emissive.setHSL((t * 0.045) % 1, 0.85, 0.55)
      else strutMat.emissive.set(0x59c6ff)
    },
  }
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
  const cabMats = []
  for (let i = 0; i < SPOKES; i++) {
    const a = (i / SPOKES) * Math.PI * 2
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, R * 2, 6), steel)
    spoke.rotation.z = a
    wheel.add(spoke)
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), glowMat(0xffffff, 0xffe08a))
    cab.position.set(Math.cos(a) * R, Math.sin(a) * R, 0)
    wheel.add(cab)
    cabMats.push(cab.material)
  }
  g.add(wheel)
  // A 形支架：长度取 cy*1.06，使倾斜后腿脚正好落在 y=0（不穿透托盘）
  const legLen = cy * 1.04
  for (const sx of [-1, 1]) {
    for (const sz of [1, -1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, legLen, 8), steel)
      leg.position.set(sx * 1.4, cy / 2, sz * 0.7)
      leg.rotation.z = sx * 0.28
      leg.rotation.x = -sz * 0.18
      g.add(leg)
    }
  }
  // 轿厢跑马灯：一道亮环绕着轮盘追着跑
  return {
    group: g,
    glow,
    spin: wheel,
    animate(t, base, nf) {
      for (let i = 0; i < cabMats.length; i++) {
        const phase = (i / cabMats.length + t * 0.12) % 1
        const chase = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.cos(phase * Math.PI * 2), 3)
        cabMats[i].emissiveIntensity = base * (1 - nf * (1 - chase))
      }
    },
  }
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

// —— 洋葱顶轮廓（俄式教堂穹顶）：底部接鼓座、中部鼓起、顶部收尖 ——
function onionDome(r, h, seg) {
  const pts = []
  const N = 20
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const rr = r * Math.pow(1 - t, 0.35) * (1 + 0.5 * Math.sin(Math.PI * t))
    pts.push(new THREE.Vector2(Math.max(0.015, rr), h * t))
  }
  return new THREE.LatheGeometry(pts, seg || 20)
}

// —— 台北 101：八段倒梯形「斗」+ 尖塔 ——
function taipei101() {
  const g = new THREE.Group()
  const glow = []
  const glass = glowMat(0x8fb8ae, 0x8fe0c8)
  glow.push(glass)
  const trim = std(0xb8c2cc, { metalness: 0.5, roughness: 0.35 })
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.6, 2.8), trim)
  base.position.y = 0.8
  g.add(base)
  let y = 1.6
  for (let i = 0; i < 8; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.78, 1.0, 4), glass)
    seg.position.y = y + 0.5
    seg.rotation.y = Math.PI / 4
    g.add(seg)
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.12, 4), trim)
    ring.position.y = y + 1.0
    ring.rotation.y = Math.PI / 4
    g.add(ring)
    y += 1.0
  }
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.8, 0.9, 4), trim)
  top.position.y = y + 0.45
  top.rotation.y = Math.PI / 4
  g.add(top)
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.13, 2.2, 8), trim)
  spire.position.y = y + 2.0
  g.add(spire)
  return { group: g, glow }
}

// —— 哈尔滨圣索菲亚教堂：红砖十字堂 + 绿铜洋葱顶 ——
function stSophia() {
  const g = new THREE.Group()
  const glow = []
  const brick = glowMat(0x9c4a35, 0xffb27a)
  glow.push(brick)
  const green = std(0x3f7d6a, { roughness: 0.5, metalness: 0.3 })
  const stone = std(0xd8cdbb, { roughness: 0.85 })

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.4, 5.2), stone)
  plinth.position.y = 0.2
  g.add(plinth)
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.6, 2.8), brick)
  b1.position.y = 1.7
  g.add(b1)
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.6, 4.2), brick)
  b2.position.y = 1.7
  g.add(b2)
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 1.5, 16), brick)
  drum.position.y = 3.75
  g.add(drum)
  const dome = new THREE.Mesh(onionDome(1.28, 2.4), green)
  dome.position.y = 4.5
  g.add(dome)
  const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), std(0xe0c060, { metalness: 0.6 }))
  cross.position.y = 7.2
  g.add(cross)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    const px = Math.cos(a) * 1.75
    const pz = Math.sin(a) * 1.75
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.44, 1.1, 12), brick)
    t.position.set(px, 3.55, pz)
    g.add(t)
    const d = new THREE.Mesh(onionDome(0.46, 0.9, 14), green)
    d.position.set(px, 4.1, pz)
    g.add(d)
  }
  const bell = new THREE.Mesh(new THREE.BoxGeometry(1.5, 4.2, 1.5), brick)
  bell.position.set(0, 2.5, 2.4)
  g.add(bell)
  const bd = new THREE.Mesh(onionDome(0.82, 1.5, 16), green)
  bd.position.set(0, 4.6, 2.4)
  g.add(bd)
  return { group: g, glow }
}

// —— 拉萨布达拉宫：山岩基座 + 白宫两翼 + 中央红宫 + 金顶 ——
function potala() {
  const g = new THREE.Group()
  const glow = []
  const white = glowMat(0xe8e4dc, 0xffe9c0)
  const red = glowMat(0x8e3b2f, 0xff9a5a)
  glow.push(white, red)
  const gold = std(0xd9a441, { metalness: 0.55, roughness: 0.35 })
  const rock = std(0xa89e8c, { roughness: 0.95 })

  // 占地收窄到约 7 个单位，避免把整片城市盖住
  const hill = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.5, 1.6, 7), rock)
  hill.position.y = 0.8
  g.add(hill)
  for (const x of [-1.75, 1.75]) {
    const wing = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 3.0, 4), white)
    wing.position.set(x, 3.1, 0)
    wing.rotation.y = Math.PI / 4
    wing.scale.z = 0.62
    g.add(wing)
  }
  const rp = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 4.4, 4), red)
  rp.position.y = 3.8
  rp.rotation.y = Math.PI / 4
  rp.scale.z = 0.7
  g.add(rp)
  for (const x of [-0.58, 0, 0.58]) {
    const roof = new THREE.Mesh(makeHipRoof(0.52, 1.0, 0.4), gold)
    roof.position.set(x, 6.0, 0)
    g.add(roof)
  }
  return { group: g, glow }
}

// —— 香港中银大厦：四象限逐级收高 + 双桅杆 ——
function bankOfChina() {
  const g = new THREE.Group()
  const glow = []
  const glass = glowMat(0x8fa8c0, 0x9fd0ff)
  glow.push(glass)
  const frame = std(0xdfe6ee, { metalness: 0.5, roughness: 0.3 })
  const s = 0.82
  const quad = [
    [-1, -1, 4.5],
    [1, -1, 7.2],
    [-1, 1, 9.6],
    [1, 1, 12.4],
  ]
  quad.forEach((q) => {
    const h = q[2]
    const m = new THREE.Mesh(new THREE.BoxGeometry(s * 2, h, s * 2), glass)
    m.position.set(q[0] * s, h / 2, q[1] * s)
    g.add(m)
    // 顶部斜切棱
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, s * 1.42, s * 1.5, 4), frame)
    cap.position.set(q[0] * s, h + s * 0.75, q[1] * s)
    cap.rotation.y = Math.PI / 4
    g.add(cap)
  })
  for (const x of [-0.32, 0.32]) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, 2.2, 6), frame)
    mast.position.set(x + s, 14.0, s)
    g.add(mast)
  }
  return { group: g, glow }
}

// —— 郑州二七纪念塔：并联双塔 + 六檐 + 顶端红星 ——
function erqiTower() {
  const g = new THREE.Group()
  const glow = []
  const body = glowMat(0xe6e0d2, 0xffdca8)
  glow.push(body)
  const roofMat = std(0x2f6b4f, { roughness: 0.6 })
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.2, 0.7, 12), std(0xbdb4a4))
  plinth.position.y = 0.35
  g.add(plinth)
  let y = 0.7
  for (let i = 0; i < 6; i++) {
    const r = 0.78 - i * 0.045
    for (const x of [-0.62, 0.62]) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.02, 1.0, 6), body)
      seg.position.set(x, y + 0.5, 0)
      seg.rotation.y = Math.PI / 6
      g.add(seg)
      const rf = new THREE.Mesh(makeConcaveRoof(r * 1.5, 0.42, 0.04, 16), roofMat)
      rf.position.set(x, y + 1.0, 0)
      g.add(rf)
    }
    y += 1.15
  }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.9, 8), std(0xcfd6df))
  pole.position.y = y + 0.15
  g.add(pole)
  const star = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), glowMat(0xd03a2f, 0xff5a3a))
  star.position.y = y + 0.8
  g.add(star)
  glow.push(star.material)
  return { group: g, glow }
}

// —— 青岛栈桥回澜阁：伸向海面的长堤 + 八角重檐亭 ——
function zhanqiao() {
  const g = new THREE.Group()
  const glow = []
  const body = glowMat(0xe4d9c0, 0xffd9a0)
  glow.push(body)
  const roofMat = std(0xb03a30, { roughness: 0.6 })
  const stone = std(0xcfc9bd, { roughness: 0.9 })
  const pier = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 6.5), stone)
  pier.position.set(0, 0.25, 3.0)
  g.add(pier)
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.5, 8), stone)
  plat.position.y = 0.25
  g.add(plat)
  const l1 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.55, 1.4, 8), body)
  l1.position.y = 1.2
  g.add(l1)
  const r1 = new THREE.Mesh(makeConcaveRoof(2.1, 0.7, 0.05), roofMat)
  r1.position.y = 1.9
  g.add(r1)
  const l2 = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.2, 1.2, 8), body)
  l2.position.y = 2.6
  g.add(l2)
  const r2 = new THREE.Mesh(makeConcaveRoof(1.7, 1.1, 0.05), roofMat)
  r2.position.y = 3.2
  g.add(r2)
  const fin = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), std(0xe0b54f, { metalness: 0.6 }))
  fin.position.y = 4.45
  g.add(fin)
  return { group: g, glow }
}

// —— 昆明金马碧鸡坊：四柱三间牌坊 ——
function paifang() {
  const g = new THREE.Group()
  const glow = []
  const pillarMat = std(0x9e3b30, { roughness: 0.7 })
  const beam = glowMat(0xc0392b, 0xff9a5a)
  glow.push(beam)
  const roofMat = std(0x2f6b4f, { roughness: 0.6 })
  for (const x of [-2.7, -0.95, 0.95, 2.7]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 4.0, 10), pillarMat)
    p.position.set(x, 2.0, 0)
    g.add(p)
    const bs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.7), std(0xbdb4a4))
    bs.position.set(x, 0.2, 0)
    g.add(bs)
  }
  const arch = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.45, 0.5), beam)
  arch.position.y = 3.5
  g.add(arch)
  for (const x of [-2.3, 2.3]) {
    const side = new THREE.Mesh(makeHipRoof(2.0, 1.2, 0.6), roofMat)
    side.position.set(x, 3.75, 0)
    g.add(side)
  }
  const mb = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.6, 0.7), beam)
  mb.position.y = 4.05
  g.add(mb)
  const main = new THREE.Mesh(makeHipRoof(3.2, 1.5, 0.85), roofMat)
  main.position.y = 4.35
  g.add(main)
  return { group: g, glow }
}

// —— 沈阳故宫大政殿：八角重檐金顶 ——
function dazhengHall() {
  const g = new THREE.Group()
  const glow = []
  const body = glowMat(0xa8342a, 0xffa060)
  glow.push(body)
  const roofMat = std(0xd9a441, { roughness: 0.5, metalness: 0.2 })
  const stone = std(0xd8d2c4, { roughness: 0.85 })
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.8, 8), stone)
  plat.position.y = 0.4
  g.add(plat)
  const hall = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.05, 2.2, 8), body)
  hall.position.y = 1.9
  g.add(hall)
  const r1 = new THREE.Mesh(makeConcaveRoof(2.8, 0.95, 0.06), roofMat)
  r1.position.y = 3.0
  g.add(r1)
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.45, 1.0, 8), body)
  upper.position.y = 4.2
  g.add(upper)
  const r2 = new THREE.Mesh(makeConcaveRoof(2.0, 1.5, 0.06), roofMat)
  r2.position.y = 4.7
  g.add(r2)
  const fin = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), std(0xe0b54f, { metalness: 0.6 }))
  fin.position.y = 6.45
  g.add(fin)
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
  台北: taipei101,
  哈尔滨: stSophia,
  拉萨: potala,
  香港: bankOfChina,
  郑州: erqiTower,
  青岛: zhanqiao,
  昆明: paifang,
  沈阳: dazhengHall,
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
