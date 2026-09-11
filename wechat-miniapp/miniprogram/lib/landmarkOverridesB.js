import * as THREE from './three.core.js'
import { makeHipRoof } from './roofKit'
import { makeTileTexture, darken } from './tileTexture'

function std(color, opts) { return new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(color), roughness: 0.56, metalness: 0.18, envMapIntensity: 0.72 }, opts || {})) }
function glowMat(color, emissive) { return std(color, { emissive: new THREE.Color(emissive), emissiveIntensity: 0.08 }) }
function tiledRoof(baseHex, repX, repY, extra) { return new THREE.MeshStandardMaterial(Object.assign({ color: 0xffffff, map: makeTileTexture(baseHex, darken(baseHex, 0.68), repX, repY), roughness: 0.62, metalness: 0.15 }, extra || {})) }

export function windowOfWorld() {
  const g = new THREE.Group(), glow = []
  const steel = glowMat(0xb58f69, 0xffc47a), stone = std(0xd7d0c4, { roughness: 0.86 }); glow.push(steel)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.75, 0.24, 20), stone); base.position.y = 0.12; g.add(base)
  const up = new THREE.Vector3(0, 1, 0)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const a = new THREE.Vector3(sx * 1.05, 0, sz * 0.58), b = new THREE.Vector3(sx * 0.28, 4.8, sz * 0.15)
    const d = new THREE.Vector3().subVectors(b, a), leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.1, d.length(), 6), steel)
    leg.position.copy(a).add(b).multiplyScalar(0.5); leg.quaternion.setFromUnitVectors(up, d.normalize()); g.add(leg)
  }
  ;[1.1, 2.2, 3.35].forEach((y, i) => { const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2 - i * 0.45, 0.11, 1.25 - i * 0.25), steel); deck.position.y = y; g.add(deck) })
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.08, 3.0, 7), steel); mast.position.y = 6.25; g.add(mast)
  return { group: g, glow }
}

export function giantBuddha() {
  const g = new THREE.Group(), glow = []
  const bronze = glowMat(0x8b7252, 0xffc878), stone = std(0xbfb7aa, { roughness: 0.92 }); glow.push(bronze)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.8, 0.7, 18), stone); base.position.y = 0.35; g.add(base)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.78, 16, 12), bronze); body.scale.set(0.86, 1.35, 0.72); body.position.y = 2.15; g.add(body)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 12), bronze); head.position.y = 3.45; g.add(head)
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), bronze); bun.position.y = 3.98; g.add(bun)
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 1.15, 0.75, 12), bronze); legs.position.y = 1.2; g.add(legs)
  for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 1.4, 8), bronze); arm.position.set(sx * 0.75, 2.25, 0); arm.rotation.z = sx * 0.6; g.add(arm) }
  return { group: g, glow }
}

export function jokhangTemple() {
  const g = new THREE.Group(), glow = []
  const white = glowMat(0xe7dfcf, 0xffd39a), red = std(0x8e3f32, { roughness: 0.8 }), gold = tiledRoof(0xd2a63c, 7, 2, { metalness: 0.35 }); glow.push(white)
  const base = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.5, 3.5), white); base.position.y = 1.25; g.add(base)
  for (const sx of [-1, 1]) { const wing = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.0, 2.8), red); wing.position.set(sx * 2.25, 1.5, 0); g.add(wing) }
  const hall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 2.2), white); hall.position.y = 3.05; g.add(hall)
  const roof = new THREE.Mesh(makeHipRoof(3.8, 2.8, 0.82), gold); roof.position.y = 3.62; g.add(roof)
  for (const x of [-1.25, -0.62, 0, 0.62, 1.25]) { const win = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.04), std(0x31383a)); win.position.set(x, 1.5, 1.76); g.add(win) }
  return { group: g, glow }
}
