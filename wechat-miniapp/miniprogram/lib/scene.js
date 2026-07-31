// 小程序原生 Three.js 微缩城市场景（第一版：托盘 + 楼群 + 主塔 + 光照 + 自动环绕）。
// 用 InstancedMesh 控制 draw call；setWeather() 切换天空/雾/背景色调。
// 这是移植的起点，跑通后再逐步搬入 web 版的地标、粒子特效、昼夜灯光。
import * as THREE from './three.module.min.js'
import { generateCity, hashName } from './cityData'
import { buildLandmark } from './landmarks'

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
  const camTarget = new THREE.Vector3(0, 1.2, 0)

  // 光照
  const amb = new THREE.AmbientLight(0xffffff, 0.75)
  scene.add(amb)
  const sun = new THREE.DirectionalLight(0xfff2d8, 2.0)
  sun.position.set(12, 18, 8)
  sun.castShadow = true
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

  // 楼群（InstancedMesh）
  const cityGroup = new THREE.Group()
  scene.add(cityGroup)
  let buildingsMesh = null
  let buildMat = null
  let landmarkObj = null // 当前城市地标 Group
  let landmarkGlow = [] // 地标夜间点亮的材质
  let landmarkSpin = null // 摩天轮等需每帧转动的部件
  let isNight = false

  function applyLandmarkGlow() {
    const on = isNight ? 0.9 : 0.15
    for (let i = 0; i < landmarkGlow.length; i++) landmarkGlow[i].emissiveIntensity = on
  }

  function buildCity(cityName) {
    if (buildingsMesh) {
      cityGroup.remove(buildingsMesh)
      buildingsMesh.geometry.dispose()
      buildingsMesh.material.dispose()
    }
    if (landmarkObj) {
      cityGroup.remove(landmarkObj)
      landmarkObj = null
      landmarkGlow = []
      landmarkSpin = null
    }
    const data = generateCity(hashName(cityName || '上海'))
    const geo = new THREE.BoxGeometry(1, 1, 1)
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.82,
      metalness: 0.05,
      emissive: new THREE.Color(0xffcf7a),
      emissiveIntensity: isNight ? 0.35 : 0,
    })
    buildMat = mat
    const mesh = new THREE.InstancedMesh(geo, mat, data.length)
    mesh.castShadow = true
    mesh.receiveShadow = true
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const s = new THREE.Vector3()
    const p = new THREE.Vector3()
    const col = new THREE.Color()
    data.forEach((b, i) => {
      p.set(b.x, b.h / 2, b.z)
      s.set(b.w, b.h, b.d)
      m.compose(p, q, s)
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, col.set(b.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    cityGroup.add(mesh)
    buildingsMesh = mesh

    // 城市专属地标（找不到则退回通用主塔）
    const lm = buildLandmark(cityName)
    if (lm) {
      lm.group.position.set(0, 0, 0)
      lm.group.traverse((o) => {
        if (o.isMesh) o.castShadow = true
      })
      cityGroup.add(lm.group)
      landmarkObj = lm.group
      landmarkGlow = lm.glow || []
      landmarkSpin = lm.spin || null
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
  }

  let curKind = 'clear'
  function setWeather(kind) {
    curKind = kind
    applyPrecip(kind)
    if (isNight) return applyNight() // 夜间由 applyNight 统一定色
    const c = new THREE.Color(SKY[kind] != null ? SKY[kind] : SKY.clear)
    scene.background = c
    scene.fog.color.copy(c)
    scene.fog.near = kind === 'fog' ? 10 : 26
    sun.intensity = kind === 'clear' ? 2.2 : kind === 'thunder' || kind === 'overcast' ? 0.9 : 1.5
    sun.color.set(0xfff2d8)
    amb.intensity = 0.75
    if (buildMat) buildMat.emissiveIntensity = 0
    applyLandmarkGlow()
  }

  // 夜间：深蓝天空 + 暖光楼宇 + 弱冷月光
  function applyNight() {
    const c = new THREE.Color(0x0d1730)
    scene.background = c
    scene.fog.color.copy(c)
    scene.fog.near = curKind === 'fog' ? 10 : 26
    amb.intensity = 0.32
    sun.intensity = 0.5
    sun.color.set(0x9fb4d8)
    if (buildMat) buildMat.emissiveIntensity = 0.42
    applyLandmarkGlow()
  }

  function setNight(night) {
    isNight = !!night
    try {
      if (isNight) applyNight()
      else setWeather(curKind)
    } catch (e) {}
  }

  // 相机：自动环绕 + 手势拖拽（横向转角、纵向抬升），松手静置片刻后恢复自动巡航
  let raf = null
  let t = 0 // 方位角
  let elev = 9 // 相机高度
  const R = 23
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
    elev = Math.max(3.5, Math.min(16, elev - (y - lastY) * 0.03))
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
  const baseAmb = () => (isNight ? 0.32 : 0.75)

  function frame() {
    if (!dragging && now() > idleUntil) t += 0.0022
    camera.position.set(Math.cos(t) * R, elev, Math.sin(t) * R)
    camera.lookAt(camTarget)

    // 摩天轮等地标自转
    if (landmarkSpin) landmarkSpin.rotation.z += 0.004

    // 雷电闪光
    if (curKind === 'thunder') {
      const ts = now()
      if (ts > nextBolt) {
        flash = 1
        nextBolt = ts + 2200 + Math.random() * 3800
      }
      if (flash > 0.001) {
        flash *= 0.82
        amb.intensity = baseAmb() + flash * 1.6
        sun.intensity = 0.9 + flash * 2.2
      } else {
        amb.intensity = baseAmb()
      }
    }

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
        renderer.dispose()
      } catch (e) {}
    },
  }
}
