import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'

/**
 * 新疆国际大巴扎观光塔 Grand Bazaar Tower — a tapering terracotta-brick tower in
 * Islamic style: arched window bands, a ring gallery and a small domed cupola.
 */
function BazaarTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.3)
  const brick = '#b06a3f'
  const SEG = 5
  const segs = useMemo(
    () =>
      Array.from({ length: SEG }).map((_, i) => ({
        rBot: 1.05 - i * 0.13,
        rTop: 1.05 - (i + 1) * 0.13,
        y: 0.8 + i * 1.5,
      })),
    [],
  )
  return (
    <group position={position}>
      {/* base */}
      <mesh position={[0, 0.4, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.2, 1.35, 0.8, 8]} />
        <meshStandardMaterial color={'#9a5c37'} roughness={0.9} />
      </mesh>
      {segs.map((s, i) => (
        <group key={i}>
          <mesh position={[0, s.y + 0.75, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
            <cylinderGeometry args={[s.rTop, s.rBot, 1.5, 8]} />
            <meshStandardMaterial ref={glow} color={brick} emissive={'#ffb066'} emissiveIntensity={0.03} roughness={0.85} />
          </mesh>
          {/* arched window band (lit) */}
          <mesh position={[0, s.y + 0.75, 0]} rotation={[0, Math.PI / 8, 0]}>
            <cylinderGeometry args={[s.rBot * 1.002, s.rTop * 1.002, 0.5, 8, 1, true]} />
            <meshStandardMaterial ref={glow} color={'#5a3a24'} emissive={'#ffcf7a'} emissiveIntensity={0.06} roughness={0.6} side={2} />
          </mesh>
          {/* brick cornice */}
          <mesh position={[0, s.y + 1.5, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
            <cylinderGeometry args={[s.rTop + 0.08, s.rTop + 0.08, 0.14, 8]} />
            <meshStandardMaterial color={'#8a4f2f'} roughness={0.85} />
          </mesh>
        </group>
      ))}
      {/* domed cupola + crescent */}
      <mesh position={[0, 0.8 + SEG * 1.5 + 0.2, 0]} castShadow>
        <sphereGeometry args={[0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial color={'#2f7d54'} metalness={0.35} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.8 + SEG * 1.5 + 0.55, 0]} castShadow>
        <coneGeometry args={[0.22, 0.5, 12]} />
        <meshStandardMaterial color={'#2f7d54'} metalness={0.35} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.8 + SEG * 1.5 + 0.95, 0]}>
        <torusGeometry args={[0.1, 0.03, 8, 16, Math.PI * 1.4]} />
        <meshStandardMaterial color={'#e8c65a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

/** 红山塔 (镇龙塔) — a small dark pagoda perched on the Red Hill. */
function RedHillPagoda({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(0.9)
  const TIERS = 6
  const tiers = useMemo(() => {
    const list: { r: number; h: number; y: number }[] = []
    let y = 0
    let r = 0.38
    for (let i = 0; i < TIERS; i++) {
      const h = 0.34 - i * 0.015
      list.push({ r, h, y })
      y += h + 0.09
      r *= 0.9
    }
    return { list, top: y }
  }, [])
  return (
    <group position={position}>
      {/* red rock hill */}
      <mesh position={[0, 0.6, 0]} scale={[2.0, 1, 1.6]} castShadow receiveShadow>
        <sphereGeometry args={[1.2, 16, 10]} />
        <meshStandardMaterial color={'#a85236'} roughness={0.98} flatShading />
      </mesh>
      <group position={[0, 1.3, 0]}>
        {tiers.list.map((t, i) => (
          <group key={i}>
            <mesh position={[0, t.y + t.h / 2, 0]} rotation={[0, Math.PI / 6, 0]} castShadow>
              <cylinderGeometry args={[t.r * 0.92, t.r, t.h, 6]} />
              <meshStandardMaterial ref={glow} color={'#5b6470'} emissive={'#ffcf8a'} emissiveIntensity={0.02} roughness={0.8} />
            </mesh>
            <mesh position={[0, t.y + t.h + 0.03, 0]} rotation={[0, Math.PI / 6, 0]} castShadow>
              <cylinderGeometry args={[t.r * 0.5, t.r + 0.1, 0.08, 6]} />
              <meshStandardMaterial color={'#3f4750'} roughness={0.6} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, tiers.top + 0.2, 0]}>
          <coneGeometry args={[0.12, 0.4, 6]} />
          <meshStandardMaterial color={'#caa94a'} metalness={0.75} roughness={0.32} emissive={'#caa94a'} emissiveIntensity={0.25} />
        </mesh>
      </group>
    </group>
  )
}

/** Urumqi — the Grand Bazaar tower downtown, the Red Hill pagoda behind. */
export default function UrumqiLandmarks() {
  return (
    <group>
      <BazaarTower position={[-1.6, 0, -3.4]} />
      <RedHillPagoda position={[3.0, 0, 2.2]} />
    </group>
  )
}
