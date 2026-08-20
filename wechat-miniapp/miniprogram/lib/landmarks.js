// 各城市专属地标（小程序精简版）。用 Three.js 基本体拼出辨识度最高的标志建筑，
// 放在城市中心取代通用主塔。每个 builder 返回 { group, glow }：
// glow 是夜间会点亮的材质数组，交给 scene 统一在昼夜间调节自发光强度。
// 找不到对应城市时返回 null，scene 退回到通用主塔。
import * as THREE from './three.core.js'
import { makeConcaveRoof, makeHipRoof } from './roofKit'
import { makeTileTexture, makeWindowTexture, darken } from './tileTexture'
import { mulberry32, hashName } from './cityData'
import { buildEnhancedLandmark } from './landmarksEnhanced'

function std(color, opts) {
  return new THREE.MeshStandardMaterial(
    Object.assign({ color: new THREE.Color(color), roughness: 0.56, metalness: 0.18, envMapIntensity: 0.72 }, opts || {}),
  )
}
function glowMat(color, emissive) {
  const m = std(color, { emissive: new THREE.Color(emissive), emissiveIntensity: 0.08 })
  return m
}
// 带釉面瓦纹理的屋顶材质（贴图已含底色，故 color 取白）
function tiledRoof(baseHex, repX, repY, extra) {
  return new THREE.MeshStandardMaterial(
    Object.assign(
      {
        color: 0xffffff,
        map: makeTileTexture(baseHex, darken(baseHex, 0.68), repX, repY),
        roughness: 0.62,
        metalness: 0.15,
      },
      extra || {},
    ),
  )
}

// —— 东方明珠（上海）：三脚架 + 大小两球 + 天线 ——
function orientalPearl() {
  const g = new THREE.Group()
  const glow = []
  const steel = std(0xc8ccd6, { metalness: 0.35, roughness: 0.45 })
  const steelDk = std(0x9aa1ac, { metalness: 0.25, roughness: 0.6 })
  const pearl = glowMat(0xa83a5a, 0xd94f7a) // 原来的艳粉在真机上过于玩具化
  glow.push(pearl)

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.25, 0.3, 20), steelDk)
  base.position.y = 0.15
  g.add(base)
  for (let i = 0; i < 3; i++) {
    const th = (i / 3) * Math.PI * 2 + Math.PI / 6
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 2.9, 8), steel)
    leg.position.set(Math.cos(th) * 0.47, 1.5, Math.sin(th) * 0.47)
    leg.rotation.z = Math.cos(th) * 0.2
    leg.rotation.x = -Math.sin(th) * 0.2
    g.add(leg)
  }
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 7.2, 12), steel)
  shaft.position.y = 5.2
  g.add(shaft)
  const lower = new THREE.Mesh(new THREE.SphereGeometry(0.72, 20, 16), pearl)
  lower.position.y = 3.25
  g.add(lower)
  const upper = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), pearl)
  upper.position.y = 6.9
  g.add(upper)
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), pearl)
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
  const roofMat = tiledRoof(opts.roof || 0x8a5a2f, 10, 1)
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
  const goldTile = tiledRoof(0xd9a441, 7, 2, { metalness: 0.25 })
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
  const roof1 = new THREE.Mesh(makeHipRoof(6.4, 2.8, 1.1), goldTile)
  roof1.position.y = 4.15
  g.add(roof1)
  const eave2 = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.4, 1.9), gold)
  eave2.position.y = 5.45
  g.add(eave2)
  const roof2 = new THREE.Mesh(makeHipRoof(4.9, 2.1, 0.95), goldTile)
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
  const body = curtainWall(opts.color || 0x5f86ad, 1.8, 8)
  glow.push(body)
  const trim = std(0xd7e0e8, { metalness: 0.55, roughness: 0.32 })
  const seg = opts.tapered !== false ? 5 : 1
  let y = 0
  let r = 0.85
  for (let i = 0; i < seg; i++) {
    const h = 2.0
    const rt = r * 0.86
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, r, h, 6), body)
    m.position.y = y + h / 2
    g.add(m)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.01, 0.035, 6, 18), trim)
    ring.position.y = y + h
    g.add(ring)
    y += h
    r = rt
  }
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.08, r * 1.08, 0.12, 6), trim)
  crown.position.y = y + 0.06
  g.add(crown)
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
  const roofMat = tiledRoof(0x2f6b4f, 8, 1)
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
  const roofMat = tiledRoof(0xb03a30, 9, 1)
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
  const roofMat = tiledRoof(0x2f6b4f, 5, 2)
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
  const roofMat = tiledRoof(0xd9a441, 9, 1, { metalness: 0.3 })
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

// —— 中式楼阁（滕王阁/甲秀楼/天心阁/镇海楼复用）：矩形多重檐 ——
function pavilion(opts) {
  opts = opts || {}
  const g = new THREE.Group()
  const glow = []
  const tiers = opts.tiers || 3
  const w = opts.w || 4.0
  const d = opts.d || 2.6
  const tierH = opts.tierH || 1.5
  const bodyMat = glowMat(opts.body || 0xc4302b, opts.bodyGlow || 0xffb066)
  glow.push(bodyMat)
  const roofMat = tiledRoof(opts.roof || 0x2f6b4f, 6, 2)
  const stone = std(0xcfc9bd, { roughness: 0.9 })

  const ph = opts.platform == null ? 0.8 : opts.platform
  if (ph > 0) {
    const plat = new THREE.Mesh(new THREE.BoxGeometry(w + 1.3, ph, d + 1.3), stone)
    plat.position.y = ph / 2
    g.add(plat)
  }
  let y = ph
  for (let i = 0; i < tiers; i++) {
    const sc = 1 - i * 0.12
    const bw = w * sc
    const bd = d * sc
    const body = new THREE.Mesh(new THREE.BoxGeometry(bw, tierH * 0.7, bd), bodyMat)
    body.position.y = y + tierH * 0.35
    g.add(body)
    const roof = new THREE.Mesh(makeHipRoof(bw * 1.3, bd * 1.38, tierH * 0.6), roofMat)
    roof.position.y = y + tierH * 0.7
    g.add(roof)
    y += tierH * 0.92
  }
  return { group: g, glow, top: y }
}

// —— 贵阳甲秀楼：三层楼阁 + 浮玉桥 ——
function jiaxiuLou() {
  const p = pavilion({ tiers: 3, w: 2.5, d: 2.5, tierH: 1.45, body: 0xc4302b, roof: 0x2f6b4f, platform: 0.9 })
  const stone = std(0xcfc9bd, { roughness: 0.9 })
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 5.4), stone)
  deck.position.set(0, 1.2, 4.0)
  p.group.add(deck)
  for (let i = 0; i < 3; i++) {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.14, 6, 14, Math.PI), stone)
    arch.position.set(0, 1.05, 2.2 + i * 1.75)
    arch.rotation.y = Math.PI / 2
    p.group.add(arch)
  }
  return p
}

// —— 济南泉标：三叉泉柱 + 圆形水池 ——
function quanbiao() {
  const g = new THREE.Group()
  const glow = []
  const blue = glowMat(0x3f8fc4, 0x7fd8ff)
  glow.push(blue)
  const stone = std(0xd8d2c4, { roughness: 0.85 })
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.5, 0.35, 22), stone)
  pool.position.y = 0.17
  g.add(pool)
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(2.9, 2.9, 0.12, 22),
    std(0x4f9fd0, { roughness: 0.25, metalness: 0.35 }),
  )
  water.position.y = 0.36
  g.add(water)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2
    const h = 6.2
    const prong = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.5), blue)
    prong.position.set(Math.cos(a) * 0.95, 0.35 + h / 2, Math.sin(a) * 0.95)
    prong.rotation.z = -Math.cos(a) * 0.16
    prong.rotation.x = Math.sin(a) * 0.16
    g.add(prong)
  }
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 2.4, 12), blue)
  core.position.y = 1.5
  g.add(core)
  return { group: g, glow }
}

// —— 澳门大三巴牌坊：逐层收窄的石façade + 三角山花 ——
function stPauls() {
  const g = new THREE.Group()
  const glow = []
  const stone = glowMat(0xd9cfbb, 0xffe2b0)
  glow.push(stone)
  const dark = std(0x8c8172, { roughness: 0.9 })
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.18, 0.5), dark)
    s.position.set(0, 0.09 + i * 0.18, 1.6 + i * 0.5)
    g.add(s)
  }
  const base = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.9, 1.0), dark)
  base.position.y = 0.45
  g.add(base)
  let y = 0.9
  const tiers = [
    [5.0, 1.7],
    [4.2, 1.5],
    [3.3, 1.4],
    [2.4, 1.2],
  ]
  tiers.forEach((t) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(t[0], t[1], 0.45), stone)
    wall.position.y = y + t[1] / 2
    g.add(wall)
    const cor = new THREE.Mesh(new THREE.BoxGeometry(t[0] + 0.3, 0.16, 0.62), dark)
    cor.position.y = y + t[1]
    g.add(cor)
    y += t[1]
  })
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 1.35, 1.0, 3), stone)
  ped.position.y = y + 0.5
  ped.rotation.y = Math.PI / 2
  ped.scale.z = 0.3
  g.add(ped)
  const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), dark)
  cross.position.y = y + 1.3
  g.add(cross)
  return { group: g, glow }
}

// —— 呼和浩特蒙古包群 ——
function yurts() {
  const g = new THREE.Group()
  const glow = []
  const felt = glowMat(0xf2efe6, 0xffe6b8)
  glow.push(felt)
  const trim = std(0x2f6b8f, { roughness: 0.7 })
  const grass = std(0x7fa05a, { roughness: 0.95 })
  const base = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.4, 0.3, 18), grass)
  base.position.y = 0.15
  g.add(base)
  const spots = [
    [0, 0, 1.3],
    [2.2, 1.2, 0.85],
    [-2.1, -1.3, 0.9],
    [0.9, -2.3, 0.72],
    [-1.6, 2.1, 0.7],
  ]
  spots.forEach((s) => {
    const r = s[2]
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 0.9, 16), felt)
    wall.position.set(s[0], 0.3 + r * 0.45, s[1])
    g.add(wall)
    const roof = new THREE.Mesh(new THREE.ConeGeometry(r * 1.08, r * 0.75, 16), felt)
    roof.position.set(s[0], 0.3 + r * 0.9 + r * 0.375, s[1])
    g.add(roof)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.22, 0.05, 6, 12), trim)
    ring.position.set(s[0], 0.3 + r * 0.9 + r * 0.72, s[1])
    ring.rotation.x = Math.PI / 2
    g.add(ring)
    const door = new THREE.Mesh(new THREE.BoxGeometry(r * 0.4, r * 0.55, 0.08), trim)
    door.position.set(s[0], 0.3 + r * 0.28, s[1] + r * 0.98)
    g.add(door)
  })
  return { group: g, glow }
}

// —— 兰州中山桥：黄河铁桥，四道钢拱 ——
function zhongshanBridge() {
  const g = new THREE.Group()
  const glow = []
  const steel = glowMat(0x8a9aa8, 0x9fd0ff)
  glow.push(steel)
  const deckMat = std(0xd8d2c4, { roughness: 0.85 })
  // 河面放宽到 5.6：连带把中心广场的清空范围撑开，桥不会被岸边高楼夹住
  const river = new THREE.Mesh(
    new THREE.BoxGeometry(9.0, 0.2, 5.6),
    std(0x3f6f8f, { roughness: 0.3, metalness: 0.35 }),
  )
  river.position.y = 0.1
  g.add(river)
  const deck = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.3, 1.5), deckMat)
  deck.position.y = 1.5
  g.add(deck)
  for (const x of [-2.15, 0, 2.15]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.5, 1.6), deckMat)
    pier.position.set(x, 0.75, 0)
    g.add(pier)
  }
  for (let i = 0; i < 4; i++) {
    const cx = -3.225 + i * 2.15
    for (const z of [-0.62, 0.62]) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.075, 0.06, 6, 16, Math.PI), steel)
      arch.position.set(cx, 1.65, z)
      g.add(arch)
    }
  }
  return { group: g, glow }
}

// —— 西宁塔尔寺白塔（覆钵式佛塔）——
function stupa() {
  const g = new THREE.Group()
  const glow = []
  const white = glowMat(0xf0ece2, 0xffe9c0)
  glow.push(white)
  const gold = std(0xd9a441, { metalness: 0.55, roughness: 0.35 })
  const sizes = [
    [3.0, 1.0, 0.5],
    [2.4, 0.8, 1.4],
    [1.9, 0.7, 2.15],
  ]
  sizes.forEach((s) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(s[0], s[1], s[0]), white)
    b.position.y = s[2]
    g.add(b)
  })
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(1.15, 18, 14), white)
  bowl.position.y = 3.1
  bowl.scale.y = 1.15
  g.add(bowl)
  let y = 4.25
  for (let i = 0; i < 9; i++) {
    const r = 0.42 - i * 0.032
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.03, 0.16, 12), gold)
    ring.position.y = y
    g.add(ring)
    y += 0.17
  }
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.4, 12), gold)
  canopy.position.y = y + 0.2
  g.add(canopy)
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), gold)
  top.position.y = y + 0.55
  g.add(top)
  return { group: g, glow }
}

// —— 乌鲁木齐大巴扎塔：伊斯兰风格塔身 + 穹顶 ——
function bazaarTower() {
  const g = new THREE.Group()
  const glow = []
  const body = glowMat(0xc9a06a, 0xffd9a0)
  glow.push(body)
  const teal = std(0x2f7d8f, { roughness: 0.5, metalness: 0.25 })
  const base = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.4, 4.2), body)
  base.position.y = 0.7
  g.add(base)
  let y = 1.4
  let r = 1.1
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r, 1.6, 8), body)
    seg.position.y = y + 0.8
    g.add(seg)
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.16, 8), teal)
    band.position.y = y + 1.6
    g.add(band)
    y += 1.6
    r *= 0.9
  }
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(r * 1.02, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    teal,
  )
  dome.position.y = y
  g.add(dome)
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.09, 1.0, 8), teal)
  spire.position.y = y + r * 1.02 + 0.5
  g.add(spire)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    const px = Math.cos(a) * 1.7
    const pz = Math.sin(a) * 1.7
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 2.2, 8), body)
    t.position.set(px, 2.5, pz)
    g.add(t)
    const d = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      teal,
    )
    d.position.set(px, 3.6, pz)
    g.add(d)
  }
  return { group: g, glow }
}

