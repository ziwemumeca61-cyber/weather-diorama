import { useMemo } from 'react'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'
import { makeConcaveRoof } from './roofKit'

/**
 * 雷峰塔 Leifeng Pagoda — an octagonal multi-eave pagoda on a hill by West Lake,
 * warm timber body with sweeping gold-brown eaves and a golden spire.
 */
function LeifengPagoda({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow()
  const TIERS = 5
  const eave = useMemo(
    () => Array.from({ length: TIERS }).map((_, i) => makeConcaveRoof(1.25 - i * 0.12, 0.36, 0.04)),
    [],
  )
  const roofMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8a5a34',
        roughness: 0.5,
        metalness: 0.25,
        side: THREE.DoubleSide,
        envMapIntensity: 1.2,
      }),
    [],
  )
  const tiers = useMemo(() => {
    const list: { r: number; h: number; y: number }[] = []
    let y = 0.9
    for (let i = 0; i < TIERS; i++) {
      const r = 0.82 - i * 0.08
      const h = 0.62
      list.push({ r, h, y: y + h / 2 })
      y += h + 0.34
    }
    return { list, top: y }
  }, [])
  return (
    <group position={position}>
      {/* grassy hillock + stone base */}
      <mesh position={[0, 0.2, 0]} receiveShadow>
        <cylinderGeometry args={[2.6, 3.0, 0.4, 24]} />
        <meshStandardMaterial color={'#6f9f63'} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.6, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.5, 1.6, 0.5, 8]} />
        <meshStandardMaterial color={'#b9b3a4'} roughness={0.9} />
      </mesh>
      {tiers.list.map((t, i) => (
        <group key={i}>
          {/* octagonal timber body */}
          <mesh position={[0, t.y, 0]} castShadow>
            <cylinderGeometry args={[t.r, t.r, t.h, 8]} />
            <meshStandardMaterial ref={glow} color={'#a8442f'} roughness={0.6} emissive={'#ff9a5c'} emissiveIntensity={0.03} />
          </mesh>
          {/* gilt band */}
          <mesh position={[0, t.y + t.h / 2, 0]}>
            <cylinderGeometry args={[t.r + 0.01, t.r + 0.01, 0.06, 8]} />
            <meshStandardMaterial color={'#caa94a'} metalness={0.6} roughness={0.35} />
          </mesh>
          {/* sweeping eave */}
          <mesh geometry={eave[i]} material={roofMat} position={[0, t.y + t.h / 2 + 0.04, 0]} castShadow />
        </group>
      ))}
      {/* golden spire */}
      <mesh position={[0, tiers.top + 0.1, 0]} castShadow>
        <coneGeometry args={[0.34, 0.5, 8]} />
        <meshStandardMaterial color={'#8a5a34'} roughness={0.5} metalness={0.25} />
      </mesh>
      <mesh position={[0, tiers.top + 0.55, 0]}>
        <cylinderGeometry args={[0.03, 0.06, 0.7, 8]} />
        <meshStandardMaterial color={'#e0b54f'} metalness={0.85} roughness={0.25} emissive={'#e0b54f'} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, tiers.top + 0.95, 0]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color={'#e0b54f'} metalness={0.85} roughness={0.25} emissive={'#e0b54f'} emissiveIntensity={0.4} />
      </mesh>
    </group>
  )
}

export default function HangzhouLandmarks() {
  return (
    <group position={[-1.0, 0, -1.6]} scale={1.25}>
      <LeifengPagoda position={[0, 0, 0]} />
    </group>
  )
}
