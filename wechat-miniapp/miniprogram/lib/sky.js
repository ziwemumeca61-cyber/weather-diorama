// Web 端 NightSky.tsx / Sun.tsx 的小程序场景版本。
import * as THREE from './three.core.js'
import { mulberry32 } from './cityData'

function starLayer(count, radius, seed, color, size) {
  const rand = mulberry32(seed)
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const u = rand()
    const theta = rand() * Math.PI * 2
    const y = 0.12 + u * 0.88
    const r = Math.sqrt(1 - y * y)
    positions[i * 3] = Math.cos(theta) * r * radius
    positions[i * 3 + 1] = y * radius
    positions[i * 3 + 2] = Math.sin(theta) * r * radius
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  })
  const points = new THREE.Points(geometry, material)
  points.visible = false
  return { points, geometry, material }
}


function makeDaySkyObjects() {
  const group = new THREE.Group()
  const geometries = []
  const materials = []
  const addMaterial = (color) => {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, fog: false })
    materials.push(material)
    return material
  }
  const addGeometry = (geometry) => {
    geometries.push(geometry)
    return geometry
  }

  const balloon = new THREE.Group()
  const balloonMat = addMaterial(0xf08b44)
  const stripeMat = addMaterial(0xf7deb3)
  const basketMat = addMaterial(0x704a2f)
  const envelope = new THREE.Mesh(addGeometry(new THREE.SphereGeometry(1.05, 16, 12)), balloonMat)
  envelope.scale.set(0.86, 1.24, 0.86)
  const stripe = new THREE.Mesh(addGeometry(new THREE.SphereGeometry(1.07, 16, 12)), stripeMat)
  stripe.scale.set(0.88, 0.24, 0.88)
  const basket = new THREE.Mesh(addGeometry(new THREE.BoxGeometry(0.42, 0.22, 0.35)), basketMat)
  basket.position.y = -1.42
  balloon.add(envelope, stripe, basket)
  ;[-1, 1].forEach((side) => {
    const rope = new THREE.Mesh(addGeometry(new THREE.CylinderGeometry(0.012, 0.012, 0.62, 5)), basketMat)
    rope.position.set(side * 0.34, -0.9, 0)
    rope.rotation.z = side * 0.28
    balloon.add(rope)
  })
  balloon.scale.setScalar(1.12)
  group.add(balloon)

  const airship = new THREE.Group()
  const blimpMat = addMaterial(0xd9e9ef)
  const bandMat = addMaterial(0x4f86b7)
  const cabinMat = addMaterial(0x3a4a59)
  const hull = new THREE.Mesh(addGeometry(new THREE.SphereGeometry(1, 18, 12)), blimpMat)
  hull.scale.set(2.3, 0.7, 0.82)
  const band = new THREE.Mesh(addGeometry(new THREE.BoxGeometry(0.14, 1.08, 1.7)), bandMat)
  const cabin = new THREE.Mesh(addGeometry(new THREE.BoxGeometry(0.8, 0.2, 0.34)), cabinMat)
  cabin.position.y = -0.72
  const tail = new THREE.Mesh(addGeometry(new THREE.BoxGeometry(0.55, 0.46, 0.06)), bandMat)
  tail.position.set(-2.18, 0.18, 0)
  airship.add(hull, band, cabin, tail)
  airship.scale.setScalar(0.9)
  group.add(airship)

  const birds = []
  const birdMat = new THREE.LineBasicMaterial({ color: 0x2e455b, transparent: true, opacity: 0, depthWrite: false, fog: false })
  materials.push(birdMat)
  for (let i = 0; i < 7; i++) {
    const wing = 0.2 + (i % 3) * 0.045
    const geo = addGeometry(new THREE.BufferGeometry())
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      -wing, 0, 0, 0, -wing * 0.34, 0,
      0, -wing * 0.34, 0, wing, 0, 0,
    ]), 3))
    const bird = new THREE.LineSegments(geo, birdMat)
    bird.userData.phase = i * 0.87
    bird.userData.offsetX = (i - 3) * 0.9
    bird.userData.offsetY = (i % 2) * 0.36
    group.add(bird)
    birds.push(bird)
  }
  group.visible = false
  return { group, balloon, airship, birds, materials, geometries }
}