// —— 合肥徽派民居：白墙黛瓦 + 阶梯马头墙 ——
function huizhouHouses() {
  const g = new THREE.Group()
  const glow = []
  const wall = glowMat(0xf0ede6, 0xffe8c0)
  glow.push(wall)
  const tile = std(0x3a3f47, { roughness: 0.75 })
  const houses = [
    [-1.9, 0, 2.8, 2.0, 2.5],
    [1.3, -0.7, 3.0, 1.9, 2.2],
    [-0.3, 2.4, 2.4, 1.7, 1.9],
  ]
  houses.forEach((h) => {
    const x = h[0]
    const z = h[1]
    const w = h[2]
    const d = h[3]
    const ht = h[4]
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, ht, d), wall)
    body.position.set(x, ht / 2, z)
    g.add(body)
    // 马头墙：两端阶梯式山墙，逐级向中间升高
    for (const sx of [-1, 1]) {
      for (let s = 0; s < 3; s++) {
        const sw = 0.26
        const sh = 0.38
        const px = x + sx * (w / 2 - sw / 2 - s * sw * 0.95)
        const py = ht + sh / 2 + s * sh * 0.7
        const step = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, d + 0.14), wall)
        step.position.set(px, py, z)
        g.add(step)
        const cap = new THREE.Mesh(new THREE.BoxGeometry(sw + 0.12, 0.09, d + 0.26), tile)
        cap.position.set(px, py + sh / 2, z)
        g.add(cap)
      }
    }
    const roof = new THREE.Mesh(makeHipRoof(w * 0.9, d * 1.08, 0.45, 0.75, 0.05), tile)
    roof.position.set(x, ht, z)
    g.add(roof)
  })
  return { group: g, glow }
}

// —— 海口钟楼 + 椰林 ——
function haikouClock() {
  const g = new THREE.Group()
  const glow = []
  const body = glowMat(0xe8ded0, 0xffe0b0)
  const face = glowMat(0xfff6e0, 0xfff0c0)
  glow.push(body, face)
  const trim = std(0xb04a35, { roughness: 0.7 })
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.0, 2.0), body)
  base.position.y = 0.5
  g.add(base)
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(1.5, 5.0, 1.5), body)
  shaft.position.y = 3.5
  g.add(shaft)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2
    const cf = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.1, 16), face)
    cf.position.set(Math.sin(a) * 0.78, 5.6, Math.cos(a) * 0.78)
    cf.rotation.x = Math.PI / 2
    cf.rotation.y = a
    g.add(cf)
  }
  const cor = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.25, 1.9), trim)
  cor.position.y = 6.15
  g.add(cor)
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.2), body)
  top.position.y = 6.7
  g.add(top)
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.0, 4), trim)
  cap.position.y = 7.6
  cap.rotation.y = Math.PI / 4
  g.add(cap)
  const trunkMat = std(0x8a6a44, { roughness: 0.9 })
  const leafMat = std(0x3f8a4a, { roughness: 0.8 })
  const palms = [
    [-2.6, 1.4],
    [2.7, -1.2],
    [-1.8, -2.6],
    [2.2, 2.4],
  ]
  palms.forEach((p, k) => {
    const h = 2.6 + (k % 2) * 0.7
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.15, h, 7), trunkMat)
    tr.position.set(p[0], h / 2, p[1])
    tr.rotation.z = (k % 2 ? 1 : -1) * 0.09
    g.add(tr)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + k
      const fr = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.4, 5), leafMat)
      fr.position.set(p[0] + Math.cos(a) * 0.5, h + 0.1, p[1] + Math.sin(a) * 0.5)
      fr.rotation.z = Math.cos(a) * 1.0
      fr.rotation.x = -Math.sin(a) * 1.0
      g.add(fr)
    }
  })
  return { group: g, glow }
}

// —— 太原永祚寺双塔 ——
function twinPagodas() {
  const g = new THREE.Group()
  const glow = []
  const bodyMat = glowMat(0xa9a396, 0xffd9a0)
  glow.push(bodyMat)
  const roofMat = tiledRoof(0x6b6257, 8, 1)
  const base = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.4, 3.2), std(0xbdb4a4))
  base.position.y = 0.2
  g.add(base)
  for (const x of [-1.8, 1.8]) {
    let y = 0.4
    for (let i = 0; i < 7; i++) {
      const r = 0.7 - i * 0.052
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.94, 0.75, 8), bodyMat)
      seg.position.set(x, y + 0.375, 0)
      seg.rotation.y = Math.PI / 8
      g.add(seg)
      const rf = new THREE.Mesh(makeConcaveRoof(r * 1.35, 0.3, 0.04, 16), roofMat)
      rf.position.set(x, y + 0.75, 0)
      g.add(rf)
      y += 0.9
    }
    const fin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.09, 0.7, 8),
      std(0xd9a441, { metalness: 0.55 }),
    )
    fin.position.set(x, y + 0.3, 0)
    g.add(fin)
  }
  return { group: g, glow }
}

// —— 银川西夏王陵：夯土陵台 ——
function xixiaTombs() {
  const g = new THREE.Group()
  const glow = []
  const earth = glowMat(0xc9a878, 0xffd9a0)
  glow.push(earth)
  const sand = std(0xd8c7a2, { roughness: 0.98 })
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.0, 0.25, 16), sand)
  ground.position.y = 0.12
  g.add(ground)
  const tombs = [
    [0, 0, 1.4, 3.4],
    [2.1, 1.2, 0.8, 1.9],
    [-1.9, -1.1, 0.7, 1.7],
  ]
  tombs.forEach((t) => {
    let y = 0.25
    for (let i = 0; i < 4; i++) {
      const f = 1 - i * 0.17
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(t[2] * f * 0.86, t[2] * f, t[3] * 0.19, 12),
        earth,
      )
      seg.position.set(t[0], y + t[3] * 0.095, t[1])
      g.add(seg)
      y += t[3] * 0.19
    }
    const cap = new THREE.Mesh(new THREE.SphereGeometry(t[2] * 0.45, 14, 10), earth)
    cap.position.set(t[0], y, t[1])
    cap.scale.y = 1.3
    g.add(cap)
  })
  return { group: g, glow }
}

/* ================= 山东 15 市 + 石家庄 / 长春 / 南宁 ================= */

// —— 泰安泰山：噪声扰动的山体，山脚植被绿 → 山顶花岗岩灰 ——
function mountTai() {
  const g = new THREE.Group()
  const glow = []
  const geo = new THREE.ConeGeometry(3.6, 7.0, 26, 8)
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const green = new THREE.Color(0x5f7d4a)
  const rock = new THREE.Color(0x9a958c)
  const snow = new THREE.Color(0xdcdbd6)
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    // 确定性噪声：按角度+高度扰动半径，做出山脊与沟壑
    const a = Math.atan2(z, x)
    const t = (y + 3.5) / 7.0
    const n =
      Math.sin(a * 5) * 0.2 + Math.sin(a * 11 + 1.7) * 0.12 + Math.sin(a * 3 - 0.6) * 0.16
    const k = 1 + n * (1 - t) * 0.55
    pos.setX(i, x * k)
    pos.setZ(i, z * k)
    pos.setY(i, Math.max(-3.5, y + Math.sin(a * 7) * (1 - t) * 0.25))
    const h = Math.max(0, Math.min(1, t))
    if (h < 0.62) c.copy(green).lerp(rock, h / 0.62)
    else c.copy(rock).lerp(snow, (h - 0.62) / 0.38)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  const mtn = new THREE.Mesh(geo, std(0xffffff, { vertexColors: true, roughness: 0.95, metalness: 0 }))
  mtn.position.y = 3.5
  g.add(mtn)
  // 南天门（山顶小殿）
  const gate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.7), glowMat(0xa8342a, 0xffa060))
  gate.position.y = 6.9
  g.add(gate)
  glow.push(gate.material)
  const gRoof = new THREE.Mesh(makeHipRoof(1.35, 0.95, 0.32), tiledRoof(0xd9a441, 4, 1))
  gRoof.position.y = 7.15
  g.add(gRoof)
  // 盘山石阶
  for (let i = 0; i < 16; i++) {
    const t = i / 16
    const a = t * 3.4
    const r = 2.9 * (1 - t * 0.82)
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.34), std(0xcfc9bd, { roughness: 0.9 }))
    st.position.set(Math.cos(a) * r, 0.5 + t * 6.0, Math.sin(a) * r)
    st.rotation.y = -a
    g.add(st)
  }
  return { group: g, glow }
}

// —— 曲阜大成殿：白台 + 红柱 + 黄琉璃重檐 ——
function dachengHall() {
  const g = new THREE.Group()
  const glow = []
  const body = glowMat(0xa8342a, 0xffa060)
  glow.push(body)
  const marble = std(0xece7dc, { roughness: 0.85 })
  const roofMat = tiledRoof(0xd9a441, 8, 2, { metalness: 0.28 })
  ;[
    [6.4, 0.45, 4.2, 0.22],
    [5.6, 0.4, 3.6, 0.65],
  ].forEach((t) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(t[0], t[1], t[2]), marble)
    p.position.y = t[3]
    g.add(p)
  })
  const hall = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.9, 2.8), body)
  hall.position.y = 1.8
  g.add(hall)
  for (let i = -3; i <= 3; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 1.9, 10), body)
    col.position.set(i * 0.72, 1.8, 1.5)
    g.add(col)
  }
  const eave1 = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.34, 3.5), roofMat)
  eave1.position.y = 2.9
  g.add(eave1)
  const r1 = new THREE.Mesh(makeHipRoof(5.8, 3.8, 1.0), roofMat)
  r1.position.y = 3.07
  g.add(r1)
  const eave2 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.3, 2.7), roofMat)
  eave2.position.y = 4.2
  g.add(eave2)
  const r2 = new THREE.Mesh(makeHipRoof(4.5, 2.9, 0.9), roofMat)
  r2.position.y = 4.35
  g.add(r2)
  return { group: g, glow }
}

// —— 烟台山灯塔：白色石塔 + 灯室 + 看守屋 ——
function lighthouse() {
  const g = new THREE.Group()
  const glow = []
  const white = glowMat(0xf0ece2, 0xffe9c0)
  glow.push(white)
  const lamp = glowMat(0xfff3c4, 0xffd45a)
  glow.push(lamp)
  const rock = std(0x9a958c, { roughness: 0.95 })
  const headland = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.2, 0.9, 12), rock)
  headland.position.y = 0.45
  g.add(headland)
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.92, 5.4, 14), white)
  shaft.position.y = 3.6
  g.add(shaft)
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.22, 14), std(0x3a4550))
  gallery.position.y = 6.35
  g.add(gallery)
  const room = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.85, 12), lamp)
  room.position.y = 6.85
  g.add(room)
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.65, 12), std(0x3a4550))
  cap.position.y = 7.6
  g.add(cap)
  const cottage = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 1.3), white)
  cottage.position.set(1.9, 1.4, 0.6)
  g.add(cottage)
  const cRoof = new THREE.Mesh(makeHipRoof(2.1, 1.6, 0.5, 0.6, 0.06), std(0xb03a30, { roughness: 0.7 }))
  cRoof.position.set(1.9, 1.9, 0.6)
  g.add(cRoof)
  return { group: g, glow }
}

// —— 东营：黄河口油城，磕头机 + 储油罐 ——
function oilField() {
  const g = new THREE.Group()
  const glow = []
  const steel = std(0xb8bec6, { metalness: 0.45, roughness: 0.5 })
  const red = std(0xc0463a, { roughness: 0.6 })
  const marsh = glowMat(0xb5533f, 0xff8a5a) // 红地毯碱蓬
  glow.push(marsh)
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.6, 0.22, 16), marsh)
  ground.position.y = 0.11
  g.add(ground)
  // 三台磕头机
  const pumps = [
    [0, 0, 1.0],
    [2.4, 1.5, 0.75],
    [-2.3, -1.4, 0.8],
  ]
  const pumpAnim = []
  pumps.forEach((p) => {
    const s = p[2]
    const skid = new THREE.Mesh(new THREE.BoxGeometry(1.8 * s, 0.2 * s, 0.9 * s), steel)
    skid.position.set(p[0], 0.32, p[1])
    g.add(skid)
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.13 * s, 1.7 * s, 6), steel)
    post.position.set(p[0], 0.32 + 0.85 * s, p[1])
    g.add(post)
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.4 * s, 0.16 * s, 0.16 * s), red)
    beam.position.set(p[0], 0.32 + 1.7 * s, p[1])
    g.add(beam)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.42 * s, 0.2 * s), red)
    head.position.set(p[0] + 1.15 * s, 0.32 + 1.55 * s, p[1])
    g.add(head)
    pumpAnim.push({ beam: beam, head: head, s: s, x: p[0], y: 0.32 + 1.7 * s, z: p[1] })
  })
  // 储油罐
  for (const t of [
    [-3.0, 2.2, 0.85],
    [3.1, -2.0, 0.7],
  ]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(t[2], t[2], t[2] * 1.4, 14), steel)
    tank.position.set(t[0], 0.22 + t[2] * 0.7, t[1])
    g.add(tank)
    const lid = new THREE.Mesh(
      new THREE.SphereGeometry(t[2], 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      steel,
    )
    lid.position.set(t[0], 0.22 + t[2] * 1.4, t[1])
    g.add(lid)
  }
  return {
    group: g,
    glow,
    animate(t) {
      // 磕头机上下点头
      for (let i = 0; i < pumpAnim.length; i++) {
        const p = pumpAnim[i]
        const ang = Math.sin(t * 1.1 + i * 1.7) * 0.28
        p.beam.rotation.z = ang
        p.head.position.y = p.y - 0.15 * p.s + Math.sin(ang) * 1.15 * p.s
      }
    },
  }
}

// —— 潍坊：风筝之都，无轴摩天轮「渤海之眼」+ 天上的风筝 ——
function kiteCity() {
  const g = new THREE.Group()
  const glow = []
  const rim = glowMat(0x6fc3ff, 0x6fc3ff)
  glow.push(rim)
  const steel = std(0xd8dde4, { metalness: 0.4, roughness: 0.4 })
  const R = 2.9
  const cy = R + 0.9
  const wheel = new THREE.Group()
  wheel.position.set(0, cy, 0)
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.13, 8, 36), rim))
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(R - 0.42, 0.07, 6, 32), rim))
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.5), glowMat(0xffffff, 0xffe08a))
    cab.position.set(Math.cos(a) * (R - 0.21), Math.sin(a) * (R - 0.21), 0)
    wheel.add(cab)
    glow.push(cab.material)
  }
  g.add(wheel)
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, cy * 1.01, 8), steel)
    leg.position.set(sx * 1.1, cy / 2, 0)
    leg.rotation.z = sx * 0.24
    g.add(leg)
  }
  // 风筝：彩色菱形，飘在空中
  const kites = []
  const cols = [0xe0553f, 0x3f8fc4, 0xf0b429, 0x5aa86a, 0x9a6fd0]
  for (let i = 0; i < 5; i++) {
    const k = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.34, 0),
      glowMat(cols[i], cols[i]),
    )
    glow.push(k.material)
    k.scale.set(1, 1.5, 0.12)
    const a = (i / 5) * Math.PI * 2
    k.position.set(Math.cos(a) * 3.4, 6.2 + (i % 3) * 0.8, Math.sin(a) * 3.4)
    g.add(k)
    kites.push({ m: k, a: a, y: k.position.y })
  }
  return {
    group: g,
    glow,
    spin: wheel,
    animate(t) {
      for (let i = 0; i < kites.length; i++) {
        const k = kites[i]
        k.m.position.y = k.y + Math.sin(t * 0.9 + i) * 0.35
        k.m.rotation.z = Math.sin(t * 1.3 + i) * 0.35
      }
    },
  }
}

