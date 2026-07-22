import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CITY } from './cityData'

// The island hangs from the underside of the thin base slab and tapers to a
// jagged point. Widest ring tucks just under the slab lip so the seam is hidden.
const SLAB_HALF = CITY.trayHalf + 0.8 // matches the base slab's half-extent
const TOP_R = CITY.trayHalf + 0.6 // cone's raw top radius (reshaped below)
const HEIGHT = 6.0 // how far the rock reaches down (chunky mountain, not a spike)
const TOP_Y = -0.4 // rock's top ring seats at the slab's underside (its lid)

/** Rounded-square (superellipse) radius at a given angle — matches the slab. */
function squircleR(ang: number, half: number, n = 8): number {
  const c = Math.abs(Math.cos(ang))
  const s = Math.abs(Math.sin(ang))
  return half / Math.pow(Math.pow(c, n) + Math.pow(s, n), 1 / n)
}

/**
 * Glowing molten-amber crack network on near-black rock, used as the emissive
 * map. Bright veins map into the crevices; the dark field stays cold stone.
 */
function makeMoltenTexture(): THREE.Texture {
  const S = 1024
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  // pure black field: the emissive map only lights the lava, so the rock keeps
  // its natural (non-emissive) stone colour everywhere else
  g.fillStyle = '#000000'
  g.fillRect(0, 0, S, S)

  let a = 90125
  const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)

  // Branching molten veins that run mostly downward (V axis = rock height).
  const drawVein = (x0: number, y0: number, len: number, dir: number, width: number) => {
    let x = x0
    let y = y0
    for (let i = 0; i < len; i++) {
      const nx = x + (rnd() - 0.5) * 26 + dir * 4
      const ny = y + 8 + rnd() * 10
      const grad = g.createLinearGradient(x, y, nx, ny)
      grad.addColorStop(0, 'rgba(255,214,110,0.95)') // gold core
      grad.addColorStop(1, 'rgba(255,140,30,0.9)') // amber
      g.strokeStyle = grad
      g.lineWidth = width * (0.5 + rnd() * 0.8)
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(nx, ny)
      g.stroke()
      // occasional glowing pool at a joint
      if (rnd() < 0.16) {
        g.fillStyle = 'rgba(255,220,120,0.85)'
        g.beginPath()
        g.arc(nx, ny, width * (0.8 + rnd()), 0, Math.PI * 2)
        g.fill()
      }
      x = nx
      y = ny
      if (y > S) break
    }
  }

  // Lava is localized: a handful of hot patches, each a glowing pool with a
  // small cluster of veins branching out of it. Most of the rock stays dark.
  const hotspots = 7
  for (let h = 0; h < hotspots; h++) {
    const hx = rnd() * S
    const hy = rnd() * S
    // molten pool: a soft radial glow
    const R = 24 + rnd() * 40
    const pool = g.createRadialGradient(hx, hy, 0, hx, hy, R)
    pool.addColorStop(0, 'rgba(255,225,140,0.95)')
    pool.addColorStop(0.4, 'rgba(255,150,40,0.75)')
    pool.addColorStop(1, 'rgba(120,40,8,0)')
    g.fillStyle = pool
    g.beginPath()
    g.arc(hx, hy, R, 0, Math.PI * 2)
    g.fill()
    // a few veins creeping out of the pool
    const veins = 2 + Math.floor(rnd() * 3)
    for (let v = 0; v < veins; v++) {
      drawVein(hx + (rnd() - 0.5) * R, hy + (rnd() - 0.5) * R, 8 + rnd() * 12, rnd() - 0.5, 1.5 + rnd() * 2)
    }
  }

  // soft bloom pass so the veins read as hot, not hairline
  g.globalCompositeOperation = 'lighter'
  g.filter = 'blur(4px)'
  g.drawImage(c, 0, 0)
  g.filter = 'none'
  g.globalCompositeOperation = 'source-over'

  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 4
  return t
}

/** Mottled grey stone: speckles and dark cracks so the rock has surface detail
 *  and doesn't read as flat facets. Used as both colour and bump map. */
