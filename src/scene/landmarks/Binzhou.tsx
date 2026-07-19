import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'

/**
 * 滨州 Binzhou — birthplace of Sun Tzu: the 孙子兵法城 fortress-hall of the
 * Art of War rising on a rammed-earth rampart, a ring of war-drum towers,
 * and the Yellow-River-delta windmills turning on the plain.
 */

/** The Art-of-War hall: a fortress terrace carrying a broad ceremonial hall. */
function SunziFort({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.0)
  const tileTex = useMemo(() => makeTileTexture('#6f6a5a', '#524d40'), [])
  const roofMat = useMemo(() => glazedRoofMaterial(tileTex, 2.4, 1, 0.28), [tileTex])
  const hallRoof = useMemo(() => makeHipRoof(3.4, 2.0, 0.44, 0.4, 0.26), [])
  return (
    <group position={position}>
      {/* rammed-earth rampart, battered */}
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.4, 2.8, 1.4, 6, 1]} />
        <meshStandardMaterial color={'#a8977a'} roughness={0.95} />
      </mesh>
      {/* ramp up the front */}
      <mesh position={[0, 0.35, 2.3]} rotation={[0.5, 0, 0]} castShadow>
        <boxGeometry args={[1.2, 0.16, 1.4]} />
        <meshStandardMaterial color={'#b3a487'} roughness={0.9} />
      </mesh>
      {/* the great hall */}
      <mesh position={[0, 1.85, 0]} castShadow>
        <boxGeometry args={[3.0, 0.9, 1.7]} />
        <meshStandardMaterial ref={glow} color={'#8a4636'} roughness={0.72} emissive={'#ffb066'} emissiveIntensity={0.05} />
      </mesh>
      {/* colonnade across the front */}
      {[-1.2, -0.72, -0.24, 0.24, 0.72, 1.2].map((x) => (
        <mesh key={x} position={[x, 1.7, 0.9]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.86, 8]} />
          <meshStandardMaterial color={'#6a3a2c'} roughness={0.75} />
        </mesh>
      ))}
      <mesh position={[0, 1.32, 0]}>
        <boxGeometry args={[3.3, 0.12, 2.0]} />
        <meshStandardMaterial color={'#c9c2b2'} roughness={0.88} />
      </mesh>
      <mesh geometry={hallRoof} material={roofMat} position={[0, 2.3, 0]} castShadow />
      {/* banner poles on the rampart corners */}
      {[[-2.0, 1.6], [2.0, 1.6], [-2.0, -1.6], [2.0, -1.6]].map(([x, z], i) => (
        <group key={i} position={[x, 1.4, z]}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 1.0, 6]} />
            <meshStandardMaterial color={'#5a4634'} roughness={0.8} />
          </mesh>
          <mesh position={[0.16, 0.78, 0]}>
            <planeGeometry args={[0.3, 0.4]} />
            <meshStandardMaterial ref={glow} color={'#c0392b'} roughness={0.7} side={THREE.DoubleSide} emissive={'#ff5a3a'} emissiveIntensity={0.05} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** A war-drum tower: a big red drum under a little pavilion roof. */
function DrumTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const tileTex = useMemo(() => makeTileTexture('#6f6a5a', '#524d40'), [])
  const roofMat = useMemo(() => glazedRoofMaterial(tileTex, 1.2, 1, 0.25), [tileTex])
  const roof = useMemo(() => makeHipRoof(0.9, 0.9, 0.22, 0.3, 0.3), [])
  return (
    <group position={position}>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <mesh key={i} position={[Math.cos(a) * 0.42, 0.55, Math.sin(a) * 0.42]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 1.1, 6]} />
            <meshStandardMaterial color={'#6a3a2c'} roughness={0.75} />
          </mesh>
        )
      })}
      {/* the drum */}
      <mesh position={[0, 0.7, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.5, 18]} />
        <meshStandardMaterial ref={glow} color={'#b23a2a'} roughness={0.6} emissive={'#ff5a3a'} emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[0, 0.7, 0.255]}>
        <cylinderGeometry args={[0.22, 0.22, 0.02, 18]} />
        <meshStandardMaterial color={'#e8d9b0'} roughness={0.7} />
      </mesh>
      <mesh geometry={roof} material={roofMat} position={[0, 1.2, 0]} castShadow />
    </group>
  )
}

/** Delta windmill: a lattice pumping mill that turns in the plain wind. */
function Windmill({ position, phase }: { position: [number, number, number]; phase: number }) {
  const bladeRef = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (bladeRef.current) bladeRef.current.rotation.z = clock.elapsedTime * 0.8 + phase
  })
  return (
    <group position={position}>
      {/* lattice trestle */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.14, 0.6, 0]} rotation={[0, 0, s * 0.14]}>
          <cylinderGeometry args={[0.025, 0.035, 1.2, 6]} />
          <meshStandardMaterial color={'#8a8f96'} metalness={0.4} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.24, 0.02, 0.02]} />
        <meshStandardMaterial color={'#8a8f96'} metalness={0.4} roughness={0.6} />
      </mesh>
      {/* nacelle + spinning multi-blade rotor */}
      <mesh position={[0, 1.24, 0.06]}>
        <boxGeometry args={[0.12, 0.12, 0.16]} />
        <meshStandardMaterial color={'#c7c4bc'} roughness={0.6} />
      </mesh>
      <group ref={bladeRef} position={[0, 1.24, 0.16]}>
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0]} rotation={[0, 0, a]}>
              <boxGeometry args={[0.4, 0.06, 0.01]} />
              <meshStandardMaterial color={'#e8e6e0'} metalness={0.3} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

/** Binzhou — the Art of War fortress, drum towers and delta windmills. */
export default function BinzhouLandmarks() {
  return (
    <group>
      <group position={[-2.2, 0, -3.4]} rotation={[0, 0.28, 0]} scale={1.2}>
        <SunziFort position={[0, 0, 0]} />
      </group>
      <DrumTower position={[3.4, 0, -0.6]} />
      <DrumTower position={[3.0, 0, 1.4]} />
      <Windmill position={[-3.6, 0, 3.2]} phase={0} />
      <Windmill position={[-2.4, 0, 4.0]} phase={1.6} />
    </group>
  )
}
