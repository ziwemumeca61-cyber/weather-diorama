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
  }

  return { group, update, dispose }
}
