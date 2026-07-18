import { useMemo } from 'react'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'
import { makeConcaveRoof } from './roofKit'
import { CITY } from '../cityData'
import { makeHallWall, wallMaps } from './wallKit'

/**
 * 栈桥·回澜阁 Zhanqiao Pier — a long stone pier reaching into the bay, ending
 * in the two-tier octagonal Huilan Pavilion.
 */
function ZhanqiaoPier({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.6)
  const roofs = useMemo(() => [makeConcaveRoof(1.0, 0.34, 0.05), makeConcaveRoof(0.72, 0.3, 0.04)], [])
  const roofMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#b08a2c',
        roughness: 0.45,
        metalness: 0.35,
        side: THREE.DoubleSide,
        envMapIntensity: 1.4,
      }),
    [],
  )
  const wall = useMemo(() => makeHallWall({ bays: 4 }), [])
  const pavWalls = useMemo(() => [wallMaps(wall, 3), wallMaps(wall, 2)], [wall])
  const pavMat = (i: number) => (
    <meshStandardMaterial
      ref={glow}
      map={pavWalls[i].map}
      emissive={'#ffb066'}
      emissiveMap={pavWalls[i].emissiveMap}
      emissiveIntensity={0.04}
      roughness={0.65}
    />
  )
  const PIER_LEN = 3.0
  const pierStart = CITY.riverZ - 0.5 // rooted on the shore
  return (
    <group position={position}>
      {/* pier deck striding into the water on piles */}
      <mesh position={[0, 0.22, pierStart + PIER_LEN / 2]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.1, PIER_LEN]} />
        <meshStandardMaterial color={'#c9c2b2'} roughness={0.85} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.29, 0.32, pierStart + PIER_LEN / 2]}>
          <boxGeometry args={[0.04, 0.1, PIER_LEN - 0.1]} />
          <meshStandardMaterial color={'#ded8ca'} roughness={0.8} transparent opacity={0.7} />
        </mesh>
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[0, 0.05, pierStart + 0.3 + i * (PIER_LEN - 0.5) / 4]}>
          <boxGeometry args={[0.56, 0.3, 0.12]} />
          <meshStandardMaterial color={'#a49c8c'} roughness={0.9} />
        </mesh>
      ))}
      {/* round pavilion platform at the sea end */}
      <mesh position={[0, 0.2, pierStart + PIER_LEN + 0.5]} castShadow receiveShadow>
        <cylinderGeometry args={[1.0, 1.08, 0.24, 16]} />
        <meshStandardMaterial color={'#c9c2b2'} roughness={0.85} />
      </mesh>
      {/* 回澜阁: two-tier octagonal pavilion */}
      <group position={[0, 0.32, pierStart + PIER_LEN + 0.5]}>
        <mesh position={[0, 0.32, 0]} castShadow>
          <cylinderGeometry args={[0.72, 0.78, 0.64, 8]} />
          {pavMat(0)}
        </mesh>
        <mesh geometry={roofs[0]} material={roofMat} position={[0, 0.68, 0]} castShadow />
        <mesh position={[0, 0.98, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.56, 0.5, 8]} />
          {pavMat(1)}
        </mesh>
        <mesh geometry={roofs[1]} material={roofMat} position={[0, 1.26, 0]} castShadow />
        <mesh position={[0, 1.68, 0]}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshStandardMaterial color={'#caa94a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.25} />
        </mesh>
      </group>
    </group>
  )
}

/** 五月的风 "May Wind" — the red spiral sculpture on the seaside plaza. */
function MayWind({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.8)
  const RINGS = 9
  return (
    <group position={position}>
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <cylinderGeometry args={[1.5, 1.6, 0.16, 20]} />
        <meshStandardMaterial color={'#b9b3a6'} roughness={0.9} />
      </mesh>
      {Array.from({ length: RINGS }).map((_, i) => {
        const f = i / (RINGS - 1)
        const r = THREE.MathUtils.lerp(0.95, 0.12, Math.pow(f, 0.85))
        const y = 0.35 + f * 2.6
        const a = f * Math.PI * 2.2
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.12, y, Math.sin(a) * 0.12]}
            rotation={[0.12 * Math.sin(a + 1), a, 0.12 * Math.cos(a)]}
            castShadow
          >
            <torusGeometry args={[r, 0.11, 10, 28]} />
            <meshStandardMaterial
              ref={glow}
              color={'#c8321e'}
              roughness={0.35}
              metalness={0.3}
              emissive={'#ff5a3c'}
              emissiveIntensity={0.05}
            />
          </mesh>
        )
      })}
    </group>
  )
}

/** Qingdao — Zhanqiao Pier reaching into the bay and the May Wind sculpture. */
export default function QingdaoLandmarks() {
  return (
    <group>
      <ZhanqiaoPier position={[-2.6, 0, 0]} />
      <MayWind position={[3.0, 0, -2.6]} />
    </group>
  )
}
