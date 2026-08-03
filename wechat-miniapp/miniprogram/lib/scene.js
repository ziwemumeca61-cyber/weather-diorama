// 小程序原生 Three.js 微缩城市场景（第一版：托盘 + 楼群 + 主塔 + 光照 + 自动环绕）。
// 用 InstancedMesh 控制 draw call；setWeather() 切换天空/雾/背景色调。
// 这是移植的起点，跑通后再逐步搬入 web 版的地标、粒子特效、昼夜灯光。
import * as THREE from './three.core.js'
import { generateCity, hashName } from './cityData'
import { buildLandmark, hasOwnWater } from './landmarks'
import { createProps } from './props'
import { createSky } from './sky'
import { makeWindowTexture } from './tileTexture'

/** 坡屋顶（人字顶）：底面 1×1，屋脊沿 X，高 1。用单位几何配合实例缩放。 */
function makeGableGeo() {
  const v = new Float32Array([
    // 前坡
    -0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 1, 0, -0.5, 0, 0.5, 0.5, 1, 0, -0.5, 1, 0,
    // 后坡
    0.5, 0, -0.5, -0.5, 0, -0.5, -0.5, 1, 0, 0.5, 0, -0.5, -0.5, 1, 0, 0.5, 1, 0,
    // 两侧山墙
    -0.5, 0, 0.5, -0.5, 1, 0, -0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 1, 0, 0.5, 0, 0.5,
  ])
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(v, 3))
  g.computeVertexNormals()
  return g
}
const GABLE_GEO = makeGableGeo()
// 四坡顶：四棱锥，底面 1×1（半径 √2/2 且转 45° 后正好是单位方形）
const HIP_GEO = new THREE.ConeGeometry(Math.SQRT2 / 2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0)

/** 楼身幕墙材质：窗格贴图 + 只有窗户会亮的自发光图 */
function makeFacadeMat(rows) {
  const tex = makeWindowTexture(0xffffff, 0xc4d2e2, 0xffd08a)
  // 横向只铺 1 遍（贴图本身 4 列）→ 一个立面 4 个窗。
  // 原来 repeat.x=2 配 8 列贴图 = 16 个窗，在 26 单位外糊成一片灰。
  tex.map.repeat.set(1, rows)
  tex.emissiveMap.repeat.set(1, rows)
  return new THREE.MeshStandardMaterial({
    map: tex.map,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: tex.emissiveMap,
    emissiveIntensity: 0,
    roughness: 0.82,
    metalness: 0.05,
  })
}

/** 释放材质及其引用的贴图（material.dispose() 不管贴图） */
function disposeMat(m) {
  if (!m) return
  const maps = ['map', 'emissiveMap', 'bumpMap', 'normalMap']
  for (let i = 0; i < maps.length; i++) {
    const t = m[maps[i]]
    if (t && t.dispose) {
      try {
        t.dispose()
      } catch (e) {}
    }
  }
  try {
    m.dispose()
  } catch (e) {}
}

const SKY = {
  clear: 0x8fc0ea,
  cloudy: 0xb3c0cc,
  overcast: 0x8a94a0,
  fog: 0xb6bcc2,
  rain: 0x71797f,
  snow: 0xcdd6e0,
  thunder: 0x565b64,
}

