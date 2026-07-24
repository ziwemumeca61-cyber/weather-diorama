import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'

/**
 * 南宁国际会展中心 — the "朱槿花" (hibiscus) crown: a ring of upswept white
 * petals around a glazed drum, the city's signature silhouette.
 */
function HibiscusHall({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.4)
  const PETALS = 11
  const petals = useMemo(() => Array.from({ length: PETALS }).map((_, i) => (i / PETALS) * Math.PI * 2), [])
  return (
    <group position={position}>
      {/* podium */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.0, 3.3, 0.8, 24]} />
        <meshStandardMaterial color={'#c3ccd2'} metalness={0.3} roughness={0.6} />
      </mesh>
      {/* glazed drum inside the crown */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[1.7, 2.0, 1.6, 24]} />
        <meshStandardMaterial ref={glow} color={'#9fc0d8'} metalness={0.5} roughness={0.3} emissive={'#ffe6a8'} emissiveIntensity={0.07} />
      </mesh>
      {/* upswept petals */}
      {petals.map((a, i) => (
        <group key={i} rotation={[0, a, 0]}>
          <mesh position={[1.9, 2.4, 0]} rotation={[0, 0, -0.5]} castShadow>
            <coneGeometry args={[0.42, 2.8, 5]} />
            <meshStandardMaterial color={'#f2f4f6'} roughness={0.6} metalness={0.15} />
          </mesh>
          {/* petal tip curl */}
          <mesh position={[2.7, 3.5, 0]} rotation={[0, 0, -1.0]} castShadow>
            <coneGeometry args={[0.2, 0.8, 5]} />
            <meshStandardMaterial color={'#e2b7c0'} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* central pistil */}
      <mesh position={[0, 3.4, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.2, 1.2, 10]} />
        <meshStandardMaterial color={'#d8ab34'} metalness={0.7} roughness={0.35} emissive={'#caa94a'} emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, 4.1, 0]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial color={'#e8c65a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

/** 龙象塔 Longxiang Pagoda — a nine-tier octagonal pagoda with grey eaves. */
function LongxiangPagoda({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.0)
  const TIERS = 9
  const tiers = useMemo(() => {
    const list: { r: number; h: number; y: number }[] = []
    let y = 0.6
    let r = 0.62
    for (let i = 0; i < TIERS; i++) {
      const h = 0.5 - i * 0.02
      list.push({ r, h, y })
      y += h + 0.12
      r *= 0.94
    }
    return { list, top: y }
  }, [])
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.95, 1.05, 0.6, 8]} />
        <meshStandardMaterial color={'#c8c0ad'} roughness={0.9} />
      </mesh>
      {tiers.list.map((t, i) => (
        <group key={i}>
          <mesh position={[0, t.y + t.h / 2, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
            <cylinderGeometry args={[t.r * 0.94, t.r, t.h, 8]} />
            <meshStandardMaterial ref={glow} color={'#ddd6c6'} emissive={'#ffe0a0'} emissiveIntensity={0.02} roughness={0.82} />
          </mesh>
          <mesh position={[0, t.y + t.h + 0.05, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
            <cylinderGeometry args={[t.r * 0.55, t.r + 0.16, 0.11, 8]} />
            <meshStandardMaterial color={'#5b6470'} metalness={0.3} roughness={0.5} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, tiers.top + 0.28, 0]}>
        <cylinderGeometry args={[0.03, 0.09, 0.6, 8]} />
        <meshStandardMaterial color={'#caa94a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.28} />
      </mesh>
    </group>
  )
}

/** Nanning — the hibiscus convention centre and the Longxiang Pagoda. */
export default function NanningLandmarks() {
  return (
    <group>
      <group position={[-1.6, 0, -3.2]} scale={1.18}>
        <HibiscusHall position={[0, 0, 0]} />
      </group>
      <LongxiangPagoda position={[3.0, 0, 1.6]} />
    </group>
  )
}
