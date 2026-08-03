// Web 端 Diorama.tsx 的托盘、地面、水体、云托底与场景彩蛋原生移植。
import * as THREE from './three.core.js'
import { CITY, mulberry32, streetLines } from './cityData'

const GROUND_X0 = -9.9
const GROUND_X1 = 9.9
const GROUND_Z0 = CITY.minZ - 1.3

function dataTexture(data, width, height) {
  const texture = new THREE.DataTexture(data, width, height)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  // CanvasTexture 默认翻转 Y；DataTexture 显式保持同样方向，路网才和建筑坐标重合。
  texture.flipY = true
  if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function fill(data, width, height, r, g, b, a) {
  for (let i = 0; i < width * height; i++) {
    const p = i * 4
    data[p] = r
    data[p + 1] = g
    data[p + 2] = b
    data[p + 3] = a == null ? 255 : a
  }
}

function rect(data, width, height, x0, y0, x1, y1, rgb) {
  const xa = Math.max(0, Math.floor(Math.min(x0, x1)))
  const xb = Math.min(width, Math.ceil(Math.max(x0, x1)))
  const ya = Math.max(0, Math.floor(Math.min(y0, y1)))
  const yb = Math.min(height, Math.ceil(Math.max(y0, y1)))
  for (let y = ya; y < yb; y++) {
    for (let x = xa; x < xb; x++) {
      const p = (y * width + x) * 4
      data[p] = rgb[0]
      data[p + 1] = rgb[1]
      data[p + 2] = rgb[2]
      data[p + 3] = rgb.length > 3 ? rgb[3] : 255
    }
  }
}

function makeGroundTexture(z1) {
  const size = 512
  const data = new Uint8Array(size * size * 4)
  fill(data, size, size, 196, 194, 187)
  const wx = GROUND_X1 - GROUND_X0
  const wz = z1 - GROUND_Z0
  const pxX = (x) => ((x - GROUND_X0) / wx) * size
  const pxZ = (z) => ((z - GROUND_Z0) / wz) * size
  const rand = mulberry32(12345)

  // Web 端相同的散落绿地。
  for (let i = 0; i < 60; i++) {
    const gx = GROUND_X0 + rand() * wx
    const gz = GROUND_Z0 + rand() * wz
    const w = (0.4 + rand() * 0.8) * (size / wx)
    const alpha = 0.5 + rand() * 0.4
    const base = [196, 194, 187]
    const park = [143, 179, 126]
    const mixed = [
      Math.round(base[0] + (park[0] - base[0]) * alpha),
      Math.round(base[1] + (park[1] - base[1]) * alpha),
      Math.round(base[2] + (park[2] - base[2]) * alpha),
    ]
    rect(data, size, size, pxX(gx), pxZ(gz), pxX(gx) + w, pxZ(gz) + w, mixed)
  }

  const lines = streetLines()
  const roadW = (0.85 / wx) * size
  lines.xs.forEach((x) => {
    const px = pxX(x)
    rect(data, size, size, px - roadW / 2, 0, px + roadW / 2, size, [74, 75, 80])
    for (let y = 0; y < size; y += 22) rect(data, size, size, px - 1, y, px + 1, y + 10, [232, 228, 208])
  })
  const roadH = (0.85 / wz) * size
  lines.zs.forEach((z) => {
    if (z > z1) return
    const pz = pxZ(z)
    rect(data, size, size, 0, pz - roadH / 2, size, pz + roadH / 2, [74, 75, 80])
    for (let x = 0; x < size; x += 22) rect(data, size, size, x, pz - 1, x + 10, pz + 1, [232, 228, 208])
  })
  return dataTexture(data, size, size)
}

function makeFlowTexture() {
  const size = 256
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Many small, directionally stretched ripples read as flowing water;
      // broad low-frequency bands made the old surface look like waves.
      const bend = Math.sin(x * 0.045 + Math.sin(y * 0.12) * 1.4) * 0.9
      const ripple = Math.max(0, Math.sin(y * 0.82 + bend))
      const fine = Math.max(0, Math.sin(y * 1.75 + x * 0.018 + bend * 0.5))
      const shimmer = Math.max(0, Math.sin(x * 0.16 + y * 0.34))
      const crest = Math.pow(ripple, 10) * 22 + Math.pow(fine, 16) * 10 + Math.pow(shimmer, 22) * 7
      const p = (y * size + x) * 4
      const base = 42 + Math.sin(y * 0.1 + x * 0.012) * 4
      data[p] = Math.min(255, base + crest * 0.72)
      data[p + 1] = Math.min(255, base + 49 + crest)
      data[p + 2] = Math.min(255, base + 89 + crest * 1.08)
      data[p + 3] = 255
    }
  }
  const rand = mulberry32(4242)
  for (let i = 0; i < 150; i++) {
    const x = Math.floor(rand() * size)
    const y = Math.floor(rand() * size)
    const len = 3 + Math.floor(rand() * 9)
    for (let k = 0; k < len; k++) {
      const yy = y + Math.round(Math.sin((k / len) * Math.PI) * -1)
      if (x + k >= size || yy < 0 || yy >= size) continue
      const p = (yy * size + x + k) * 4
      data[p] = 150
      data[p + 1] = 202
      data[p + 2] = 236
    }
  }
  return dataTexture(data, size, size)
}

