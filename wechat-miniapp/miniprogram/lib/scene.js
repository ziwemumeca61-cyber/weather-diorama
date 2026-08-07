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


function makeReflectionEnvironment() {
  // Web 端 Environment 的轻量原生替代：用一张渐变环境贴图给玻璃幕墙提供蓝天、
  // 云层和白色建筑光带的反射高光。使用 DataTexture，不依赖外部图片资源。
  const width = 64
  const height = 32
  const data = new Uint8Array(width * height * 4)
  const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)))
  for (let y = 0; y < height; y++) {
    const v = y / (height - 1)
    const sky = v < 0.58
      ? [64 + v * 245, 108 + v * 190, 158 + v * 150]
      : [206 - (v - 0.58) * 320, 230 - (v - 0.58) * 330, 244 - (v - 0.58) * 300]
    for (let x = 0; x < width; x++) {
      const u = x / width
      const cardA = Math.exp(-Math.pow((u - 0.16) / 0.028, 2))
      const cardB = Math.exp(-Math.pow((u - 0.52) / 0.042, 2))
      const cardC = Math.exp(-Math.pow((u - 0.82) / 0.026, 2))
      const cards = (cardA * 1.0 + cardB * 0.72 + cardC * 0.9) * (0.35 + (1 - v) * 0.65)
      const index = (y * width + x) * 4
      data[index] = clamp(sky[0] + cards * 48)
      data[index + 1] = clamp(sky[1] + cards * 52)
      data[index + 2] = clamp(sky[2] + cards * 60)
      data[index + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(
    data,
    width,
    height,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  )
  if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace
  if (THREE.EquirectangularReflectionMapping) texture.mapping = THREE.EquirectangularReflectionMapping
  texture.needsUpdate = true
  return texture
}

function makeFacadeMaterial(glass) {
  const texture = glass
    ? makeWindowTexture(0xd3dbe4, 0x9fb6cc, 0xffcf7a)
    : makeWindowTexture(0xded6c8, 0xb9b3a4, 0xffcf7a)
  // Web 版每个箱体使用完整的一张 6×14 幕墙贴图；新贴图已经有足够
  // 的楼层和窗格，不能再按旧 4×4 贴图重复，否则远景会糊成条纹。
  texture.map.repeat.set(1, 1)
  texture.emissiveMap.repeat.copy(texture.map.repeat)
  texture.roughnessMap.repeat.copy(texture.map.repeat)
  return new THREE.MeshStandardMaterial({
    color: glass ? 0xd9f2ff : 0xffffff,
    map: texture.map,
    emissive: new THREE.Color(0xffcf7a),
    emissiveMap: texture.emissiveMap,
    roughnessMap: texture.roughnessMap,
    emissiveIntensity: 0,
    // 保留远程版本的真实环境反射，同时让粗糙度贴图控制玻璃窗格与框架。
    roughness: glass ? 0.22 : 0.8,
    metalness: glass ? 0.85 : 0.1,
    envMapIntensity: glass ? 1.8 : 0.55,
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

  function addDetailMesh(geometry, material, items, shadow) {
    if (!items.length) return null
    const mesh = new THREE.InstancedMesh(geometry, material, items.length)
    mesh.castShadow = shadow !== false
    mesh.receiveShadow = true
    const euler = new THREE.Euler()
    items.forEach((item, i) => {
      position.set(item.x, item.y, item.z)
      if (item.rx || item.ry || item.rz) {
        euler.set(item.rx || 0, item.ry || 0, item.rz || 0)
        quaternion.setFromEuler(euler)
      } else quaternion.identity()
      scale.set(item.sx, item.sy, item.sz)
      matrix.compose(position, quaternion, scale)
      mesh.setMatrixAt(i, matrix)
      if (item.color != null) mesh.setColorAt(i, color.set(item.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    root.add(mesh)
    return mesh
  }

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

  // 裙房、退台、幕墙竖梃和阳台腰线共同形成可辨识的建筑尺度，
  // 不再让建筑只是一排带贴图的方盒子。
  const podiums = []
  const glassTiers = []
  const concreteTiers = []
  const glassFins = []
  const concreteFins = []
  const officeBelts = []
  const residentialBelts = []
  const glassSheens = []
  buildings.forEach((b) => {
    const isGlass = b.core > 0.5
    if (b.h > 2.15) {
      const podiumH = Math.min(0.62, Math.max(0.28, b.h * 0.12))
      podiums.push({
        x: b.x, y: podiumH / 2, z: b.z,
        sx: b.w * 1.17, sy: podiumH, sz: b.d * 1.17,
      })
    }

    if (b.roof === 'setback') {
      const firstH = Math.max(0.68, b.h * 0.16)
      const secondH = b.h > 10 ? Math.max(0.45, b.h * 0.09) : 0
      const first = {
        x: b.x, y: b.h + firstH / 2, z: b.z,
        sx: b.w * 0.72, sy: firstH, sz: b.d * 0.72,
      }
      ;(isGlass ? glassTiers : concreteTiers).push(first)
      if (secondH) {
        ;(isGlass ? glassTiers : concreteTiers).push({
          x: b.x, y: b.h + firstH + secondH / 2, z: b.z,
          sx: b.w * 0.46, sy: secondH, sz: b.d * 0.46,
        })
      }
    }

    if (isGlass && b.h > 2.6) {
      const sheenH = Math.max(1.7, b.h * 0.7)
      const sheenW = Math.max(0.1, b.w * 0.22)
      const sheenD = Math.max(0.1, b.d * 0.22)
      // 四个立面各有一条略微倾斜的天空反射高光，真机不支持环境贴图时仍清晰可见。
      glassSheens.push(
        { x: b.x - b.w * 0.16, y: b.h * 0.58, z: b.z + b.d * 0.508, sx: sheenW, sy: sheenH, sz: 0.018, rz: -0.16 },
        { x: b.x + b.w * 0.17, y: b.h * 0.6, z: b.z - b.d * 0.508, sx: sheenW, sy: sheenH * 0.86, sz: 0.018, rz: 0.14 },
        { x: b.x + b.w * 0.508, y: b.h * 0.56, z: b.z - b.d * 0.14, sx: 0.018, sy: sheenH * 0.9, sz: sheenD, rx: 0.14 },
        { x: b.x - b.w * 0.508, y: b.h * 0.61, z: b.z + b.d * 0.16, sx: 0.018, sy: sheenH * 0.78, sz: sheenD, rx: -0.12 },
      )
    }

    if (b.h > 2.5 && (b.style === 'office' || b.style === 'tower')) {
      const finH = Math.max(1.4, b.h - 0.16)
      const finW = Math.min(0.055, b.w * 0.08)
      const finD = Math.min(0.055, b.d * 0.08)
      const fins = isGlass ? glassFins : concreteFins
      fins.push(
        { x: b.x - b.w * 0.505, y: finH / 2, z: b.z, sx: finW, sy: finH, sz: b.d * 1.025 },
        { x: b.x + b.w * 0.505, y: finH / 2, z: b.z, sx: finW, sy: finH, sz: b.d * 1.025 },
        { x: b.x, y: finH / 2, z: b.z - b.d * 0.505, sx: b.w * 1.025, sy: finH, sz: finD },
        { x: b.x, y: finH / 2, z: b.z + b.d * 0.505, sx: b.w * 1.025, sy: finH, sz: finD },
      )
      const levels = Math.min(4, Math.max(1, Math.floor(b.h / 2.9)))
      for (let level = 1; level <= levels; level++) {
        officeBelts.push({
          x: b.x, y: (b.h * level) / (levels + 1), z: b.z,
          sx: b.w * 1.045, sy: 0.04, sz: b.d * 1.045,
        })
      }
    } else if (b.h > 2.1 && b.style === 'residential' && b.roof === 'flat') {
      const levels = Math.min(3, Math.max(1, Math.floor(b.h / 2.1)))
      for (let level = 1; level <= levels; level++) {
        residentialBelts.push({
          x: b.x, y: (b.h * level) / (levels + 1), z: b.z,
          sx: b.w * 1.09, sy: 0.055, sz: b.d * 1.09,
        })
      }
    }
  })
  const podiumMat = new THREE.MeshStandardMaterial({ color: 0x6f7984, roughness: 0.65, metalness: 0.18 })
  const glassFrameMat = new THREE.MeshStandardMaterial({ color: 0xc5d6e5, roughness: 0.24, metalness: 0.78, envMapIntensity: 1.25 })
  const concreteFrameMat = new THREE.MeshStandardMaterial({ color: 0x75808b, roughness: 0.52, metalness: 0.28 })
  const officeBeltMat = new THREE.MeshStandardMaterial({ color: 0x506473, roughness: 0.32, metalness: 0.62, envMapIntensity: 1.1 })
  const balconyMat = new THREE.MeshStandardMaterial({ color: 0xa9b0b4, roughness: 0.58, metalness: 0.24 })
  const glassSheenMat = new THREE.MeshBasicMaterial({
    color: 0xd9f4ff,
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
  })
  addDetailMesh(box, podiumMat, podiums)
  addDetailMesh(box, glassMat, glassTiers)
  addDetailMesh(box, concreteMat, concreteTiers)
  addDetailMesh(box, glassFrameMat, glassFins, false)
  addDetailMesh(box, concreteFrameMat, concreteFins, false)
  addDetailMesh(box, officeBeltMat, officeBelts, false)
  addDetailMesh(box, balconyMat, residentialBelts, false)
  addDetailMesh(box, glassSheenMat, glassSheens, false)

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
    if (b.h < 1.6 || (b.roof !== 'flat' && b.roof !== 'setback')) return
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
  return { root, materials: [glassMat, concreteMat], reflectionMaterials: [glassSheenMat] }
}

export function createScene(canvas, opts) {
  const width = opts.width
  const height = opts.height
  const dpr = Math.min(opts.dpr || 2, 2)
  if (typeof canvas.addEventListener !== 'function') canvas.addEventListener = () => {}
  if (typeof canvas.removeEventListener !== 'function') canvas.removeEventListener = () => {}
  if (canvas.style === undefined) canvas.style = { width: '', height: '' }

  // 导出天气贴图时需要读取当前帧。保留绘图缓冲区，避免某些真机在渲染后
  // 清空 WebGL back buffer，导致 toDataURL 得到透明或全黑图片。
  const glOptions = { antialias: true, alpha: false, preserveDrawingBuffer: true }
  const gl = canvas.getContext('webgl', glOptions) || canvas.getContext('experimental-webgl', glOptions)
  if (!gl) throw new Error('当前设备无法创建 WebGL 场景')
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, alpha: false, preserveDrawingBuffer: true })
  renderer.setPixelRatio(dpr)
  renderer.setSize(width, height, false)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.13
  if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const reflectionEnvironment = makeReflectionEnvironment()
  scene.environment = reflectionEnvironment
  scene.background = new THREE.Color(0xbcd9ec)
  scene.fog = new THREE.FogExp2(0xbcd9ec, 0.003)
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 200)
  // 下方固定天气面板会占用视觉重量；把观察目标抬高约 0.45 个世界单位，
  // 城市模型在画布中整体下移一点，缩放和旋转中心保持不变。
  const cameraTarget = new THREE.Vector3(0, 0.45, 0)

  // 可见太阳、方向光和阴影都使用同一个世界坐标，避免“太阳在一边、光从另一边来”。
  const daySunPosition = new THREE.Vector3(-26, 15, 2)
  const nightSunPosition = new THREE.Vector3(-8, 12, -6)

  const ambient = new THREE.AmbientLight(0xaecbe6, 0.58)
  const hemisphere = new THREE.HemisphereLight(0xbcd9ec, 0x3a3f47, 0.46)
  // 晴天采用更强的定向日照：幕墙会有高光，建筑和树木也有清晰但柔和的投影。
  // 这是晴天真正参与建筑明暗和投影的太阳光源，不是只显示在天空里的装饰球。
  const sun = new THREE.DirectionalLight(0xfff7e7, 3.65)
  sun.position.copy(daySunPosition)
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
  sun.shadow.normalBias = 0.018
  sun.shadow.radius = 1.8
  // Web 端 Environment 中的蓝色侧光、暖色轮廓光和底部反射光的原生近似。
  // 这些灯不投射阴影，只负责让阴天建筑仍有真实的体积明暗。
  const blueFill = new THREE.DirectionalLight(0xcfe7ff, 0.28)
  blueFill.position.set(-12, 8, -6)
  const warmFill = new THREE.DirectionalLight(0xffe4b7, 0.22)
  warmFill.position.set(-2, 11, -12)
  const groundFill = new THREE.DirectionalLight(0x9eb6d6, 0.1)
  groundFill.position.set(0, -6, 0)
  scene.add(ambient, hemisphere, sun, blueFill, warmFill, groundFill)

  const sky = createSky()
  scene.add(sky.group)
  const weatherFx = createWeatherEffects(scene)
  const world = new THREE.Group()
  const cityRoot = new THREE.Group()
  world.add(cityRoot)
  scene.add(world)
  // 让 DirectionalLight 瞄准实际城市场景，而不是默认的场景原点目标。
  sun.target = world

  let environment = null
  let props = null
  let skyline = null
  let landmark = null
  let landmarkGlow = []
  let landmarkSpin = null
  let landmarkAnimate = null
  let cityMaterials = []
  let reflectionMaterials = []
  let currentCity = null
  let currentProfile = null
  let currentWeather = 'clear'
  let isNight = false

  const current = {
    sky: new THREE.Color(0xbcd9ec),
    sun: new THREE.Color(0xfff4e2),
    ambient: new THREE.Color(0xaecbe6),
    sunPosition: daySunPosition.clone(),
    sunIntensity: 3.65,
    ambientIntensity: 0.58,
    fogDensity: 0.003,
    night: 0,
    buildingGlow: 0,
    landmarkGlow: 0.15,
  }
  const target = {
    sky: new THREE.Color(0xbcd9ec),
    sun: new THREE.Color(0xfff4e2),
    ambient: new THREE.Color(0xaecbe6),
    sunPosition: daySunPosition.clone(),
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
      target.sunPosition.copy(nightSunPosition)
      target.night = 1
    } else {
      target.sky.set(0xbcd9ec)
      target.sun.set(0xfff7e7)
      target.ambient.set(0xaecbe6)
      target.sunIntensity = 3.65
      target.ambientIntensity = 0.58
      target.sunPosition.copy(daySunPosition)
      target.night = 0
    }
    target.sky.lerp(grey, mod.grey).multiplyScalar(1 - mod.darken)
    target.sun.lerp(sunGrey, mod.grey * 0.6)
    target.ambient.lerp(grey, mod.grey * 0.5)
    target.sunIntensity *= mod.sun
    target.ambientIntensity *= 1 + mod.grey * 0.4
    // 雾天提高体积雾浓度，拉开近景与远景的层次；雨天保持较低浓度避免糊屏。
    target.fogDensity = currentWeather === 'fog' ? 0.055 : currentWeather === 'rain' || currentWeather === 'thunder' ? 0.0065 : currentWeather === 'snow' ? 0.0045 : 0.003
    target.buildingGlow = isNight ? 1.15 : 0
    target.landmarkGlow = isNight ? 0.9 : 0.15
  }

  function applyGlow() {
    cityMaterials.forEach((material) => { material.emissiveIntensity = current.buildingGlow })
    // 高光带只在白天存在，夜里自然淡出，避免窗面像自发光贴纸。
    reflectionMaterials.forEach((material) => { material.opacity = 0.46 * (1 - current.night * 0.94) })
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
    reflectionMaterials = []
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
    reflectionMaterials = skyline.reflectionMaterials || []
    cityRoot.add(skyline.root)
    props = createProps(key, { water: currentProfile.water, clearZones })
    props.setWeather(currentWeather)
    props.setNight(current.night)
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
      // 让模型跟随手指水平滑动方向转动。
      angle += (center.x - previousCenter.x) * 0.010
      polar = Math.max(MIN_POLAR, Math.min(MAX_POLAR, polar - (center.y - previousCenter.y) * 0.008))
      const distance = touchDistance(points)
      if (distance > 1 && lastDistance > 1) {
        // 两指向外张开时放大，向内收拢时缩小；采用幂函数放大捏合反馈。
        const zoom = Math.pow(lastDistance / distance, 1.35)
        radius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, radius * zoom))
      }
      lastDistance = distance
    } else if (lastTouches.length) {
      angle += (points[0].x - lastTouches[0].x) * 0.011
      polar = Math.max(MIN_POLAR, Math.min(MAX_POLAR, polar - (points[0].y - lastTouches[0].y) * 0.009))
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
    // 环境光随天气和昼夜变化，保持阴雨天柔和、夜间不发灰发白。
    const weatherLight = WEATHER_LOOK[currentWeather] || WEATHER_LOOK.clear
    const nightLight = 1 - current.night * 0.72
    blueFill.intensity = Math.max(0.025, current.ambientIntensity * (0.32 + weatherLight.grey * 0.22) * nightLight)
    warmFill.intensity = Math.max(0.018, current.sunIntensity * 0.075 * nightLight)
    groundFill.intensity = Math.max(0.012, current.ambientIntensity * 0.14 * nightLight)
    if (scene.environmentIntensity != null) {
      scene.environmentIntensity = 0.65 * (0.78 + weatherLight.grey * 0.22) * nightLight
    }
    sun.color.copy(current.sun)
    sun.position.copy(current.sunPosition)
    ambient.color.copy(current.ambient)
    hemisphere.color.copy(current.sky)
    hemisphere.groundColor.set(current.night > 0.5 ? 0x111827 : 0x3a3f47)
    hemisphere.intensity = current.ambientIntensity * 0.8
    applyGlow()

    const flash = weatherFx.step(t, dt)
    ambient.intensity = current.ambientIntensity + flash * 1.6
    sun.intensity = current.sunIntensity + flash * 2.2
    if (environment) {
      environment.setNight(current.night)
      environment.step(t, dt)
    }
    if (props) {
      props.setNight(current.night)
      props.step(t)
    }
    if (landmarkSpin) landmarkSpin.rotation.z += dt * 0.24
    if (landmarkAnimate) landmarkAnimate(t, current.landmarkGlow, current.night)
    sky.update(current.night, currentWeather, camera, t, current.sunPosition)

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
    // 供“生成天气贴图”读取当前 WebGL 帧。不同基础库暴露的 canvas 对象略有差异，
    // 依次兼容标准节点、Three 挂载节点和旧版 _ctx.canvas。
    captureDataURL() {
      try {
        renderer.render(scene, camera)
        const targets = [
          canvas,
          renderer.domElement,
          renderer.domElement && renderer.domElement._ctx && renderer.domElement._ctx.canvas,
        ]
        for (let i = 0; i < targets.length; i++) {
          const targetCanvas = targets[i]
          if (!targetCanvas || typeof targetCanvas.toDataURL !== 'function') continue
          const dataUrl = targetCanvas.toDataURL('image/png')
          if (dataUrl && dataUrl.indexOf('data:image/') === 0) return dataUrl
        }
      } catch (e) {
        console.error('[scene] capture failed', e)
      }
      return ''
    },
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
      try { reflectionEnvironment.dispose() } catch (e) {}
      try { renderer.dispose() } catch (e) {}
    },
  }
}
