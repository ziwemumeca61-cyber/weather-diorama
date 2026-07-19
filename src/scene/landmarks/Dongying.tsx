import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'

/**
 * 东营 Dongying — the Yellow River delta oil city: nodding pumpjacks over
 * the fields, storage tanks, and the famous "red carpet" seepweed marsh
 * with reeds and cranes where the river meets the sea.
 */

/** A nodding-donkey pumpjack; the walking beam rocks continuously. */
function Pumpjack({ position, yaw, phase }: { position: [number, number, number]; yaw: number; phase: number }) {
  const beamRef = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (beamRef.current) beamRef.current.rotation.z = Math.sin(clock.elapsedTime * 1.1 + phase) * 0.22
  })
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* concrete pad */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[1.6, 0.1, 0.9]} />
        <meshStandardMaterial color={'#b9b4a8'} roughness={0.9} />
      </mesh>
      {/* A-frame samson post */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.62, s * 0.18]} rotation={[s * 0.24, 0, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.05, 1.15, 6]} />
          <meshStandardMaterial color={'#c9483a'} roughness={0.6} />
        </mesh>
      ))}
      {/* walking beam with horsehead, pivoting on the post */}
      <group ref={beamRef} position={[0, 1.16, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.5, 0.09, 0.12]} />
          <meshStandardMaterial color={'#c9483a'} roughness={0.6} />
        </mesh>
        {/* horsehead */}
        <mesh position={[0.78, -0.04, 0]} rotation={[0, 0, -0.2]} castShadow>
          <boxGeometry args={[0.16, 0.32, 0.2]} />
          <meshStandardMaterial color={'#d7cf42'} roughness={0.6} />
        </mesh>
        {/* counterweight */}
        <mesh position={[-0.68, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.1, 10]} />
          <meshStandardMaterial color={'#3d434a'} roughness={0.7} />
        </mesh>
      </group>
      {/* motor block + wellhead */}
      <mesh position={[-0.5, 0.22, 0]} castShadow>
        <boxGeometry args={[0.4, 0.24, 0.3]} />
        <meshStandardMaterial color={'#4a525a'} roughness={0.7} />
      </mesh>
      <mesh position={[0.78, 0.22, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.34, 6]} />
        <meshStandardMaterial color={'#5d646c'} roughness={0.6} />
      </mesh>
    </group>
  )
}

/** White oil-storage tank pair with a catwalk. */
function Tanks({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.6)
  return (
    <group position={position}>
      {[[-0.55, 0.42], [0.55, 0.36]].map(([x, r], i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh position={[0, 0.42, 0]} castShadow>
            <cylinderGeometry args={[r, r, 0.84, 18]} />
            <meshStandardMaterial ref={glow} color={'#e8e6e0'} roughness={0.5} emissive={'#ffd9a0'} emissiveIntensity={0.02} />
          </mesh>
          <mesh position={[0, 0.86, 0]}>
            <cylinderGeometry args={[r * 0.98, r, 0.06, 18]} />
            <meshStandardMaterial color={'#c7c4bc'} roughness={0.6} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[0.5, 0.03, 0.14]} />
        <meshStandardMaterial color={'#9aa0a8'} metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  )
}

/**
 * The seepweed "red carpet" on the mudflat by the river mouth, with a reed
 * fringe and a pair of red-crowned cranes.
 */
function RedMarsh({ position }: { position: [number, number, number] }) {
  const patches = useMemo(() => {
    let a = 90210
    const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    return Array.from({ length: 16 }).map(() => ({
      x: (rnd() - 0.5) * 4.2,
      z: (rnd() - 0.5) * 1.8,
      r: 0.25 + rnd() * 0.5,
      c: ['#b23a2e', '#c14a34', '#9c3128', '#c9573d'][Math.floor(rnd() * 4)],
    }))
  }, [])
  const reeds = useMemo(() => {
    let a = 424242
    const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    return Array.from({ length: 22 }).map(() => ({
      x: (rnd() - 0.5) * 4.4,
      z: 0.9 + rnd() * 0.5,
      h: 0.3 + rnd() * 0.3,
      lean: (rnd() - 0.5) * 0.3,
    }))
  }, [])
  return (
    <group position={position}>
      {patches.map((p, i) => (
        <mesh key={i} position={[p.x, 0.03, p.z]} scale={[p.r, 0.04, p.r * 0.7]}>
          <sphereGeometry args={[1, 10, 6]} />
          <meshStandardMaterial color={p.c} roughness={0.95} />
        </mesh>
      ))}
      {reeds.map((r, i) => (
        <group key={i} position={[r.x, 0, r.z]} rotation={[0, 0, r.lean]}>
          <mesh position={[0, r.h / 2, 0]}>
            <cylinderGeometry args={[0.012, 0.02, r.h, 4]} />
            <meshStandardMaterial color={'#b9a86a'} roughness={0.9} />
          </mesh>
          <mesh position={[0, r.h + 0.06, 0]}>
            <coneGeometry args={[0.035, 0.14, 5]} />
            <meshStandardMaterial color={'#d9c98a'} roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* red-crowned cranes */}
      {[[-0.8, 0.5, 0.3], [0.6, 0.4, -0.5]].map(([x, z, yaw], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, yaw, 0]}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshStandardMaterial color={'#f2f0ea'} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.44, 0.07]} rotation={[0.5, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.025, 0.2, 5]} />
            <meshStandardMaterial color={'#f2f0ea'} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.54, 0.12]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshStandardMaterial color={'#e8e5de'} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.585, 0.12]}>
            <sphereGeometry args={[0.015, 6, 6]} />
            <meshStandardMaterial color={'#d03a2a'} roughness={0.6} />
          </mesh>
          {[0.03, -0.03].map((dx) => (
            <mesh key={dx} position={[dx, 0.12, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.24, 4]} />
              <meshStandardMaterial color={'#3a3a3a'} roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

/** Dongying — pumpjacks, tanks and the red-carpet delta marsh. */
export default function DongyingLandmarks() {
  return (
    <group>
      {/* the derricks stand ~40% larger so they read over the low delta town */}
      <group scale={1.4}>
        <Pumpjack position={[-2.4, 0, -2.4]} yaw={0.5} phase={0} />
        <Pumpjack position={[-1.1, 0, -3.2]} yaw={-0.3} phase={2.1} />
        <Pumpjack position={[2.4, 0, -2.7]} yaw={0.15} phase={4.2} />
        <Tanks position={[1.0, 0, -3.4]} />
      </group>
      {/* mudflat marsh along the riverbank (river z0 = 6.6) */}
      <RedMarsh position={[-0.6, 0, 5.6]} />
    </group>
  )
}