function makeFoamTexture() {
  const width = 256
  const height = 64
  const data = new Uint8Array(width * height * 4)
  const rand = mulberry32(8123)
  for (let i = 0; i < 90; i++) {
    const cx = Math.floor(rand() * width)
    const cy = Math.floor(rand() * height)
    const radius = 1 + Math.floor(rand() * 4)
    const alpha = 32 + Math.floor(rand() * 110)
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        if (x * x + y * y > radius * radius) continue
        const px = (cx + x + width) % width
        const py = cy + y
        if (py < 0 || py >= height) continue
        const p = (py * width + px) * 4
        data[p] = data[p + 1] = data[p + 2] = 255
        data[p + 3] = Math.max(data[p + 3], alpha)
      }
    }
  }
  return dataTexture(data, width, height)
}

function makeRoundedTrayGeometry() {
  const half = (CITY.trayHalf * 2 + 1.6) / 2
  const radius = 0.22
  const shape = new THREE.Shape()
  shape.moveTo(-half + radius, -half)
  shape.lineTo(half - radius, -half)
  shape.quadraticCurveTo(half, -half, half, -half + radius)
  shape.lineTo(half, half - radius)
  shape.quadraticCurveTo(half, half, half - radius, half)
  shape.lineTo(-half + radius, half)
  shape.quadraticCurveTo(-half, half, -half, half - radius)
  shape.lineTo(-half, -half + radius)
  shape.quadraticCurveTo(-half, -half, -half + radius, -half)
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.42, bevelEnabled: false, curveSegments: 4 })
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, -0.42, 0)
  geometry.computeVertexNormals()
  return geometry
}

function makePuffTexture() {
  const size = 128
  const data = new Uint8Array(size * size * 4)
  const center = (size - 1) / 2
  const radius = size * 0.5
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const distance = Math.hypot(x - center, y - center) / radius
      let alpha = 0
      if (distance <= 0.45) alpha = 1 - (distance / 0.45) * 0.08
      else if (distance <= 0.8) alpha = 0.92 - ((distance - 0.45) / 0.35) * 0.57
      else if (distance <= 1) alpha = 0.35 * (1 - (distance - 0.8) / 0.2)
      const p = (y * size + x) * 4
      data[p] = data[p + 1] = data[p + 2] = 255
      data[p + 3] = Math.round(Math.max(0, alpha) * 255)
    }
  }
  return dataTexture(data, size, size)
}

