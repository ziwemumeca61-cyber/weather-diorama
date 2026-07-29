// 小程序原生 Three.js 微缩城市场景（第一版：托盘 + 楼群 + 主塔 + 光照 + 自动环绕）。
// 用 InstancedMesh 控制 draw call；setWeather() 切换天空/雾/背景色调。
// 这是移植的起点，跑通后再逐步搬入 web 版的地标、粒子特效、昼夜灯光。
import * as THREE from './three.module.min.js'
import { generateCity, hashName } from './cityData'

const SKY = {
  clear: 0xdfeaf6,
  cloudy: 0xcfd6de,
  overcast: 0x9aa3ad,
  fog: 0xc3c8cd,
  rain: 0x8b939d,
  snow: 0xdfe6ee,
  thunder: 0x6b7079,
}

export function createScene(canvas, opts) {
  const width = opts.width
  const height = opts.height
  const dpr = Math.min(opts.dpr || 2, 2)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setSize(width, height, false)
  renderer.setPixelRatio(dpr)
  renderer.shadowMap.enabled = true

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(SKY.clear)
  scene.fog = new THREE.Fog(SKY.clear, 26, 60)

  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 200)
  const camTarget = new THREE.Vector3(0, -0.5, 0)

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

  // 楼群（InstancedMesh）
  const cityGroup = new THREE.Group()
  scene.add(cityGroup)
  let buildingsMesh = null

  function buildCity(cityName) {
    if (buildingsMesh) {
      cityGroup.remove(buildingsMesh)
      buildingsMesh.geometry.dispose()
      buildingsMesh.material.dispose()
    }
    const data = generateCity(hashName(cityName || '上海'))
    const geo = new THREE.BoxGeometry(1, 1, 1)
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.05 })
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

    // 主塔（视觉焦点）
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.7, 9, 6),
      new THREE.MeshStandardMaterial({ color: 0x5f86ad, roughness: 0.3, metalness: 0.6 }),
    )
    tower.position.set(0.4, 4.5, -0.6)
    tower.castShadow = true
    cityGroup.add(tower)
  }

  function setWeather(kind) {
    const c = new THREE.Color(SKY[kind] != null ? SKY[kind] : SKY.clear)
    scene.background = c
    scene.fog.color.copy(c)
    const foggy = kind === 'fog'
    scene.fog.near = foggy ? 10 : 26
    sun.intensity = kind === 'clear' ? 2.2 : kind === 'thunder' || kind === 'overcast' ? 0.9 : 1.5
  }

  // 渲染循环 + 自动环绕
  let raf = null
  let t = 0
  const R = 26
  function frame() {
    t += 0.0025
    camera.position.set(Math.cos(t) * R, 9, Math.sin(t) * R)
    camera.lookAt(camTarget)
    renderer.render(scene, camera)
    raf = canvas.requestAnimationFrame(frame)
  }

  buildCity(opts.city)
  frame()

  return {
    setCity: buildCity,
    setWeather,
    resize(w, h) {
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    },
    dispose() {
      if (raf) canvas.cancelAnimationFrame(raf)
      renderer.dispose()
    },
  }
}
