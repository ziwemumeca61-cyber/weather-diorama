import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CITY } from './cityData'

/* deterministic value noise, keyed on rounded position (seam-safe) */
function hash3(x: number, y: number, z: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return h - Math.floor(h)
}
function noise3(x: number, y: number, z: number): number {
  const a = hash3(Math.round(x) , Math.round(y), Math.round(z))
  const b = hash3(Math.round(x * 3) / 3, Math.round(y * 3) / 3, Math.round(z * 3) / 3)
  return a * 0.78 + b * 0.22 // low-frequency dominant → broad lumps, not spikes
}

const TRAY_BOTTOM = -1.4

/**
 * The underside of the floating island: a craggy chunk of earth torn from the
 * ground, tapering to a rocky point below the tray. Vertex-coloured from mossy
 * dirt at the rim through granite to dark rock at the tip; seam-safe noise.
 */
function makeUnderside(): THREE.BufferGeometry {
  const R = CITY.trayHalf + 0.55 // meet the tray edge so rock hugs the rim
  const H = 7.6
  const geo = new THREE.ConeGeometry(R, H, 40, 16, false)
  geo.rotateX(Math.PI) // apex points down
  geo.translate(0, TRAY_BOTTOM - H / 2, 0) // base ring at the tray bottom

  const pos = geo.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  const cMoss = new THREE.Color('#73824d')
  const cDirt = new THREE.Color('#8a6743')
  const cRock = new THREE.Color('#7c756a')
  const cDark = new THREE.Color('#4a453f')
  const tmp = new THREE.Color()
  const apexY = TRAY_BOTTOM - H

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    // f: 0 at the rim (top), 1 at the apex (bottom)
    const f = THREE.MathUtils.clamp((TRAY_BOTTOM - y) / H, 0, 1)
    const len = Math.hypot(x, z) || 1
    const n = noise3(x + 5, y * 0.6, z - 5)
    const ridge = noise3(x * 0.4 - 3, y * 0.2, z * 0.4 + 3)
    // gentle craggy radial displacement — broad lumps, fading near rim and apex
    const amp = (0.07 + ridge * 0.14) * R * Math.sin(Math.min(f, 1) * Math.PI)
    const d = (n - 0.5) * 2 * amp
    const ny = y + (n - 0.5) * 0.3 * (1 - f) - f * 0.2 // mild tip stretch
    pos.setXYZ(i, x + (x / len) * d, Math.max(apexY - 0.3, ny), z + (z / len) * d)

    // colour bands: earthy dirt just under the rim → granite → dark tip
    if (f < 0.06) tmp.copy(cMoss)
    else if (f < 0.3) tmp.lerpColors(cDirt, cRock, (f - 0.06) / 0.24)
    else tmp.lerpColors(cRock, cDark, (f - 0.3) / 0.7)
    tmp.offsetHSL((n - 0.5) * 0.02, 0, (n - 0.5) * 0.07) // subtle per-face jitter
    colors[i * 3] = tmp.r
    colors[i * 3 + 1] = tmp.g
    colors[i * 3 + 2] = tmp.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

/** A small detached rock that drifts and slowly turns near the island. */
function DriftRock({ seed }: { seed: number }) {
  const ref = useRef<THREE.Group>(null)
  const cfg = useMemo(() => {
    const r = (n: number) => {
      const v = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453
      return v - Math.floor(v)
    }
    const ang = r(1) * Math.PI * 2
    const rad = 8.5 + r(2) * 4
    return {
      x: Math.cos(ang) * rad,
      z: Math.sin(ang) * rad,
      y: TRAY_BOTTOM - 2 - r(3) * 5,
      s: 0.4 + r(4) * 0.7,
      spin: (r(5) - 0.5) * 0.3,
      bobA: 0.15 + r(6) * 0.2,
      bobP: r(7) * Math.PI * 2,
    }
  }, [seed])
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    const t = clock.elapsedTime
    g.rotation.y += cfg.spin * 0.01
    g.position.y = cfg.y + Math.sin(t * 0.4 + cfg.bobP) * cfg.bobA
  })
  return (
    <group ref={ref} position={[cfg.x, cfg.y, cfg.z]} scale={cfg.s} rotation={[cfg.spin, 0, cfg.spin * 0.5]}>
      <mesh castShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={'#5f6163'} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 0.35, 0]} scale={[1.05, 0.4, 1.05]}>
        <dodecahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial color={'#6f7d4e'} roughness={0.95} flatShading />
      </mesh>
    </group>
  )
}

/** Thin hanging vines/roots dangling from the island's rim. */
function Vines() {
  const vines = useMemo(() => {
    let a = 33
    const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    const R = CITY.trayHalf + 0.2
    return Array.from({ length: 20 }).map(() => {
      const th = rnd() * Math.PI * 2
      return {
        x: Math.cos(th) * R,
        z: Math.sin(th) * R,
        len: 0.8 + rnd() * 2.2,
        lean: (rnd() - 0.5) * 0.3,
        c: rnd() > 0.5 ? '#5a6f3e' : '#6b5636',
      }
    })
  }, [])
  return (
    <group>
      {vines.map((v, i) => (
        <mesh key={i} position={[v.x, TRAY_BOTTOM - v.len / 2 + 0.2, v.z]} rotation={[v.lean, 0, v.lean]}>
          <cylinderGeometry args={[0.02, 0.05, v.len, 4]} />
          <meshStandardMaterial color={v.c} roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

/** Slow-drifting mist wisps hanging in the air below the island. */
function DriftMist() {
  const puffs = useMemo(() => {
    let a = 707
    const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    return Array.from({ length: 7 }).map(() => {
      const th = rnd() * Math.PI * 2
      const r = 6 + rnd() * 7
      return {
        x: Math.cos(th) * r,
        z: Math.sin(th) * r,
        y: TRAY_BOTTOM - 2 - rnd() * 6,
        s: 1.6 + rnd() * 1.8,
        p: rnd() * Math.PI * 2,
      }
    })
  }, [])
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    puffs.forEach((pf, i) => {
      const m = refs.current[i]
      if (m) m.position.x = pf.x + Math.sin(t * 0.12 + pf.p) * 1.2
    })
  })
  return (
    <group>
      {puffs.map((pf, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} position={[pf.x, pf.y, pf.z]} scale={[pf.s * 1.8, pf.s * 0.6, pf.s]}>
          <sphereGeometry args={[0.7, 12, 8]} />
          <meshStandardMaterial color={'#eef3f8'} transparent opacity={0.32} roughness={1} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** The floating island's rocky underside, drifting rocks, vines and mist. */
export default function FloatingBase() {
  const geo = useMemo(() => makeUnderside(), [])
  const rockMat = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }),
    [],
  )
  return (
    <group>
      <mesh geometry={geo} material={rockMat} castShadow receiveShadow />
      <Vines />
      {[0, 1, 2, 3, 4].map((i) => (
        <DriftRock key={i} seed={i + 1} />
      ))}
      <DriftMist />
    </group>
  )
}
