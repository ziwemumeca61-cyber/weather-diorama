import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'

/**
 * 大成殿 Dacheng Hall — the double-eaved heart of the Confucius Temple:
 * white terraces, a red colonnade and yellow glazed roofs.
 */
function DachengHall({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.5)
  const tileTex = useMemo(() => makeTileTexture('#caa032', '#a67f22'), [])
  const roofs = useMemo(() => [makeHipRoof(4.0, 2.9, 0.5, 0.28, 0.28), makeHipRoof(3.2, 2.2, 0.5, 0.28, 0.3)], [])
  const mats = useMemo(() => roofs.map((_, i) => glazedRoofMaterial(tileTex, 4 - i, 1.4, 0.32)), [roofs, tileTex])
  return (
    <group position={position}>
      {/* two-step white stone terrace */}
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.6, 0.36, 3.4]} />
        <meshStandardMaterial color={'#d9d5c9'} roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.0, 0.26, 2.9]} />
        <meshStandardMaterial color={'#e4e0d4'} roughness={0.88} />
      </mesh>
      {/* dragon-column colonnade (front row) */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[-1.5 + i * 0.6, 1.1, 1.28]} castShadow>
          <cylinderGeometry args={[0.075, 0.085, 1.0, 10]} />
          <meshStandardMaterial color={'#8f3a28'} roughness={0.6} />
        </mesh>
      ))}
      {/* hall body */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[3.3, 1.05, 2.1]} />
        <meshStandardMaterial ref={glow} color={'#a8402f'} roughness={0.7} emissive={'#ffb066'} emissiveIntensity={0.04} />
      </mesh>
      {/* lower eave */}
      <mesh geometry={roofs[0]} material={mats[0]} position={[0, 1.68, 0]} castShadow />
      {/* clerestory + upper roof */}
      <mesh position={[0, 2.15, 0]} castShadow>
        <boxGeometry args={[2.6, 0.55, 1.6]} />
        <meshStandardMaterial ref={glow} color={'#a8402f'} roughness={0.7} emissive={'#ffb066'} emissiveIntensity={0.04} />
      </mesh>
      <mesh geometry={roofs[1]} material={mats[1]} position={[0, 2.44, 0]} castShadow />
      {/* main ridge with gold end knobs */}
      <mesh position={[0, 2.97, 0]} castShadow>
        <boxGeometry args={[1.1, 0.08, 0.1]} />
        <meshStandardMaterial color={'#8a6b1f'} metalness={0.5} roughness={0.4} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.55, 3.02, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color={'#caa94a'} metalness={0.75} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * 万仞宫墙 — the vermilion city-wall gate before the temple, with its
 * crenellations and gate tower.
 */
function GongQiangGate({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.4)
  const tileTex = useMemo(() => makeTileTexture('#55605a', '#3c4640'), [])
  const roof = useMemo(() => makeHipRoof(2.0, 1.2, 0.4, 0.28, 0.26), [])
  const roofMat = useMemo(() => glazedRoofMaterial(tileTex, 2.6, 1.3, 0.25), [tileTex])
  const LEN = 5.0
  return (
    <group position={position}>
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[LEN, 1.4, 1.0]} />
        <meshStandardMaterial ref={glow} color={'#9c3d2c'} roughness={0.85} emissive={'#ff9a5c'} emissiveIntensity={0.02} />
      </mesh>
      {Array.from({ length: 11 }).map((_, i) => (
        <mesh key={i} position={[-LEN / 2 + 0.3 + (i * (LEN - 0.6)) / 10, 1.5, 0.42]} castShadow>
          <boxGeometry args={[0.24, 0.22, 0.12]} />
          <meshStandardMaterial color={'#8a8377'} roughness={0.9} />
        </mesh>
      ))}
      {/* arched gate */}
      <mesh position={[0, 0.44, 0.51]}>
        <boxGeometry args={[0.56, 0.88, 0.04]} />
        <meshStandardMaterial color={'#241c14'} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.88, 0.51]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.04, 14, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={'#241c14'} roughness={0.95} />
      </mesh>
      {/* gate tower */}
      <group position={[0, 1.4, 0]}>
        <mesh position={[0, 0.33, 0]} castShadow>
          <boxGeometry args={[1.7, 0.66, 0.95]} />
          <meshStandardMaterial ref={glow} color={'#a8442f'} roughness={0.7} emissive={'#ffb066'} emissiveIntensity={0.04} />
        </mesh>
        <mesh geometry={roof} material={roofMat} position={[0, 0.66, 0]} castShadow />
      </group>
    </group>
  )
}

/** Qufu — Dacheng Hall behind the 万仞宫墙 gate; the whole town stays low. */
export default function QufuLandmarks() {
  return (
    <group>
      <group position={[-3.2, 0, 0.6]} scale={1.05}>
        <DachengHall position={[0, 0, 0]} />
      </group>
      <group position={[3.2, 0, -0.4]} rotation={[0, -0.1, 0]}>
        <GongQiangGate position={[0, 0, 0]} />
      </group>
    </group>
  )
}