// —— 威海幸福门：海边圆孔玻璃门形建筑 ——
function gateOfHappiness() {
  const g = new THREE.Group()
  const glow = []
  const glass = glowMat(0x7fb8d8, 0x9fd8ff)
  glow.push(glass)
  const stone = std(0xd8d2c4, { roughness: 0.88 })
  const sea = std(0x3f7f9f, { roughness: 0.28, metalness: 0.35 })
  const water = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.18, 3.2), sea)
  water.position.set(0, 0.09, -3.2)
  g.add(water)
  const promenade = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.35, 3.0), stone)
  promenade.position.set(0, 0.17, 0.4)
  g.add(promenade)
  // 门形：两根立柱 + 顶梁
  for (const sx of [-1, 1]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.85, 5.4, 1.0), glass)
    pier.position.set(sx * 1.85, 3.05, 0)
    g.add(pier)
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.7, 1.0, 1.0), glass)
  lintel.position.y = 6.25
  g.add(lintel)
  // 标志性圆孔：用圆环表示
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.24, 10, 26), glass)
  ring.position.y = 4.0
  g.add(ring)
  return { group: g, glow }
}

// —— 日照：白色风帆雕塑 + 金色沙滩 ——
function sailSculpture() {
  const g = new THREE.Group()
  const glow = []
  const white = glowMat(0xf6f3ec, 0xffe9c0)
  glow.push(white)
  const sand = std(0xe4d3a8, { roughness: 0.95 })
  const sea = std(0x3f8fb0, { roughness: 0.25, metalness: 0.35 })
  const beach = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.4, 0.25, 18), sand)
  beach.position.y = 0.12
  g.add(beach)
  const water = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.16, 2.6), sea)
  water.position.set(0, 0.08, -3.1)
  g.add(water)
  // 三片帆：不同高度的曲面（用扁平锥近似）
  const sails = [
    [0, 0, 5.6, 1.7],
    [1.2, 0.7, 4.0, 1.25],
    [-1.15, -0.6, 3.2, 1.0],
  ]
  sails.forEach((s, i) => {
    const sail = new THREE.Mesh(new THREE.ConeGeometry(s[3], s[2], 3), white)
    sail.position.set(s[0], 0.25 + s[2] / 2, s[1])
    sail.rotation.y = Math.PI / 6 + i * 0.5
    sail.scale.z = 0.16
    g.add(sail)
  })
  // 遮阳伞
  const parasol = std(0xe0553f, { roughness: 0.75 })
  for (const p of [
    [2.9, 1.9],
    [-2.8, 1.6],
    [2.4, -2.3],
  ]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), std(0xcfc9bd))
    pole.position.set(p[0], 0.65, p[1])
    g.add(pole)
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.3, 10), parasol)
    top.position.set(p[0], 1.1, p[1])
    g.add(top)
  }
  return { group: g, glow }
}

// —— 淄博海岱楼 / 济宁太白楼 / 临沂书圣阁 / 聊城光岳楼：楼阁变体 ——
// （见 BUILDERS 里的 pavilion 调用）

// —— 枣庄台儿庄古城：城门楼 + 运河民居 ——
function taierzhuang() {
  const g = new THREE.Group()
  const glow = []
  const wall = std(0x9a8f80, { roughness: 0.9 })
  const white = glowMat(0xeae4d8, 0xffe0b0)
  glow.push(white)
  const roofMat = tiledRoof(0x4a4f57, 6, 1)
  const canal = new THREE.Mesh(
    new THREE.BoxGeometry(9.0, 0.16, 2.0),
    std(0x4f7f9f, { roughness: 0.28, metalness: 0.3 }),
  )
  canal.position.set(0, 0.08, 2.6)
  g.add(canal)
  // 城门楼
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.0, 2.0), wall)
  base.position.y = 1.0
  g.add(base)
  const arch = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 2.1), std(0x3a3530))
  arch.position.y = 0.6
  g.add(arch)
  const tower = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.3, 1.6), white)
  tower.position.y = 2.65
  g.add(tower)
  const tRoof = new THREE.Mesh(makeHipRoof(3.6, 2.2, 0.9), roofMat)
  tRoof.position.y = 3.3
  g.add(tRoof)
  // 运河民居
  const houses = [
    [-2.9, 1.5, 1.6, 1.2, 1.3],
    [2.8, 1.6, 1.8, 1.2, 1.15],
    [-1.6, 3.9, 1.5, 1.1, 1.0],
    [1.9, 4.0, 1.6, 1.1, 1.1],
  ]
  houses.forEach((h) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(h[2], h[4], h[3]), white)
    b.position.set(h[0], h[4] / 2, h[1])
    g.add(b)
    const r = new THREE.Mesh(makeHipRoof(h[2] * 1.12, h[3] * 1.25, 0.42, 0.7, 0.06), roofMat)
    r.position.set(h[0], h[4], h[1])
    g.add(r)
  })
  return { group: g, glow }
}

// —— 德州日晷太阳能大楼 ——
function sundialTower() {
  const g = new THREE.Group()
  const glow = []
  const glass = glowMat(0x5f9fc4, 0x8fd8ff)
  glow.push(glass)
  const steel = std(0xc8ced6, { metalness: 0.5, roughness: 0.35 })
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.2, 0.24, 20), std(0xd2cec4, { roughness: 0.9 }))
  plaza.position.y = 0.12
  g.add(plaza)
  // 日晷主体：一段倾斜的巨大圆弧
  const dial = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.62, 12, 28, Math.PI * 1.05), glass)
  dial.position.y = 0.72
  dial.rotation.set(-0.45, 0, 0)
  g.add(dial)
  // 晷针
  const gnomon = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.13, 5.4, 8), steel)
  gnomon.position.set(0, 2.5, 0.5)
  gnomon.rotation.x = -0.45
  g.add(gnomon)
  // 光伏板阵列
  const panel = std(0x2a3f6a, { metalness: 0.45, roughness: 0.3 })
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.62), panel)
    p.position.set(Math.cos(a) * 3.3, 0.62, Math.sin(a) * 3.3)
    p.rotation.set(-0.5, -a, 0)
    g.add(p)
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.55, 6), steel)
    st.position.set(Math.cos(a) * 3.3, 0.42, Math.sin(a) * 3.3)
    g.add(st)
  }
  return { group: g, glow }
}

// —— 滨州孙子兵法城：夯土台上的兵法殿 + 战鼓环 ——
function sunTzuFortress() {
  const g = new THREE.Group()
  const glow = []
  const earth = std(0xb9a488, { roughness: 0.95 })
  const wall = glowMat(0x8f7a5e, 0xffd9a0)
  glow.push(wall)
  const roofMat = tiledRoof(0x4a4f57, 6, 2)
  // 夯土台，三级收分
  let y = 0
  ;[
    [4.4, 0.9],
    [3.6, 0.8],
    [2.9, 0.7],
  ].forEach((t) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(t[0] * 0.9, t[0], t[1], 4), earth)
    p.position.y = y + t[1] / 2
    p.rotation.y = Math.PI / 4
    g.add(p)
    y += t[1]
  })
  // 主殿
  const hall = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.5, 2.2), wall)
  hall.position.y = y + 0.75
  g.add(hall)
  const r1 = new THREE.Mesh(makeHipRoof(3.6, 2.8, 0.9), roofMat)
  r1.position.y = y + 1.5
  g.add(r1)
  const upper = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.0, 1.5), wall)
  upper.position.y = y + 2.6
  g.add(upper)
  const r2 = new THREE.Mesh(makeHipRoof(2.5, 1.9, 0.75), roofMat)
  r2.position.y = y + 3.1
  g.add(r2)
  // 战鼓环
  const drum = std(0xa8452f, { roughness: 0.7 })
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.42, 12), drum)
    d.position.set(Math.cos(a) * 3.9, 0.32, Math.sin(a) * 3.9)
    d.rotation.z = Math.PI / 2
    d.rotation.y = -a
    g.add(d)
  }
  return { group: g, glow }
}

// —— 菏泽牡丹：层层花田 + 中央牡丹亭 ——
function peonyGarden() {
  const g = new THREE.Group()
  const glow = []
  const body = glowMat(0xe4d9c0, 0xffd9a0)
  glow.push(body)
  const roofMat = tiledRoof(0x2f6b4f, 8, 1)
  const soil = std(0x7a6a55, { roughness: 0.96 })
  const BLOOM = [0xd94f7a, 0xe8759a, 0xf0e0e8, 0xc03a5a, 0xefc0d0, 0xa8447a]
  // 环形花田。48 朵牡丹若逐朵建 Mesh 就是 48 个 draw call（本地标一度高达 64），
  // 合成一个 InstancedMesh，花色用 instanceColor 区分。
  const blooms = []
  for (let ring = 0; ring < 3; ring++) {
    const rr = 2.4 + ring * 0.85
    const bed = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.3, 6, 26), soil)
    bed.position.y = 0.34 + ring * 0.06
    bed.rotation.x = Math.PI / 2
    g.add(bed)
    const n = 12 + ring * 4
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.3
      blooms.push({
        x: Math.cos(a) * rr,
        y: 0.42 + ring * 0.06,
        z: Math.sin(a) * rr,
        c: BLOOM[(i + ring) % BLOOM.length],
      })
    }
  }
  const bloomMat = glowMat(0xffffff, 0xffffff)
  glow.push(bloomMat)
  const bloomMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.2, 8, 6),
    bloomMat,
    blooms.length,
  )
  const bm = new THREE.Matrix4()
  const bp = new THREE.Vector3()
  const bq = new THREE.Quaternion()
  const bs = new THREE.Vector3(1, 0.72, 1)
  const bc = new THREE.Color()
  blooms.forEach((f, i) => {
    bp.set(f.x, f.y, f.z)
    bm.compose(bp, bq, bs)
    bloomMesh.setMatrixAt(i, bm)
    bloomMesh.setColorAt(i, bc.set(f.c))
  })
  bloomMesh.instanceMatrix.needsUpdate = true
  if (bloomMesh.instanceColor) bloomMesh.instanceColor.needsUpdate = true
  g.add(bloomMesh)
  // 牡丹亭：圆形重檐亭
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.65, 0.4, 12), std(0xcfc9bd))
  plat.position.y = 0.2
  g.add(plat)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 1.5, 8), body)
    col.position.set(Math.cos(a) * 1.15, 1.15, Math.sin(a) * 1.15)
    g.add(col)
  }
  const r1 = new THREE.Mesh(makeConcaveRoof(1.75, 0.75, 0.05), roofMat)
  r1.position.y = 1.9
  g.add(r1)
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.75, 0.7, 10), body)
  drum.position.y = 2.9
  g.add(drum)
  const r2 = new THREE.Mesh(makeConcaveRoof(1.15, 0.95, 0.05), roofMat)
  r2.position.y = 3.25
  g.add(r2)
  const fin = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), std(0xe0b54f, { metalness: 0.6 }))
  fin.position.y = 4.35
  g.add(fin)
  return { group: g, glow }
}

// —— 石家庄广播电视塔：细长塔身 + 双观景环 + 长天线 ——
function tvTower() {
  const g = new THREE.Group()
  const glow = []
  const steel = std(0xd0d6de, { metalness: 0.5, roughness: 0.35 })
  const ringMat = glowMat(0x6fa8dc, 0x8fd8ff)
  glow.push(ringMat)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.0, 0.9, 12), std(0xc8c2b6, { roughness: 0.9 }))
  base.position.y = 0.45
  g.add(base)
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.62, 8.6, 14), steel)
  shaft.position.y = 5.2
  g.add(shaft)
  for (const y of [7.2, 8.3]) {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, 0.55, 16), ringMat)
    collar.position.y = y
    g.add(collar)
  }
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.16, 4.4, 8), steel)
  ant.position.y = 11.6
  g.add(ant)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), glowMat(0xff4d4d, 0xff2a2a))
  beacon.position.y = 13.9
  g.add(beacon)
  return { group: g, glow }
}

// —— 长春地质宫：石砖大殿 + 黄琉璃庑殿顶 ——
function geologyPalace() {
  const g = new THREE.Group()
  const glow = []
  const body = glowMat(0xd8cdb8, 0xffe0b0)
  glow.push(body)
  const brick = std(0x9a5f4a, { roughness: 0.85 })
  const roofMat = tiledRoof(0xd9a441, 9, 2, { metalness: 0.28 })
  const plat = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.5, 3.6), std(0xcfc9bd, { roughness: 0.9 }))
  plat.position.y = 0.25
  g.add(plat)
  // 两翼
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.8, 2.4), body)
    wing.position.set(sx * 2.3, 1.4, 0)
    g.add(wing)
    const wr = new THREE.Mesh(makeHipRoof(2.5, 2.9, 0.65), roofMat)
    wr.position.set(sx * 2.3, 2.3, 0)
    g.add(wr)
  }
  // 中央主体
  const mid = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.0, 2.8), body)
  mid.position.y = 2.0
  g.add(mid)
  for (let i = -2; i <= 2; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 2.2, 8), brick)
    col.position.set(i * 0.6, 1.6, 1.5)
    g.add(col)
  }
  const mr = new THREE.Mesh(makeHipRoof(3.7, 3.4, 1.15), roofMat)
  mr.position.y = 3.5
  g.add(mr)
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.4), body)
  top.position.y = 4.9
  g.add(top)
  const tr = new THREE.Mesh(makeHipRoof(1.9, 1.9, 0.75), roofMat)
  tr.position.y = 5.35
  g.add(tr)
  return { group: g, glow }
}

