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
  // 保留阴雨氛围，但不再把建筑整体压成一片无色灰；雨幕和湿地面负责天气感。
  rain: { sun: 0.46, grey: 0.34, darken: 0.2 },
  snow: { sun: 0.72, grey: 0.3, darken: 0.04 },
  thunder: { sun: 0.34, grey: 0.36, darken: 0.32 },
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


function makeFallbackReflectionEnvironment() {
  // 极少数真机若 PMREM 创建失败，仍保留轻量环境贴图，避免幕墙退化成纯黑。
  const width = 128
  const height = 64
  const data = new Uint8Array(width * height * 4)
  const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)))
  for (let y = 0; y < height; y++) {
    const v = y / (height - 1)
    const sky = v < 0.58
      ? [58 + v * 250, 105 + v * 196, 162 + v * 144]
      : [214 - (v - 0.58) * 300, 235 - (v - 0.58) * 320, 248 - (v - 0.58) * 290]
    for (let x = 0; x < width; x++) {
      const u = x / width
      const cardA = Math.exp(-Math.pow((u - 0.15) / 0.052, 2))
      const cardB = Math.exp(-Math.pow((u - 0.51) / 0.075, 2))
      const cardC = Math.exp(-Math.pow((u - 0.83) / 0.046, 2))
      const cards = (cardA * 1.08 + cardB * 0.76 + cardC) * (0.32 + (1 - v) * 0.68)
      const index = (y * width + x) * 4
      data[index] = clampByte(sky[0] + cards * 58)
      data[index + 1] = clampByte(sky[1] + cards * 62)
      data[index + 2] = clampByte(sky[2] + cards * 70)
      data[index + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType)
  if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace
  if (THREE.EquirectangularReflectionMapping) texture.mapping = THREE.EquirectangularReflectionMapping
  texture.needsUpdate = true
  return {
    texture,
    kind: 'ldr-fallback',
    dispose() { texture.dispose() },
  }
}

function makeReflectionEnvironment(renderer) {
  // 与 Web 版 Environment/Lightformer 同一路径：高亮环境光卡经 PMREM 预滤波，
  // 幕墙反光会随粗糙度和观察方向变化。
  const environmentScene = new THREE.Scene()
  environmentScene.background = new THREE.Color(0x20242c)
  const resources = []
  let pmrem = null

  const addCard = (geometry, color, intensity, position, scale, rotation) => {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity),
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(position[0], position[1], position[2])
    mesh.scale.set(scale[0], scale[1], scale[2])
    if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2])
    environmentScene.add(mesh)
    resources.push(geometry, material)
  }

  try {
    addCard(new THREE.PlaneGeometry(1, 1), 0xffffff, 3, [10, 12, 8], [14, 14, 1], [-0.25, -0.7, 0])
    addCard(new THREE.PlaneGeometry(1, 1), 0xcfe0ff, 1.2, [-12, 8, -6], [12, 12, 1], [-0.15, 0.95, 0])
    addCard(new THREE.PlaneGeometry(1, 1), 0xffffff, 0.8, [0, -6, 0], [20, 20, 1], [Math.PI / 2, 0, 0])
    addCard(new THREE.TorusGeometry(4.2, 0.55, 12, 48), 0xffe6c0, 2, [0, 10, -12], [1, 1, 1], [0.2, 0, 0])

    pmrem = new THREE.PMREMGenerator(renderer)
    pmrem.compileCubemapShader()
    const target = pmrem.fromScene(environmentScene, 0.04, 0.1, 100)
    return {
      texture: target.texture,
      kind: 'pmrem-lightformers',
      dispose() { target.dispose() },
    }
  } catch (error) {
    console.warn('[scene] PMREM environment fallback', error)
    return makeFallbackReflectionEnvironment()
  } finally {
    resources.forEach((resource) => {
      try { resource.dispose() } catch (e) {}
    })
    if (pmrem) {
      try { pmrem.dispose() } catch (e) {}
    }
  }
}

