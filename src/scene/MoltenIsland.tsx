import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CITY } from './cityData'

// The island hangs from the underside of the thin base slab and tapers to a
// jagged point. Widest ring tucks just under the slab lip so the seam is hidden.
const TOP_R = CITY.trayHalf + 0.6 // ≈ slab half-extent, sits under the lip
const HEIGHT = 6.0 // how far the rock reaches down (chunky mountain, not a spike)
const TOP_Y = -0.35 // just below the (thinned) slab

/**
 * Glowing molten-amber crack network on near-black rock, used as the emissive
 * map. Bright veins map into the crevices; the dark field stays cold stone.
 */
function makeMoltenTexture(): THREE.Texture {
  const S = 1024
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  // dim warm ember base so the whole mass glows faintly amber, not pure black
  const bg = g.createLinearGradient(0, 0, 0, S)
  bg.addColorStop(0, '#3a1608')
  bg.addColorStop(0.5, '#2a0f05')
  bg.addColorStop(1, '#1c0a03')
  g.fillStyle = bg
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

  for (let i = 0; i < 40; i++) {
    drawVein(rnd() * S, -20 + rnd() * 60, 60 + rnd() * 40, rnd() - 0.5, 2 + rnd() * 3)
  }
  // a few bright horizontal molten seams
  for (let i = 0; i < 8; i++) {
    const y = rnd() * S
    g.strokeStyle = `rgba(255,${140 + rnd() * 80},40,${0.5 + rnd() * 0.4})`
    g.lineWidth = 1 + rnd() * 2.5
    g.beginPath()
    g.moveTo(0, y)
    for (let x = 0; x <= S; x += 32) g.lineTo(x, y + (rnd() - 0.5) * 24)
    g.stroke()
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

/** Deterministic layered-trig "value noise" for craggy rock displacement. */
function craggy(ang: number, ny: number): number {
  const ridges =
    Math.sin(ang * 6) * 0.5 + Math.sin(ang * 11 + 1.3) * 0.3 + Math.sin(ang * 19 + 2.1) * 0.2
  const vert = Math.sin(ny * 7 + ang * 3) * 0.35 + Math.sin(ny * 15 + 0.7) * 0.2
  return ridges * 0.7 + vert * 0.4
}

function makeIslandGeometry(): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(TOP_R, HEIGHT, 72, 40, false)
  // Cone default: apex at +y, base circle at -y. Flip so the wide ring is on
  // top and the point hangs down, then drop the top ring to TOP_Y.
  geo.scale(1, -1, 1)
  geo.translate(0, -HEIGHT / 2 + TOP_Y, 0)

  const pos = geo.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const r0 = Math.hypot(v.x, v.z)
    const ny = (TOP_Y - v.y) / HEIGHT // 0 at top, 1 at bottom point
    const ang = Math.atan2(v.z, v.x)
    // keep the top ~12% almost undisturbed so it tucks flush under the slab
    const gate = THREE.MathUtils.smoothstep(ny, 0.0, 0.14)
    const amp = (0.6 + ny * 1.7) * gate
    const n = craggy(ang, ny)
    if (r0 > 1e-3) {
      const nr = Math.max(0.02, r0 + n * amp)
      v.x *= nr / r0
      v.z *= nr / r0
    }
    // jagged vertical wobble, strongest toward the hanging tip
    v.y -= (Math.sin(ang * 9 + ny * 6) * 0.25 + n * 0.15) * gate * (0.4 + ny)
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
  const shardGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), [])
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
    const glow = 1.15 + Math.sin(t * 0.9) * 0.35 + Math.sin(t * 2.3) * 0.12
    if (matRef.current) matRef.current.emissiveIntensity = glow
    if (lightRef.current) lightRef.current.intensity = 5 + glow * 3
    shards.forEach((s, i) => {
      const m = shardRefs.current[i]
      if (!m) return
      m.rotation.y += s.spin * 0.01
      m.position.y = s.pos[1] + Math.sin(t * 0.6 + i) * 0.25
    })
  })

  return (
    <group>
      {/* main hanging molten rock mass */}
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial
          ref={matRef}
          color={'#4a2c16'}
          roughness={0.9}
          metalness={0.2}
          emissive={'#ff8a20'}
          emissiveMap={molten}
          emissiveIntensity={1.4}
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
            color={'#3a2214'}
            roughness={0.88}
            metalness={0.2}
            emissive={'#ff9a2c'}
            emissiveMap={molten}
            emissiveIntensity={1.05}
          />
        </mesh>
      ))}
    </group>
  )
}
