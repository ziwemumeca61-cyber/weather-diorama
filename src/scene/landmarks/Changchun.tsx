import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'
import { makeHallWall, wallMaps } from './wallKit'

/**
 * 地质宫 Geology Palace — a grand symmetric hall on Culture Square: a broad
 * stone-and-brick body under a big yellow-glazed Chinese hip roof, flanked by
 * two lower wings with their own roofs.
 */
function GeologyPalace({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.3)
  const tileTex = useMemo(() => makeTileTexture('#caa032', '#a67f22'), [])
  const wall = useMemo(() => makeHallWall({ wall: '#c9b78f', pillar: '#a8946b', beam: '#7c2d1f', bays: 6 }), [])
  const centerRoof = useMemo(() => makeHipRoof(4.4, 3.0, 0.7, 0.4, 0.28), [])
  const wingRoof = useMemo(() => makeHipRoof(2.6, 2.2, 0.5, 0.4, 0.28), [])
  const rmC = useMemo(() => glazedRoofMaterial(tileTex, 4, 1.4, 0.34), [tileTex])
  const rmW = useMemo(() => glazedRoofMaterial(tileTex, 2.6, 1.4, 0.34), [tileTex])
  const bodyMat = useMemo(() => wallMaps(wall, 6), [wall])
  const wingMat = useMemo(() => wallMaps(wall, 3), [wall])
  return (
    <group position={position}>
      {/* stone terrace */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.0, 0.5, 3.4]} />
        <meshStandardMaterial color={'#bcb4a0'} roughness={0.9} />
      </mesh>
      {/* two flanking wings */}
      {[-2.7, 2.7].map((x) => (
        <group key={x} position={[x, 0.5, 0]}>
          <mesh position={[0, 1.0, 0]} castShadow>
            <boxGeometry args={[2.2, 2.0, 2.0]} />
            <meshStandardMaterial ref={glow} map={wingMat.map} emissive={'#ffb066'} emissiveMap={wingMat.emissiveMap} emissiveIntensity={0.04} roughness={0.72} />
          </mesh>
          <mesh geometry={wingRoof} material={rmW} position={[0, 2.0, 0]} castShadow />
        </group>
      ))}
      {/* central block, taller */}
      <group position={[0, 0.5, 0]}>
        <mesh position={[0, 1.4, 0]} castShadow>
          <boxGeometry args={[4.0, 2.8, 2.6]} />
          <meshStandardMaterial ref={glow} map={bodyMat.map} emissive={'#ffb066'} emissiveMap={bodyMat.emissiveMap} emissiveIntensity={0.04} roughness={0.72} />
        </mesh>
        {/* portico columns */}
        {[-1.4, -0.7, 0, 0.7, 1.4].map((x) => (
          <mesh key={x} position={[x, 1.2, 1.35]} castShadow>
            <cylinderGeometry args={[0.13, 0.14, 2.4, 10]} />
            <meshStandardMaterial color={'#8a3524'} roughness={0.6} />
          </mesh>
        ))}
        <mesh geometry={centerRoof} material={rmC} position={[0, 2.8, 0]} castShadow />
        {/* gilt finial */}
        <mesh position={[0, 4.0, 0]}>
          <sphereGeometry args={[0.14, 12, 12]} />
          <meshStandardMaterial color={'#e8c65a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.28} />
        </mesh>
      </group>
    </group>
  )
}

/** 太阳鸟 Sun Bird — the golden sculpture standing on Culture Square. */
function SunBird({ position }: { position: [number, number, number] }) {
  const gold = (
    <meshStandardMaterial color={'#d8ab34'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.2} />
  )
  return (
    <group position={position}>
      {/* pylon */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.24, 2.8, 12]} />
        <meshStandardMaterial color={'#c8ccd2'} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* stylised bird: body + two swept wings + head */}
      <mesh position={[0, 3.0, 0]} rotation={[0, 0, 0]} castShadow>
        <coneGeometry args={[0.22, 1.1, 8]} />
        {gold}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.6, 3.2, 0]} rotation={[0, 0, s * 0.9]} castShadow>
          <boxGeometry args={[1.3, 0.1, 0.5]} />
          {gold}
        </mesh>
      ))}
      <mesh position={[0, 3.7, 0]}>
        <sphereGeometry args={[0.15, 12, 12]} />
        {gold}
      </mesh>
    </group>
  )
}

/** Changchun — the Geology Palace with the Sun Bird on Culture Square. */
export default function ChangchunLandmarks() {
  return (
    <group>
      <group position={[-1.4, 0, -3.4]} rotation={[0, 0.15, 0]}>
        <GeologyPalace position={[0, 0, 0]} />
      </group>
      <SunBird position={[2.6, 0, 3.0]} />
    </group>
  )
}