// —— 南宁国际会展中心：朱槿花冠，一圈上翘花瓣围着玻璃鼓座 ——
function hibiscusHall() {
  const g = new THREE.Group()
  const glow = []
  const petalMat = glowMat(0xf4f1ea, 0xffe6c8)
  glow.push(petalMat)
  const glass = glowMat(0x7fb8d8, 0x9fd8ff)
  glow.push(glass)
  // 裙楼
  const podium = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.9, 1.3, 18), petalMat)
  podium.position.y = 0.65
  g.add(podium)
  // 玻璃鼓座
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.75, 2.0, 18), glass)
  drum.position.y = 2.3
  g.add(drum)
  // 12 片上翘花瓣
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const petal = new THREE.Mesh(new THREE.ConeGeometry(0.42, 3.0, 5), petalMat)
    petal.position.set(Math.cos(a) * 1.9, 3.3, Math.sin(a) * 1.9)
    // 花瓣尖向外翻卷
    petal.rotation.z = Math.cos(a) * 0.62
    petal.rotation.x = -Math.sin(a) * 0.62
    petal.scale.z = 0.42
    g.add(petal)
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), glass)
  core.position.y = 3.9
  g.add(core)
  const stamen = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.08, 1.6, 8),
    std(0xd9a441, { metalness: 0.55 }),
  )
  stamen.position.y = 5.0
  g.add(stamen)
  return { group: g, glow }
}

/* ================= 通用程序化地标（没有专属造型的城市用） =================
 * 移植自 Web 版 ProceduralLandmark.tsx：原型、配色、比例、朝向全部由城市名
 * 哈希推出，所以每座陌生城市各有各的样子，而不是清一色一根通用主塔。
 */

const GENERIC_ACCENTS = [
  0x6fa8dc, 0xe0995b, 0x7bbf8a, 0xc98a8a, 0x9a8fd0, 0x4fb0b8, 0xd0a94f, 0x8a97a6,
]

/** 把颜色向白/黑推 amt（-1..1），用于同色系的深浅搭配 */
function shade(hex, amt) {
  const c = new THREE.Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt)))
  return c.getHex()
}

/** 幕墙材质：细窗格 + 只有窗户会亮的自发光图 + 玻璃粗糙度 */
function curtainWall(accent, repX, repY) {
  const tex = makeWindowTexture(shade(accent, 0.06), shade(accent, -0.14), 0xffd9a0)
  tex.map.repeat.set(repX, repY)
  tex.emissiveMap.repeat.set(repX, repY)
  tex.roughnessMap.repeat.set(repX, repY)
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.map,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: tex.emissiveMap,
    roughnessMap: tex.roughnessMap,
    emissiveIntensity: 0.15,
    metalness: 0.68,
    roughness: 0.19,
    envMapIntensity: 2.15,
  })
}

/** 0 — 收分玻璃超高层：主塔 + 退台 + 冠带 + 塔尖 */
function genGlassSupertall(accent, rand) {
  const g = new THREE.Group()
  const glow = []
  const H = 9.5 + rand() * 3
  const shoulder = H * (0.66 + rand() * 0.1)
  const mat = curtainWall(accent, 3, Math.max(2, Math.round(shoulder * 0.8)))
  glow.push(mat)
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.6, 2.4),
    std(shade(accent, -0.2), { metalness: 0.5, roughness: 0.5 }),
  )
  base.position.y = 0.3
  g.add(base)
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(1.6, shoulder, 1.6), mat)
  shaft.position.y = shoulder / 2 + 0.6
  g.add(shaft)
  const upper = new THREE.Mesh(new THREE.BoxGeometry(1.1, H - shoulder, 1.1), mat)
  upper.position.y = shoulder + (H - shoulder) / 2 + 0.6
  g.add(upper)
  const crown = glowMat(accent, accent)
  glow.push(crown)
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.16, 1.15), crown)
  band.position.y = H + 0.66
  g.add(band)
  const spire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.12, 1.5, 6),
    std(0xcfd6de, { metalness: 0.8, roughness: 0.3 }),
  )
  spire.position.y = H + 1.4
  g.add(spire)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), glowMat(0xff4d4d, 0xff2a2a))
  beacon.position.y = H + 2.2
  g.add(beacon)
  return { group: g, glow }
}

/** 1 — 双子塔 + 空中连廊 */
function genTwinTowers(accent, rand) {
  const g = new THREE.Group()
  const glow = []
  const H = 7.5 + rand() * 2.5
  const gap = 1.5
  const mat = curtainWall(accent, 3, Math.max(2, Math.round(H * 0.8)))
  glow.push(mat)
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.5, 1.8),
    std(shade(accent, -0.2), { metalness: 0.5, roughness: 0.5 }),
  )
  base.position.y = 0.25
  g.add(base)
  const crown = glowMat(accent, accent)
  glow.push(crown)
  for (const x of [-gap / 2, gap / 2]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(1.15, H, 1.15), mat)
    t.position.set(x, H / 2 + 0.5, 0)
    g.add(t)
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 1.2), crown)
    cap.position.set(x, H + 0.62, 0)
    g.add(cap)
    const sp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.05, 1.4, 6),
      std(0xcfd6de, { metalness: 0.8 }),
    )
    sp.position.set(x, H + 1.4, 0)
    g.add(sp)
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(gap, 0.5, 0.8), mat)
  bridge.position.y = H * 0.66 + 0.5
  g.add(bridge)
  return { group: g, glow }
}

/** 2 — 装饰艺术退台石塔 */
function genSetbackDeco(accent, rand) {
  const g = new THREE.Group()
  const glow = []
  const stone = shade(accent, 0.24)
  const stoneDk = shade(accent, 0.1)
  const rib = std(shade(accent, 0.32), { roughness: 0.7 })
  const matA = glowMat(stone, 0xffd9a0)
  const matB = glowMat(stoneDk, 0xffd9a0)
  glow.push(matA, matB)
  const n = 5
  const baseW = 2.4
  const totalH = 8.5 + rand() * 2
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(2.9, 0.5, 2.9),
    std(stoneDk, { roughness: 0.85, metalness: 0.1 }),
  )
  plinth.position.y = 0.25
  g.add(plinth)
  let y = 0.5
  for (let i = 0; i < n; i++) {
    const t = i / n
    const w = baseW * (1 - t * 0.62)
    const h = (totalH / n) * (1 - t * 0.15)
    const cy = y + h / 2
    const seg = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), i % 2 ? matA : matB)
    seg.position.y = cy
    g.add(seg)
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, h * 0.96, w * 0.9), rib)
      p.position.set(s * (w / 2 + 0.02), cy, 0)
      g.add(p)
    }
    y += h
  }
  const lantern = glowMat(accent, accent)
  glow.push(lantern)
  const lan = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), lantern)
  lan.position.y = y + 0.35
  g.add(lan)
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.34, 1.0, 4),
    std(shade(accent, 0.34), { roughness: 0.6 }),
  )
  cone.position.y = y + 1.2
  g.add(cone)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), glowMat(0xff4d4d, 0xff2a2a))
  beacon.position.y = y + 1.9
  g.add(beacon)
  return { group: g, glow }
}

/** 3 — 穹顶公共建筑：柱廊 + 鼓座 + 彩色穹顶 */
function genDomedCivic(accent, rand) {
  const g = new THREE.Group()
  const glow = []
  const wingH = 1.4 + rand() * 0.4
  const marble = glowMat(0xefe9dc, 0xffcf7a)
  glow.push(marble)
  const pale = std(0xf2eee2, { roughness: 0.85 })
  ;[3.4, 3.0].forEach((w, i) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.24, w * 0.7), std(0xd8d4c8, { roughness: 0.9 }))
    s.position.y = 0.12 + i * 0.18
    g.add(s)
  })
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.3, wingH, 1.7), marble)
    wing.position.set(s * 1.9, wingH / 2 + 0.4, 0)
    g.add(wing)
  }
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 1.6, 16), marble)
  drum.position.y = 1.1
  g.add(drum)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 8), pale)
    col.position.set(Math.cos(a) * 1.62, 1.1, Math.sin(a) * 1.62)
    g.add(col)
  }
  const ent = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 1.75, 0.24, 16),
    std(0xe2dccc, { roughness: 0.85 }),
  )
  ent.position.y = 2.0
  g.add(ent)
  const domeMat = glowMat(accent, accent)
  glow.push(domeMat)
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    domeMat,
  )
  dome.position.y = 2.12
  g.add(dome)
  const ribMat = std(shade(accent, 0.28), { metalness: 0.5, roughness: 0.4 })
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.55, 0.05), ribMat)
    r.position.set(Math.cos(a) * 0.75, 2.9, Math.sin(a) * 0.75)
    r.rotation.set(0, -a, 0.55)
    g.add(r)
  }
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 12), domeMat)
  lantern.position.y = 3.7
  g.add(lantern)
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.7, 5),
    std(0x9aa1a8, { metalness: 0.5 }),
  )
  pole.position.y = 4.15
  g.add(pole)
  return { group: g, glow }
}

/** 按城市名哈希挑一个原型 + 配色 + 朝向 */
function proceduralLandmark(name) {
  const rand = mulberry32(hashName(name || 'City'))
  const kind = Math.floor(rand() * 4)
  rand() // 与 Web 版保持同样的取数顺序（hueShift 占一位）
  const accent = GENERIC_ACCENTS[Math.floor(rand() * GENERIC_ACCENTS.length)]
  const yaw = (rand() - 0.5) * Math.PI * 0.9
  const build = [genGlassSupertall, genTwinTowers, genSetbackDeco, genDomedCivic][kind]
  const r = build(accent, rand)
  r.group.rotation.y = yaw
  return r
}


/* ================= 地标组合 + 各城市的次要地标 =================
 * Web 版每座大城市是「一组」地标（上海 4 处、北京 4 处…），
 * 小程序此前每城只有 1 处，天际线明显单薄。这里补上。
 */

/** 把多处地标拼成一组，各自带偏移/缩放/朝向 */
function set(parts) {
  const g = new THREE.Group()
  const glow = []
  const landmarkNodes = []
  const landmarkNames = []
  let spin = null
  const anims = []
  parts.forEach((p, i) => {
    const r = p.b()
    r.group.position.set(p.x || 0, 0, p.z || 0)
    if (p.s) r.group.scale.setScalar(p.s)
    if (p.ry) r.group.rotation.y = p.ry
    r.group.userData.landmarkRole = p.role || (i === 0 ? 'hero' : 'secondary')
    r.group.userData.landmarkPriority = p.priority == null ? (i === 0 ? 100 : 80 - i) : p.priority
    r.group.userData.landmarkIndex = i
    r.group.userData.landmarkVisible = true
    if (p.name) {
      r.group.userData.landmarkName = p.name
      landmarkNames.push(p.name)
    }
    g.add(r.group)
    landmarkNodes.push(r.group)
    if (r.glow && r.glow.length) for (let i = 0; i < r.glow.length; i++) glow.push(r.glow[i])
    if (r.spin) spin = r.spin
    if (typeof r.animate === 'function') anims.push(r.animate)
  })
  g.userData.landmarkCount = landmarkNodes.length
  g.userData.landmarkNodes = landmarkNodes
  g.userData.secondaryLandmarks = landmarkNames
  g.userData.landmarkFocusNode = landmarkNodes[0] || null
  g.userData.landmarkVisibility = 'foreground'
  const out = { group: g, glow: glow, spin: spin }
  if (anims.length) {
    out.animate = (t, base, nf) => {
      for (let i = 0; i < anims.length; i++) anims[i](t, base, nf)
    }
  }
  return out
}

/* ================= 地标组合 + 各城市的次要地标 =================
 * web 版每座大城市是“一组”地标；小程序也必须保持独立、可辨识的地标层次。
 */
/** 通用玻璃板楼（广州西塔 / 武汉绿地 / 南京紫峰等复用） */
function slabTower(opts) {
  opts = opts || {}
  const g = new THREE.Group()
  const glow = []
  const H = opts.h || 8.5
  const w = opts.w || 0.95
  const profile = opts.profile || 'generic'
  const segments = profile === 'pingan' ? 7 : profile === 'kingkey' ? 6 : 5
  const mat = curtainWall(opts.color || 0x8fb0cc, 2.2, Math.max(4, Math.round(H * 1.4)))
  glow.push(mat)
  const trim = std(0xd7e0e8, { metalness: 0.55, roughness: 0.32, envMapIntensity: 1.15 })
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(w * 1.68, 0.28, w * 1.38),
    std(shade(opts.color || 0x8fb0cc, -0.24), { metalness: 0.35, roughness: 0.62 }),
  )
  base.position.y = 0.14
  g.add(base)

  const widthAt = (t) => {
    if (profile === 'pingan') return 1 - t * 0.52
    if (profile === 'kingkey') return t < 0.68 ? 1 - t * 0.12 : 0.72 - (t - 0.68) * 0.38
    if (profile === 'diwang') return t < 0.78 ? 1 - t * 0.1 : 0.76
    return 1 - t * (opts.taper == null ? 0.32 : opts.taper)
  }

  let y = 0.28
  for (let i = 0; i < segments; i++) {
    const t = i / Math.max(1, segments - 1)
    const f = widthAt(t)
    const h = H / segments
    const depth = w * f * (profile === 'diwang' ? 0.62 : profile === 'kingkey' ? 0.74 : 0.8)
    let geometry
    if (profile === 'pingan') {
      geometry = new THREE.CylinderGeometry(w * f * 0.52, w * Math.min(1, f + 0.08) * 0.52, h, 4)
    } else {
      geometry = new THREE.BoxGeometry(w * f, h, depth)
    }
    const mesh = new THREE.Mesh(geometry, mat)
    mesh.position.y = y + h / 2
    if (profile === 'pingan') mesh.rotation.y = Math.PI / 4 + i * 0.025
    if (profile === 'kingkey' && i >= segments - 2) mesh.position.x = -w * 0.08
    g.add(mesh)

    const band = new THREE.Mesh(
      profile === 'pingan'
        ? new THREE.TorusGeometry(w * f * 0.54, 0.028, 5, 12)
        : new THREE.BoxGeometry(w * f * 1.06, 0.055, depth * 1.06),
      trim,
    )
    band.position.y = y + h
    if (profile === 'pingan') band.rotation.x = Math.PI / 2
    g.add(band)
    y += h
  }

  if (profile === 'pingan') {
    const crown = new THREE.Mesh(new THREE.ConeGeometry(w * 0.34, 1.15, 4), trim)
    crown.position.y = H + 0.85
    crown.rotation.y = Math.PI / 4
    g.add(crown)
  } else if (profile === 'kingkey') {
    const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.52, w * 0.58), mat)
    crown.position.set(-w * 0.08, H + 0.54, 0)
    g.add(crown)
  } else if (profile === 'diwang') {
    const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.22, w * 0.5), trim)
    crown.position.y = H + 0.39
    g.add(crown)
    for (const sx of [-1, 1]) {
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.045, 1.3, 6), trim)
      antenna.position.set(sx * w * 0.28, H + 1.04, 0)
      g.add(antenna)
    }
  } else {
    const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.68, 0.14, w * 0.56), trim)
    crown.position.y = H + 0.35
    g.add(crown)
  }

  const spireHeight = opts.spire == null ? (profile === 'diwang' ? 0 : 1.4) : opts.spire
  if (spireHeight > 0) {
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.07, spireHeight, 6),
      std(0xcfd6df, { metalness: 0.6 }),
    )
    spire.position.y = H + 0.42 + spireHeight / 2
    g.add(spire)
  }
  g.userData.towerProfile = profile
  return { group: g, glow }
}

