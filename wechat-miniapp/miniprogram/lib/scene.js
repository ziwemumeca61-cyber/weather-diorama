// 微信小程序原生 Three.js 场景。构图和动态表现与 Web 端 scene/ 保持同源。
import * as THREE from './three.core.js'
import { CITY, generateCity, mulberry32 } from './cityData'
import { createEnvironment } from './environment'
import { buildLandmark } from './landmarks'
import { createProps } from './props'
import { profileForCity, inLake } from './sceneProfiles'
import { createSky } from './sky'
import { makeWindowTexture } from './tileTexture'
import { createWeatherEffects } from './weatherEffects'

const WEATHER_LOOK = {
  clear: { sun: 1, grey: 0, darken: 0 },
  cloudy: { sun: 0.82, grey: 0.15, darken: 0.05 },
  overcast: { sun: 0.4, grey: 0.5, darken: 0.18 },
  fog: { sun: 0.5, grey: 0.55, darken: 0.1 },
  rain: { sun: 0.42, grey: 0.45, darken: 0.28 },
  snow: { sun: 0.72, grey: 0.35, darken: 0.05 },
  thunder: { sun: 0.32, grey: 0.4, darken: 0.4 },
}

function makeGableGeometry() {
  const positions = new Float32Array([
    -0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 1, 0,
    0.5, 0, -0.5, 0.5, 1, 0, 0.5, 0, 0.5,
    -0.5, 0, -0.5, -0.5, 1, 0, 0.5, 1, 0,
    -0.5, 0, -0.5, 0.5, 1, 0, 0.5, 0, -0.5,
    -0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 1, 0,
    -0.5, 0, 0.5, 0.5, 1, 0, -0.5, 1, 0,
  ])
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

function makeFacadeMaterial(glass) {
  const texture = glass
    ? makeWindowTexture(0x9bacbc, 0x7792aa, 0xffcf7a)
    : makeWindowTexture(0xe1ddd5, 0x9eabb6, 0xffcf7a)
  texture.map.repeat.set(glass ? 1.4 : 1, glass ? 3.5 : 2.5)
  texture.emissiveMap.repeat.copy(texture.map.repeat)
  return new THREE.MeshStandardMaterial({
    map: texture.map,
    emissive: new THREE.Color(0xffcf7a),
    emissiveMap: texture.emissiveMap,
    emissiveIntensity: 0,
    roughness: glass ? 0.22 : 0.8,
    metalness: glass ? 0.82 : 0.1,
  })
}

function disposeTree(root) {
  if (!root) return
  const geometries = []
  const materials = []
  const textures = []
  root.traverse((object) => {
    if (!object.isMesh && !object.isPoints && !object.isLine && !object.isLineSegments) return
    if (object.geometry && geometries.indexOf(object.geometry) === -1) {
      geometries.push(object.geometry)
      try { object.geometry.dispose() } catch (e) {}
    }
    const list = Array.isArray(object.material) ? object.material : [object.material]
    list.forEach((material) => {
      if (!material || materials.indexOf(material) !== -1) return
      materials.push(material)
      ;['map', 'emissiveMap', 'roughnessMap', 'normalMap', 'alphaMap'].forEach((key) => {
        const texture = material[key]
        if (texture && textures.indexOf(texture) === -1) {
          textures.push(texture)
          try { texture.dispose() } catch (e) {}
        }
      })
      try { material.dispose() } catch (e) {}
    })
  })
}

function addBuildingMesh(root, geometry, material, list) {
  if (!list.length) return null
  const mesh = new THREE.InstancedMesh(geometry, material, list.length)
  mesh.castShadow = true
  mesh.receiveShadow = true
  const matrix = new THREE.Matrix4()
  const position = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  const color = new THREE.Color()
  list.forEach((building, i) => {
    position.set(building.x, building.h / 2, building.z)
    scale.set(building.w, building.h, building.d)
    matrix.compose(position, quaternion, scale)
    mesh.setMatrixAt(i, matrix)
    mesh.setColorAt(i, color.set(building.color))
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  root.add(mesh)
  return mesh
}

function buildSkyline(buildings) {
  const root = new THREE.Group()
  const box = new THREE.BoxGeometry(1, 1, 1)
  const glass = buildings.filter((b) => b.core > 0.5)
  const concrete = buildings.filter((b) => b.core <= 0.5)
  const glassMat = makeFacadeMaterial(true)
  const concreteMat = makeFacadeMaterial(false)
  addBuildingMesh(root, box, glassMat, glass)
  addBuildingMesh(root, box, concreteMat, concrete)

  const matrix = new THREE.Matrix4()
  const position = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  const color = new THREE.Color()
  const roofPalette = [0xb06a4a, 0x9c5b40, 0x8a6f63, 0x6f7075]
  const roofMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 })

  const hip = buildings.filter((b) => b.roof === 'hip')
  if (hip.length) {
    const geometry = new THREE.ConeGeometry(0.5, 1, 4)
    const mesh = new THREE.InstancedMesh(geometry, roofMat, hip.length)
    mesh.castShadow = true
    hip.forEach((b, i) => {
      const capH = 0.2 + Math.min(b.w, b.d) * 0.22
      position.set(b.x, b.h + capH / 2, b.z)
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4)
      scale.set(b.w * 1.08, capH, b.d * 1.08)
      matrix.compose(position, quaternion, scale)
      mesh.setMatrixAt(i, matrix)
      color.set(roofPalette[i % roofPalette.length]).offsetHSL(0, 0, (i % 3) * 0.02 - 0.02)
      mesh.setColorAt(i, color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    root.add(mesh)
  }

  const gable = buildings.filter((b) => b.roof === 'gable')
  if (gable.length) {
    const mesh = new THREE.InstancedMesh(makeGableGeometry(), roofMat, gable.length)
    mesh.castShadow = true
    gable.forEach((b, i) => {
      const height = 0.18 + b.d * 0.3
      position.set(b.x, b.h, b.z)
      quaternion.identity()
      scale.set(b.w * 1.08, height, b.d * 1.12)
      matrix.compose(position, quaternion, scale)
      mesh.setMatrixAt(i, matrix)
      color.set(roofPalette[(i + 1) % roofPalette.length]).offsetHSL(0, 0, (i % 3) * 0.02 - 0.02)
      mesh.setColorAt(i, color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    root.add(mesh)
  }

  const crownList = glass.filter((b) => b.h > 5.3 && b.roof === 'flat')
  if (crownList.length) {
    const crownMat = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.7 })
    const crowns = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.5, 1, 6), crownMat, crownList.length)
    crowns.castShadow = true
    crownList.forEach((b, i) => {
      position.set(b.x, b.h + b.w * 0.5, b.z)
      quaternion.identity()
      scale.set(b.w * 0.58, b.w, b.d * 0.58)
      matrix.compose(position, quaternion, scale)
      crowns.setMatrixAt(i, matrix)
      crowns.setColorAt(i, color.set(b.color).multiplyScalar(0.9))
    })
    crowns.instanceMatrix.needsUpdate = true
    if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true
    root.add(crowns)
  }

  const rooftopData = []
  const rand = mulberry32(555)
  buildings.forEach((b) => {
    if (b.h < 1.6 || b.roof !== 'flat') return
    const count = 1 + Math.floor(rand() * 2)
    for (let i = 0; i < count; i++) {
      const sx = b.w * (0.12 + rand() * 0.18)
      const sy = 0.12 + rand() * 0.2
      rooftopData.push({
        x: b.x + (rand() - 0.5) * b.w * 0.5,
        y: b.h + sy / 2,
        z: b.z + (rand() - 0.5) * b.d * 0.5,
        sx,
        sy,
      })
    }
  })
  if (rooftopData.length) {
    const rooftopMat = new THREE.MeshStandardMaterial({ color: 0x6d7178, roughness: 0.9, metalness: 0.1 })
    const rooftops = new THREE.InstancedMesh(box, rooftopMat, rooftopData.length)
    rooftops.castShadow = rooftops.receiveShadow = true
    rooftopData.forEach((item, i) => {
      position.set(item.x, item.y, item.z)
      quaternion.identity()
      scale.set(item.sx, item.sy, item.sx)
      matrix.compose(position, quaternion, scale)
      rooftops.setMatrixAt(i, matrix)
    })
    rooftops.instanceMatrix.needsUpdate = true
    root.add(rooftops)
  }
  return { root, materials: [glassMat, concreteMat] }
}

export function createScene(canvas, opts) {
  const width = opts.width
  const height = opts.height
  const dpr = Math.min(opts.dpr || 2, 2)
  if (typeof canvas.addEventListener !== 'function') canvas.addEventListener = () => {}
  if (typeof canvas.removeEventListener !== 'function') canvas.removeEventListener = () => {}
  if (canvas.style === undefined) canvas.style = { width: '', height: '' }

  const gl = canvas.getContext('webgl', { antialias: true, alpha: false }) || canvas.getContext('experimental-webgl', { antialias: true, alpha: false })
  if (!gl) throw new Error('当前设备无法创建 WebGL 场景')
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, alpha: false })
  renderer.setPixelRatio(dpr)
  renderer.setSize(width, height, false)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xbcd9ec)
  scene.fog = new THREE.FogExp2(0xbcd9ec, 0.003)
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 200)
  const cameraTarget = new THREE.Vector3(0, -1, 0)

  const ambient = new THREE.AmbientLight(0xaecbe6, 0.55)
  const hemisphere = new THREE.HemisphereLight(0xbcd9ec, 0x3a3f47, 0.44)
  const sun = new THREE.DirectionalLight(0xfff4e2, 2.4)
  sun.position.set(9, 14, 6)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 60
  sun.shadow.camera.left = -16
  sun.shadow.camera.right = 16
  sun.shadow.camera.top = 16
  sun.shadow.camera.bottom = -16
  sun.shadow.camera.updateProjectionMatrix()
  sun.shadow.bias = -0.0007
  scene.add(ambient, hemisphere, sun)

  const sky = createSky()
  scene.add(sky.group)
  const weatherFx = createWeatherEffects(scene)
  const world = new THREE.Group()
  const cityRoot = new THREE.Group()
  world.add(cityRoot)
  scene.add(world)

  let environment = null
  let props = null
  let skyline = null
  let landmark = null
  let landmarkGlow = []
  let landmarkSpin = null
  let landmarkAnimate = null
  let cityMaterials = []
  let currentCity = null
  let currentProfile = null
  let currentWeather = 'clear'
  let isNight = false

  const current = {
    sky: new THREE.Color(0xbcd9ec),
    sun: new THREE.Color(0xfff4e2),
    ambient: new THREE.Color(0xaecbe6),
    sunPosition: new THREE.Vector3(9, 14, 6),
    sunIntensity: 2.4,
    ambientIntensity: 0.55,
    fogDensity: 0.003,
    night: 0,
    buildingGlow: 0,
    landmarkGlow: 0.15,
  }
  const target = {
    sky: new THREE.Color(0xbcd9ec),
    sun: new THREE.Color(0xfff4e2),
    ambient: new THREE.Color(0xaecbe6),
    sunPosition: new THREE.Vector3(9, 14, 6),
    sunIntensity: 2.4,
    ambientIntensity: 0.55,
    fogDensity: 0.003,
    night: 0,
    buildingGlow: 0,
    landmarkGlow: 0.15,
  }
  const grey = new THREE.Color(0x9aa2ab)
  const sunGrey = new THREE.Color(0xcfd6de)

  function refreshLook() {
    const mod = WEATHER_LOOK[currentWeather] || WEATHER_LOOK.clear
    if (isNight) {
      target.sky.set(0x0c1524)
      target.sun.set(0x546891)
      target.ambient.set(0x243049)
      target.sunIntensity = 0.35
      target.ambientIntensity = 0.4
      target.sunPosition.set(-8, 12, -6)
      target.night = 1
    } else {
      target.sky.set(0xbcd9ec)
      target.sun.set(0xfff4e2)
      target.ambient.set(0xaecbe6)
      target.sunIntensity = 2.4
      target.ambientIntensity = 0.55
      target.sunPosition.set(9, 14, 6)
      target.night = 0
    }
    target.sky.lerp(grey, mod.grey).multiplyScalar(1 - mod.darken)
    target.sun.lerp(sunGrey, mod.grey * 0.6)
    target.ambient.lerp(grey, mod.grey * 0.5)
    target.sunIntensity *= mod.sun
    target.ambientIntensity *= 1 + mod.grey * 0.4
    target.fogDensity = currentWeather === 'fog' ? 0.025 : currentWeather === 'rain' || currentWeather === 'thunder' ? 0.0065 : currentWeather === 'snow' ? 0.0045 : 0.003
    target.buildingGlow = isNight ? 1.15 : 0
    target.landmarkGlow = isNight ? 0.9 : 0.15
  }

  function applyGlow() {
    cityMaterials.forEach((material) => { material.emissiveIntensity = current.buildingGlow })
    landmarkGlow.forEach((material) => {
      if (material && material.emissiveIntensity != null) material.emissiveIntensity = current.landmarkGlow
    })
  }

  function cleanupCity() {
    if (props) {
      cityRoot.remove(props.group)
      props.dispose()
      props = null
    }
    if (skyline) {
      cityRoot.remove(skyline.root)
      disposeTree(skyline.root)
      skyline = null
    }
    if (landmark) {
      cityRoot.remove(landmark)
      disposeTree(landmark)
      landmark = null
    }
    if (environment) {
      world.remove(environment.group)
      environment.dispose()
      environment = null
    }
    landmarkGlow = []
    landmarkSpin = null
    landmarkAnimate = null
    cityMaterials = []
  }

  function buildCity(cityName) {
    const key = '' + (cityName || '上海')
    if (currentCity === key && environment) return
    cleanupCity()
    currentCity = key
    currentProfile = profileForCity(key)
    environment = createEnvironment(currentProfile.water)
    world.add(environment.group)

    const built = buildLandmark(key)
    let clearZones = [{ x: CITY.landmark.x, z: CITY.landmark.z, r: 1.7 }]
    let calmZones = [{ x: CITY.landmark.x, z: CITY.landmark.z, r: 4.6, maxHeight: 2.8 }]
    if (built && built.group) {
      // 各城市地标组合已经按 Web 组件的局部坐标排布，不再整体套用楼群核心偏移。
      built.group.position.set(0, 0, 0)
      built.group.updateMatrixWorld(true)
      const bounds = new THREE.Box3().setFromObject(built.group)
      const center = bounds.getCenter(new THREE.Vector3())
      const size = bounds.getSize(new THREE.Vector3())
      const radius = Math.min(5.8, Math.max(1.7, Math.hypot(size.x, size.z) * 0.38 + 0.7))
      clearZones = [{ x: center.x, z: center.z, r: radius }]
      calmZones = [{ x: center.x, z: center.z, r: Math.min(8.5, radius + 3), maxHeight: 2.5 }]
      built.group.traverse((object) => { if (object.isMesh) object.castShadow = true })
      landmark = built.group
      landmarkGlow = built.glow || []
      landmarkSpin = built.spin || null
      landmarkAnimate = typeof built.animate === 'function' ? built.animate : null
      cityRoot.add(landmark)
    }
    if (currentProfile.water.lake) {
      const lake = currentProfile.water.lake
      clearZones.push({ x: lake.x, z: lake.z, r: Math.max(lake.rx, lake.rz) + 0.35 })
    }

    const buildings = generateCity(
      currentProfile.seed,
      clearZones,
      calmZones,
      currentProfile.water.cityMaxZ,
      currentProfile.hueShift,
    ).filter((b) => !inLake(currentProfile.water, b.x, b.z, 0.35))
    skyline = buildSkyline(buildings)
    cityMaterials = skyline.materials
    cityRoot.add(skyline.root)
    props = createProps(key, { water: currentProfile.water, clearZones })
    props.setWeather(currentWeather)
    cityRoot.add(props.group)
    environment.setWeather(currentWeather)
    environment.setNight(current.night)
    applyGlow()
  }

  function setWeather(kind) {
    currentWeather = WEATHER_LOOK[kind] ? kind : 'clear'
    weatherFx.setWeather(currentWeather)
    if (environment) environment.setWeather(currentWeather)
    if (props) props.setWeather(currentWeather)
    refreshLook()
  }

  function setNight(value) {
    isNight = !!value
    refreshLook()
  }

  // 与 Web 端 OrbitControls 对齐：radius 是相机到目标点的真实距离，
  // polar 是从正上方量起的轨道角，允许越过地平线看到悬浮底盘底部。
  let angle = Math.atan2(21, 19)
  let polar = Math.acos(3 / Math.sqrt(19 * 19 + 3 * 3 + 21 * 21))
  let radius = Math.sqrt(19 * 19 + 3 * 3 + 21 * 21)
  const MIN_POLAR = 0.15
  const MAX_POLAR = Math.PI * 0.62
  const MIN_RADIUS = 8.5
  const MAX_RADIUS = 82
  let dragging = false
  let userInteracted = false
  let lastTouches = []
  let lastCenter = null
  let lastDistance = 0
  const now = () => (Date.now ? Date.now() : new Date().getTime())

  function normalizeTouches(value, y) {
    if (Array.isArray(value)) {
      return value.map((point) => ({
        x: Number(point && point.x != null ? point.x : point && point.clientX) || 0,
        y: Number(point && point.y != null ? point.y : point && point.clientY) || 0,
      }))
    }
    if (value && typeof value === 'object' && value.touches) return normalizeTouches(value.touches)
    if (value == null) return []
    return [{ x: Number(value) || 0, y: Number(y) || 0 }]
  }

  function touchCenter(points) {
    if (!points.length) return { x: 0, y: 0 }
    let x = 0
    let y = 0
    points.forEach((point) => {
      x += point.x
      y += point.y
    })
    return { x: x / points.length, y: y / points.length }
  }

  function touchDistance(points) {
    if (points.length < 2) return 0
    const dx = points[0].x - points[1].x
    const dy = points[0].y - points[1].y
    return Math.sqrt(dx * dx + dy * dy)
  }

  function onTouchStart(value, y) {
    const points = normalizeTouches(value, y)
    if (!points.length) return
    userInteracted = true
    dragging = true
    lastTouches = points
    lastCenter = touchCenter(points)
    lastDistance = touchDistance(points)
  }

  function onTouchMove(value, y) {
    const points = normalizeTouches(value, y)
    if (!dragging || !points.length) return
    const center = touchCenter(points)
    const previousCenter = lastCenter || center

    if (points.length >= 2 && lastTouches.length >= 2) {
      // 双指中心负责旋转/俯仰，捏合距离负责缩放。
      // 方向按当前真机反馈反转，让模型随手指滑动方向转动。
      angle -= (center.x - previousCenter.x) * 0.010
      polar = Math.max(MIN_POLAR, Math.min(MAX_POLAR, polar + (center.y - previousCenter.y) * 0.008))
      const distance = touchDistance(points)
      if (distance > 1 && lastDistance > 1) {
        // 两指向内收时拉近，向外张时拉远；采用幂函数放大捏合反馈。
        const zoom = Math.pow(distance / lastDistance, 1.35)
        radius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, radius * zoom))
      }
      lastDistance = distance
    } else if (lastTouches.length) {
      angle -= (points[0].x - lastTouches[0].x) * 0.011
      polar = Math.max(MIN_POLAR, Math.min(MAX_POLAR, polar + (points[0].y - lastTouches[0].y) * 0.009))
      lastDistance = touchDistance(points)
    }

    lastTouches = points
    lastCenter = center
  }

  function onTouchEnd(value) {
    const points = normalizeTouches(value)
    if (points.length) {
      // 一根手指抬起后，保留另一根手指的连续拖动状态。
      lastTouches = points
      lastCenter = touchCenter(points)
      lastDistance = touchDistance(points)
      return
    }
    dragging = false
    lastTouches = []
    lastCenter = null
    lastDistance = 0
  }

  let raf = null
  const started = now()
  let lastFrame = started
  function frame() {
    const stamp = now()
    const dt = Math.min(0.05, Math.max(0.001, (stamp - lastFrame) * 0.001))
    const t = (stamp - started) * 0.001
    lastFrame = stamp
    if (!dragging && !userInteracted) angle += dt * 0.042
    camera.position.set(
      cameraTarget.x + Math.sin(polar) * Math.cos(angle) * radius,
      cameraTarget.y + Math.cos(polar) * radius,
      cameraTarget.z + Math.sin(polar) * Math.sin(angle) * radius,
    )
    camera.lookAt(cameraTarget)

    const damping = 1 - Math.exp(-3 * dt)
    current.sky.lerp(target.sky, damping)
    current.sun.lerp(target.sun, damping)
    current.ambient.lerp(target.ambient, damping)
    current.sunPosition.lerp(target.sunPosition, damping)
    current.sunIntensity += (target.sunIntensity - current.sunIntensity) * damping
    current.ambientIntensity += (target.ambientIntensity - current.ambientIntensity) * damping
    current.fogDensity += (target.fogDensity - current.fogDensity) * damping
    current.night += (target.night - current.night) * damping
    current.buildingGlow += (target.buildingGlow - current.buildingGlow) * damping
    current.landmarkGlow += (target.landmarkGlow - current.landmarkGlow) * damping
    scene.background.copy(current.sky)
    scene.fog.color.copy(current.sky)
    scene.fog.density = current.fogDensity
    sun.color.copy(current.sun)
    sun.position.copy(current.sunPosition)
    ambient.color.copy(current.ambient)
    hemisphere.color.copy(current.sky)
    hemisphere.intensity = current.ambientIntensity * 0.8
    applyGlow()

    const flash = weatherFx.step(t, dt)
    ambient.intensity = current.ambientIntensity + flash * 1.6
    sun.intensity = current.sunIntensity + flash * 2.2
    if (environment) {
      environment.setNight(current.night)
      environment.step(t, dt)
    }
    if (props) props.step(t)
    if (landmarkSpin) landmarkSpin.rotation.z += dt * 0.24
    if (landmarkAnimate) landmarkAnimate(t, current.landmarkGlow, current.night)
    sky.update(current.night, currentWeather, camera, t)

    world.position.y = Math.sin(t * 0.5) * 0.18
    world.rotation.z = Math.sin(t * 0.4) * 0.012
    world.rotation.x = Math.sin(t * 0.33 + 1.1) * 0.01
    renderer.render(scene, camera)
    raf = canvas.requestAnimationFrame(frame)
  }

  refreshLook()
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
      if (!w || !h) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    },
    dispose() {
      try { if (raf && canvas.cancelAnimationFrame) canvas.cancelAnimationFrame(raf) } catch (e) {}
      raf = null
      try { renderer.setAnimationLoop(null) } catch (e) {}
      cleanupCity()
      weatherFx.dispose()
      sky.dispose()
      try { renderer.dispose() } catch (e) {}
    },
  }
}