function makeCloudBase(group) {
  const cloudGroup = new THREE.Group()
  group.add(cloudGroup)
  const texture = makePuffTexture()
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: 0xf6f9fe,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  })
  let seed = 4177
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  const slabHalf = CITY.trayHalf + 0.8
  const addPuff = (x, y, z, size) => {
    const sprite = new THREE.Sprite(material)
    sprite.position.set(x, y, z)
    sprite.scale.set(size, size, 1)
    sprite.frustumCulled = false
    cloudGroup.add(sprite)
  }

  // Web CloudBase 的同款柔边 Sprite；网格从 6×6 降到 5×5，减少底盘下云量。
  const grid = 5
  for (let ix = 0; ix < grid; ix++) {
    for (let iz = 0; iz < grid; iz++) {
      const gx = (ix / (grid - 1) - 0.5) * 2 * slabHalf * 0.92
      const gz = (iz / (grid - 1) - 0.5) * 2 * slabHalf * 0.92
      const size = 3.4 + rand() * 2.2
      addPuff(gx + (rand() - 0.5) * 2, -0.55 - size * 0.42 - rand() * 0.3, gz + (rand() - 0.5) * 2, size)
    }
  }

  const ring = 10
  for (let i = 0; i < ring; i++) {
    const angle = (i / ring) * Math.PI * 2 + rand() * 0.3
    const radius = slabHalf * (0.9 + rand() * 0.1)
    const size = 2.8 + rand() * 1.6
    addPuff(Math.cos(angle) * radius, -0.55 - size * 0.42 - 0.3 - rand() * 0.6, Math.sin(angle) * radius, size)
  }

  for (let i = 0; i < 8; i++) {
    const angle = rand() * Math.PI * 2
    const t = rand()
    const radius = (1 - t * 0.85) * slabHalf * 0.6
    const size = 1.8 + (1 - t) * 2.2
    addPuff(Math.cos(angle) * radius, -2.8 - t * 2, Math.sin(angle) * radius, size)
  }
  return { group: cloudGroup, materials: [material], texture }
}

function makeWater(group, water, flow, foam) {
  let mesh = null
  let base = null
  const mat = new THREE.MeshStandardMaterial({
    map: flow,
    color: 0xdfeaf2,
    roughness: 0.42,
    metalness: 0.25,
    emissive: new THREE.Color(0x2b5a86),
    emissiveIntensity: 0.05,
    transparent: true,
    opacity: 0.95,
  })
  if (water.lake) {
    flow.repeat.set(4, 4)
    const geo = new THREE.CircleGeometry(1, 56)
    geo.rotateX(-Math.PI / 2)
    mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(water.lake.x, 0.02, water.lake.z)
    mesh.scale.set(water.lake.rx, 1, water.lake.rz)
    group.add(mesh)
  } else if (water.riverZ0 != null) {
    flow.repeat.set(10, 3)
    const z0 = water.riverZ0
    const z1 = CITY.trayHalf
    const geo = new THREE.PlaneGeometry(22, z1 - z0, 64, 12)
    geo.rotateX(-Math.PI / 2)
    mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(0, 0.015, (z0 + z1) / 2)
    mesh.receiveShadow = true
    group.add(mesh)
    foam.repeat.set(10, 1)
    const shoreMat = new THREE.MeshStandardMaterial({
      map: foam,
      color: 0xffffff,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      roughness: 1,
    })
    const shore = new THREE.Mesh(new THREE.PlaneGeometry(22, 0.7), shoreMat)
    shore.rotation.x = -Math.PI / 2
    shore.position.set(0, 0.04, z0 + 0.05)
    group.add(shore)
  }
  if (mesh) base = mesh.geometry.attributes.position.array.slice()
  return { mesh, mat, base }
}