function rafflesComplex() {
  const group = new THREE.Group()
  const glow = []
  const towers = [
    [-1.75, 8.6, -0.2],
    [-0.58, 9.2, 0.1],
    [0.58, 8.9, -0.05],
    [1.75, 8.4, 0.18],
  ]
  towers.forEach((item, index) => {
    const tower = slabTower({
      h: item[1],
      w: 0.82,
      color: index % 2 ? 0x7695ad : 0x86a4b9,
      taper: 0.16,
      spire: 0,
    })
    tower.group.position.set(item[0], 0, item[2])
    tower.group.rotation.z = (index - 1.5) * 0.018
    group.add(tower.group)
    ;(tower.glow || []).forEach((material) => glow.push(material))
  })

  const bridgeMat = curtainWall(0x91aec2, 5, 2)
  glow.push(bridgeMat)
  const skybridge = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.72, 1.02), bridgeMat)
  skybridge.position.y = 7.05
  group.add(skybridge)
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(4.85, 0.12, 1.18),
    std(0xd7e0e7, { metalness: 0.58, roughness: 0.28 }),
  )
  deck.position.y = 6.66
  group.add(deck)
  const podium = new THREE.Mesh(
    new THREE.BoxGeometry(5.25, 0.52, 2.05),
    std(0x6d7780, { metalness: 0.3, roughness: 0.58 }),
  )
  podium.position.y = 0.26
  group.add(podium)
  group.userData.landmarkName = '重庆来福士'
  return { group, glow }
}

function tokyoTower() {
  const group = new THREE.Group()
  const glow = []
  const red = glowMat(0xd54b3f, 0xff6b55)
  const white = std(0xf0eee8, { metalness: 0.38, roughness: 0.42 })
  const deckMat = glowMat(0x4d6575, 0xffcf82)
  glow.push(red, deckMat)
  const up = new THREE.Vector3(0, 1, 0)

  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + i * Math.PI / 2
    const bottom = new THREE.Vector3(Math.cos(angle) * 1.35, 0, Math.sin(angle) * 1.35)
    const top = new THREE.Vector3(Math.cos(angle) * 0.34, 6.2, Math.sin(angle) * 0.34)
    const dir = new THREE.Vector3().subVectors(top, bottom)
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.13, dir.length(), 6), i % 2 ? white : red)
    leg.position.copy(bottom).add(top).multiplyScalar(0.5)
    leg.quaternion.setFromUnitVectors(up, dir.clone().normalize())
    group.add(leg)
  }

  ;[1.35, 2.65, 4.0, 5.35].forEach((height, index) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.18 - index * 0.2, 0.055, 6, 16), index % 2 ? white : red)
    ring.position.y = height
    ring.rotation.x = Math.PI / 2
    group.add(ring)
  })
  const lowerDeck = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.88, 0.46, 12), deckMat)
  lowerDeck.position.y = 4.45
  const upperDeck = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.46, 0.38, 10), deckMat)
  upperDeck.position.y = 6.2
  group.add(lowerDeck, upperDeck)

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.12, 4.2, 8), red)
  mast.position.y = 8.45
  group.add(mast)
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.035, 1.25, 6), white)
  tip.position.y = 11.15
  group.add(tip)
  group.userData.landmarkName = '东京塔'
  return { group, glow }
}

/** 上海中心：螺旋收分的扭转塔 */
function shanghaiTower() {
  const g = new THREE.Group()
  const glow = []
  const mat = curtainWall(0x9fc2d8, 1.6, 14)
  glow.push(mat)
  const trim = std(0xe2ebf2, { metalness: 0.62, roughness: 0.28 })
  const SEG = 9
  const H = 12.5
  let r = 0.62
  for (let i = 0; i < SEG; i++) {
    const h = H / SEG
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.93, r, h, 5), mat)
    m.position.y = i * h + h / 2
    m.rotation.y = i * 0.16 // 逐段扭转，形成螺旋
    g.add(m)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.96, 0.028, 6, 16), trim)
    ring.position.y = i * h + h
    g.add(ring)
    r *= 0.93
  }
  const cap = new THREE.Mesh(new THREE.ConeGeometry(r, 0.9, 5), mat)
  cap.position.y = H + 0.45
  g.add(cap)
  return { group: g, glow }
}

/** 金茂大厦：层层收进的塔式退台 */
function jinMao() {
  const g = new THREE.Group()
  const glow = []
  const mat = curtainWall(0xbfc8d2, 1.4, 10)
  glow.push(mat)
  const trim = std(0x8f98a4, { metalness: 0.4, roughness: 0.45 })
  let y = 0
  let w = 1.0
  for (let i = 0; i < 8; i++) {
    const h = 1.15 - i * 0.055
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat)
    m.position.y = y + h / 2
    m.rotation.y = Math.PI / 4
    g.add(m)
    const band = new THREE.Mesh(new THREE.BoxGeometry(w * 1.06, 0.07, w * 1.06), trim)
    band.position.y = y + h
    band.rotation.y = Math.PI / 4
    g.add(band)
    y += h
    w *= 0.9
  }
  const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.08, 1.6, 6), trim)
  sp.position.y = y + 0.8
  g.add(sp)
  return { group: g, glow }
}

/** 环球金融中心「开瓶器」：收分板楼 + 顶部方形开口 */
function bottleOpener() {
  const g = new THREE.Group()
  const glow = []
  const mat = curtainWall(0x8aa6bd, 1.6, 12)
  glow.push(mat)
  const H = 11.0
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.92, H, 4), mat)
  body.position.y = H / 2
  body.rotation.y = Math.PI / 4
  body.scale.z = 0.42
  g.add(body)
  const floorTrim = std(0xd7e0e8, { metalness: 0.55, roughness: 0.32 })
  for (let i = 1; i < 5; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.42 + (0.92 - 0.42) * (1 - i / 5), 0.026, 5, 4), floorTrim)
    band.rotation.x = Math.PI / 2
    band.position.y = i * (H / 5)
    g.add(band)
  }
  // 顶部的「开瓶口」：用四根边框围出一个方洞
  const fr = std(0x7d8b99, { metalness: 0.45, roughness: 0.4 })
  const hy = H - 0.75
  for (const dy of [-0.42, 0.42]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.16, 0.2), fr)
    bar.position.set(0, hy + dy, 0)
    g.add(bar)
  }
  for (const dx of [-0.35, 0.35]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.84, 0.2), fr)
    bar.position.set(dx, hy, 0)
    g.add(bar)
  }
  return { group: g, glow }
}

/** 中信大厦「中国尊」：上下宽、腰部收的樽形 */
function citicTower() {
  const g = new THREE.Group()
  const glow = []
  const mat = glowMat(0x7f93a8, 0xbfe4ff)
  glow.push(mat)
  const SEG = 12
  const H = 11.5
  for (let i = 0; i < SEG; i++) {
    const t = i / (SEG - 1)
    // 樽形：两端粗、中间细
    const r = 0.72 - 0.34 * Math.sin(Math.PI * t) + 0.1 * t
    const h = H / SEG
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.97, r, h * 1.02, 4), mat)
    m.position.y = i * h + h / 2
    m.rotation.y = Math.PI / 4
    g.add(m)
  }
  return { group: g, glow }
}

/** 央视大楼：两条倾斜塔身 + 顶部悬臂连成环 */
function cctvLoop() {
  const g = new THREE.Group()
  const glow = []
  const mat = glowMat(0x8f98a4, 0xbfe4ff)
  glow.push(mat)
  const H = 6.4
  const lean = 0.13
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.62, H, 0.9), mat)
    leg.position.set(sx * 1.35, H / 2, 0)
    leg.rotation.z = -sx * lean
    g.add(leg)
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.75, 0.9), mat)
  top.position.y = H + 0.36
  g.add(top)
  const over = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.75, 1.9), mat)
  over.position.set(-1.35 + H * lean, H + 0.36, 0.5)
  g.add(over)
  return { group: g, glow }
}

/** 天坛祈年殿：圆形三重檐 + 蓝琉璃顶 */
function templeOfHeaven() {
  const g = new THREE.Group()
  const glow = []
  const body = glowMat(0xa8342a, 0xffa060)
  glow.push(body)
  const marble = std(0xece7dc, { roughness: 0.85 })
  const roofMat = tiledRoof(0x274b8c, 10, 1)
  ;[
    [2.9, 0.42, 0.21],
    [2.4, 0.38, 0.6],
    [2.0, 0.34, 0.96],
  ].forEach((t) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(t[0], t[0] + 0.12, t[1], 20), marble)
    p.position.y = t[2]
    g.add(p)
  })
  let y = 1.13
  const tiers = [
    [1.5, 1.0, 2.0],
    [1.2, 0.85, 1.65],
    [0.9, 0.75, 1.3],
  ]
  tiers.forEach((t) => {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(t[0], t[0] + 0.04, t[1], 16), body)
    drum.position.y = y + t[1] / 2
    g.add(drum)
    const rf = new THREE.Mesh(makeConcaveRoof(t[2], 0.72, 0.06), roofMat)
    rf.position.y = y + t[1]
    g.add(rf)
    y += t[1] + 0.18
  })
  const fin = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 10),
    std(0xe0b54f, { metalness: 0.6 }),
  )
  fin.position.y = y + 0.5
  g.add(fin)
  return { group: g, glow }
}

/** 西安钟楼：砖砌台基上的重檐方亭 */
function bellTower() {
  const g = new THREE.Group()
  const glow = []
  const body = glowMat(0xa8342a, 0xffa060)
  glow.push(body)
  const brick = std(0xb9a68c, { roughness: 0.92 })
  const roofMat = tiledRoof(0x2f4a3a, 6, 2)
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.5, 3.4), brick)
  base.position.y = 0.75
  g.add(base)
  const arch = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 3.5), std(0x3a3530))
  arch.position.y = 0.5
  g.add(arch)
  let y = 1.5
  for (let i = 0; i < 2; i++) {
    const w = 2.3 - i * 0.5
    const hall = new THREE.Mesh(new THREE.BoxGeometry(w, 0.95, w), body)
    hall.position.y = y + 0.48
    g.add(hall)
    const rf = new THREE.Mesh(makeHipRoof(w * 1.45, w * 1.45, 0.7), roofMat)
    rf.position.y = y + 0.95
    g.add(rf)
    y += 1.15
  }
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.0, 4), roofMat)
  top.position.y = y + 0.5
  top.rotation.y = Math.PI / 4
  g.add(top)
  return { group: g, glow }
}

/** 南京城墙城门：砖墙 + 拱门 + 城楼 */
function cityGate() {
  const g = new THREE.Group()
  const glow = []
  const brick = std(0x9a8f80, { roughness: 0.94 })
  const body = glowMat(0xa8443a, 0xffb070)
  glow.push(body)
  const roofMat = tiledRoof(0x4a4f57, 7, 2)
  const wall = new THREE.Mesh(new THREE.BoxGeometry(6.2, 2.4, 1.7), brick)
  wall.position.y = 1.2
  g.add(wall)
  const arch = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 1.8), std(0x35302b))
  arch.position.y = 0.7
  g.add(arch)
  // 垛口
  for (let i = -3; i <= 3; i++) {
    const cren = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 1.75), brick)
    cren.position.set(i * 0.86, 2.56, 0)
    g.add(cren)
  }
  const tower = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 1.4), body)
  tower.position.y = 3.32
  g.add(tower)
  const rf = new THREE.Mesh(makeHipRoof(4.3, 2.1, 0.95), roofMat)
  rf.position.y = 3.92
  g.add(rf)
  return { group: g, glow }
}

/** 苏州东方之门：两腿并拢的门形高楼 */
function gateOfOrient() {
  const g = new THREE.Group()
  const glow = []
  const mat = glowMat(0xa8b8c8, 0xbfe4ff)
  glow.push(mat)
  const H = 8.2
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.9, H, 0.75), mat)
    leg.position.set(sx * 1.15, H / 2, 0)
    leg.rotation.z = -sx * 0.05
    g.add(leg)
  }
  // 顶部内弯的连接段，形成「门」的弧顶
  for (let i = 0; i < 5; i++) {
    const t = i / 4
    const a = Math.PI * (1 - t)
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.62, 0.75), mat)
    seg.position.set(Math.cos(a) * 1.35, H + Math.sin(a) * 1.05, 0)
    seg.rotation.z = -a + Math.PI / 2
    g.add(seg)
  }
  return { group: g, glow }
}

/** 虎丘塔：向一侧微倾的七层砖塔 */
function leaningPagoda() {
  const p = pagoda({ tiers: 7, baseR: 0.95, tierH: 0.92, body: 0xb5a893, roof: 0x6f6154 })
  p.group.rotation.z = 0.055 // 标志性的倾斜
  // 一倾斜，塔基远侧边缘就会陷到地面以下（半径 1.5 × sin0.055 ≈ 0.08），
  // 套一层外壳把它抬起来；set() 会把外壳定位在 y=0。
  const shell = new THREE.Group()
  p.group.position.y = 0.09
  shell.add(p.group)
  return { group: shell, glow: p.glow }
}

// 城市名（中文，Open-Meteo language=zh 返回）→ builder

