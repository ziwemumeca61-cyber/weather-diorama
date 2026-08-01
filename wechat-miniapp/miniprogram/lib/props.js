// 城市配景：路面、河流与桥、行人、车、行道树、路灯。
// 全部对齐 cityData 的街道网格，并避开中心地标广场。
// 行人和车用 InstancedMesh，每帧只更新矩阵，不新建对象。
import * as THREE from './three.module.min.js'
import { mulberry32, hashName, streetLines, GRID } from './cityData'

const ROAD_Y = 0.012 // 略高于托盘面，避免 z-fighting
const HALF = 7.6 // 行人/车走到这个范围外就回绕

const SKIN = [0xf2c9a0, 0xe0b088, 0xc99a72, 0xf7d9b8]
const CLOTH = [0xe0553f, 0x3f8fc4, 0xf0b429, 0x5aa86a, 0x9a6fd0, 0xe07fa8, 0x4a5a72, 0xd9d3c8]
const CARS = [0xe0553f, 0x3f6f9f, 0xf0f0f0, 0x2f3a48, 0xd9a441, 0x6a8f5a]

export function createProps(cityName, opts) {
  opts = opts || {}
  const clearX = opts.clearX || 1.6
  const clearZ = opts.clearZ || 1.6
  const withRiver = !opts.skipRiver
  const rand = mulberry32(hashName(cityName || '城') ^ 0x5bf03635)
  const group = new THREE.Group()
  const glow = [] // 夜里点亮的材质（路灯、车灯）
  const lines = streetLines()

  // 河流在城市后侧横穿；有河时最靠后的那条街让位给河
  const riverZ = 6.0
  const riverW = 2.6
  const inRiver = (z) => withRiver && Math.abs(z - riverZ) < riverW / 2 + 0.35

  /* ---------------- 路面 ---------------- */
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x6e747c, roughness: 0.95, metalness: 0 })
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.9 })
  const roadLen = GRID.max - GRID.min + 2.2
  lines.xs.forEach((x) => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.02, roadLen), roadMat)
    r.position.set(x, ROAD_Y, 0)
    r.receiveShadow = true
    group.add(r)
  })
  lines.zs.forEach((z) => {
    if (inRiver(z)) return // 这条街被河占了
    const r = new THREE.Mesh(new THREE.BoxGeometry(roadLen, 0.02, 1.15), roadMat)
    r.position.set(0, ROAD_Y, z)
    r.receiveShadow = true
    group.add(r)
  })
  // 中心虚线
  lines.xs.forEach((x) => {
    for (let s = -6.5; s <= 6.5; s += 1.3) {
      if (withRiver && Math.abs(s - riverZ) < riverW / 2) continue
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.01, 0.5), lineMat)
      d.position.set(x, ROAD_Y + 0.012, s)
      group.add(d)
    }
  })

  /* ---------------- 河流 + 桥 ---------------- */
  if (withRiver) {
    const water = new THREE.Mesh(
      new THREE.BoxGeometry(roadLen + 3, 0.14, riverW),
      new THREE.MeshStandardMaterial({
        color: 0x4a86a8,
        roughness: 0.18,
        metalness: 0.45,
        transparent: true,
        opacity: 0.92,
      }),
    )
    water.position.set(0, 0.02, riverZ)
    group.add(water)
    // 两岸护堤
    for (const s of [-1, 1]) {
      const bank = new THREE.Mesh(
        new THREE.BoxGeometry(roadLen + 3, 0.16, 0.28),
        new THREE.MeshStandardMaterial({ color: 0xb8b2a6, roughness: 0.95 }),
      )
      bank.position.set(0, 0.08, riverZ + (s * (riverW + 0.28)) / 2)
      group.add(bank)
    }
    // 桥：架在最中间那条纵向街上
    const bx = lines.xs.length ? lines.xs[Math.floor(lines.xs.length / 2)] : 0
    const stone = new THREE.MeshStandardMaterial({ color: 0xcfc9bd, roughness: 0.9 })
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, riverW + 1.2), stone)
    deck.position.set(bx, 0.42, riverZ)
    group.add(deck)
    for (const s of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, riverW + 1.2), stone)
      rail.position.set(bx + s * 0.6, 0.6, riverZ)
      group.add(rail)
    }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.11, 6, 14, Math.PI), stone)
    arch.position.set(bx, 0.06, riverZ)
    arch.rotation.y = Math.PI / 2
    group.add(arch)
  }

  /* ---------------- 行道树 + 路灯（避开广场与河） ---------------- */
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3f, roughness: 0.95 })
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f8a4a, roughness: 0.85 })
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x8a939c, roughness: 0.6, metalness: 0.4 })
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfff3d0,
    emissive: new THREE.Color(0xffd98a),
    emissiveIntensity: 0.1,
    roughness: 0.4,
  })
  glow.push(lampMat)

  const trunkGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.5, 5)
  const leafGeo = new THREE.SphereGeometry(0.34, 8, 6)
  const poleGeo = new THREE.CylinderGeometry(0.035, 0.045, 1.25, 5)
  const lampGeo = new THREE.SphereGeometry(0.1, 8, 6)
  const okSpot = (x, z) =>
    !(Math.abs(x) <= clearX && Math.abs(z) <= clearZ) && !inRiver(z) && Math.abs(z) < 7.4

  lines.xs.forEach((x, li) => {
    for (let z = -6.6; z <= 6.6; z += 1.65) {
      const side = ((li + Math.round(z)) % 2 ? 1 : -1) * 0.78
      const px = x + side
      const jz = z + (rand() - 0.5) * 0.3
      if (!okSpot(px, jz)) continue
      if (rand() < 0.34) {
        const pole = new THREE.Mesh(poleGeo, poleMat)
        pole.position.set(px, 0.62, jz)
        group.add(pole)
        const head = new THREE.Mesh(lampGeo, lampMat)
        head.position.set(px, 1.3, jz)
        group.add(head)
      } else {
        const tr = new THREE.Mesh(trunkGeo, trunkMat)
        tr.position.set(px, 0.25, jz)
        group.add(tr)
        const lf = new THREE.Mesh(leafGeo, leafMat)
        lf.position.set(px, 0.68, jz)
        lf.scale.set(1, 1.15, 1)
        group.add(lf)
      }
    }
  })

  /* ---------------- 行人（InstancedMesh） ---------------- */
  const PEOPLE = 26
  const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.85 })
  const headMat = new THREE.MeshStandardMaterial({ roughness: 0.8 })
  const bodies = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.055, 0.075, 0.2, 6),
    bodyMat,
    PEOPLE,
  )
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.052, 7, 6), headMat, PEOPLE)
  bodies.castShadow = true
  group.add(bodies, heads)

  const walkers = []
  const col = new THREE.Color()
  for (let i = 0; i < PEOPLE; i++) {
    const alongX = rand() < 0.5
    const lane = alongX
      ? lines.zs[Math.floor(rand() * lines.zs.length)]
      : lines.xs[Math.floor(rand() * lines.xs.length)]
    walkers.push({
      alongX: alongX,
      lane: lane + (rand() - 0.5) * 0.55,
      pos: (rand() - 0.5) * 2 * HALF,
      dir: rand() < 0.5 ? 1 : -1,
      speed: 0.32 + rand() * 0.26,
      phase: rand() * Math.PI * 2,
    })
    bodies.setColorAt(i, col.set(CLOTH[Math.floor(rand() * CLOTH.length)]))
    heads.setColorAt(i, col.set(SKIN[Math.floor(rand() * SKIN.length)]))
  }
  if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true
  if (heads.instanceColor) heads.instanceColor.needsUpdate = true

  /* ---------------- 车（InstancedMesh） ---------------- */
  const CARN = 11
  const carMat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.35 })
  const cars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.17, 0.22), carMat, CARN)
  cars.castShadow = true
  group.add(cars)
  const drivers = []
  for (let i = 0; i < CARN; i++) {
    const alongX = rand() < 0.5
    const lane = alongX
      ? lines.zs[Math.floor(rand() * lines.zs.length)]
      : lines.xs[Math.floor(rand() * lines.xs.length)]
    const dir = rand() < 0.5 ? 1 : -1
    drivers.push({
      alongX: alongX,
      lane: lane + dir * 0.26, // 靠右行驶
      pos: (rand() - 0.5) * 2 * HALF,
      dir: dir,
      speed: 1.5 + rand() * 1.1,
    })
    cars.setColorAt(i, col.set(CARS[Math.floor(rand() * CARS.length)]))
  }
  if (cars.instanceColor) cars.instanceColor.needsUpdate = true

  // 复用的临时对象，避免每帧 new
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const sc = new THREE.Vector3(1, 1, 1)
  const p = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  let last = 0

  function step(t) {
    const dt = last ? Math.min(0.05, t - last) : 0.016
    last = t

    for (let i = 0; i < PEOPLE; i++) {
      const w = walkers[i]
      w.pos += w.speed * w.dir * dt
      if (w.pos > HALF) w.pos = -HALF
      else if (w.pos < -HALF) w.pos = HALF
      const x = w.alongX ? w.pos : w.lane
      const z = w.alongX ? w.lane : w.pos
      // 走路的上下起伏
      const bob = Math.abs(Math.sin(t * 5.5 + w.phase)) * 0.028
      q.setFromAxisAngle(up, w.alongX ? (w.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : w.dir > 0 ? 0 : Math.PI)
      p.set(x, 0.11 + bob, z)
      m.compose(p, q, sc)
      bodies.setMatrixAt(i, m)
      p.set(x, 0.245 + bob, z)
      m.compose(p, q, sc)
      heads.setMatrixAt(i, m)
    }
    bodies.instanceMatrix.needsUpdate = true
    heads.instanceMatrix.needsUpdate = true

    for (let i = 0; i < CARN; i++) {
      const c = drivers[i]
      c.pos += c.speed * c.dir * dt
      if (c.pos > HALF) c.pos = -HALF
      else if (c.pos < -HALF) c.pos = HALF
      const x = c.alongX ? c.pos : c.lane
      const z = c.alongX ? c.lane : c.pos
      q.setFromAxisAngle(up, c.alongX ? 0 : Math.PI / 2)
      p.set(x, 0.11, z)
      m.compose(p, q, sc)
      cars.setMatrixAt(i, m)
    }
    cars.instanceMatrix.needsUpdate = true
  }

  function dispose() {
    // 每次切城市都会重建配景，几何与材质都是本次新建的，一并释放
    const seen = []
    group.traverse((o) => {
      if (!o.isMesh) return
      try {
        o.geometry.dispose()
      } catch (e) {}
      if (o.material && seen.indexOf(o.material) === -1) {
        seen.push(o.material)
        try {
          o.material.dispose()
        } catch (e) {}
      }
    })
  }

  return { group: group, glow: glow, step: step, dispose: dispose }
}
