import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'

/**
 * 承天寺塔 (西塔) Chengtian Temple Pagoda — a tall, slender grey-brick pagoda:
 * eleven tapering storeys with recessed niche windows and a pointed cap.
 */
function ChengtianPagoda({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.1)
  const TIERS = 11
  const tiers = useMemo(() => {
    const list: { r: number; h: number; y: number }[] = []
    let y = 0.6
    let r = 0.66
    for (let i = 0; i < TIERS; i++) {
      const h = 0.62 - i * 0.02
      list.push({ r, h, y })
      y += h + 0.06
      r *= 0.965
    }
    return { list, top: y }
  }, [])
  return (
    <group position={position}>
      {/* base */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.7, 0.6, 1.7]} />
        <meshStandardMaterial color={'#c4bda9'} roughness={0.9} />
      </mesh>
      {tiers.list.map((t, i) => (
        <group key={i}>
          <mesh position={[0, t.y + t.h / 2, 0]} castShadow>
            <boxGeometry args={[t.r * 1.7, t.h, t.r * 1.7]} />
            <meshStandardMaterial ref={glow} color={'#d5cdba'} emissive={'#ffdca0'} emissiveIntensity={0.02} roughness={0.86} />
          </mesh>
          {/* niche windows on each face */}
          {[0, 1].map((f) => (
            <mesh key={f} position={[f === 0 ? 0 : 0, t.y + t.h * 0.55, f === 0 ? t.r * 0.86 : 0]} rotation={[0, f === 0 ? 0 : Math.PI / 2, 0]}>
              <boxGeometry args={[0.18, t.h * 0.4, 0.05]} />
              <meshStandardMaterial color={'#2a241c'} roughness={0.9} />
            </mesh>
          ))}
          {/* thin cornice */}
          <mesh position={[0, t.y + t.h + 0.02, 0]} castShadow>
            <boxGeometry args={[t.r * 1.85, 0.08, t.r * 1.85]} />
            <meshStandardMaterial color={'#b7ad97'} roughness={0.85} />
          </mesh>
        </group>
      ))}
      {/* tented cap + finial */}
      <mesh position={[0, tiers.top + 0.35, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.5, 0.8, 4]} />
        <meshStandardMaterial color={'#8a8f96'} roughness={0.7} />
      </mesh>
      <mesh position={[0, tiers.top + 0.95, 0]}>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshStandardMaterial color={'#caa94a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.28} />
      </mesh>
    </group>
  )
}

/**
 * 西夏王陵 Western Xia Tombs — the distinctive eroded earthen mounds: tan
 * octagonal beehive cones rising from the desert plain.
 */
function XixiaTombs({ position }: { position: [number, number, number] }) {
  const mounds = useMemo(
    () => [
      { x: 0, z: 0, r: 1.0, h: 2.6 },
      { x: 2.2, z: 0.8, r: 0.7, h: 1.9 },
      { x: -1.6, z: 1.4, r: 0.6, h: 1.6 },
      { x: 1.0, z: 2.4, r: 0.5, h: 1.3 },
    ],
    [],
  )
  return (
    <group position={position}>
      {mounds.map((m, i) => (
        <group key={i} position={[m.x, 0, m.z]}>
          {/* stepped octagonal body */}
          <mesh position={[0, m.h * 0.28, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[m.r * 0.8, m.r, m.h * 0.56, 8]} />
            <meshStandardMaterial color={'#c9a877'} roughness={0.98} flatShading />
          </mesh>
          {/* eroded beehive cap */}
          <mesh position={[0, m.h * 0.72, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
            <coneGeometry args={[m.r * 0.85, m.h * 0.5, 8]} />
            <meshStandardMaterial color={'#bfa06f'} roughness={0.98} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Yinchuan — the Chengtian Pagoda with the Western Xia tombs on the plain. */
export default function YinchuanLandmarks() {
  return (
    <group>
      <ChengtianPagoda position={[-2.6, 0, -1.4]} />
      <XixiaTombs position={[2.4, 0, 1.2]} />
    </group>
  )
}