// 烟台专属补景：蓬莱阁的多层海边阁楼，以及张裕酒文化的红砖酒庄。
function penglaiPavilion() {
  const group = new THREE.Group()
  const glow = []
  const cliff = std(0x9a8d7a, { roughness: 0.96, metalness: 0.02 })
  const stone = std(0xd8cdb8, { roughness: 0.88 })
  const wall = glowMat(0xb78b58, 0xffd39a)
  const roofMat = tiledRoof(0x36596b, 7, 2, { roughness: 0.55, metalness: 0.22 })
  glow.push(wall)

  // 蓬莱阁不再只是通用亭子：海蚀台地、主阁、偏阁、城墙和临海长廊共同形成轮廓。
  const headland = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.45, 0.62, 10), cliff)
  headland.position.y = 0.31
  group.add(headland)

  const main = pavilion({
    tiers: 4, w: 3.35, d: 2.5, tierH: 1.02,
    body: 0xc3a06b, roof: 0x36596b, platform: 0.7,
  })
  main.group.position.set(-0.45, 0.58, -0.05)
  main.group.scale.setScalar(0.88)
  group.add(main.group)
  ;(main.glow || []).forEach((material) => glow.push(material))

  const sideHall = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.15, 1.35), wall)
  sideHall.position.set(2.0, 1.16, 0.35)
  const sideRoof = new THREE.Mesh(makeHipRoof(2.05, 1.65, 0.62, 0.7, 0.05), roofMat)
  sideRoof.position.set(2.0, 1.73, 0.35)
  const wallWalk = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.48, 0.34), stone)
  wallWalk.position.set(0.15, 0.86, 1.88)
  group.add(sideHall, sideRoof, wallWalk)

  const merlonGeo = new THREE.BoxGeometry(0.22, 0.22, 0.4)
  const merlons = new THREE.InstancedMesh(merlonGeo, stone, 11)
  const matrix = new THREE.Matrix4()
  for (let i = 0; i < 11; i++) {
    matrix.makeTranslation(-2.35 + i * 0.5, 1.2, 1.88)
    merlons.setMatrixAt(i, matrix)
  }
  merlons.instanceMatrix.needsUpdate = true
  group.add(merlons)
  return { group, glow }
}

function zhangyuChateau() {
  const group = new THREE.Group()
  const glow = []
  const brick = std(0x9f4d36, { roughness: 0.8 })
  const stone = std(0xd8c5aa, { roughness: 0.72 })
  const roof = std(0x405463, { roughness: 0.56, metalness: 0.2, envMapIntensity: 0.9 })
  const dark = std(0x352b29, { roughness: 0.86 })
  const windowMat = glowMat(0x49657a, 0xffd08a)
  glow.push(windowMat)

  // 张裕酒文化建筑群：砖石主楼、双塔楼、坡屋顶、石带和成排拱窗。
  const main = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.75, 1.55), brick)
  main.position.y = 1.05
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.28, 1.36), stone)
  wing.position.set(2.05, 0.8, 0)
  const roofMain = new THREE.Mesh(new THREE.ConeGeometry(1.48, 0.82, 4), roof)
  roofMain.position.set(-0.15, 2.34, 0)
  roofMain.rotation.y = Math.PI * 0.25
  group.add(main, wing, roofMain)

  for (const sx of [-1, 1]) {
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 2.18, 10), sx < 0 ? brick : stone)
    turret.position.set(sx * 1.82, 1.25, 0.02)
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.78, 10), roof)
    cap.position.set(sx * 1.82, 2.73, 0.02)
    group.add(turret, cap)
  }

  const band = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.12, 1.62), stone)
  band.position.set(-0.05, 1.42, 0)
  const entry = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.86, 0.06), dark)
  entry.position.set(-0.25, 0.48, 0.805)
  group.add(band, entry)

  const windows = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.38, 0.035), windowMat, 10)
  const matrix = new THREE.Matrix4()
  let wi = 0
  for (const y of [0.72, 1.28]) {
    for (const x of [-1.35, -0.78, 0.35, 0.92, 1.46]) {
      matrix.makeTranslation(x, y, 0.805)
      windows.setMatrixAt(wi++, matrix)
    }
  }
  windows.instanceMatrix.needsUpdate = true
  group.add(windows)

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.42, 10), dark)
  barrel.position.set(0.66, 0.28, 0.92)
  barrel.rotation.z = Math.PI * 0.5
  group.add(barrel)
  return { group, glow }
}

const BUILDERS = {
  上海: () =>
    set([
      { b: orientalPearl, x: -2.6, z: 1.4 },
      { b: shanghaiTower, x: 1.5, z: -1.2 },
      { b: jinMao, x: 3.0, z: 1.5, s: 0.9 },
      { b: bottleOpener, x: 0.2, z: 2.4, s: 0.85, ry: 0.4 },
    ]),
  广州: () =>
    set([
      { b: cantonTower, x: -1.4, z: 0.8 },
      { b: () => slabTower({ h: 9.5, w: 1.0, color: 0x9fb8cc }), x: 2.2, z: -1.4 },
    ]),
  北京: () =>
    set([
      { b: tiananmen, x: -1.0, z: 2.6, s: 0.85 },
      { b: templeOfHeaven, x: -3.4, z: -2.2, s: 0.8 },
      { b: citicTower, x: 2.6, z: -1.0, s: 0.85 },
      { b: cctvLoop, x: 2.4, z: 2.6, s: 0.7, ry: -0.5 },
    ]),
  天津: ferrisWheel,
  杭州: () => pagoda({ tiers: 5, body: 0xcaa06a, roof: 0x8a5a2f, bodyGlow: 0xffcf7a }),
  武汉: () =>
    set([
      { b: () => pagoda({ tiers: 5, body: 0xd8b878, roof: 0xc9a227, bodyGlow: 0xffe0a0 }), x: -1.9, z: 1.0 },
      { b: () => slabTower({ h: 10.0, w: 0.9, color: 0x93aec4, taper: 0.42 }), x: 2.3, z: -1.4 },
    ]),
  西安: () =>
    set([
      { b: () => pagoda({ tiers: 6, baseR: 1.1, tierH: 1.15, square: true, body: 0xb9a68c, roof: 0x6f5a44 }), x: -2.0, z: 1.2 },
      { b: bellTower, x: 2.2, z: -1.6, s: 0.85 },
    ]),
  南京: () =>
    set([
      { b: () => slabTower({ h: 10.5, w: 0.95, color: 0x8fa8bd }), x: -1.8, z: -0.6 },
      { b: cityGate, x: 1.6, z: 2.4, s: 0.85, ry: -0.3 },
    ]),
  开封: () => pagoda({ tiers: 6, body: 0x7a6a55, roof: 0x4a3d2f }),
  苏州: () =>
    set([
      { b: gateOfOrient, x: 1.9, z: -1.0 },
      { b: leaningPagoda, x: -2.2, z: 1.4, s: 0.9 },
    ]),
  // 深圳：平安金融中心 + 京基100 + 地王大厦，分别使用收尖、冠顶和双天线轮廓。
  深圳: () =>
    set([
      { b: () => slabTower({ h: 12.0, w: 1.08, color: 0x6f9ec4, profile: 'pingan', spire: 1.85 }), x: 0.4, z: -2.6, s: 0.9, name: '平安金融中心' },
      { b: () => slabTower({ h: 9.2, w: 0.98, color: 0x7f93a8, profile: 'kingkey', spire: 0.75 }), x: -2.9, z: -3.6, s: 0.78, ry: -0.3, name: '京基100' },
      { b: () => slabTower({ h: 8.4, w: 0.94, color: 0x9fb8cc, profile: 'diwang', spire: 0 }), x: 3.6, z: -3.0, s: 0.74, ry: 0.35, name: '地王大厦' },
    ]),
  // 重庆：来福士四塔与横向“水晶连廊”作为一体主地标，洪崖洞保留山城层次。
  重庆: () =>
    set([
      { b: rafflesComplex, x: 0, z: -3.05, s: 0.88, name: '重庆来福士' },
      { b: () => pavilion({ tiers: 5, w: 3.4, d: 2.5, tierH: 0.9, body: 0x9d5438, roof: 0x43535b, platform: 0.55 }), x: -3.15, z: 1.25, s: 0.62, ry: 0.18, name: '洪崖洞' },
    ]),
  // 成都：熊猫主题低台 + 天府双塔
  成都: () =>
    set([
      { b: () => pavilion({ tiers: 3, w: 3.1, d: 2.6, tierH: 1.25, body: 0xc7a878, roof: 0x7a5a34, platform: 0.65 }), x: -3.2, z: 0.8, s: 0.72 },
      { b: () => slabTower({ h: 9.4, w: 0.92, color: 0x7f9fbd, taper: 0.2 }), x: 2.15, z: -3.8, s: 0.78 },
      { b: () => slabTower({ h: 9.0, w: 0.86, color: 0x9bb5c9, taper: 0.2 }), x: 3.5, z: -3.8, s: 0.68, ry: 0.16 },
    ]),
  台北: taipei101,
  东京: () =>
    set([
      { b: tokyoTower, x: -1.7, z: 0.8, s: 0.92, name: '东京塔' },
      { b: () => slabTower({ h: 10.2, w: 0.9, color: 0x8aa7bd, profile: 'pingan', spire: 0.9 }), x: 2.25, z: -2.5, s: 0.76, name: '东京晴空塔' },
      { b: () => pagoda({ tiers: 5, baseR: 0.86, tierH: 0.92, square: true, body: 0xb54a3b, roof: 0x3d4c4a }), x: 2.65, z: 1.65, s: 0.66, name: '浅草五重塔' },
    ]),
  哈尔滨: () =>
    set([
      { b: stSophia, x: -3.2, z: 0.6, s: 0.9, ry: 0.38 },
      { b: () => pavilion({ tiers: 3, w: 2.2, d: 1.9, tierH: 1.1, body: 0x9e9b8f, roof: 0x4c6a63, platform: 0.5 }), x: 3.4, z: -3.2, s: 0.7, ry: -0.35 },
    ]),
  拉萨: potala,
  香港: () =>
    set([
      { b: bankOfChina, x: 2.6, z: -3.6, s: 0.88 },
      { b: () => modernTower({ color: 0x7f93a8 }), x: -2.4, z: -4.0, s: 0.72 },
      { b: () => slabTower({ h: 8.2, w: 0.82, color: 0x9fb8cc, taper: 0.1 }), x: -3.7, z: -2.7, s: 0.52 },
    ]),
  郑州: erqiTower,
  青岛: zhanqiao,
  昆明: paifang,
  沈阳: dazhengHall,
  济南: () =>
    set([
      { b: quanbiao, x: -3.3, z: 0.8, s: 0.88 },
      { b: () => pavilion({ tiers: 3, w: 2.7, d: 2.2, tierH: 1.2, body: 0xb58c3a, roof: 0x5f5426, platform: 0.65 }), x: 3.2, z: 0.1, s: 0.8, ry: -0.42 },
    ]),
  澳门: stPauls,
  呼和浩特: yurts,
  兰州: zhongshanBridge,
  西宁: stupa,
  乌鲁木齐: bazaarTower,
  合肥: huizhouHouses,
  海口: haikouClock,
  太原: twinPagodas,
  银川: xixiaTombs,
  贵阳: jiaxiuLou,
  南昌: () => pavilion({ tiers: 3, w: 4.4, d: 2.8, tierH: 1.6, body: 0xb5482e, roof: 0x2f6b4f, platform: 1.2 }),
  长沙: () => pavilion({ tiers: 3, w: 3.4, d: 2.6, tierH: 1.45, body: 0xa8443a, roof: 0x4a5a52, platform: 1.6 }),
  福州: () => pavilion({ tiers: 2, w: 4.6, d: 2.9, tierH: 1.7, body: 0x9e3b30, roof: 0x3a3f47, platform: 1.0 }),

  // 山东 15 市
  泰安: mountTai, // 泰山
  曲阜: () =>
    set([
      { b: dachengHall, x: -3.2, z: 0.6, s: 0.9, ry: -0.24 },
      { b: cityGate, x: 3.2, z: -0.4, s: 0.72, ry: 0.32 },
    ]), // 大成殿 + 万仞宫墙
  烟台: () =>
    set([
      { b: lighthouse, x: -3.15, z: 1.15, s: 0.82, name: '烟台山灯塔' }, // 烟台山灯塔
      { b: penglaiPavilion, x: 0.1, z: 1.35, s: 0.72, ry: -0.22, name: '蓬莱阁' }, // 蓬莱阁
      { b: zhangyuChateau, x: 3.0, z: -1.55, s: 0.76, ry: 0.2, name: '张裕酒文化博物馆' }, // 张裕酒文化博物馆
    ]),
  东营: oilField, // 黄河口油城
  潍坊: kiteCity, // 风筝之都 + 渤海之眼
  威海: gateOfHappiness, // 幸福门
  日照: sailSculpture, // 风帆雕塑 + 金沙滩
  枣庄: taierzhuang, // 台儿庄古城
  德州: sundialTower, // 日晷太阳能大楼
  滨州: sunTzuFortress, // 孙子兵法城
  菏泽: peonyGarden, // 牡丹之都
  淄博: () =>
    set([
      { b: () => pavilion({ tiers: 4, w: 3.0, d: 3.0, tierH: 1.4, body: 0xb5643a, roof: 0x3f6b8f, platform: 1.0 }), x: -3.1, z: 0.4, s: 0.82 },
      { b: () => genDomedCivic(0x5d9fe0, mulberry32(20260803)), x: 3.4, z: -3.6, s: 0.42 },
      { b: cityGate, x: 3.0, z: 1.6, s: 0.38, ry: 0.18 },
    ]), // 海岱楼 + 琉璃艺术 + 烧烤街区
  济宁: () => pavilion({ tiers: 3, w: 3.6, d: 2.4, tierH: 1.5, body: 0xa8443a, roof: 0x4a4f57, platform: 1.5 }), // 太白楼
  临沂: () => pavilion({ tiers: 4, w: 3.2, d: 2.8, tierH: 1.55, body: 0x9e5b30, roof: 0x5a4a3a, platform: 1.1 }), // 书圣阁
  聊城: () => pavilion({ tiers: 3, w: 3.4, d: 3.4, tierH: 1.5, body: 0xa06848, roof: 0x4a4f57, platform: 1.8 }), // 光岳楼

  // 其余三市
  石家庄: tvTower, // 广播电视塔
  长春: geologyPalace, // 地质宫
  南宁: hibiscusHall, // 朱槿花会展中心
}

// 这些城市的地标自带水面（河/海/运河/水池），城市配景就不要再叠一条河了
const OWN_WATER = ['兰州', '青岛', '日照', '威海', '枣庄', '济南', '贵阳']

export function hasOwnWater(name) {
  const key = ('' + (name || '')).replace(/[市区县省]/g, '').trim()
  for (let i = 0; i < OWN_WATER.length; i++) {
    if (key.indexOf(OWN_WATER[i]) !== -1) return true
  }
  return false
}

