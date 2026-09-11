import * as THREE from './three.core.js'
import { makeHipRoof } from './roofKit'
import { makeTileTexture, darken } from './tileTexture'

function std(color, opts) { return new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(color), roughness: 0.56, metalness: 0.18, envMapIntensity: 0.72 }, opts || {})) }
function glowMat(color, emissive) { return std(color, { emissive: new THREE.Color(emissive), emissiveIntensity: 0.08 }) }
function tiledRoof(baseHex, repX, repY, extra) { return new THREE.MeshStandardMaterial(Object.assign({ color: 0xffffff, map: makeTileTexture(baseHex, darken(baseHex, 0.68), repX, repY), roughness: 0.62, metalness: 0.15 }, extra || {})) }

export function forbiddenCity() {
  const g = new THREE.Group(), glow = []
  const red = glowMat(0x9b342b, 0xff9e62), gold = tiledRoof(0xd6a33b, 10, 2, { metalness: 0.28 })
  const stone = std(0xd8d0c1, { roughness: 0.88 }), dark = std(0x382f2a, { roughness: 0.72 })
  glow.push(red)
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.18, 4.8), stone); plaza.position.y = 0.09; g.add(plaza)
  ;[-1.1, 1.1].forEach((z, row) => {
    const body = new THREE.Mesh(new THREE.BoxGeometry(row ? 4.7 : 5.3, 1.28, 1.55), red); body.position.set(0, 0.85 + row * 0.2, z); g.add(body)
    const roof = new THREE.Mesh(makeHipRoof(row ? 5.35 : 5.95, 2.15, 0.78), gold); roof.position.set(0, 1.52 + row * 0.2, z); g.add(roof)
    for (let i = -3; i <= 3; i++) { const bay = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.56, 0.05), dark); bay.position.set(i * 0.66, 0.86 + row * 0.2, z + 0.79); g.add(bay) }
  })
  for (const x of [-2.75, 2.75]) for (const z of [-1.85, 1.85]) { const tower = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.72, 0.75), red); tower.position.set(x, 0.58, z); g.add(tower); const roof = new THREE.Mesh(makeHipRoof(1.08, 1.08, 0.48), gold); roof.position.set(x, 0.94, z); g.add(roof) }
  return { group: g, glow }
}

export function bundHeritage() {
  const g = new THREE.Group(), glow = []
  const stone = glowMat(0xd9cfbd, 0xffd8a0), trim = std(0x8e8272, { roughness: 0.76 }), roof = std(0x56606a, { metalness: 0.22, roughness: 0.55 }), glass = glowMat(0x668396, 0xffc875)
  glow.push(stone, glass)
  const widths = [1.35, 1.5, 1.22, 1.45, 1.28]; let x = -3.25
  widths.forEach((w, i) => { const h = 2.5 + (i % 3) * 0.55; const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.25), stone); body.position.set(x + w / 2, h / 2 + 0.2, 0); g.add(body); const cornice = new THREE.Mesh(new THREE.BoxGeometry(w * 1.06, 0.12, 1.34), trim); cornice.position.set(x + w / 2, h + 0.16, 0); g.add(cornice); for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) { const win = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.32, 0.035), glass); win.position.set(x + w * (0.25 + c * 0.25), 0.75 + r * 0.58, 0.64); g.add(win) } if (i === 2) { const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), roof); dome.position.set(x + w / 2, h + 0.55, 0); g.add(dome) } x += w + 0.08 })
  const promenade = new THREE.Mesh(new THREE.BoxGeometry(7.1, 0.18, 1.2), std(0xc9c1b3, { roughness: 0.9 })); promenade.position.set(0, 0.09, 1.32); g.add(promenade)
  return { group: g, glow }
}

export function threePoolsMirroringMoon() {
  const g = new THREE.Group(), glow = []
  const water = std(0x4787a3, { roughness: 0.2, metalness: 0.38, envMapIntensity: 1.35 }), stone = glowMat(0xe5dfd1, 0xffd9a0), dark = std(0x62594d, { roughness: 0.82 }); glow.push(stone)
  const lake = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.12, 28), water); lake.position.y = 0.06; g.add(lake)
  ;[[-1.35, 0.4], [1.05, 1.05], [0.5, -1.35]].forEach(([x, z]) => { const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 0.28, 8), stone); base.position.set(x, 0.2, z); g.add(base); const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 1.2, 8), stone); shaft.position.set(x, 0.93, z); g.add(shaft); for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.08, 8), dark); hole.rotation.x = Math.PI / 2; hole.position.set(x + Math.cos(a) * 0.16, 1.0, z + Math.sin(a) * 0.16); g.add(hole) } const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.52, 8), stone); cap.position.set(x, 1.72, z); g.add(cap) })
  return { group: g, glow }
}

export function terracottaArmy() {
  const g = new THREE.Group(), glow = []
  const earth = std(0xb79b75, { roughness: 0.96 }), figure = glowMat(0x8f7658, 0xffc985); glow.push(figure)
  const pit = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.38, 4.4), earth); pit.position.y = 0.19; g.add(pit)
  const rows = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 8; c++) rows.push([-2.55 + c * 0.72, 0.56, -1.45 + r * 0.72])
  const bodies = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.15, 0.58, 6), figure, rows.length), heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 8, 6), figure, rows.length), m = new THREE.Matrix4()
  rows.forEach((p, i) => { m.makeTranslation(p[0], p[1], p[2]); bodies.setMatrixAt(i, m); m.makeTranslation(p[0], p[1] + 0.4, p[2]); heads.setMatrixAt(i, m) }); bodies.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true; g.add(bodies, heads)
  const gate = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.16, 0.3), std(0x746451, { roughness: 0.9 })); gate.position.set(0, 0.12, 2.0); g.add(gate)
  return { group: g, glow }
}
