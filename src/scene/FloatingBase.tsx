import { useMemo } from 'react'
import * as THREE from 'three'
import { CITY } from './cityData'

/* deterministic value noise for a little colour variation on the soil */
function hash3(x: number, y: number, z: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return h - Math.floor(h)
}

const HALF = CITY.trayHalf + 0.8
const THICK = 1.7

/**
 * The diorama base: a clean rounded-rectangle slab like the reference — a
 * cream promenade rim on top, warm brown soil sides with a soft bevelled edge,
 * darker toward the bottom. The city ground plane sits on top of it.
 */
function makeSoilSlab(): THREE.BufferGeometry {
  const cr = 1.3 // corner radius
  const s = new THREE.Shape()
  s.moveTo(-HALF + cr, -HALF)
  s.lineTo(HALF - cr, -HALF)
  s.quadraticCurveTo(HALF, -HALF, HALF, -HALF + cr)
  s.lineTo(HALF, HALF - cr)
  s.quadraticCurveTo(HALF, HALF, HALF - cr, HALF)
  s.lineTo(-HALF + cr, HALF)
  s.quadraticCurveTo(-HALF, HALF, -HALF, HALF - cr)
  s.lineTo(-HALF, -HALF + cr)
  s.quadraticCurveTo(-HALF, -HALF, -HALF + cr, -HALF)

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: THICK,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.22,
    bevelSegments: 2,
    steps: 1,
  })
  geo.rotateX(-Math.PI / 2) // shape XY → ground XZ, extrude → +Y
  geo.translate(0, -THICK, 0) // top face at y≈0, bottom at ≈ -THICK

  const pos = geo.attributes.position as THREE.BufferAttribute
  const nrm = geo.attributes.normal as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  const cRim = new THREE.Color('#efe9dc') // cream promenade rim (top)
  const cSoilHi = new THREE.Color('#8a6a45') // warm soil just under the rim
  const cSoilLo = new THREE.Color('#55402b') // darker soil toward the bottom
  const cDark = new THREE.Color('#33281d') // hidden underside
  const tmp = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    const ny = nrm.getY(i)
    const j = hash3(Math.round(pos.getX(i)), 0, Math.round(pos.getZ(i))) - 0.5
    if (ny > 0.55) {
      tmp.copy(cRim) // flat top → cream rim
    } else if (ny < -0.55) {
      tmp.copy(cDark) // bottom
    } else {
      const t = THREE.MathUtils.clamp(-y / THICK, 0, 1) // 0 top edge → 1 bottom
      tmp.lerpColors(cSoilHi, cSoilLo, t)
    }
    tmp.offsetHSL(0, 0, j * 0.05)
    colors[i * 3] = tmp.r
    colors[i * 3 + 1] = tmp.g
    colors[i * 3 + 2] = tmp.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

/** The floating diorama base: a clean cream-rimmed soil slab. */
export default function FloatingBase() {
  const geo = useMemo(() => makeSoilSlab(), [])
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }),
    [],
  )
  return <mesh geometry={geo} material={mat} castShadow receiveShadow />
}