// 去掉「市/区/县」等后缀，做包含匹配，提升命中率。
// 没有专属造型的城市不再退回同一根通用主塔，而是按城市名哈希生成一座
// 程序化地标（4 种原型 × 8 种配色 × 随机朝向），让每座陌生城市各不相同。
const TOURIST_CITY_KEYS = [
  '北京', '上海', '广州', '天津', '杭州', '武汉', '南京', '苏州', '西安', '成都', '重庆',
  '深圳', '青岛', '烟台', '威海', '哈尔滨', '拉萨', '昆明', '香港', '澳门', '台北', '东京',
  '济南', '长沙', '南昌', '海口', '福州', '兰州', '贵阳', '长春', '乌鲁木齐',
]
const TOURIST_EXTRA_SIGHTS = {
  北京: ['故宫', 'hall'],
  上海: ['外滩万国建筑群', 'heritage'],
  广州: ['沙面历史街区', 'heritage'],
  天津: ['五大道', 'heritage'],
  杭州: ['西湖三潭印月', 'water'],
  武汉: ['东湖听涛', 'water'],
  南京: ['夫子庙', 'hall'],
  苏州: ['拙政园', 'pavilion'],
  西安: ['兵马俑', 'hall'],
  成都: ['宽窄巷子', 'heritage'],
  重庆: ['洪崖洞', 'pavilion'],
  深圳: ['世界之窗', 'monument'],
  青岛: ['五四广场', 'sail'],
  烟台: ['烟台市博物馆', 'museum'],
  威海: ['刘公岛灯塔', 'lighthouse'],
  哈尔滨: ['冰雪大世界', 'ice'],
  拉萨: ['大昭寺', 'hall'],
  昆明: ['石林', 'rock'],
  香港: ['天坛大佛', 'stupa'],
  澳门: ['大三巴牌坊', 'paifang'],
  台北: ['九份老街', 'heritage'],
  东京: ['浅草寺', 'hall'],
  济南: ['千佛山', 'pavilion'],
  长沙: ['橘子洲', 'water'],
  南昌: ['滕王阁', 'pavilion'],
  海口: ['骑楼老街', 'heritage'],
  福州: ['三坊七巷', 'heritage'],
  兰州: ['黄河母亲雕塑', 'sail'],
  贵阳: ['青岩古镇', 'gate'],
  长春: ['净月潭', 'water'],
  乌鲁木齐: ['国际大巴扎', 'civic'],
}

// 副地标不再按城市哈希随机拼造；每个登记城市都使用实名景点，
// 再由一组轻量低多边形原型表达轮廓，兼顾辨识度与小程序性能。
const NAMED_SECONDARY_SIGHTS = {
  上海: [['外滩万国建筑群', 'civic'], ['上海中心大厦', 'tower'], ['金茂大厦', 'tower']],
  广州: [['陈家祠', 'hall'], ['海心桥', 'bridge']],
  北京: [['正阳门', 'gate'], ['北海白塔', 'stupa'], ['国家大剧院', 'civic']],
  天津: [['天津鼓楼', 'gate'], ['解放桥', 'bridge'], ['天津广播电视塔', 'tv']],
  杭州: [['雷峰塔', 'pagoda'], ['拱宸桥', 'bridge'], ['杭州城市阳台', 'civic']],
  武汉: [['武汉长江大桥', 'bridge'], ['古德寺', 'church']],
  西安: [['永宁门', 'gate'], ['丹凤门', 'hall'], ['小雁塔', 'pagoda']],
  南京: [['中山陵', 'hall'], ['阅江楼', 'pavilion']],
  开封: [['龙亭', 'pavilion'], ['大梁门', 'gate']],
  苏州: [['北寺塔', 'pagoda'], ['盘门', 'gate'], ['苏州博物馆', 'civic']],
  深圳: [['市民中心', 'civic'], ['深圳湾体育中心', 'civic']],
  重庆: [['解放碑', 'tower'], ['洪崖洞', 'pavilion'], ['重庆人民大礼堂', 'hall']],
  成都: [['安顺廊桥', 'bridge'], ['望江楼', 'pavilion'], ['天府艺术公园', 'civic']],
  台北: [['中正纪念堂', 'hall'], ['台北北门', 'gate'], ['新光摩天大楼', 'tower']],
  东京: [['东京站', 'heritage'], ['东京晴空塔', 'tv'], ['明治神宫', 'gate']],
  哈尔滨: [['防洪胜利纪念塔', 'tower'], ['龙塔', 'tv'], ['松花江铁路桥', 'bridge']],
  拉萨: [['大昭寺', 'hall'], ['布达拉宫白塔', 'stupa']],
  香港: [['凌霄阁', 'civic'], ['天坛大佛', 'stupa']],
  郑州: [['中原福塔', 'tv'], ['河南博物院', 'civic']],
  青岛: [['五四广场', 'sail'], ['青岛电视塔', 'tv'], ['圣弥厄尔教堂', 'church']],
  昆明: [['金马碧鸡坊', 'paifang'], ['大观楼', 'pavilion']],
  沈阳: [['清福陵', 'hall'], ['辽宁广播电视塔', 'tv']],
  济南: [['解放阁', 'pavilion'], ['山东博物馆', 'civic']],
  澳门: [['东望洋灯塔', 'lighthouse'], ['澳门塔', 'tv'], ['葡京酒店', 'civic']],
  呼和浩特: [['五塔寺', 'pagoda'], ['昭君博物院', 'civic']],
  兰州: [['白塔山白塔', 'stupa'], ['黄河母亲雕塑', 'sail']],
  西宁: [['东关清真大寺', 'civic'], ['北禅寺', 'pavilion']],
  乌鲁木齐: [['红山塔', 'pagoda'], ['新疆博物馆', 'civic']],
  合肥: [['清风阁', 'pavilion'], ['包公祠', 'hall']],
  海口: [['世纪大桥', 'bridge'], ['海南省博物馆', 'civic']],
  太原: [['晋祠', 'hall'], ['迎泽门', 'gate']],
  银川: [['承天寺塔', 'pagoda'], ['银川鼓楼', 'pavilion']],
  贵阳: [['文昌阁', 'pavilion'], ['青岩古镇定广门', 'gate']],
  南昌: [['八一南昌起义纪念塔', 'tower'], ['八一大桥', 'bridge']],
  长沙: [['岳麓书院', 'hall'], ['杜甫江阁', 'pavilion']],
  福州: [['镇海楼', 'pavilion'], ['五一广场纪念塔', 'tower']],
  泰安: [['岱庙', 'hall'], ['南天门', 'gate']],
  曲阜: [['孔林万古长春坊', 'paifang'], ['颜庙', 'hall']],
  烟台: [['烟台市博物馆', 'civic'], ['养马岛灯塔', 'lighthouse']],
  东营: [['黄河文化馆', 'civic'], ['黄河入海塔', 'tower']],
  潍坊: [['十笏园', 'hall'], ['世界风筝都纪念广场', 'sail']],
  威海: [['刘公岛灯塔', 'lighthouse'], ['中国甲午战争博物院', 'civic'], ['环翠楼', 'pavilion']],
  日照: [['灯塔广场', 'lighthouse'], ['日照海洋美学馆', 'civic']],
  枣庄: [['台儿庄古城复兴楼', 'pavilion'], ['运河古桥', 'bridge']],
  德州: [['董子园', 'pavilion'], ['德州大剧院', 'civic']],
  滨州: [['黄河楼', 'pavilion'], ['魏氏庄园', 'hall']],
  菏泽: [['曹州牡丹园', 'pavilion'], ['菏泽大剧院', 'civic']],
  淄博: [['中国陶瓷琉璃馆', 'civic'], ['齐盛湖钟书阁', 'civic']],
  济宁: [['崇觉寺铁塔', 'pagoda'], ['京杭运河牌坊', 'paifang']],
  临沂: [['书法广场', 'sail'], ['临沂电视塔', 'tv']],
  聊城: [['山陕会馆', 'hall'], ['聊城铁塔', 'pagoda']],
  石家庄: [['正定隆兴寺', 'hall'], ['临济寺澄灵塔', 'pagoda']],
  长春: [['伪满皇宫', 'hall'], ['长影旧址博物馆', 'civic']],
  南宁: [['青秀山龙象塔', 'pagoda'], ['广西民族博物馆', 'civic']],
}

function modernMuseum(accent, rand) {
  const group = new THREE.Group()
  const glow = []
  const concrete = std(0xe4dfd5, { roughness: 0.78, metalness: 0.08 })
  const stone = std(0xb9b3aa, { roughness: 0.88 })
  const glass = curtainWall(shade(accent, -0.08), 3, 3)
  const trim = glowMat(shade(accent, 0.1), shade(accent, 0.22))
  glow.push(glass, trim)

  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(2.75, 3.05, 0.18, 18), stone)
  plaza.position.y = 0.09
  group.add(plaza)

  const center = new THREE.Mesh(new THREE.BoxGeometry(1.55, 2.45, 1.55), glass)
  center.position.y = 1.4
  group.add(center)
  const wings = [
    [-1.65, 0.88, 0.12, 2.1, 1.45, 1.45, -0.12],
    [1.62, 0.72, -0.18, 1.95, 1.18, 1.32, 0.16],
  ]
  wings.forEach((item) => {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(item[3], item[4], item[5]), concrete)
    wing.position.set(item[0], item[1], item[2])
    wing.rotation.y = item[6]
    group.add(wing)
  })
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.16, 1.72), trim)
  canopy.position.set(0, 1.92, 0.1)
  canopy.rotation.y = (rand() - 0.5) * 0.12
  group.add(canopy)

  const columns = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.07, 1.25, 6), concrete, 6)
  const matrix = new THREE.Matrix4()
  for (let i = 0; i < 6; i++) {
    matrix.makeTranslation(-1.25 + i * 0.5, 0.76, 0.92)
    columns.setMatrixAt(i, matrix)
  }
  columns.instanceMatrix.needsUpdate = true
  group.add(columns)
  group.userData.sightArchetype = 'museum'
  return { group, glow }
}

function heritageBlock(accent, rand) {
  const group = new THREE.Group()
  const glow = []
  const wall = glowMat(shade(accent, 0.28), 0xffd39a)
  const wallAlt = std(0xe5d7c1, { roughness: 0.86 })
  const roof = tiledRoof(shade(accent, -0.25), 4, 1, { roughness: 0.66 })
  const stone = std(0xbeb4a4, { roughness: 0.92 })
  glow.push(wall)

  const plaza = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.14, 3.5), stone)
  plaza.position.y = 0.07
  group.add(plaza)

  const bodyGeo = new THREE.BoxGeometry(1, 1, 1)
  const roofGeo = makeHipRoof(1, 1, 0.42, 0.72, 0.05)
  const blocks = [
    [-2.05, 0.72, -0.45, 1.25, 1.3, 1.18],
    [-0.72, 0.86, 0.18, 1.18, 1.58, 1.34],
    [0.62, 0.7, -0.28, 1.25, 1.28, 1.16],
    [1.92, 0.82, 0.28, 1.18, 1.5, 1.3],
  ]
  const bodiesA = new THREE.InstancedMesh(bodyGeo, wall, 2)
  const bodiesB = new THREE.InstancedMesh(bodyGeo, wallAlt, 2)
  const roofs = new THREE.InstancedMesh(roofGeo, roof, blocks.length)
  const matrix = new THREE.Matrix4()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  blocks.forEach((b, i) => {
    const yaw = (i % 2 ? -1 : 1) * (0.08 + rand() * 0.06)
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
    scale.set(b[3], b[4], b[5])
    matrix.compose(new THREE.Vector3(b[0], b[1], b[2]), quaternion, scale)
    ;(i % 2 ? bodiesB : bodiesA).setMatrixAt(Math.floor(i / 2), matrix)
    scale.set(b[3] * 1.13, 1, b[5] * 1.2)
    matrix.compose(new THREE.Vector3(b[0], b[4] + 0.16, b[2]), quaternion, scale)
    roofs.setMatrixAt(i, matrix)
  })
  bodiesA.instanceMatrix.needsUpdate = true
  bodiesB.instanceMatrix.needsUpdate = true
  roofs.instanceMatrix.needsUpdate = true
  group.add(bodiesA, bodiesB, roofs)

  const arch = cityGate()
  arch.group.position.set(0, 0.14, 1.15)
  arch.group.scale.setScalar(0.34)
  group.add(arch.group)
  ;(arch.glow || []).forEach((material) => glow.push(material))
  group.userData.sightArchetype = 'heritage'
  return { group, glow }
}

function watersideSight(accent, rand) {
  const group = new THREE.Group()
  const glow = []
  const water = std(0x3f86a6, { roughness: 0.22, metalness: 0.4, envMapIntensity: 1.35 })
  const bank = std(0xcfc7b7, { roughness: 0.9 })
  const beacon = glowMat(shade(accent, 0.08), shade(accent, 0.2))
  glow.push(beacon)

  const pool = new THREE.Mesh(new THREE.CylinderGeometry(2.85, 3.05, 0.12, 28), water)
  pool.position.y = 0.06
  const island = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.5, 0.22, 14), bank)
  island.position.y = 0.18
  group.add(pool, island)

  const pavilionPart = pavilion({
    tiers: 2, w: 1.8, d: 1.55, tierH: 0.95,
    body: shade(accent, 0.18), roof: shade(accent, -0.24), platform: 0.28,
  })
  pavilionPart.group.position.y = 0.25
  pavilionPart.group.scale.setScalar(0.72)
  group.add(pavilionPart.group)
  ;(pavilionPart.glow || []).forEach((material) => glow.push(material))

  const markers = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.2, 0.78, 6), beacon, 3)
  const matrix = new THREE.Matrix4()
  ;[[-1.65, 0.48, 0.95], [1.55, 0.48, 0.85], [0.1, 0.48, -1.72]].forEach((p, i) => {
    matrix.makeTranslation(p[0], p[1], p[2])
    markers.setMatrixAt(i, matrix)
  })
  markers.instanceMatrix.needsUpdate = true
  group.add(markers)
  group.userData.sightArchetype = 'waterside'
  return { group, glow }
}

function rockLandscape(accent, rand) {
  const group = new THREE.Group()
  const glow = []
  const earth = std(0xbca98d, { roughness: 0.96 })
  const rockMat = std(shade(accent, -0.12), { roughness: 0.9, metalness: 0.04 })
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.15, 0.28, 14), earth)
  base.position.y = 0.14
  group.add(base)

  const rocks = new THREE.InstancedMesh(new THREE.ConeGeometry(0.55, 2.4, 5), rockMat, 9)
  const matrix = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rand() * 0.32
    const radius = 0.65 + (i % 3) * 0.56
    const h = 0.72 + rand() * 0.75
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI)
    scale.set(0.55 + rand() * 0.5, h, 0.48 + rand() * 0.42)
    matrix.compose(new THREE.Vector3(Math.cos(a) * radius, 0.28 + 1.2 * h, Math.sin(a) * radius), q, scale)
    rocks.setMatrixAt(i, matrix)
  }
  rocks.instanceMatrix.needsUpdate = true
  group.add(rocks)
  group.userData.sightArchetype = 'rock'
  return { group, glow }
}

