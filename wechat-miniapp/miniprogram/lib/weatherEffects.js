// Web 端 WeatherController 的 WebGL1 版本：云层、雨线、雪、贴地雾和可见闪电。
import * as THREE from './three.core.js'
import { mulberry32 } from './cityData'

function makeCloudTexture() {
  const size = 64
  const data = new Uint8Array(size * size * 4)
  const center = (size - 1) / 2
  const radius = size * 0.5
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center
      const dy = y - center
      const angle = Math.atan2(dy, dx)
      const unevenEdge = 1 + Math.sin(angle * 5) * 0.035 + Math.sin(angle * 9 + 1.7) * 0.022
      const distance = Math.sqrt(dx * dx + dy * dy) / radius / unevenEdge
      const edge = Math.max(0, Math.min(1, (1 - distance) / 0.42))
      const smooth = edge * edge * (3 - 2 * edge)
      const p = (y * size + x) * 4
      data[p] = data[p + 1] = data[p + 2] = 255
      data[p + 3] = Math.round(smooth * 255)
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

function setCloudOpacity(layer, opacity) {
  const value = Math.max(0, opacity)
  layer.opacity = value
  layer.bodyMaterial.opacity = value
  layer.shadowMaterial.opacity = value * 0.52
  layer.haloMaterial.opacity = value * 0.28
  layer.group.visible = value > 0.01
}

function setCloudColor(layer, body, shadow) {
  layer.bodyMaterial.color.set(body)
  layer.shadowMaterial.color.set(shadow)
  layer.haloMaterial.color.set(body)
}

/**
 * 每一朵云由 5–8 个受光云团、2–3 个冷色底部阴影和一个柔边轮廓组成。
 * 云团按簇分布，旋转视角时仍能看到厚度，不再是单个扁球或圆形贴片。
 */
function makeCloudLayer(clusterCount, seed, inner, outer, y0, y1, opacity, texture, compact) {
  const group = new THREE.Group()
  const geometry = new THREE.SphereGeometry(1, 12, 9)
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xf7fbff,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  })
  const shadowMaterial = new THREE.MeshStandardMaterial({
    color: 0xaeb9c7,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  })
  const haloMaterial = new THREE.SpriteMaterial({
    map: texture,
    color: 0xf7fbff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  })
  const rand = mulberry32(seed)
  const bodies = []
  const shadows = []
  const halos = []

  for (let cluster = 0; cluster < clusterCount; cluster++) {
    const angle = rand() * Math.PI * 2
    const radius = inner + rand() * (outer - inner)
    const baseSize = (compact ? 1.25 : 1.7) + rand() * (compact ? 1.65 : 2.5)
    const cx = Math.cos(angle) * radius
    const cy = y0 + rand() * (y1 - y0)
    const cz = Math.sin(angle) * radius
    const puffCount = (compact ? 4 : 5) + Math.floor(rand() * 4)

    for (let i = 0; i < puffCount; i++) {
      const localAngle = rand() * Math.PI * 2
      const spread = baseSize * (0.12 + rand() * 0.72)
      const size = baseSize * (0.48 + rand() * 0.48)
      const crown = i < 2 ? baseSize * (0.3 + rand() * 0.28) : (rand() - 0.5) * baseSize * 0.3
      bodies.push({
        x: cx + Math.cos(localAngle) * spread,
        y: cy + crown,
        z: cz + Math.sin(localAngle) * spread * 0.62,
        sx: size * (1.05 + rand() * 0.38),
        sy: size * (0.72 + rand() * 0.34),
        sz: size * (0.82 + rand() * 0.3),
      })
    }

    const shadowCount = compact ? 2 : 3
    for (let i = 0; i < shadowCount; i++) {
      const offset = (i - (shadowCount - 1) / 2) * baseSize * 0.68
      shadows.push({
        x: cx + offset,
        y: cy - baseSize * (0.34 + rand() * 0.12),
        z: cz + (rand() - 0.5) * baseSize * 0.32,
        sx: baseSize * (0.85 + rand() * 0.32),
        sy: baseSize * (0.32 + rand() * 0.12),
        sz: baseSize * (0.7 + rand() * 0.25),
      })
    }
    halos.push({ x: cx, y: cy + baseSize * 0.08, z: cz, sx: baseSize * 3.35, sy: baseSize * 1.9 })
  }

  const makeInstances = (material, puffs) => {
    const mesh = new THREE.InstancedMesh(geometry, material, puffs.length)
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3()
    puffs.forEach((puff, i) => {
      position.set(puff.x, puff.y, puff.z)
      scale.set(puff.sx, puff.sy, puff.sz)
      matrix.compose(position, quaternion, scale)
      mesh.setMatrixAt(i, matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.frustumCulled = false
    group.add(mesh)
    return mesh
  }

  const bodyMesh = makeInstances(bodyMaterial, bodies)
  const shadowMesh = makeInstances(shadowMaterial, shadows)
  halos.forEach((halo) => {
    const sprite = new THREE.Sprite(haloMaterial)
    sprite.position.set(halo.x, halo.y, halo.z)
    sprite.scale.set(halo.sx, halo.sy, 1)
    sprite.frustumCulled = false
    group.add(sprite)
  })

  const layer = {
    group,
    bodyMesh,
    shadowMesh,
    bodyMaterial,
    shadowMaterial,
    haloMaterial,
    materials: [bodyMaterial, shadowMaterial, haloMaterial],
    geometry,
    opacity: 0,
  }
  setCloudOpacity(layer, opacity || 0)
  return layer
}

function makeRain(count) {
  const positions = new Float32Array(count * 6)
  const drops = []
  const rand = mulberry32(3103)
  for (let i = 0; i < count; i++) {
    drops.push({
      x: (rand() - 0.5) * 30,
      y: rand() * 23,
      z: (rand() - 0.5) * 30,
      length: 0.45 + rand() * 0.65,
      speed: 13 + rand() * 9,
    })
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.LineBasicMaterial({
    color: 0xc4d5e3,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  })
  const mesh = new THREE.LineSegments(geometry, material)
  mesh.visible = false
  mesh.frustumCulled = false
  return { mesh, geometry, material, positions, drops }
}

function makeSnow(count) {
  const positions = new Float32Array(count * 3)
  const flakes = []
  const rand = mulberry32(6407)
  for (let i = 0; i < count; i++) {
    const flake = {
      x: (rand() - 0.5) * 31,
      y: rand() * 22,
      z: (rand() - 0.5) * 31,
      speed: 1.2 + rand() * 2.1,
      phase: rand() * Math.PI * 2,
    }
    flakes.push(flake)
    positions[i * 3] = flake.x
    positions[i * 3 + 1] = flake.y
    positions[i * 3 + 2] = flake.z
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.2,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
  })
  const mesh = new THREE.Points(geometry, material)
  mesh.visible = false
  mesh.frustumCulled = false
  return { mesh, geometry, material, positions, flakes }
}

function makeSplashes(count) {
  const material = new THREE.MeshBasicMaterial({
    color: 0xdcebf7,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const geometry = new THREE.RingGeometry(0.5, 1, 10)
  geometry.rotateX(-Math.PI / 2)
  const mesh = new THREE.InstancedMesh(geometry, material, count)
  mesh.visible = false
  mesh.frustumCulled = false
  const rand = mulberry32(8821)
  const drops = []
  for (let i = 0; i < count; i++) {
    drops.push({
      x: (rand() - 0.5) * 19,
      y: rand() < 0.35 ? 0.4 + rand() * 4.5 : 0.045,
      z: (rand() - 0.5) * 18,
      age: rand(),
      life: 0.42 + rand() * 0.36,
    })
  }
  return { mesh, geometry, material, drops, rand }
}

function makeLightning() {
  const maxSegments = 48
  const positions = new Float32Array(maxSegments * 6)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.LineBasicMaterial({ color: 0xf6f2ff, transparent: true, opacity: 0, depthWrite: false, fog: false })
  const mesh = new THREE.LineSegments(geometry, material)
  mesh.visible = false
  mesh.frustumCulled = false
  return { mesh, geometry, material, positions, maxSegments }
}

function resetLightning(bolt, seed) {
  const rand = mulberry32(seed)
  const points = []
  let x = -4 + rand() * 8
  let y = 22
  let z = -5 + rand() * 9
  points.push([x, y, z])
  for (let i = 1; i < 17; i++) {
    x += (rand() - 0.5) * 1.3
    y = 22 - (i / 16) * 19.5
    z += (rand() - 0.5) * 0.75
    points.push([x, y, z])
  }
  const segments = []
  for (let i = 0; i < points.length - 1; i++) segments.push([points[i], points[i + 1]])
  ;[6, 10].forEach((start, branchIndex) => {
    let prev = points[start]
    for (let i = 0; i < 6; i++) {
      const next = [
        prev[0] + (branchIndex ? -1 : 1) * (0.45 + rand() * 0.55),
        prev[1] - 0.65 - rand() * 0.6,
        prev[2] + (rand() - 0.5) * 0.7,
      ]
      segments.push([prev, next])
      prev = next
    }
  })
  const arr = bolt.positions
  arr.fill(0)
  for (let i = 0; i < Math.min(segments.length, bolt.maxSegments); i++) {
    const a = segments[i][0]
    const b = segments[i][1]
    const p = i * 6
    arr[p] = a[0]
    arr[p + 1] = a[1]
    arr[p + 2] = a[2]
    arr[p + 3] = b[0]
    arr[p + 4] = b[1]
    arr[p + 5] = b[2]
  }
  bolt.geometry.attributes.position.needsUpdate = true
  bolt.lightPosition = points[9]
}

export function createWeatherEffects(scene) {
  const group = new THREE.Group()
  group.name = 'VolumetricWeatherCloudsV3'
  if (typeof console !== 'undefined' && console.info) console.info('[scene] cloud renderer: VolumetricWeatherCloudsV3')
  scene.add(group)
  const cloudTexture = makeCloudTexture()
  // 晴天也能明显看到远处的簇状环境云；天气云则压低到高楼上方。
  const ambient = makeCloudLayer(11, 1731, 15, 28, -1, 8, 0.58, cloudTexture, false)
  const high = makeCloudLayer(15, 2719, 3, 19, 10.5, 15.5, 0, cloudTexture, false)
  const fog = makeCloudLayer(10, 3761, 1, 12, 0.3, 1.8, 0, cloudTexture, true)
  setCloudColor(ambient, 0xf7fbff, 0xb9c6d5)
  setCloudColor(high, 0xe8edf3, 0x8f9aa8)
  setCloudColor(fog, 0xe4e9ef, 0xb2bbc5)
  group.add(ambient.group, high.group, fog.group)

  const rain = makeRain(1250)
  const snow = makeSnow(1350)
  const splashes = makeSplashes(52)
  const bolt = makeLightning()
  group.add(rain.mesh, snow.mesh, splashes.mesh, bolt.mesh)
  const boltLight = new THREE.PointLight(0xdde8ff, 0, 38, 2)
  group.add(boltLight)

  let kind = 'clear'
  let rainTarget = 0
  let snowTarget = 0
  let ambientTarget = 0.58
  let cloudTarget = 0
  let fogTarget = 0
  let flash = 0
  let boltLife = 0
  let nextBolt = 1.5
  let boltSeed = 4001

  function setWeather(value) {
    kind = value || 'clear'
    rainTarget = kind === 'rain' || kind === 'thunder' ? 0.82 : 0
    snowTarget = kind === 'snow' ? 0.96 : 0
    fogTarget = kind === 'fog' ? 0.42 : 0
    ambientTarget = kind === 'clear' ? 0.58 : kind === 'cloudy' ? 0.68 : kind === 'overcast' ? 0.72 : kind === 'fog' ? 0.48 : kind === 'snow' ? 0.62 : kind === 'rain' ? 0.66 : kind === 'thunder' ? 0.7 : 0.58
    cloudTarget = kind === 'cloudy' ? 0.52 : kind === 'overcast' ? 0.78 : kind === 'fog' ? 0.38 : kind === 'snow' ? 0.52 : kind === 'rain' ? 0.8 : kind === 'thunder' ? 0.92 : 0
    const body = kind === 'thunder' ? 0x626b79 : kind === 'rain' ? 0x8993a0 : kind === 'overcast' ? 0xb6bec9 : kind === 'cloudy' ? 0xe7edf4 : kind === 'fog' ? 0xd9dfe6 : 0xf5f9fd
    const shadow = kind === 'thunder' ? 0x353e4d : kind === 'rain' ? 0x505a67 : kind === 'overcast' ? 0x747e8b : kind === 'cloudy' ? 0x9aa7b6 : kind === 'fog' ? 0xaeb7c1 : 0xb9c6d5
    setCloudColor(ambient, body, shadow)
    setCloudColor(high, body, shadow)
  }

  const splashMatrix = new THREE.Matrix4()
  const splashP = new THREE.Vector3()
  const splashQ = new THREE.Quaternion()
  const splashS = new THREE.Vector3()
  function updateSplashes(dt) {
    for (let i = 0; i < splashes.drops.length; i++) {
      const drop = splashes.drops[i]
      drop.age += dt
      if (drop.age >= drop.life) {
        drop.x = (splashes.rand() - 0.5) * 19
        drop.y = splashes.rand() < 0.35 ? 0.4 + splashes.rand() * 4.5 : 0.045
        drop.z = (splashes.rand() - 0.5) * 18
        drop.age = 0
        drop.life = 0.42 + splashes.rand() * 0.36
      }
      const u = drop.age / drop.life
      const radius = Math.sin(u * Math.PI) * 0.26
      splashP.set(drop.x, drop.y, drop.z)
      splashS.set(radius, 1, radius)
      splashMatrix.compose(splashP, splashQ, splashS)
      splashes.mesh.setMatrixAt(i, splashMatrix)
    }
    splashes.mesh.instanceMatrix.needsUpdate = true
  }

  function step(t, dt) {
    const damping = 1 - Math.exp(-3 * dt)
    setCloudOpacity(ambient, ambient.opacity + (ambientTarget - ambient.opacity) * damping)
    setCloudOpacity(high, high.opacity + (cloudTarget - high.opacity) * damping)
    setCloudOpacity(fog, fog.opacity + (fogTarget - fog.opacity) * damping)
    rain.material.opacity += (rainTarget - rain.material.opacity) * damping
    snow.material.opacity += (snowTarget - snow.material.opacity) * damping
    splashes.material.opacity += (rainTarget * 0.6 - splashes.material.opacity) * damping
    rain.mesh.visible = rain.material.opacity > 0.01
    snow.mesh.visible = snow.material.opacity > 0.01
    splashes.mesh.visible = splashes.material.opacity > 0.01
    ambient.group.rotation.y = t * 0.018
    ambient.group.position.y = Math.sin(t * 0.16) * 0.22
    high.group.rotation.y = -t * 0.012
    high.group.position.x = Math.sin(t * 0.08) * 0.9
    high.group.position.y = Math.sin(t * 0.13 + 1.2) * 0.28
    fog.group.rotation.y = t * 0.025

    if (rain.mesh.visible) {
      for (let i = 0; i < rain.drops.length; i++) {
        const drop = rain.drops[i]
        drop.y -= drop.speed * dt
        drop.x += dt * 1.35
        if (drop.y < 0) {
          drop.y = 19 + ((i * 17) % 40) * 0.1
          drop.x = ((i * 43) % 300) / 10 - 15
          drop.z = ((i * 71) % 300) / 10 - 15
        }
        const p = i * 6
        rain.positions[p] = drop.x
        rain.positions[p + 1] = drop.y
        rain.positions[p + 2] = drop.z
        rain.positions[p + 3] = drop.x - 0.08
        rain.positions[p + 4] = drop.y - drop.length
        rain.positions[p + 5] = drop.z + 0.025
      }
      rain.geometry.attributes.position.needsUpdate = true
      updateSplashes(dt)
    }

    if (snow.mesh.visible) {
      for (let i = 0; i < snow.flakes.length; i++) {
        const flake = snow.flakes[i]
        flake.y -= flake.speed * dt
        flake.x += Math.sin(t * 0.8 + flake.phase) * dt * 0.6
        flake.z += Math.cos(t * 0.55 + flake.phase) * dt * 0.25
        if (flake.y < 0) flake.y = 20 + ((i * 13) % 20) * 0.1
        snow.positions[i * 3] = flake.x
        snow.positions[i * 3 + 1] = flake.y
        snow.positions[i * 3 + 2] = flake.z
      }
      snow.geometry.attributes.position.needsUpdate = true
    }

    if (kind === 'thunder' && t > nextBolt) {
      flash = 1
      boltLife = 0.22
      boltSeed += 97
      resetLightning(bolt, boltSeed)
      bolt.mesh.visible = true
      bolt.material.opacity = 1
      if (bolt.lightPosition) boltLight.position.set(bolt.lightPosition[0], bolt.lightPosition[1], bolt.lightPosition[2])
      nextBolt = t + 2.2 + (boltSeed % 39) * 0.1
    }
    boltLife = Math.max(0, boltLife - dt)
    if (boltLife > 0) bolt.material.opacity = Math.min(1, boltLife * 7)
    else bolt.mesh.visible = false
    flash = flash > 0.001 ? flash * Math.pow(0.00001, dt) : 0
    boltLight.intensity = flash * 12
    return flash
  }

  function dispose() {
    const geometries = [ambient.geometry, high.geometry, fog.geometry, rain.geometry, snow.geometry, splashes.geometry, bolt.geometry]
    const materials = ambient.materials.concat(high.materials, fog.materials, [rain.material, snow.material, splashes.material, bolt.material])
    geometries.forEach((geometry) => { try { geometry.dispose() } catch (e) {} })
    materials.forEach((material) => { try { material.dispose() } catch (e) {} })
    try { cloudTexture.dispose() } catch (e) {}
    scene.remove(group)
  }

  setWeather('clear')
  return { group, setWeather, step, dispose }
}