function makeFacadeMaterial(glass) {
  const texture = glass
    ? makeWindowTexture(0xd3dbe4, 0x9fb6cc, 0xffcf7a)
    : makeWindowTexture(0xded6c8, 0xb9b3a4, 0xffcf7a)
  texture.map.repeat.set(1, 1)
  texture.emissiveMap.repeat.copy(texture.map.repeat)
  texture.roughnessMap.repeat.copy(texture.map.repeat)

  // Web 版 1.8/0.6 再乘 Environment intensity 0.65，折算为 r162 可用的材质强度。
  const baseEnvMapIntensity = glass ? 1.2 : 0.4
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texture.map,
    emissive: new THREE.Color(0xffcf7a),
    emissiveMap: texture.emissiveMap,
    roughnessMap: texture.roughnessMap,
    emissiveIntensity: 0,
    roughness: glass ? 0.22 : 0.8,
    metalness: glass ? 0.85 : 0.1,
    envMapIntensity: baseEnvMapIntensity,
  })
  material.userData.baseEnvMapIntensity = baseEnvMapIntensity
  material.userData.reflectiveFacade = glass
  return material
}

function disposeTree(root) {
  if (!root) return
  const geometries = []
  const materials = []
  const textures = []
  root.traverse((object) => {
    if (!object.isMesh && !object.isPoints && !object.isLine && !object.isLineSegments && !object.isSprite) return
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
  const axisY = new THREE.Vector3(0, 1, 0)
  const scale = new THREE.Vector3()
  const color = new THREE.Color()
  list.forEach((building, i) => {
    position.set(building.x, building.h / 2, building.z)
    if (building.yaw) quaternion.setFromAxisAngle(axisY, building.yaw)
    else quaternion.identity()
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
  const geometries = {
    box: new THREE.BoxGeometry(1, 1, 1),
    taper: new THREE.CylinderGeometry(0.36, 0.52, 1, 6),
    octagon: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
    diamond: new THREE.CylinderGeometry(0.5, 0.5, 1, 4),
  }
  const box = geometries.box
  const glass = buildings.filter((b) => b.core > 0.5)
  const concrete = buildings.filter((b) => b.core <= 0.5)
  const glassMat = makeFacadeMaterial(true)
  const concreteMat = makeFacadeMaterial(false)
  const clusters = {}
  buildings.forEach((building) => {
    const family = building.core > 0.5 ? 'glass' : 'concrete'
    const form = geometries[building.form] ? building.form : 'box'
    const key = family + ':' + form
    if (!clusters[key]) clusters[key] = []
    clusters[key].push(building)
  })
  Object.keys(clusters).forEach((key) => {
    const parts = key.split(':')
    addBuildingMesh(root, geometries[parts[1]], parts[0] === 'glass' ? glassMat : concreteMat, clusters[key])
  })

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
  buildings.forEach((b) => {
    const isGlass = b.core > 0.5
    if (b.h > 2.15) {
      const podiumH = Math.min(0.62, Math.max(0.28, b.h * 0.12))
      podiums.push({
        x: b.x, y: podiumH / 2, z: b.z,
        sx: b.w * 1.17, sy: podiumH, sz: b.d * 1.17,
        color: new THREE.Color(b.color).offsetHSL(0, -0.04, -0.08).getHex(),
      })
    }

    if (b.roof === 'setback') {
      const firstH = Math.max(0.68, b.h * 0.16)
      const secondH = b.h > 10 ? Math.max(0.45, b.h * 0.09) : 0
      const first = {
        x: b.x, y: b.h + firstH / 2, z: b.z,
        sx: b.w * 0.72, sy: firstH, sz: b.d * 0.72,
        color: b.color,
      }
      ;(isGlass ? glassTiers : concreteTiers).push(first)
      if (secondH) {
        ;(isGlass ? glassTiers : concreteTiers).push({
          x: b.x, y: b.h + firstH + secondH / 2, z: b.z,
          sx: b.w * 0.46, sy: secondH, sz: b.d * 0.46,
          color: b.color,
        })
      }
    }

    if (b.h > 2.5 && (b.style === 'office' || b.style === 'tower') && (!b.form || b.form === 'box')) {
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
  const podiumMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.68, metalness: 0.14 })
  const glassFrameMat = new THREE.MeshStandardMaterial({ color: 0xc5d6e5, roughness: 0.24, metalness: 0.78, envMapIntensity: 1.25 })
  const concreteFrameMat = new THREE.MeshStandardMaterial({ color: 0x75808b, roughness: 0.52, metalness: 0.28 })
  const officeBeltMat = new THREE.MeshStandardMaterial({ color: 0x506473, roughness: 0.32, metalness: 0.62, envMapIntensity: 1.1 })
  const balconyMat = new THREE.MeshStandardMaterial({ color: 0xa9b0b4, roughness: 0.58, metalness: 0.24 })
  addDetailMesh(box, podiumMat, podiums)
  addDetailMesh(box, glassMat, glassTiers)
  addDetailMesh(box, concreteMat, concreteTiers)
  addDetailMesh(box, glassFrameMat, glassFins, false)
  addDetailMesh(box, concreteFrameMat, concreteFins, false)
  addDetailMesh(box, officeBeltMat, officeBelts, false)
  addDetailMesh(box, balconyMat, residentialBelts, false)

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
  return { root, materials: [glassMat, concreteMat] }
}

function createLandmarkDistrict(center, size, seed) {
  const group = new THREE.Group()
  const palette = [0x2f8090, 0xb66a4f, 0x4f729c, 0x8b7043, 0x77619a, 0x4e8a72]
  const accent = palette[Math.abs(seed || 0) % palette.length]
  const radius = THREE.MathUtils.clamp(Math.hypot(size.x, size.z) * 0.46 + 0.85, 2.35, 5.8)
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xe5dfd3, roughness: 0.82, metalness: 0.02 })
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xc7d0cd, roughness: 0.76, metalness: 0.06 })
  const accentMat = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: new THREE.Color(accent).multiplyScalar(0.32),
    emissiveIntensity: 0.08,
    roughness: 0.46,
    metalness: 0.22,
  })
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x6f9f70, roughness: 0.9, flatShading: true })

  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.06, 48), stoneMat)
  plaza.scale.set(radius, 1, radius * 0.88)
  plaza.position.set(center.x, 0.035, center.z)
  plaza.receiveShadow = true
  group.add(plaza)

  const avenueX = new THREE.Mesh(new THREE.BoxGeometry(radius * 2.28, 0.026, 0.34), pathMat)
  avenueX.position.set(center.x, 0.078, center.z)
  avenueX.receiveShadow = true
  const avenueZ = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.026, radius * 2.02), pathMat)
  avenueZ.position.set(center.x, 0.079, center.z)
  avenueZ.receiveShadow = true
  group.add(avenueX, avenueZ)

  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.82, 0.045, 6, 56), accentMat)
  ring.position.set(center.x, 0.1, center.z)
  ring.rotation.x = Math.PI / 2
  group.add(ring)

  // 一圈低矮花池给地标提供尺度参照，完全合批，不会像大树一样遮挡主体。
  const count = 10
  const planters = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.15, 0.13, 8), accentMat, count)
  const shrubs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 1), greenMat, count)
  const matrix = new THREE.Matrix4()
  const position = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3(1, 1, 1)
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const rx = radius * 0.91
    const rz = radius * 0.8
    position.set(center.x + Math.cos(angle) * rx, 0.14, center.z + Math.sin(angle) * rz)
    matrix.compose(position, quaternion, scale)
    planters.setMatrixAt(i, matrix)
    position.y = 0.31
    scale.setScalar(0.82 + (i % 3) * 0.08)
    matrix.compose(position, quaternion, scale)
    shrubs.setMatrixAt(i, matrix)
    scale.set(1, 1, 1)
  }
  planters.instanceMatrix.needsUpdate = true
  shrubs.instanceMatrix.needsUpdate = true
  planters.castShadow = planters.receiveShadow = true
  shrubs.castShadow = true
  group.add(planters, shrubs)
  return { group, radius }
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
  renderer.toneMappingExposure = 1.06
  if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const reflectionEnvironment = makeReflectionEnvironment(renderer)
  scene.environment = reflectionEnvironment.texture
  scene.background = new THREE.Color(0xbcd9ec)
  scene.fog = new THREE.FogExp2(0xbcd9ec, 0.003)
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 200)
  // 旧默认镜头相对目标只高约 3 单位，几乎平视，街区和地标广场全部被楼挡住。
  // 改成俯看微缩沙盘的观察中心；切城时会按地标高度再做轻量自适应。
  const cameraTarget = new THREE.Vector3(0, 2.35, 0)

  // 可见太阳、方向光和阴影都使用同一个世界坐标，避免“太阳在一边、光从另一边来”。
  const daySunPosition = new THREE.Vector3(-26, 15, 2)
  const nightSunPosition = new THREE.Vector3(-8, 12, -6)

  const ambient = new THREE.AmbientLight(0xaecbe6, 0.58)
  const hemisphere = new THREE.HemisphereLight(0xbcd9ec, 0x3a3f47, 0.46)
  // 晴天采用更强的定向日照：幕墙会有高光，建筑和树木也有清晰但柔和的投影。
  // 这是晴天真正参与建筑明暗和投影的太阳光源，不是只显示在天空里的装饰球。
  const sun = new THREE.DirectionalLight(0xfff7e7, 3.3)
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
  // 只增加一盏不投影的暖色地标补光，夜间突出轮廓，开销远低于给每栋建筑加灯。
  const landmarkFill = new THREE.PointLight(0xffd6a0, 0.06, 12, 2)
  landmarkFill.position.set(0, 5.5, 1.5)
  landmarkFill.castShadow = false
  scene.add(ambient, hemisphere, sun, blueFill, warmFill, groundFill, landmarkFill)

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
  let currentCity = null
  let currentProfile = null
  let currentWeather = 'clear'
  let currentRainLevel = ''
  let isNight = false

  const current = {
    sky: new THREE.Color(0xbcd9ec),
    sun: new THREE.Color(0xfff4e2),
    ambient: new THREE.Color(0xaecbe6),
    sunPosition: daySunPosition.clone(),
    sunIntensity: 3.3,
    ambientIntensity: 0.58,
    fogDensity: 0.003,
    night: 0,
    buildingGlow: 0,
    landmarkGlow: 0.05,
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
    landmarkGlow: 0.05,
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
      target.sunIntensity = 3.3
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
    target.landmarkGlow = isNight ? 1.05 : 0.05
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
    cameraTarget.set(0, 2.5, 0)
    let clearZones = [{ x: CITY.landmark.x, z: CITY.landmark.z, r: 1.7 }]
    let calmZones = [{ x: CITY.landmark.x, z: CITY.landmark.z, r: 4.9, maxHeight: 2.6 }]
    if (built && built.group) {
      // 地标组保持独立排布，但每个节点都要有自己的净空和低楼缓冲区。
      // 这样主地标不会被随机楼群、树木或路灯从前景切掉。
      built.group.position.set(0, 0, 0)
      built.group.updateMatrixWorld(true)
      const bounds = new THREE.Box3().setFromObject(built.group)
      const center = bounds.getCenter(new THREE.Vector3())
      const size = bounds.getSize(new THREE.Vector3())
      const skylineProfile = currentProfile.skyline || {}
      const registeredLandmarkNodes = Array.isArray(built.group.userData.landmarkNodes)
        ? built.group.userData.landmarkNodes.filter(Boolean)
        : []
      const landmarkParts = registeredLandmarkNodes.length > 1
        ? registeredLandmarkNodes
        : skylineProfile.distributedLandmarks
          ? built.group.children.filter((child) => child && child.isGroup)
          : []

      let focusPart = landmarkParts[0] || null
      let focusRank = -Infinity
      if (landmarkParts.length > 1) {
        clearZones = []
        calmZones = []
        landmarkParts.forEach((part, index) => {
          part.updateMatrixWorld(true)
          const partBounds = new THREE.Box3().setFromObject(part)
          const partCenter = partBounds.getCenter(new THREE.Vector3())
          const partSize = partBounds.getSize(new THREE.Vector3())
          const metadata = part.userData || {}
          const role = metadata.landmarkRole || (index === 0 ? 'hero' : 'secondary')
          const rank = Number(metadata.landmarkPriority)
          if (role === 'hero' || (isFinite(rank) && rank > focusRank)) {
            focusPart = part
            focusRank = isFinite(rank) ? rank : focusRank
          }

          // 用真实地标底座的外接尺寸计算半径，再额外留一圈净空；
          // 旧版固定上限 3 会让宽体建筑的边缘仍被楼脚/树冠贴住。
          const footprintRadius = Math.hypot(partSize.x, partSize.z) * 0.46
          const visibilityPadding = Number(skylineProfile.landmarkVisibilityPadding)
          const padding = isFinite(visibilityPadding)
            ? THREE.MathUtils.clamp(visibilityPadding, 0.3, 0.9)
            : 0.5
          let partRadius = THREE.MathUtils.clamp(footprintRadius + padding, 1.15, 3.4)
          if (role === 'hero' || index === 0) {
            const heroRadius = Number(skylineProfile.heroClearRadius)
            partRadius = Math.max(partRadius, isFinite(heroRadius) ? heroRadius : 2.05)
          }

          const configuredCalmPadding = Number(
            role === 'hero' || index === 0
              ? skylineProfile.heroCalmPadding
              : skylineProfile.calmPadding,
          )
          const calmPadding = Math.max(
            role === 'hero' || index === 0 ? 1.35 : 0.7,
            isFinite(configuredCalmPadding) ? configuredCalmPadding : 0,
          )
          const configuredCalmHeight = Number(
            role === 'hero' || index === 0
              ? skylineProfile.heroCalmHeight
              : skylineProfile.calmHeight,
          )
          const calmLimit = role === 'hero' || index === 0 ? 4.2 : 5.2
          const calmHeight = Math.min(
            calmLimit,
            isFinite(configuredCalmHeight) ? configuredCalmHeight : calmLimit,
          )
          clearZones.push({ x: partCenter.x, z: partCenter.z, r: partRadius })
          calmZones.push({
            x: partCenter.x,
            z: partCenter.z,
            r: partRadius + calmPadding,
            maxHeight: calmHeight,
          })
        })
      } else {
        const district = createLandmarkDistrict(center, size, currentProfile.seed)
        built.group.add(district.group)
        const districtRadius = Math.max(
          district.radius + 0.42,
          Math.min(6.2, Math.max(2.05, Math.hypot(size.x, size.z) * 0.42 + 0.85)),
        )
        clearZones = [{ x: center.x, z: center.z, r: districtRadius }]
        calmZones = [{ x: center.x, z: center.z, r: Math.min(9.2, districtRadius + 2.85), maxHeight: 2.35 }]
        focusPart = built.group
      }

      const focusBounds = focusPart
        ? new THREE.Box3().setFromObject(focusPart)
        : bounds
      const focusCenter = focusBounds.getCenter(new THREE.Vector3())
      const focusWeightValue = Number(skylineProfile.heroFocusWeight)
      const focusWeight = THREE.MathUtils.clamp(
        isFinite(focusWeightValue) ? focusWeightValue : 0.56,
        0.42,
        0.72,
      )
      const focusX = center.x * (1 - focusWeight) + focusCenter.x * focusWeight
      const focusZ = center.z * (1 - focusWeight) + focusCenter.z * focusWeight
      cameraTarget.set(
        focusX,
        THREE.MathUtils.clamp(2.25 + Math.min(size.y, 14) * 0.075, 2.4, 3.2),
        focusZ,
      )
      if (!userInteracted) {
        const span = Math.max(size.x, size.z)
        radius = THREE.MathUtils.clamp(
          25.5 + span * 0.62 + Math.max(0, 0.9 - camera.aspect) * 7,
          28.5,
          34,
        )
        // 初始镜头提高俯视角，让地标广场、主体轮廓和屋顶不再被前排楼群吞掉。
        polar = Math.PI * 0.345
      }
      // 专属模型可声明有限的前景视线净空，避免矮地标仍被圆形底座范围外的楼挡住。
      const frontClearance = built.group.userData.frontClearanceZones
      if (Array.isArray(frontClearance)) frontClearance.slice(0, 4).forEach((zone) => {
        if (!zone || ![zone.x, zone.z, zone.r].every(Number.isFinite) || zone.r <= 0) return
        clearZones.push({ x: zone.x, z: zone.z, r: Math.min(zone.r, 1.6) })
      })
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
      currentProfile.skyline,
    ).filter((b) => !inLake(currentProfile.water, b.x, b.z, 0.35))
    skyline = buildSkyline(buildings)
    cityMaterials = skyline.materials
    cityRoot.add(skyline.root)
    props = createProps(key, { water: currentProfile.water, clearZones })
    props.setWeather(currentWeather)
    props.setNight(current.night)
    cityRoot.add(props.group)
    environment.setWeather(currentWeather)
    environment.setNight(current.night)
    applyGlow()
  }

  function setWeather(kind, rainLevel) {
    currentWeather = WEATHER_LOOK[kind] ? kind : 'clear'
    currentRainLevel = currentWeather === 'rain' || currentWeather === 'thunder'
      ? (rainLevel === 'light' || rainLevel === 'heavy' ? rainLevel : 'moderate')
      : ''
    weatherFx.setWeather(currentWeather, currentRainLevel)
    if (environment) environment.setWeather(currentWeather)
    if (props) props.setWeather(currentWeather)
    refreshLook()
  }

  function setNight(value) {
    isNight = !!value
    refreshLook()
  }

  // 默认采用约 67° 的俯视微缩构图，同时保留单指旋转、双指缩放。
  // 不再允许镜头钻到托盘下方，避免用户旋转后只看到灰色底座。
  let angle = Math.atan2(20, 19)
  let polar = Math.PI * 0.37
  let radius = 34
  const MIN_POLAR = Math.PI * 0.2
  const MAX_POLAR = Math.PI * 0.49
  const MIN_RADIUS = 14
  const MAX_RADIUS = 72
  let dragging = false
  let userInteracted = false
  let lastTouches = []
  let lastCenter = null
  let lastDistance = 0

  // 沉浸模式保存的是轨道参数，而非每帧都会被重算的 camera.position。
  let immersiveSnapshot = null
  let immersiveMode = false
  function fitViewportRadius(value, previousAspect, nextAspect) {
    const before = Math.min(1, Math.max(0.01, previousAspect))
    const after = Math.min(1, Math.max(0.01, nextAspect))
    return THREE.MathUtils.clamp(value * before / after, MIN_RADIUS, MAX_RADIUS)
  }
  function syncCamera() {
    camera.position.set(
      cameraTarget.x + Math.sin(polar) * Math.cos(angle) * radius,
      cameraTarget.y + Math.cos(polar) * radius,
      cameraTarget.z + Math.sin(polar) * Math.sin(angle) * radius,
    )
    camera.lookAt(cameraTarget)
  }
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
    syncCamera()

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
    landmarkFill.intensity = 0.055 + current.night * 0.58
    // three r162 没有 Scene.environmentIntensity；改为逐材质调节真实环境反射强度。
    const environmentStrength = THREE.MathUtils.clamp(
      (0.98 - weatherLight.grey * 0.2) * (1 - current.night * 0.42),
      0.5,
      1,
    )
    cityMaterials.forEach((material) => {
      const base = Number(material.userData && material.userData.baseEnvMapIntensity)
      if (isFinite(base)) material.envMapIntensity = base * environmentStrength
    })
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

    world.position.y = Math.sin(t * 0.5) * 0.08
    world.rotation.z = Math.sin(t * 0.4) * 0.005
    world.rotation.x = Math.sin(t * 0.33 + 1.1) * 0.004
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
    resize(w, h, options = {}) {
      const width = Number(w), height = Number(h)
      if (![width, height].every(Number.isFinite) || width <= 0 || height <= 0) return
      const nextAspect = width / height
      if (!Number.isFinite(nextAspect) || nextAspect <= 0) return
      const nextImmersive = typeof options.immersive === 'boolean' ? options.immersive : immersiveMode

      if (nextImmersive && !immersiveMode) {
        immersiveSnapshot = {
          angle, polar, radius, userInteracted, aspect: camera.aspect,
          target: cameraTarget.clone(), city: currentCity,
        }
      }
      if (!nextImmersive && immersiveMode && immersiveSnapshot && immersiveSnapshot.city === currentCity) {
        angle = immersiveSnapshot.angle
        polar = immersiveSnapshot.polar
        radius = fitViewportRadius(immersiveSnapshot.radius, immersiveSnapshot.aspect, nextAspect)
        userInteracted = immersiveSnapshot.userInteracted
        cameraTarget.copy(immersiveSnapshot.target)
      } else if (nextImmersive || immersiveMode) {
        // 只按前后宽高比补偿；重复相同尺寸不会累乘放大，用户在全屏里仍可缩放。
        radius = fitViewportRadius(radius, camera.aspect, nextAspect)
      }
      if (!nextImmersive) immersiveSnapshot = null
      immersiveMode = nextImmersive
      camera.aspect = nextAspect
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      dragging = false
      lastTouches = []
      lastCenter = null
      lastDistance = 0
      syncCamera()
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