function iceMonument(accent, rand) {
  const group = new THREE.Group()
  const glow = []
  const ice = glowMat(0xbfe9ff, 0x8fdcff)
  ice.transparent = true
  ice.opacity = 0.82
  ice.roughness = 0.18
  ice.metalness = 0.12
  ice.depthWrite = true
  glow.push(ice)
  const snow = std(0xe9f2f5, { roughness: 0.86 })

  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.75, 3.05, 0.24, 16), snow)
  base.position.y = 0.12
  group.add(base)
  const crystals = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.7, 0), ice, 7)
  const matrix = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.62
    const h = 1.4 + (3 - Math.abs(i - 3)) * 0.48
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 0.36)
    scale.set(0.62, h, 0.62)
    matrix.compose(new THREE.Vector3(x, 0.35 + h * 0.65, Math.sin(i) * 0.42), q, scale)
    crystals.setMatrixAt(i, matrix)
  }
  crystals.instanceMatrix.needsUpdate = true
  group.add(crystals)
  group.userData.sightArchetype = 'ice'
  return { group, glow }
}

function monumentSight(accent, rand) {
  const group = new THREE.Group()
  const glow = []
  const stone = std(0xe2ded5, { roughness: 0.76 })
  const metal = glowMat(shade(accent, 0.02), shade(accent, 0.2))
  glow.push(metal)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.6, 0.3, 18), stone)
  base.position.y = 0.15
  group.add(base)
  for (const sx of [-1, 1]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.5, 0.72), stone)
    pier.position.set(sx * 1.3, 2.02, 0)
    group.add(pier)
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.2, 8, 24, Math.PI), metal)
  arch.position.y = 3.7
  arch.rotation.z = Math.PI
  group.add(arch)
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.75, 6), metal)
  spire.position.y = 5.15
  group.add(spire)
  group.userData.sightArchetype = 'monument'
  return { group, glow }
}

function resolveSightType(name, type) {
  const value = '' + (name || '')
  if (/冰雪|冰雕/.test(value)) return 'ice'
  if (/石林|奇石|石窟/.test(value)) return 'rock'
  if (/老街|街区|巷|古镇|骑楼|五大道|建筑群/.test(value)) return 'heritage'
  if (/西湖|东湖|净月潭|橘子洲|岛|湖|潭|园林/.test(value)) return 'water'
  if (/博物|美术|艺术|剧院|文化馆|纪念馆/.test(value)) return 'museum'
  if (/世界之窗|纪念碑|纪念塔/.test(value) && type === 'civic') return 'monument'
  return type
}

function buildNamedSight(spec) {
  if (!spec) return null
  const name = spec[0]
  const type = resolveSightType(name, spec[1])
  const accent = GENERIC_ACCENTS[hashName(name) % GENERIC_ACCENTS.length]
  const rand = mulberry32(hashName(name))
  let result
  switch (type) {
    case 'bridge': result = zhongshanBridge(); break
    case 'pagoda': result = pagoda({ tiers: 5, baseR: 0.9, tierH: 1.0, body: shade(accent, 0.12), roof: shade(accent, -0.2) }); break
    case 'gate': result = cityGate(); break
    case 'pavilion': result = pavilion({ tiers: 3, w: 2.9, d: 2.3, tierH: 1.2, body: shade(accent, 0.08), roof: shade(accent, -0.22), platform: 0.55 }); break
    case 'tv': result = tvTower(); break
    case 'lighthouse': result = lighthouse(); break
    case 'stupa': result = stupa(); break
    case 'paifang': result = paifang(); break
    case 'church': result = stSophia(); break
    case 'wheel': result = ferrisWheel(); break
    case 'sail': result = sailSculpture(); break
    case 'hall': result = dachengHall(); break
    case 'mountain': result = mountTai(); break
    case 'tower': result = slabTower({ h: 8.2, w: 0.82, color: accent, taper: 0.2 }); break
    case 'museum': result = modernMuseum(accent, rand); break
    case 'heritage': result = heritageBlock(accent, rand); break
    case 'water': result = watersideSight(accent, rand); break
    case 'rock': result = rockLandscape(accent, rand); break
    case 'ice': result = iceMonument(accent, rand); break
    case 'monument': result = monumentSight(accent, rand); break
    case 'civic':
    default: result = hashName(name) % 2 ? modernMuseum(accent, rand) : genDomedCivic(accent, rand); break
  }
  result.group.userData.landmarkName = name
  result.group.userData.landmarkRole = 'secondary'
  return result
}

function namedSecondarySight(key, index) {
  const spec = (NAMED_SECONDARY_SIGHTS[key] || [])[index]
  return buildNamedSight(spec)
}

function generatedSecondarySight(key, index) {
  const safeKey = key || '城市'
  const types = ['pavilion', 'bridge', 'civic', 'pagoda', 'gate', 'tower']
  const type = types[hashName(safeKey + ':' + index) % types.length]
  return buildNamedSight([safeKey + '地标' + (index + 1), type])
}

function touristExtraSight(key) {
  const result = buildNamedSight(TOURIST_EXTRA_SIGHTS[key])
  if (result && result.group) result.group.userData.landmarkRole = 'tourist'
  return result
}

function polishLandmark(key, result) {
  if (!result || !result.group || result.group.userData.visualPolished) return result
  result.glow = result.glow || []
  const glowing = result.glow.slice()
  result.group.traverse((object) => {
    if (!object.isMesh) return
    object.castShadow = true
    object.receiveShadow = true
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => {
      if (!material) return
      material.dithering = true
      if (material.roughness != null) material.roughness = Math.max(0.16, Math.min(0.84, material.roughness))
      if (material.envMapIntensity != null) {
        const reflective = material.metalness != null && material.metalness > 0.35
        material.envMapIntensity = Math.max(material.envMapIntensity || 0, reflective ? 1.35 : 0.62)
      }
      const hasGlow = material.emissiveMap || (
        material.emissive && typeof material.emissive.getHex === 'function' && material.emissive.getHex() !== 0
      )
      if (hasGlow && glowing.indexOf(material) < 0) glowing.push(material)
    })
  })
  result.group.updateMatrixWorld(true)
  const root = result.group
  const nodes = Array.isArray(root.userData.landmarkNodes) && root.userData.landmarkNodes.length
    ? root.userData.landmarkNodes.filter(Boolean)
    : [root]
  const anchors = []
  nodes.forEach((node) => {
    node.updateMatrixWorld(true)
    const bounds = new THREE.Box3().setFromObject(node)
    const center = bounds.getCenter(new THREE.Vector3())
    const size = bounds.getSize(new THREE.Vector3())
    anchors.push({
      x: center.x,
      z: center.z,
      radius: Math.max(0.9, Math.min(2.65, Math.hypot(size.x, size.z) * 0.34)),
    })
  })

  if (anchors.length) {
    // 每个地标各自落在石质展示台上；用 InstancedMesh 合为两次绘制，
    // 比套住整组建筑的一只巨大霓虹圈更稳重，也能清楚区分主地标和景点。
    const accent = GENERIC_ACCENTS[hashName(key) % GENERIC_ACCENTS.length]
    const padMaterial = std(0xd7d1c5, { roughness: 0.9, metalness: 0.04, envMapIntensity: 0.48 })
    const ringMaterial = glowMat(shade(accent, 0.04), shade(accent, 0.2))
    ringMaterial.transparent = true
    ringMaterial.opacity = 0.42
    ringMaterial.depthWrite = false
    const pads = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1, 1, 0.075, 24),
      padMaterial,
      anchors.length,
    )
    const rings = new THREE.InstancedMesh(
      new THREE.TorusGeometry(1, 0.026, 5, 32),
      ringMaterial,
      anchors.length,
    )
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const identity = new THREE.Quaternion()
    const ringRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))
    anchors.forEach((anchor, index) => {
      position.set(anchor.x, 0.038, anchor.z)
      scale.set(anchor.radius, 1, anchor.radius)
      matrix.compose(position, identity, scale)
      pads.setMatrixAt(index, matrix)
      position.y = 0.084
      scale.set(anchor.radius, anchor.radius, anchor.radius)
      matrix.compose(position, ringRotation, scale)
      rings.setMatrixAt(index, matrix)
    })
    pads.instanceMatrix.needsUpdate = true
    rings.instanceMatrix.needsUpdate = true
    pads.receiveShadow = true
    pads.castShadow = false
    rings.castShadow = false
    rings.receiveShadow = false
    root.add(pads, rings)
    glowing.push(ringMaterial)
    root.userData.presentationPads = anchors.length
  }
  result.glow = glowing
  result.group.userData.visualPolished = true
  return result
}

function findLandmarkBuilderKey(value) {
  const key = ('' + (value || '')).replace(/[市区县省]/g, '').trim()
  const keys = Object.keys(BUILDERS).sort((a, b) => b.length - a.length)
  for (let i = 0; i < keys.length; i++) {
    if (key.indexOf(keys[i]) !== -1) return keys[i]
  }
  return ''
}

function ensureLandmarkSet(key, result) {
  if (!result || !result.group) return result
  const canonicalKey = findLandmarkBuilderKey(key) || key
  const tourist = TOURIST_CITY_KEYS.indexOf(canonicalKey) >= 0
  const target = tourist ? 4 : 3
  let root = result.group
  let nodes = Array.isArray(root.userData.landmarkNodes)
    ? root.userData.landmarkNodes.filter(Boolean)
    : []

  // 单体 builder（例如天津之眼、单塔城市）先包成一个可计算的主地标节点。
  if (!nodes.length) {
    const hero = root
    root = new THREE.Group()
    root.userData = Object.assign({}, hero.userData)
    root.add(hero)
    nodes = [hero]
    result.group = root
  }

  result.glow = result.glow || []
  const names = Array.isArray(root.userData.secondaryLandmarks)
    ? root.userData.secondaryLandmarks.slice()
    : []
  nodes.forEach((node, index) => {
    node.userData = node.userData || {}
    node.userData.landmarkRole = node.userData.landmarkRole || (index === 0 ? 'hero' : 'secondary')
    node.userData.landmarkPriority = node.userData.landmarkPriority == null
      ? (index === 0 ? 100 : 80 - index)
      : node.userData.landmarkPriority
    node.userData.landmarkIndex = index
    node.userData.landmarkVisible = true
  })
  root.userData.landmarkNodes = nodes
  let count = nodes.length
  const positions = [
    [-4.2, 3.4],
    [4.15, 3.1],
    [-4.05, -3.65],
    [4.0, -3.45],
    [0.1, 4.25],
    [0.1, -4.15],
  ]
  const occupied = nodes.map((node) => [
    Number(node.position && node.position.x) || 0,
    Number(node.position && node.position.z) || 0,
  ])
  const pickPosition = () => {
    let best = positions[0]
    let bestScore = -Infinity
    for (let i = 0; i < positions.length; i++) {
      const candidate = positions[i]
      if (candidate._used) continue
      let score = Infinity
      for (let j = 0; j < occupied.length; j++) {
        score = Math.min(
          score,
          Math.hypot(candidate[0] - occupied[j][0], candidate[1] - occupied[j][1]),
        )
      }
      score += candidate[1] > 0 ? 0.45 : 0
      if (score > bestScore) {
        bestScore = score
        best = candidate
      }
    }
    best._used = true
    occupied.push(best)
    return best
  }
  let positionIndex = 0

  function addSight(extra) {
    if (!extra || !extra.group || count >= target) return false
    const at = pickPosition()
    positionIndex++
    extra.group.position.set(at[0], 0, at[1])
    // 副地标统一放进前景展示带，并为楼群避让留下更大的底座净空。
    const scale = extra.group.userData.landmarkRole === 'tourist'
      ? 0.78
      : 0.68 + (positionIndex % 2) * 0.05
    extra.group.userData.landmarkPriority = 50 - positionIndex
    extra.group.userData.landmarkIndex = nodes.length
    extra.group.userData.landmarkVisible = true
    extra.group.scale.setScalar(scale)
    root.add(extra.group)
    nodes.push(extra.group)
    const name = extra.group.userData.landmarkName
    if (name && names.indexOf(name) < 0) names.push(name)
    ;(extra.glow || []).forEach((material) => result.glow.push(material))
    count++
    return true
  }

  if (tourist && count < target) {
    const extra = touristExtraSight(canonicalKey)
    if (extra && names.indexOf(extra.group.userData.landmarkName) < 0) addSight(extra)
  }

  const specs = NAMED_SECONDARY_SIGHTS[canonicalKey] || []
  let secondaryIndex = 0
  while (count < target) {
    let extra = null
    while (secondaryIndex < specs.length && !extra) {
      const spec = specs[secondaryIndex++]
      if (names.indexOf(spec[0]) >= 0) continue
      extra = namedSecondarySight(canonicalKey, secondaryIndex - 1)
    }
    if (!extra) {
      extra = generatedSecondarySight(canonicalKey, count)
    }
    if (!addSight(extra)) break
  }

  root.userData.secondaryLandmarks = names
  root.userData.landmarkNodes = nodes
  root.userData.landmarkCount = count
  root.userData.landmarkTarget = target
  root.userData.landmarkCoverage = count >= target ? 'complete' : 'fallback'
  return polishLandmark(canonicalKey, result)
}

// 这些城市在旧库中已有可辨识的专属地标组合，优先使用，避免被通用玻璃塔替代。
const LEGACY_FIRST_CITIES = [
  '上海', '广州', '北京', '天津', '杭州', '武汉', '南京', '重庆', '成都', '西安', '苏州',
  '深圳', '哈尔滨', '香港', '台北', '郑州', '青岛', '济南', '烟台', '威海', '日照', '曲阜',
  '泰安', '兰州', '海口', '南昌', '长沙', '福州', '澳门',
]

export function buildLandmark(name) {
  const key = ('' + (name || '')).replace(/[市区县省]/g, '').trim()
  const canonicalKey = findLandmarkBuilderKey(key)
  if (canonicalKey) {
    try {
      return ensureLandmarkSet(canonicalKey, BUILDERS[canonicalKey]())
    } catch (e) {}
  }
  try {
    const enhanced = buildEnhancedLandmark(name)
    if (enhanced && enhanced.group) return ensureLandmarkSet(key, enhanced)
    return ensureLandmarkSet(key, proceduralLandmark(name))
  } catch (e) {
    return null
  }
}
