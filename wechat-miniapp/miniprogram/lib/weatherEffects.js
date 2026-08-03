// Web 端 WeatherController 的 WebGL1 版本：云层、雨线、雪、贴地雾和可见闪电。
import * as THREE from './three.core.js'
import { CITY, mulberry32 } from './cityData'

function makeRadialTexture(stops) {
  const size = 128
  const data = new Uint8Array(size * size * 4)
  const center = (size - 1) / 2
  const radius = size * 0.5
  const alphaAt = (distance) => {
    if (distance >= 1) return 0
    for (let i = 1; i < stops.length; i++) {
      if (distance <= stops[i][0]) {
        const a = stops[i - 1]
        const b = stops[i]
        const t = (distance - a[0]) / (b[0] - a[0])
        return a[1] + (b[1] - a[1]) * t
      }
    }
    return 0
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const distance = Math.hypot(x - center, y - center) / radius
      const p = (y * size + x) * 4
      data[p] = data[p + 1] = data[p + 2] = 255
      data[p + 3] = Math.round(alphaAt(distance) * 255)
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

function lcg(seed) {
  let value = seed
  return () => ((value = (value * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
}

function makeAmbientClouds(texture) {
  const group = new THREE.Group()
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  })
  const rand = lcg(5150)
  const puffs = []
  for (let i = 0; i < 22; i++) {
    const puff = {
      angle: rand() * Math.PI * 2,
      radius: 17 + rand() * 22,
      y: -11 + rand() * 15,
      scale: 6 + rand() * 10,
      speed: (0.02 + rand() * 0.05) * (rand() < 0.5 ? 1 : -1),
    }
    puffs.push(puff)
    const sprite = new THREE.Sprite(material)
    sprite.position.set(Math.cos(puff.angle) * puff.radius, puff.y, Math.sin(puff.angle) * puff.radius)
    sprite.scale.set(puff.scale, puff.scale * 0.62, 1)
    sprite.frustumCulled = false
    group.add(sprite)
  }
  return { group, material, puffs }
}

function makeWeatherClouds(texture) {
  const group = new THREE.Group()
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: 0xf2f5f8,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  })
  const rand = mulberry32(2719)
  const puffs = []
  // 天气云层覆盖城市上空；增加数量而降低单朵尺寸，让多云/阴雨更有层次。
  const cloudCount = 44
  for (let i = 0; i < cloudCount; i++) {
    const puff = {
      x: (rand() - 0.5) * 36,
      z: (rand() - 0.5) * 36 + CITY.landmark.z,
      y: 9.2 + rand() * 5.2,
      scale: 5.2 + rand() * 5.8,
      speed: 0.1 + rand() * 0.16,
    }
    puffs.push(puff)
    const sprite = new THREE.Sprite(material)
    sprite.position.set(puff.x, puff.y, puff.z)
    sprite.scale.set(puff.scale, puff.scale * 0.62, 1)
    sprite.visible = false
    sprite.frustumCulled = false
    group.add(sprite)
  }
  group.visible = false
  return { group, material, puffs, targetOpacity: 0, activeCount: 0 }
}

function setWeatherClouds(layer, coverage, dark) {
  const total = layer.puffs.length
  layer.activeCount = coverage > 0 ? Math.min(total, Math.floor(20 + (total - 20) * coverage)) : 0
  layer.targetOpacity = coverage > 0 ? 0.5 + (0.92 - 0.5) * coverage : 0
  layer.material.color.set(dark ? 0x5b626e : coverage > 0.7 ? 0xaeb4bd : 0xf2f5f8)
  layer.group.children.forEach((sprite, i) => { sprite.visible = i < layer.activeCount })
}

function makeFogBanks(texture) {
  const group = new THREE.Group()
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: 0xeef1f4,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  })
  const rand = mulberry32(3761)
  const banks = []
  for (let i = 0; i < 26; i++) {
    const bank = {
      x: (rand() - 0.5) * 20,
      z: (rand() - 0.5) * 20 + CITY.landmark.z,
      y: 0.3 + rand() * 1.4,
      scale: 3 + rand() * 4,
      speed: 0.05 + rand() * 0.12,
      phase: rand() * Math.PI * 2,
    }
    banks.push(bank)
    const sprite = new THREE.Sprite(material)
    sprite.position.set(bank.x, bank.y, bank.z)
    sprite.scale.set(bank.scale, bank.scale * 0.55, 1)
    sprite.frustumCulled = false
    group.add(sprite)
  }
  group.visible = false
  return { group, material, banks, targetOpacity: 0 }
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
  group.name = 'WebSpriteCloudsV4'
  if (typeof console !== 'undefined' && console.info) console.info('[scene] cloud renderer: WebSpriteCloudsV4')
  scene.add(group)
  // 三套径向渐变参数逐项对应 Web 端 AmbientClouds / Clouds / Fog。
  const ambientTexture = makeRadialTexture([[0, 0.95], [0.5, 0.6], [1, 0]])
  const weatherTexture = makeRadialTexture([[0, 1], [0.6, 0.65], [1, 0]])
  const fogTexture = makeRadialTexture([[0, 0.9], [0.5, 0.5], [1, 0]])
  const ambient = makeAmbientClouds(ambientTexture)
  const high = makeWeatherClouds(weatherTexture)
  const fog = makeFogBanks(fogTexture)
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
  let flash = 0
  let boltLife = 0
  let nextBolt = 1.0
  let boltSeed = 4001

  function setWeather(value) {
    kind = value || 'clear'
    rainTarget = kind === 'rain' || kind === 'thunder' ? 0.82 : 0
    snowTarget = kind === 'snow' ? 0.96 : 0
    fog.targetOpacity = kind === 'fog' ? 0.28 : 0
    if (kind === 'cloudy') setWeatherClouds(high, 0.66, false)
    else if (kind === 'overcast') setWeatherClouds(high, 0.96, false)
    else if (kind === 'rain') setWeatherClouds(high, 0.92, true)
    else if (kind === 'thunder') setWeatherClouds(high, 0.98, true)
    else setWeatherClouds(high, 0, false)
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
    high.material.opacity += (high.targetOpacity - high.material.opacity) * damping
    high.group.visible = high.targetOpacity > 0 && high.material.opacity > 0.01
    fog.material.opacity += (fog.targetOpacity - fog.material.opacity) * damping
    fog.group.visible = fog.targetOpacity > 0 && fog.material.opacity > 0.01
    rain.material.opacity += (rainTarget - rain.material.opacity) * damping
    snow.material.opacity += (snowTarget - snow.material.opacity) * damping
    splashes.material.opacity += (rainTarget * 0.6 - splashes.material.opacity) * damping
    rain.mesh.visible = rain.material.opacity > 0.01
    snow.mesh.visible = snow.material.opacity > 0.01
    splashes.mesh.visible = splashes.material.opacity > 0.01
    ambient.puffs.forEach((puff, i) => {
      puff.angle += puff.speed * dt
      const sprite = ambient.group.children[i]
      if (sprite) sprite.position.set(Math.cos(puff.angle) * puff.radius, puff.y, Math.sin(puff.angle) * puff.radius)
    })
    if (high.group.visible) {
      high.puffs.forEach((puff, i) => {
        const sprite = high.group.children[i]
        if (!sprite || !sprite.visible) return
        sprite.position.x += puff.speed * dt
        if (sprite.position.x > 15) sprite.position.x = -15
      })
    }
    if (fog.group.visible) {
      fog.banks.forEach((bank, i) => {
        const sprite = fog.group.children[i]
        if (!sprite) return
        sprite.position.x = bank.x + Math.sin(t * bank.speed + bank.phase) * 2.2
        sprite.position.z = bank.z + Math.cos(t * bank.speed * 0.7 + bank.phase) * 1.6
      })
    }

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
      // 雷阵雨缩短闪电间隔，保持有随机间歇，避免机械地等很久才闪一次。
      nextBolt = t + 0.95 + (boltSeed % 22) * 0.07
    }
    boltLife = Math.max(0, boltLife - dt)
    if (boltLife > 0) bolt.material.opacity = Math.min(1, boltLife * 7)
    else bolt.mesh.visible = false
    flash = flash > 0.001 ? flash * Math.pow(0.00001, dt) : 0
    boltLight.intensity = flash * 12
    return flash
  }

  function dispose() {
    const geometries = [rain.geometry, snow.geometry, splashes.geometry, bolt.geometry]
    const materials = [ambient.material, high.material, fog.material, rain.material, snow.material, splashes.material, bolt.material]
    geometries.forEach((geometry) => { try { geometry.dispose() } catch (e) {} })
    materials.forEach((material) => { try { material.dispose() } catch (e) {} })
    ;[ambientTexture, weatherTexture, fogTexture].forEach((texture) => { try { texture.dispose() } catch (e) {} })
    scene.remove(group)
  }

  setWeather('clear')
  return { group, setWeather, step, dispose }
}
