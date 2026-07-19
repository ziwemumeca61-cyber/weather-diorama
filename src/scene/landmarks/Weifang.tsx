import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'

/**
 * 潍坊 Weifang — the kite capital: a sky full of kites over the plaza, a
 * long dragon kite snaking overhead, and 渤海之眼 — the world's largest
 * spokeless Ferris wheel — standing on its lattice frame by the river.
 */

/** A diamond kite on a string, swaying in a lazy figure-eight. */
function Kite({
  anchor,
  color,
  height,
  phase,
}: {
  anchor: [number, number, number]
  color: string
  height: number
  phase: number
}) {
  const ref = useRef<THREE.Group>(null)
  const lineRef = useRef<THREE.Mesh>(null)
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  useFrame(({ clock }) => {
    if (!ref.current || !lineRef.current) return
    const t = clock.elapsedTime * 0.5 + phase
    const x = anchor[0] + Math.sin(t) * 0.7
    const y = anchor[1] + height + Math.sin(t * 2) * 0.25
    const z = anchor[2] + Math.cos(t * 0.8) * 0.5
    ref.current.position.set(x, y, z)
    ref.current.rotation.set(0.35 + Math.sin(t * 2) * 0.12, Math.sin(t) * 0.4, Math.sin(t * 1.3) * 0.18)
    // stretch the string from anchor to kite
    tmp.set(x - anchor[0], y - anchor[1], z - anchor[2])
    const len = tmp.length()
    lineRef.current.position.set(anchor[0] + tmp.x / 2, anchor[1] + tmp.y / 2, anchor[2] + tmp.z / 2)
    q.setFromUnitVectors(up, tmp.normalize())
    lineRef.current.quaternion.copy(q)
    lineRef.current.scale.set(1, len, 1)
  })
  return (
    <group>
      <mesh ref={lineRef}>
        <cylinderGeometry args={[0.006, 0.006, 1, 3]} />
        <meshStandardMaterial color={'#d8d5cc'} roughness={0.8} transparent opacity={0.5} />
      </mesh>
      <group ref={ref}>
        {/* diamond sail (two triangles) */}
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[0.42, 0.42]} />
          <meshStandardMaterial color={color} roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
        {/* tail ribbons */}
        {[0, 1, 2].map((k) => (
          <mesh key={k} position={[0, -0.4 - k * 0.16, 0]} rotation={[0, 0, 0.3 * (k % 2 ? 1 : -1)]}>
            <planeGeometry args={[0.07, 0.12]} />
            <meshStandardMaterial color={k % 2 ? '#f2e04a' : color} roughness={0.7} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** The long dragon kite: a head plate and a chain of discs undulating. */
function DragonKite({ anchor }: { anchor: [number, number, number] }) {
  const N = 12
  const refs = useRef<(THREE.Group | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.7
    for (let i = 0; i < N; i++) {
      const g = refs.current[i]
      if (!g) continue
      const s = i / (N - 1)
      g.position.set(
        anchor[0] + Math.sin(t * 0.6) * 0.8 - s * 2.6,
        anchor[1] + 3.4 + Math.sin(t + s * 4.4) * (0.3 + s * 0.35),
        anchor[2] + Math.cos(t * 0.5 + s * 2.4) * (0.4 + s * 0.4),
      )
      g.rotation.z = Math.sin(t + s * 4.4) * 0.4
    }
  })
  return (
    <group>
      {Array.from({ length: N }).map((_, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          {i === 0 ? (
            // dragon head
            <mesh rotation={[0, 0.3, 0]}>
              <boxGeometry args={[0.34, 0.3, 0.1]} />
              <meshStandardMaterial color={'#d0392b'} roughness={0.6} />
            </mesh>
          ) : (
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.13, 0.13, 0.02, 12]} />
              <meshStandardMaterial
                color={i % 2 ? '#e8b73a' : '#3f9e58'}
                roughness={0.6}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

/** 渤海之眼: spokeless wheel — a giant free-standing ring on a lattice frame. */
function SpokelessWheel({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.6)
  const R = 3.0
  const CY = 3.5
  const cabinRefs = useRef<(THREE.Group | null)[]>([])
  const angle = useRef(0)
  const CABINS = 10
  useFrame((_, dt) => {
    // cabins crawl around the inside of the fixed ring (no hub, no spokes)
    angle.current += dt * 0.1
    for (let i = 0; i < CABINS; i++) {
      const g = cabinRefs.current[i]
      if (!g) continue
      const a = angle.current + (i / CABINS) * Math.PI * 2
      g.position.set(Math.cos(a) * (R - 0.28), CY + Math.sin(a) * (R - 0.28), 0)
    }
  })
  return (
    <group position={position} rotation={[0, 0.24, 0]}>
      {/* the ring (double rim + inner track) */}
      {[-0.16, 0.16].map((zc) => (
        <mesh key={zc} position={[0, CY, zc]}>
          <torusGeometry args={[R, 0.09, 10, 64]} />
          <meshStandardMaterial
            ref={glow}
            color={'#dfe5ec'}
            metalness={0.6}
            roughness={0.35}
            emissive={'#66c7ff'}
            emissiveIntensity={0.06}
          />
        </mesh>
      ))}
      <mesh position={[0, CY, 0]}>
        <torusGeometry args={[R - 0.16, 0.05, 8, 64]} />
        <meshStandardMaterial color={'#b9c2cc'} metalness={0.55} roughness={0.4} />
      </mesh>
      {/* lattice support frame rising to grip the ring low on both sides */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 1.7, 1.4, 0]} rotation={[0, 0, s * -0.55]} castShadow>
            <boxGeometry args={[0.22, 3.4, 0.6]} />
            <meshStandardMaterial color={'#cfd6dd'} metalness={0.5} roughness={0.5} />
          </mesh>
          {[0.7, 1.5, 2.3].map((y) => (
            <mesh key={y} position={[s * (2.1 - y * 0.5), y, 0]} rotation={[0, 0, s * 0.8]}>
              <boxGeometry args={[0.08, 0.7, 0.5]} />
              <meshStandardMaterial color={'#b9c2cc'} metalness={0.5} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
      {/* saddle where the frame meets the ring */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 2.2, 2.4, 0]} castShadow>
          <boxGeometry args={[0.5, 0.4, 0.66]} />
          <meshStandardMaterial color={'#aab4be'} metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      {/* cabins riding the inner track */}
      {Array.from({ length: CABINS }).map((_, i) => (
        <group key={i} ref={(el) => (cabinRefs.current[i] = el)}>
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.24, 0.34]} />
            <meshStandardMaterial
              ref={glow}
              color={'#5fa8d8'}
              roughness={0.4}
              metalness={0.3}
              emissive={'#7ad0ff'}
              emissiveIntensity={0.05}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Weifang — the spokeless wheel and a sky of kites over the plaza. */
export default function WeifangLandmarks() {
  return (
    <group>
      <SpokelessWheel position={[-2.4, 0, -4.2]} />
      {/* kite plaza in the front-right block */}
      <Kite anchor={[3.2, 0.1, 0.8]} color={'#d0392b'} height={2.6} phase={0} />
      <Kite anchor={[2.4, 0.1, 1.8]} color={'#3a7fd0'} height={3.3} phase={2.2} />
      <Kite anchor={[4.0, 0.1, 1.6]} color={'#3f9e58'} height={2.1} phase={4.4} />
      <DragonKite anchor={[3.6, 0.1, -0.6]} />
    </group>
  )
}
