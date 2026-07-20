import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CITY } from './cityData'
import type { ResolvedWater } from './water'

/** Vertical streak texture for the falling sheet (scrolled downward). */
function makeFallTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 256
  const g = c.getContext('2d')!
  g.clearRect(0, 0, 128, 256)
  let a = 9911
  const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  for (let i = 0; i < 46; i++) {
    const x = rnd() * 128
    const w = 1 + rnd() * 4
    g.strokeStyle = `rgba(${210 + rnd() * 45}, ${235 + rnd() * 20}, 255, ${0.12 + rnd() * 0.3})`
    g.lineWidth = w
    g.beginPath()
    g.moveTo(x, rnd() * 40)
    g.lineTo(x + (rnd() - 0.5) * 8, 256)
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(3, 1.4)
  return t
}

/** Soft mist puffs (spray at the lip and plunge pool below). */
function Mist({ y, spread, count, scale }: { y: number; spread: number; count: number; scale: number }) {
  const puffs = useMemo(() => {
    let a = Math.floor(y * 97) & 0x7fffffff
    const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    return Array.from({ length: count }).map(() => ({
      x: (rnd() - 0.5) * spread,
      z: (rnd() - 0.5) * 1.4,
      dy: (rnd() - 0.5) * 0.5,
      s: (0.7 + rnd() * 0.8) * scale,
      p: rnd() * Math.PI * 2,
    }))
  }, [y, spread, count, scale])
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    puffs.forEach((pf, i) => {
      const m = refs.current[i]
      if (m) m.position.x = pf.x + Math.sin(t * 0.3 + pf.p) * 0.4
    })
  })
  return (
    <group position={[0, y, 0]}>
      {puffs.map((pf, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} position={[pf.x, pf.dy, pf.z]} scale={[pf.s * 1.5, pf.s, pf.s]}>
          <sphereGeometry args={[0.6, 10, 8]} />
          <meshStandardMaterial color={'#f4f9fd'} transparent opacity={0.55} roughness={1} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * A waterfall spilling off the front (+z) edge of the floating island, where
 * the river reaches the tray rim, plunging into mist below. Only rendered for
 * river cities (lakes sit inland, so nothing spills).
 */
export default function Waterfall({ water }: { water: ResolvedWater }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const tex = useMemo(() => makeFallTexture(), [])
  useFrame((_, dt) => {
    tex.offset.y -= dt * 0.9 // streaks race downward
    if (matRef.current) matRef.current.opacity = 0.72 + Math.sin(performance.now() * 0.004) * 0.06
  })

  if (water.riverZ0 == null) return null
  // spill off the OUTSIDE of the rounded tray rim (which bulges past the water),
  // otherwise the rim would occlude the fall from the camera
  const zEdge = CITY.trayHalf + 1.0
  const W = 12
  const H = 7.2
  return (
    <group position={[0, 0, zEdge]}>
      {/* the falling sheet: tips over the rim, angled slightly outward */}
      <mesh position={[0, -H / 2 + 0.1, 0]} rotation={[0.14, 0, 0]}>
        <planeGeometry args={[W, H, 1, 1]} />
        <meshStandardMaterial
          ref={matRef}
          map={tex}
          color={'#eaf4ff'}
          transparent
          opacity={0.85}
          roughness={0.15}
          metalness={0.35}
          emissive={'#5a8cc0'}
          emissiveIntensity={0.1}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* bright lip where the water tips over the edge */}
      <mesh position={[0, 0.06, -0.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, 1.1]} />
        <meshStandardMaterial color={'#f2f9ff'} transparent opacity={0.82} roughness={0.15} depthWrite={false} />
      </mesh>
      {/* spray at the lip + a billowing mist cloud at the plunge */}
      <Mist y={-0.5} spread={W} count={7} scale={0.85} />
      <Mist y={-H + 0.6} spread={W + 4} count={12} scale={1.7} />
    </group>
  )
}