export function createSky() {
  const group = new THREE.Group()
  const stars = [
    starLayer(520, 44, 9871, 0xeaf1ff, 0.34),
    starLayer(380, 46.2, 4412, 0xc8d6ff, 0.2),
    starLayer(110, 43.1, 2277, 0xffffff, 0.5),
  ]
  stars.forEach((layer) => group.add(layer.points))

  const moonGroup = new THREE.Group()
  const moonMat = new THREE.MeshBasicMaterial({ color: 0xf4f1e2, transparent: true, opacity: 0, depthWrite: false, fog: false })
  const moonGlowMat = new THREE.MeshBasicMaterial({
    color: 0xcfe0ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
  })
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.35, 22, 18), moonMat)
  const moonGlow = new THREE.Mesh(new THREE.SphereGeometry(2.9, 20, 16), moonGlowMat)
  moonGroup.add(moon, moonGlow)
  moonGroup.visible = false
  group.add(moonGroup)

  const sunGroup = new THREE.Group()
  sunGroup.position.set(-26, 15, 2)
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff4c4, transparent: true, opacity: 0, fog: false })
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xffd873, transparent: true, opacity: 0, depthWrite: false, fog: false })
  const sun = new THREE.Mesh(new THREE.SphereGeometry(3.6, 24, 18), sunMat)
  const halo = new THREE.Mesh(new THREE.SphereGeometry(5.8, 22, 16), haloMat)
  sunGroup.add(halo, sun)
  sunGroup.visible = false
  group.add(sunGroup)

  const dayObjects = makeDaySkyObjects()
  group.add(dayObjects.group)

  const forward = new THREE.Vector3()
  const right = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  const clearByKind = { clear: 1, cloudy: 0.4, overcast: 0, fog: 0, rain: 0, snow: 0, thunder: 0 }

  function update(nightFactor, weather, camera, t) {
    const kind = typeof weather === 'string' ? weather : weather ? 'clear' : 'overcast'
    const clearness = clearByKind[kind] == null ? 1 : clearByKind[kind]
    const nf = Math.max(0, Math.min(1, nightFactor)) * clearness
    const opacities = [
      nf * (0.62 + 0.38 * Math.sin(t * 1.1)),
      nf * (0.5 + 0.35 * Math.sin(t * 0.7 + 1.7)),
      nf * (0.55 + 0.45 * Math.abs(Math.sin(t * 2.3 + 0.6))),
    ]
    stars.forEach((layer, i) => {
      layer.material.opacity = Math.max(0, opacities[i])
      layer.points.visible = layer.material.opacity > 0.01
    })
    moonGroup.visible = nf > 0.01
    moonMat.opacity = nf
    moonGlowMat.opacity = nf * 0.28
    if (moonGroup.visible) {
      camera.getWorldDirection(forward)
      right.crossVectors(forward, up).normalize()
      moonGroup.position.copy(camera.position).addScaledVector(forward, 46).addScaledVector(right, 12).addScaledVector(up, 11)
    }

    const day = Math.max(0, 1 - nightFactor * 1.6) * (kind === 'clear' ? 1 : 0)
    sunGroup.visible = day > 0.01
    sunMat.opacity = day
    haloMat.opacity = day * 0.3
    halo.scale.setScalar(1 + Math.sin(t * 0.8) * 0.04)

    // 晴天专属远景：热气球、飞艇和鸟群固定在镜头远方，不会遮挡城市主体。
    dayObjects.group.visible = day > 0.01
    dayObjects.materials.forEach((material) => { material.opacity = day })
    if (dayObjects.group.visible) {
      camera.getWorldDirection(forward)
      right.crossVectors(forward, up).normalize()
      const base = camera.position.clone().addScaledVector(forward, 39)
      dayObjects.balloon.position.copy(base).addScaledVector(right, -11).addScaledVector(up, 7.5 + Math.sin(t * 0.62) * 1.05)
      dayObjects.balloon.rotation.y = t * 0.1
      dayObjects.airship.position.copy(base).addScaledVector(right, 10.8).addScaledVector(up, 8.2 + Math.sin(t * 0.28) * 0.42)
      dayObjects.airship.rotation.y = -0.24 + Math.sin(t * 0.16) * 0.08
      dayObjects.birds.forEach((bird) => {
        bird.position.copy(base)
          .addScaledVector(right, bird.userData.offsetX + Math.sin(t * 0.34 + bird.userData.phase) * 0.8)
          .addScaledVector(up, 4.2 + bird.userData.offsetY + Math.cos(t * 0.55 + bird.userData.phase) * 0.35)
        bird.rotation.z = Math.sin(t * 6 + bird.userData.phase) * 0.2
      })
    }
  }

  function dispose() {
    stars.forEach((layer) => {
      try { layer.geometry.dispose() } catch (e) {}
      try { layer.material.dispose() } catch (e) {}
    })
    ;[moon.geometry, moonGlow.geometry, sun.geometry, halo.geometry].forEach((geometry) => {
      try { geometry.dispose() } catch (e) {}
    })
    ;[moonMat, moonGlowMat, sunMat, haloMat].forEach((material) => {
      try { material.dispose() } catch (e) {}
    })
    dayObjects.geometries.forEach((geometry) => {
      try { geometry.dispose() } catch (e) {}
    })
    dayObjects.materials.forEach((material) => {
      try { material.dispose() } catch (e) {}
    })
  }

  return { group, update, dispose }
}