function makeBoats(group, water, foam) {
  const hasRiver = water.riverZ0 != null
  const hasLake = !!water.lake
  if ((!water.boats && !hasLake) || (!hasRiver && !hasLake)) return []
  const boats = []
  const hullGeo = new THREE.BoxGeometry(0.6, 0.12, 0.26)
  const prowGeo = new THREE.BoxGeometry(0.19, 0.12, 0.19)
  const cabinGeo = new THREE.BoxGeometry(0.26, 0.12, 0.19)
  const windowGeo = new THREE.BoxGeometry(0.2, 0.055, 0.196)
  const funnelGeo = new THREE.CylinderGeometry(0.028, 0.032, 0.14, 8)
  const wakeGeo = new THREE.PlaneGeometry(0.8, 0.34)
  const colors = [0xe8e8e8, 0xd7b24a, 0xc96b4a]
  const hullMats = colors.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 }))
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x5a5f68, roughness: 0.5 })
  const windowMat = new THREE.MeshStandardMaterial({ color: 0xcfe0ea, metalness: 0.4, roughness: 0.25 })
  const funnelMat = new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.6 })
  const wakeMat = new THREE.MeshStandardMaterial({ map: foam, color: 0xffffff, transparent: true, opacity: 0.32, depthWrite: false, roughness: 1 })
  const count = hasRiver ? 6 : 2
  for (let i = 0; i < count; i++) {
    const boat = new THREE.Group()
    const hullMat = hullMats[i % hullMats.length]
    const hull = new THREE.Mesh(hullGeo, hullMat)
    hull.position.x = -0.05
    hull.castShadow = true
    boat.add(hull)
    const prow = new THREE.Mesh(prowGeo, hullMat)
    prow.position.x = 0.32
    prow.rotation.y = Math.PI / 4
    boat.add(prow)
    const cabin = new THREE.Mesh(cabinGeo, cabinMat)
    cabin.position.set(-0.12, 0.12, 0)
    boat.add(cabin)
    const windows = new THREE.Mesh(windowGeo, windowMat)
    windows.position.set(-0.12, 0.13, 0)
    boat.add(windows)
    const funnel = new THREE.Mesh(funnelGeo, funnelMat)
    funnel.position.set(-0.25, 0.21, 0)
    boat.add(funnel)
    const wake = new THREE.Mesh(wakeGeo, wakeMat)
    wake.position.set(-0.62, -0.035, 0)
    wake.rotation.x = -Math.PI / 2
    boat.add(wake)
    group.add(boat)
    boats.push({
      group: boat,
      lake: water.lake,
      z: hasRiver ? water.riverZ0 + 0.7 + (i % 3) : null,
      speed: hasLake ? 0.18 + (i % 2) * 0.035 : 0.09 + (i % 4) * 0.022,
      offset: (i * 0.31) % 1,
      dir: i % 2 === 0 ? 1 : -1,
    })
  }
  return boats
}

function makeExtras(group) {
  const extras = {}
  const birdsGeo = new THREE.BufferGeometry()
  const birdPos = []
  for (let i = 0; i < 5; i++) {
    const x = i * 0.75
    birdPos.push(x - 0.24, 0, 0, x, 0.16, 0, x, 0.16, 0, x + 0.24, 0, 0)
  }
  birdsGeo.setAttribute('position', new THREE.Float32BufferAttribute(birdPos, 3))
  extras.birds = new THREE.LineSegments(birdsGeo, new THREE.LineBasicMaterial({ color: 0x374151, transparent: true, opacity: 0.75 }))
  extras.birds.position.set(-5, 9, -5)
  group.add(extras.birds)

  extras.balloon = new THREE.Group()
  const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.72, 14, 10), new THREE.MeshStandardMaterial({ color: 0xc96b4a, roughness: 0.75 }))
  balloon.scale.y = 1.28
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.07, 6, 18), new THREE.MeshStandardMaterial({ color: 0xf0c35a, roughness: 0.7 }))
  band.rotation.x = Math.PI / 2
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.25, 0.3), new THREE.MeshStandardMaterial({ color: 0x7d5a3c, roughness: 0.95 }))
  basket.position.y = -1.08
  extras.balloon.add(balloon, band, basket)
  extras.balloon.position.set(7, 8, -6)
  group.add(extras.balloon)

  extras.snowman = new THREE.Group()
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 0.82 })
  const lower = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 9), snowMat)
  lower.position.y = 0.42
  const upper = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 9), snowMat)
  upper.position.y = 1.05
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0x30343c, roughness: 0.8 }))
  hat.position.y = 1.39
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.35, 8), new THREE.MeshStandardMaterial({ color: 0xe88432, roughness: 0.8 }))
  nose.rotation.x = Math.PI / 2
  nose.position.set(0, 1.05, 0.31)
  extras.snowman.add(lower, upper, hat, nose)
  extras.snowman.position.set(6.6, 0, -6.4)
  extras.snowman.visible = false
  group.add(extras.snowman)

  extras.rainbow = new THREE.Group()
  const rainbowColors = [0xe65b55, 0xf39b45, 0xf2d55c, 0x69b56e, 0x5d93d6, 0x9570c4]
  rainbowColors.forEach((c, i) => {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(3.9 - i * 0.19, 0.1, 6, 48, Math.PI),
      new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.58, depthWrite: false, fog: false }),
    )
    extras.rainbow.add(arc)
  })
  extras.rainbow.position.set(-4.6, 0.45, 7.7)
  extras.rainbow.rotation.y = 0.12
  extras.rainbow.visible = false
  group.add(extras.rainbow)
  return extras
}