export function createScene(canvas, opts) {
  const width = opts.width
  const height = opts.height
  const dpr = Math.min(opts.dpr || 2, 2)

  // 小程序 canvas 节点缺少 DOM 事件/style 接口；three 的 WebGLRenderer 构造时会调
  // canvas.addEventListener('webglcontextlost', …)，不补桩就报 "addEventListener is not a function"。
  if (typeof canvas.addEventListener !== 'function') canvas.addEventListener = () => {}
  if (typeof canvas.removeEventListener !== 'function') canvas.removeEventListener = () => {}
  if (canvas.style === undefined) canvas.style = { width: '', height: '' }

  // 小程序 canvas 只有 WebGL 1.0（不认 webgl2）。显式取 webgl1 上下文喂给渲染器，
  // 避免 three 去请求不存在的 webgl2 而报 "Error creating WebGL context"。
  const gl =
    canvas.getContext('webgl', { antialias: true, alpha: false }) ||
    canvas.getContext('experimental-webgl', { antialias: true, alpha: false })
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, alpha: false })
  renderer.setSize(width, height, false)
  renderer.setPixelRatio(dpr)
  renderer.shadowMap.enabled = true

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(SKY.clear)
  scene.fog = new THREE.Fog(SKY.clear, 26, 60)

  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 200)
  const camTarget = new THREE.Vector3(0, 2.0, 0)

  // 光照
  const amb = new THREE.AmbientLight(0xffffff, 0.75)
  scene.add(amb)
  const sun = new THREE.DirectionalLight(0xfff2d8, 2.0)
  sun.position.set(12, 18, 8)
  sun.castShadow = true
  // DirectionalLight 的默认阴影相机只有正交 ±5，而城市跨度 ±10，
  // 不配的话中心以外根本没有阴影，却照样付一整遍渲染的代价。
  const sc = sun.shadow.camera
  sc.left = -12
  sc.right = 12
  sc.top = 12
  sc.bottom = -12
  sc.near = 1
  sc.far = 60
  sc.updateProjectionMatrix()
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.bias = -0.0012
  scene.add(sun)

  // 托盘
  const tray = new THREE.Mesh(
    new THREE.BoxGeometry(20, 0.6, 20),
    new THREE.MeshStandardMaterial({ color: 0xeef3fa, roughness: 0.9 }),
  )
  tray.position.y = -0.3
  tray.receiveShadow = true
  scene.add(tray)

  // 云托底
  const cloud = new THREE.Mesh(
    new THREE.SphereGeometry(9, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0xf2f6fd, roughness: 1 }),
  )
  cloud.scale.set(1.5, 0.5, 1.5)
  cloud.position.y = -3.2
  scene.add(cloud)

  // 降水粒子（雨 / 雪），落在城市上空
  const PCOUNT = 700
  const AREA = 15
  const TOP = 24
  const pPos = new Float32Array(PCOUNT * 3)
  for (let i = 0; i < PCOUNT; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 2 * AREA
    pPos[i * 3 + 1] = Math.random() * TOP
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 2 * AREA
  }
  const pGeo = new THREE.BufferGeometry()
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
  const pMat = new THREE.PointsMaterial({
    color: 0xbfd4e6,
    size: 0.12,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  })
  const precip = new THREE.Points(pGeo, pMat)
  precip.visible = false
  scene.add(precip)
  let precipMode = null // 'rain' | 'snow' | null

  // 雨滴溅落：在地面和屋顶随机炸开的小水环（兑现「雨滴打在屋顶」）
  const SPLASH = 40
  const splashMat = new THREE.MeshBasicMaterial({
    color: 0xdcebf7,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const splashes = new THREE.InstancedMesh(
    new THREE.RingGeometry(0.5, 1, 10).rotateX(-Math.PI / 2),
    splashMat,
    SPLASH,
  )
  splashes.visible = false
  scene.add(splashes)
  const drops = []
  for (let i = 0; i < SPLASH; i++) {
    drops.push({ x: 0, y: 0, z: 0, age: Math.random(), life: 0.45 + Math.random() * 0.35 })
  }
  // 一半落地面、一半落屋顶
  function reseed(d, i) {
    const roof = i % 2 === 1 && rooftops.length
    if (roof) {
      const b = rooftops[Math.floor(Math.random() * rooftops.length)]
      d.x = b.x + (Math.random() - 0.5) * b.w
      d.z = b.z + (Math.random() - 0.5) * b.d
      d.y = b.h + 0.03
    } else {
      d.x = (Math.random() - 0.5) * 15
      d.z = (Math.random() - 0.5) * 15
      d.y = 0.04
    }
    d.age = 0
    d.life = 0.42 + Math.random() * 0.36
  }
  const sMat = new THREE.Matrix4()
  const sQ = new THREE.Quaternion()
  const sS = new THREE.Vector3()
  const sP = new THREE.Vector3()
  function stepSplash(dt) {
    for (let i = 0; i < SPLASH; i++) {
      const d = drops[i]
      d.age += dt
      if (d.age >= d.life) reseed(d, i)
      const t01 = d.age / d.life
      // 先扩散后收束，无需逐实例透明度也能读出「溅起又消失」
      const r = Math.sin(t01 * Math.PI) * 0.26
      sP.set(d.x, d.y, d.z)
      sS.set(r, 1, r)
      sMat.compose(sP, sQ, sS)
      splashes.setMatrixAt(i, sMat)
    }
    splashes.instanceMatrix.needsUpdate = true
  }

  // 街道雾团：几片贴地的半透明雾体，雾天渐显并缓缓漂移（体积雾近似）
  const fogBanks = new THREE.Group()
  const fogMats = []
  const FOG_OPACITY = []
  const fogGeo = new THREE.SphereGeometry(1, 14, 10)
  for (let i = 0; i < 7; i++) {
    const fm = new THREE.MeshBasicMaterial({
      color: 0xdfe6ee,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
    const fmesh = new THREE.Mesh(fogGeo, fm)
    const a = (i / 7) * Math.PI * 2
    const rad = 3.5 + Math.random() * 5
    fmesh.position.set(Math.cos(a) * rad, 0.5 + Math.random() * 0.9, Math.sin(a) * rad)
    fmesh.scale.set(4.5 + Math.random() * 2.5, 0.8, 4.5 + Math.random() * 2.5)
    fogBanks.add(fmesh)
    fogMats.push(fm)
    FOG_OPACITY.push(0.3 + Math.random() * 0.22)
  }
  fogBanks.visible = false
  scene.add(fogBanks)

  // 星空 / 月亮 / 太阳
  const sky = createSky()
  scene.add(sky.group)

  // 楼群（InstancedMesh）
  const cityGroup = new THREE.Group()
  scene.add(cityGroup)
  let buildingMeshes = [] // 楼身（按高度分档）+ 各类屋顶
  let buildMats = [] // 楼身材质（夜间窗户发光）
  let buildRoofMat = null
  let rooftops = [] // 当前楼群数据，雨滴溅落用它挑屋顶落点
  let landmarkObj = null // 当前城市地标 Group
  let landmarkGlow = [] // 地标夜间点亮的材质
  let landmarkSpin = null // 摩天轮等需每帧转动的部件
  let landmarkAnim = null // 地标专属灯光动画（彩虹流光/呼吸灯/跑马灯）
  let props = null // 路面/河/行人/车/树/路灯
  let propsGlow = [] // 路灯材质，夜间点亮
  let isNight = false

  function applyLandmarkGlow() {
    for (let i = 0; i < landmarkGlow.length; i++) landmarkGlow[i].emissiveIntensity = cur.landmark
    // 路灯：白天全灭，入夜渐亮
    const lamp = Math.max(0, (cur.landmark - 0.15) / 0.75) * 1.5
    for (let i = 0; i < propsGlow.length; i++) propsGlow[i].emissiveIntensity = lamp
  }

  function buildCity(cityName) {
    for (let i = 0; i < buildingMeshes.length; i++) {
      const bm = buildingMeshes[i]
      cityGroup.remove(bm)
      // GABLE_GEO / HIP_GEO 是模块级共享几何，所有城市反复复用，
      // 释放了下一座城市就画不出屋顶——只释放本次 buildCity 内新建的。
      if (bm.geometry === GABLE_GEO || bm.geometry === HIP_GEO) continue
      try {
        bm.geometry.dispose()
      } catch (e) {}
    }
    // material.dispose() 不会释放它引用的贴图，
    // 幕墙每档 2 张、切一次城市就泄漏 6 张 DataTexture，必须手动释放。
    for (let i = 0; i < buildMats.length; i++) disposeMat(buildMats[i])
    disposeMat(buildRoofMat)
    buildingMeshes = []
    buildMats = []
    buildRoofMat = null
    if (landmarkObj) {
      cityGroup.remove(landmarkObj)
      landmarkObj = null
      landmarkGlow = []
      landmarkSpin = null
      landmarkAnim = null
    }
    // 先建地标并量出占地，好在城市中心留出等大的广场。
    // 否则中心那圈最高的楼（可达 14 单位）会把矮地标（蒙古包、铁桥）整个埋掉。
    const lm = buildLandmark(cityName)
    let clearX = 1.6
    let clearZ = 1.6
    if (lm) {
      lm.group.updateMatrixWorld(true)
      const bb = new THREE.Box3().setFromObject(lm.group)
      clearX = Math.max(1.6, Math.min(5.5, (bb.max.x - bb.min.x) / 2 + 0.9))
      clearZ = Math.max(1.6, Math.min(5.5, (bb.max.z - bb.min.z) / 2 + 0.9))
    }
    // 配景：路面、河、桥、行人、车、行道树、路灯
    if (props) {
      cityGroup.remove(props.group)
      props.dispose()
      props = null
      propsGlow = []
    }
    const skipRiver = hasOwnWater(cityName)
    props = createProps(cityName, { clearX: clearX, clearZ: clearZ, skipRiver: skipRiver })
    cityGroup.add(props.group)
    propsGlow = props.glow || []

    const data = generateCity(hashName(cityName || '上海')).filter((b) => {
      if (Math.abs(b.x) <= clearX && Math.abs(b.z) <= clearZ) return false // 地标广场
      if (!skipRiver && Math.abs(b.z - 6.0) < 1.75) return false // 河道
      return true
    })
    rooftops = data // 供雨滴溅落挑落点

    // 楼身按高度分三档，每档用不同的窗格重复次数，
    // 否则同一张贴图铺在 1 米和 14 米的楼上，窗户会被拉得又高又扁。
    // rows = 纵向重复次数，贴图每遍 4 行窗 → 实际窗行数 = rows × 4
    const BUCKETS = [
      { max: 3.2, rows: 1 },
      { max: 7.0, rows: 2 },
      { max: Infinity, rows: 3.5 },
    ]
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const s = new THREE.Vector3()
    const p = new THREE.Vector3()
    const col = new THREE.Color()
    const c2 = new THREE.Color()
    const boxGeo = new THREE.BoxGeometry(1, 1, 1)

    BUCKETS.forEach((bk, bi) => {
      const lo = bi === 0 ? 0 : BUCKETS[bi - 1].max
      const list = data.filter((b) => b.h > lo && b.h <= bk.max)
      if (!list.length) return
      const mat = makeFacadeMat(bk.rows)
      buildMats.push(mat)
      const mesh = new THREE.InstancedMesh(boxGeo, mat, list.length)
      mesh.castShadow = true
      mesh.receiveShadow = true
      list.forEach((b, i) => {
        p.set(b.x, b.h / 2, b.z)
        s.set(b.w, b.h, b.d)
        m.compose(p, q, s)
        mesh.setMatrixAt(i, m)
        mesh.setColorAt(i, col.set(b.color))
      })
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      cityGroup.add(mesh)
      buildingMeshes.push(mesh)
    })

    // 屋顶造型：坡屋顶 / 四坡顶 / 退台，各自一个 InstancedMesh
    const roofMat = new THREE.MeshStandardMaterial({ roughness: 0.86, metalness: 0.04 })
    buildRoofMat = roofMat
    const ROOFS = [
      { kind: 'gable', geo: GABLE_GEO },
      { kind: 'hip', geo: HIP_GEO },
      { kind: 'setback', geo: boxGeo },
    ]
    ROOFS.forEach((r) => {
      const list = data.filter((b) => b.roof === r.kind)
      if (!list.length) return
      const mesh = new THREE.InstancedMesh(r.geo, roofMat, list.length)
      mesh.castShadow = true
      list.forEach((b, i) => {
        if (r.kind === 'setback') {
          const sh = Math.min(1.5, b.h * 0.16)
          p.set(b.x, b.h + sh / 2, b.z)
          s.set(b.w * 0.62, sh, b.d * 0.62)
        } else {
          const rh = Math.min(0.85, Math.max(0.3, b.w * 0.55))
          p.set(b.x, b.h, b.z)
          s.set(b.w, rh, b.d)
        }
        m.compose(p, q, s)
        mesh.setMatrixAt(i, m)
        // 坡屋顶压暗成瓦色，退台沿用楼身色
        c2.set(b.color)
        if (r.kind !== 'setback') c2.multiplyScalar(0.62)
        mesh.setColorAt(i, c2)
      })
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      cityGroup.add(mesh)
      buildingMeshes.push(mesh)
    })

    // 城市专属地标（找不到则退回通用主塔）
    if (lm) {
      lm.group.position.set(0, 0, 0)
      lm.group.traverse((o) => {
        if (o.isMesh) o.castShadow = true
      })
      cityGroup.add(lm.group)
      landmarkObj = lm.group
      landmarkGlow = lm.glow || []
      landmarkSpin = lm.spin || null
      landmarkAnim = typeof lm.animate === 'function' ? lm.animate : null
    } else {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.7, 9, 6),
        new THREE.MeshStandardMaterial({ color: 0x5f86ad, roughness: 0.3, metalness: 0.6 }),
      )
      tower.position.set(0.4, 4.5, -0.6)
      tower.castShadow = true
      cityGroup.add(tower)
      landmarkObj = tower
    }
    applyLandmarkGlow()
  }

  function applyPrecip(kind) {
    if (kind === 'rain' || kind === 'thunder') {
      precipMode = 'rain'
      precip.visible = true
      pMat.color.set(0xaebfce)
      pMat.size = 0.09
      pMat.opacity = 0.8
    } else if (kind === 'snow') {
      precipMode = 'snow'
      precip.visible = true
      pMat.color.set(0xffffff)
      pMat.size = 0.2
      pMat.opacity = 0.95
    } else {
      precipMode = null
      precip.visible = false
    }
    splashes.visible = precipMode === 'rain'
  }

  // —— 天气 / 昼夜渐变过渡 ——
  // setWeather、setNight 只设定「目标值」，由帧循环把当前值平滑插值过去，
  // 切天气不再是瞬间硬切，而是天色、雾、光照一起缓缓变化。
  let curKind = 'clear'
  const cur = {
    sky: new THREE.Color(SKY.clear),
    sunColor: new THREE.Color(0xfff2d8),
    fogNear: 26,
    sun: 2.2,
    amb: 0.75,
    build: 0, // 楼宇窗光
    landmark: 0.15, // 地标自发光
    bank: 0, // 街道雾团浓度
  }
  const tgt = {
    sky: new THREE.Color(SKY.clear),
    sunColor: new THREE.Color(0xfff2d8),
    fogNear: 26,
    sun: 2.2,
    amb: 0.75,
    build: 0,
    landmark: 0.15,
    bank: 0,
  }

  function refreshTargets() {
    const kind = curKind
    tgt.fogNear = kind === 'fog' ? 9 : 26
    tgt.bank = kind === 'fog' ? 1 : 0
    if (isNight) {
      // 夜间：深蓝天空 + 暖光楼宇 + 弱冷月光
      tgt.sky.set(0x0d1730)
      tgt.sunColor.set(0x9fb4d8)
      tgt.sun = 0.5
      tgt.amb = 0.32
      tgt.build = 0.42
      tgt.landmark = 0.9
    } else {
      tgt.sky.set(SKY[kind] != null ? SKY[kind] : SKY.clear)
      tgt.sunColor.set(0xfff2d8)
      tgt.sun = kind === 'clear' ? 2.2 : kind === 'thunder' || kind === 'overcast' ? 0.9 : 1.5
      tgt.amb = 0.75
      tgt.build = 0
      tgt.landmark = 0.15
    }
  }

  // 每帧把 cur 拉向 tgt，并写入场景
  function tickTransition() {
    const k = 0.06
    cur.sky.lerp(tgt.sky, k)
    cur.sunColor.lerp(tgt.sunColor, k)
    cur.fogNear += (tgt.fogNear - cur.fogNear) * k
    cur.sun += (tgt.sun - cur.sun) * k
    cur.amb += (tgt.amb - cur.amb) * k
    cur.build += (tgt.build - cur.build) * k
    cur.landmark += (tgt.landmark - cur.landmark) * k
    cur.bank += (tgt.bank - cur.bank) * k

    scene.background = cur.sky
    scene.fog.color.copy(cur.sky)
    scene.fog.near = cur.fogNear
    sun.color.copy(cur.sunColor)
    for (let i = 0; i < buildMats.length; i++) buildMats[i].emissiveIntensity = cur.build * 2.2
    applyLandmarkGlow()

    fogBanks.visible = cur.bank > 0.02
    if (fogBanks.visible) {
      for (let i = 0; i < fogMats.length; i++) fogMats[i].opacity = cur.bank * FOG_OPACITY[i]
      fogBanks.rotation.y += 0.0006 // 雾团缓缓漂移
    }
  }

  function setWeather(kind) {
    curKind = kind
    applyPrecip(kind)
    refreshTargets()
  }

  function setNight(night) {
    isNight = !!night
    try {
      refreshTargets()
    } catch (e) {}
  }

  // 相机：自动环绕 + 手势拖拽（横向转角、纵向抬升），松手静置片刻后恢复自动巡航
  let raf = null
  let t = 0 // 方位角
  // 俯角 = atan((elev - target.y) / R)。原来 R=23/elev=9 只有 18.7°，几乎是平视，
  // 看着像站在街上而不是俯看模型 —— 微缩感需要 30~40°。
  let elev = 19 // → 约 33°
  const R = 26
  let dragging = false
  let lastX = 0
  let lastY = 0
  let idleUntil = 0 // 时间戳（ms）之前不自动环绕
  function now() {
    return Date.now ? Date.now() : new Date().getTime()
  }
  function onTouchStart(x, y) {
    dragging = true
    lastX = x
    lastY = y
    idleUntil = now() + 999999
  }
  function onTouchMove(x, y) {
    if (!dragging) return
    t -= (x - lastX) * 0.008
    elev = Math.max(9, Math.min(30, elev - (y - lastY) * 0.06))
    lastX = x
    lastY = y
  }
  function onTouchEnd() {
    dragging = false
    idleUntil = now() + 2600 // 静置 2.6s 后恢复自动环绕
  }

  // 雷电闪光：curKind==='thunder' 时随机触发全场景亮度脉冲
  let flash = 0 // 0..1 剩余强度
  let nextBolt = 0
  const t0 = now() // 地标灯光动画的时间基准（秒），不受拖拽暂停影响
  let lastSplashT = 0

  function frame() {
    if (!dragging && now() > idleUntil) t += 0.0022
    camera.position.set(Math.cos(t) * R, elev, Math.sin(t) * R)
    camera.lookAt(camTarget)

    // 摩天轮等地标自转
    if (landmarkSpin) landmarkSpin.rotation.z += 0.004

    // 天气/昼夜渐变
    tickTransition()

    // 行人、车流
    const secs = (now() - t0) * 0.001
    if (props) props.step(secs)

    // 雨滴溅落
    if (splashes.visible) stepSplash(Math.min(0.05, secs - lastSplashT || 0.016))
    lastSplashT = secs

    // 星月与太阳：跟随昼夜因子与当前天气
    sky.update(
      Math.max(0, Math.min(1, (cur.landmark - 0.15) / 0.75)),
      curKind === 'clear' || curKind === 'cloudy',
      camera,
      secs,
    )

    // 地标专属灯光（在 applyLandmarkGlow 之后，可覆盖自发光强度）
    if (landmarkAnim) {
      const nf = Math.max(0, Math.min(1, (cur.landmark - 0.15) / 0.75))
      landmarkAnim((now() - t0) * 0.001, cur.landmark, nf)
    }

    // 雷电闪光：叠加在渐变后的基准亮度之上
    if (curKind === 'thunder') {
      const ts = now()
      if (ts > nextBolt) {
        flash = 1
        nextBolt = ts + 2200 + Math.random() * 3800
      }
    }
    flash = flash > 0.001 ? flash * 0.82 : 0
    amb.intensity = cur.amb + flash * 1.6
    sun.intensity = cur.sun + flash * 2.2

    // 降水动画
    if (precipMode) {
      const speed = precipMode === 'rain' ? 0.55 : 0.13
      for (let i = 0; i < PCOUNT; i++) {
        const yi = i * 3 + 1
        pPos[yi] -= speed
        if (precipMode === 'snow') {
          pPos[i * 3] += Math.sin((t * 40 + i) * 0.5) * 0.01
        }
        if (pPos[yi] < 0) {
          pPos[yi] = TOP
          pPos[i * 3] = (Math.random() - 0.5) * 2 * AREA
          pPos[i * 3 + 2] = (Math.random() - 0.5) * 2 * AREA
        }
      }
      pGeo.attributes.position.needsUpdate = true
    }

    renderer.render(scene, camera)
    raf = canvas.requestAnimationFrame(frame)
  }

  buildCity(opts.city)
  frame()

  return {
    setCity: buildCity,
    setWeather,
    setNight,
    isNight: () => isNight,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    resize(w, h) {
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    },
    dispose() {
      // 小程序环境下 three 内部 cancelAnimationFrame 可能读到 null，
      // 页面卸载/热重载时会抛错；逐项加保护，避免销毁流程崩溃。
      try {
        if (raf && canvas && canvas.cancelAnimationFrame) canvas.cancelAnimationFrame(raf)
      } catch (e) {}
      raf = null
      try {
        renderer.setAnimationLoop(null)
      } catch (e) {}
      try {
        if (props) props.dispose()
      } catch (e) {}
      try {
        sky.dispose()
      } catch (e) {}
      try {
        renderer.dispose()
      } catch (e) {}
    },
  }
}