function makeRockTexture(): THREE.CanvasTexture {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#6d685f'
  g.fillRect(0, 0, S, S)
  let a = 20240
  const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  // mottled patches, light and dark
  for (let i = 0; i < 900; i++) {
    const x = rnd() * S
    const y = rnd() * S
    const r = 2 + rnd() * 22
    const l = 60 + Math.floor(rnd() * 70)
    g.fillStyle = `rgba(${l},${l - 4},${l - 10},${0.05 + rnd() * 0.12})`
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
  }
  // thin dark cracks
  g.strokeStyle = 'rgba(30,26,22,0.5)'
  for (let i = 0; i < 60; i++) {
    g.lineWidth = 0.6 + rnd() * 1.6
    let x = rnd() * S
    let y = rnd() * S
    g.beginPath()
    g.moveTo(x, y)
    for (let k = 0; k < 5; k++) {
      x += (rnd() - 0.5) * 60
      y += (rnd() - 0.5) * 60
      g.lineTo(x, y)
    }
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(5, 5)
  t.anisotropy = 4
  return t
}

/** Craggy displacement: angular ridges plus irregular spatial noise (uses the
 *  world x/z so the bumps break the cone's radial symmetry and read as rock). */
function craggy(ang: number, ny: number, x: number, z: number): number {
  const ridges =
    Math.sin(ang * 6) * 0.5 + Math.sin(ang * 11 + 1.3) * 0.3 + Math.sin(ang * 19 + 2.1) * 0.2
  const vert = Math.sin(ny * 7 + ang * 3) * 0.35 + Math.sin(ny * 15 + 0.7) * 0.2
  // irregular lumps from incommensurate spatial waves
  const spatial =
    Math.sin(x * 1.7 + z * 1.3) * 0.32 +
    Math.sin(x * 3.1 - z * 2.7 + 1.1) * 0.18 +
    Math.sin(x * 6.3 + z * 5.1 + 2.3) * 0.1
  return ridges * 0.6 + vert * 0.35 + spatial
}

function makeIslandGeometry(): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(TOP_R, HEIGHT, 90, 44, false)
  // Cone default: apex at +y, base circle at -y. Flip with a ROTATION (not a
  // negative scale — that mirrors the geometry and inverts the face winding,
  // which makes single-sided rendering cull the outer surface and show a
  // see-through "net"). Rotating keeps the winding correct → solid exterior.
  geo.rotateX(Math.PI)
  geo.translate(0, -HEIGHT / 2 + TOP_Y, 0)

  const pos = geo.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const r0 = Math.hypot(v.x, v.z)
    const ny = (TOP_Y - v.y) / HEIGHT // 0 at top, 1 at bottom point
    const ang = Math.atan2(v.z, v.x)
    const gate = THREE.MathUtils.smoothstep(ny, 0.0, 0.14)
    // GENTLE outward-only bumps (a small fraction of the local radius) keep the
    // mass star-convex — no steep back-facing triangles, so single-sided
    // rendering shows a solid rock with no see-through holes or "net".
    const amp = (0.28 + ny * 0.5) * gate
    const n = craggy(ang, ny, v.x, v.z) // ~[-1.1, 1.1]
    if (r0 > 1e-3) {
      const bump = (n * 0.4 + 0.5) * amp // biased outward, small
      const craggyR = r0 + Math.max(0, bump)
      // near the top, blend to a rounded-square profile matching the slab
      const sqR = squircleR(ang, SLAB_HALF + 0.02)
      const topFactor = 1 - THREE.MathUtils.smoothstep(ny, 0.02, 0.3)
      const nr = THREE.MathUtils.lerp(craggyR, sqR, topFactor)
      v.x *= nr / r0
      v.z *= nr / r0
    }
    // gently lengthen the hanging tip downward only
    v.y -= Math.max(0, n) * 0.12 * gate * (0.4 + ny)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

interface Shard {
  pos: [number, number, number]
  scale: number
  rot: [number, number, number]
  spin: number
}

export default function MoltenIsland() {
  const geo = useMemo(makeIslandGeometry, [])
  const molten = useMemo(makeMoltenTexture, [])
  const rock = useMemo(makeRockTexture, [])
  const shardGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), [])
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const shardRefs = useRef<(THREE.Mesh | null)[]>([])

  const shards = useMemo<Shard[]>(() => {
    let a = 7
    const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    return Array.from({ length: 7 }).map(() => {
      const ang = rnd() * Math.PI * 2
      const rad = 5 + rnd() * 6
      return {
        pos: [Math.cos(ang) * rad, -3.5 - rnd() * 5, Math.sin(ang) * rad],
        scale: 0.4 + rnd() * 1.1,
        rot: [rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI],
        spin: (rnd() - 0.5) * 0.3,
      }
    })
  }, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // slow breathing glow, like cooling and reheating magma
    const glow = 0.9 + Math.sin(t * 0.9) * 0.28 + Math.sin(t * 2.3) * 0.1
    if (matRef.current) matRef.current.emissiveIntensity = glow
    if (lightRef.current) lightRef.current.intensity = 4 + glow * 2.5
    shards.forEach((s, i) => {
      const m = shardRefs.current[i]
      if (!m) return
      m.rotation.y += s.spin * 0.01
      m.position.y = s.pos[1] + Math.sin(t * 0.6 + i) * 0.25
    })
  })

  return (
    <group>
      {/* main hanging molten rock mass — smooth-shaded stone with a rock texture
          so it reads as solid rock, not a triangulated net */}
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial
          ref={matRef}
          color={'#7a746a'}
          map={rock}
          bumpMap={rock}
          bumpScale={0.12}
          roughness={0.98}
          metalness={0.08}
          emissive={'#ff8a20'}
          emissiveMap={molten}
          emissiveIntensity={1.3}
        />
      </mesh>

      {/* warm underglow from the molten core — kept close so it doesn't wash
          the city above the slab */}
      <pointLight ref={lightRef} position={[0, -3.6, 0]} color={'#ff8a24'} intensity={7} distance={13} decay={2.4} />

      {/* floating rock shards for the suspended feel */}
      {shards.map((s, i) => (
        <mesh
          key={i}
          ref={(el) => (shardRefs.current[i] = el)}
          geometry={shardGeo}
          position={s.pos}
          rotation={s.rot}
          scale={s.scale}
          castShadow
        >
          <meshStandardMaterial
            color={'#726c62'}
            map={rock}
            bumpMap={rock}
            bumpScale={0.1}
            roughness={0.95}
            metalness={0.12}
            emissive={'#ff9a2c'}
            emissiveMap={molten}
            emissiveIntensity={1.2}
          />
        </mesh>
      ))}
    </group>
  )
}