export function createEnvironment(water) {
  const group = new THREE.Group()
  const textures = []
  const tray = new THREE.Mesh(
    makeRoundedTrayGeometry(),
    new THREE.MeshStandardMaterial({ color: 0xf4f2ee, roughness: 0.85, metalness: 0 }),
  )
  tray.castShadow = tray.receiveShadow = true
  group.add(tray)
  const clouds = makeCloudBase(group)

  const groundTex = makeGroundTexture(water.groundZ1)
  textures.push(groundTex)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(GROUND_X1 - GROUND_X0, water.groundZ1 - GROUND_Z0),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.9, metalness: 0 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.set(0, 0.005, (GROUND_Z0 + water.groundZ1) / 2)
  ground.receiveShadow = true
  group.add(ground)

  const snowMat = new THREE.MeshStandardMaterial({ color: 0xeef4fc, roughness: 0.7, transparent: true, opacity: 0, depthWrite: false })
  const snow = new THREE.Mesh(new THREE.PlaneGeometry(GROUND_X1 - GROUND_X0, water.groundZ1 - GROUND_Z0), snowMat)
  snow.rotation.x = -Math.PI / 2
  snow.position.set(0, 0.035, (GROUND_Z0 + water.groundZ1) / 2)
  snow.visible = false
  group.add(snow)

  const flow = makeFlowTexture()
  const foam = makeFoamTexture()
  textures.push(clouds.texture, flow, foam)
  const surface = makeWater(group, water, flow, foam)
  const boats = makeBoats(group, water, foam)
  const extras = makeExtras(group)
  let weather = 'clear'
  let snowTarget = 0
  let nightFactor = 0
  let rainbowLeft = 0
  let previousWeather = 'clear'
  let waterFrame = 0
  const cloudTint = new THREE.Color(0xf2f6fd)

  function setWeather(kind) {
    previousWeather = weather
    weather = kind || 'clear'
    snowTarget = weather === 'snow' ? 0.92 : 0
    if ((previousWeather === 'rain' || previousWeather === 'thunder') && (weather === 'clear' || weather === 'cloudy')) rainbowLeft = 25
  }

  function setNight(value) {
    nightFactor = Math.max(0, Math.min(1, value))
  }

  function step(t, dt) {
    flow.offset.x -= dt * (water.lake ? 0.009 : 0.035)
    if (water.lake) flow.offset.y += dt * 0.004
    foam.offset.x -= dt * 0.02
    surface.mat.emissiveIntensity = 0.035 + Math.sin(t * 0.8) * 0.008
    if (surface.mesh && surface.base) {
      waterFrame++
      const attr = surface.mesh.geometry.attributes.position
      const base = surface.base
      for (let i = 0; i < attr.count; i++) {
        const x = base[i * 3]
        const z = base[i * 3 + 2]
        const current = Math.sin(z * 3.4 - t * 1.05 + Math.sin(x * 0.7) * 0.45) * 0.004
        const cross = Math.sin(x * 2.8 + z * 1.8 - t * 0.72) * 0.002
        attr.array[i * 3 + 1] = base[i * 3 + 1] + current + cross
      }
      attr.needsUpdate = true
      if (waterFrame % 6 === 0) surface.mesh.geometry.computeVertexNormals()
    }
    boats.forEach((boat) => {
      const p = (t * boat.speed + boat.offset) % 1
      if (boat.lake) {
        const angle = t * boat.speed + boat.offset * Math.PI * 2
        const next = angle + 0.02
        const x = boat.lake.x + Math.cos(angle) * boat.lake.rx * 0.42
        const z = boat.lake.z + Math.sin(angle) * boat.lake.rz * 0.42
        const nx = boat.lake.x + Math.cos(next) * boat.lake.rx * 0.42
        const nz = boat.lake.z + Math.sin(next) * boat.lake.rz * 0.42
        boat.group.position.set(x, 0.05, z)
        boat.group.rotation.y = Math.atan2(nz - z, nx - x)
      } else {
        const x = -10 + 20 * (boat.dir > 0 ? p : 1 - p)
        boat.group.position.set(x, 0.05, boat.z)
        boat.group.rotation.y = boat.dir > 0 ? 0 : Math.PI
      }
    })

    snowMat.opacity += (snowTarget - snowMat.opacity) * (1 - Math.exp(-2.2 * dt))
    snow.visible = snowMat.opacity > 0.01
    extras.snowman.visible = weather === 'snow'
    const pleasant = weather === 'clear' || weather === 'cloudy'
    extras.birds.visible = pleasant && nightFactor < 0.45
    extras.balloon.visible = pleasant && nightFactor < 0.35
    extras.birds.position.x = -5 + ((t * 0.65) % 13)
    extras.birds.position.y = 9 + Math.sin(t * 1.2) * 0.35
    extras.birds.rotation.y = -0.35 + Math.sin(t * 0.3) * 0.2
    extras.balloon.position.x = 7 - ((t * 0.16) % 14)
    extras.balloon.position.y = 8 + Math.sin(t * 0.45) * 0.55
    if (rainbowLeft > 0) rainbowLeft = Math.max(0, rainbowLeft - dt)
    extras.rainbow.visible = rainbowLeft > 0 && nightFactor < 0.5
    if (extras.rainbow.visible) {
      const alpha = Math.min(1, rainbowLeft / 2, (25 - rainbowLeft) / 2)
      extras.rainbow.children.forEach((arc) => { arc.material.opacity = 0.58 * alpha })
    }

    const tint = weather === 'thunder' ? 0x838b96
      : weather === 'rain' ? 0x9ca3ad
        : weather === 'overcast' ? 0xc4cad3
          : weather === 'fog' ? 0xd4d9e0
            : weather === 'cloudy' ? 0xedf1f8
              : weather === 'snow' ? 0xf8fbff
                : 0xf6f9fe
    cloudTint.set(tint)
    clouds.materials.forEach((material) => {
      material.color.lerp(cloudTint, 1 - Math.exp(-1.8 * dt))
    })
  }

  function dispose() {
    const geometries = []
    const materials = []
    group.traverse((o) => {
      if (!o.isMesh && !o.isLineSegments && !o.isSprite) return
      if (o.geometry && geometries.indexOf(o.geometry) === -1) {
        geometries.push(o.geometry)
        try { o.geometry.dispose() } catch (e) {}
      }
      const list = Array.isArray(o.material) ? o.material : [o.material]
      list.forEach((mat) => {
        if (mat && materials.indexOf(mat) === -1) {
          materials.push(mat)
          try { mat.dispose() } catch (e) {}
        }
      })
    })
    textures.forEach((texture) => {
      try { texture.dispose() } catch (e) {}
    })
    if (!surface.mesh) {
      try { surface.mat.dispose() } catch (e) {}
    }
  }

  return { group, setWeather, setNight, step, dispose }
}
