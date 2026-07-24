import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'

/**
 * 中山桥 (黄河铁桥) Zhongshan Bridge — the historic iron bridge over the Yellow
 * River: a stone-pier deck spanned by five arched steel trusses with hangers.
 */
function IronBridge({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  const glow = useNightGlow(1.6)
  const SPAN = 2.2
  const spans = [-2, -1, 0, 1, 2]
  const steel = '#3f4a52'
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* deck */}
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[SPAN * 5.1, 0.16, 1.4]} />
        <meshStandardMaterial color={'#8a8f96'} roughness={0.8} />
      </mesh>
      {/* stone piers */}
      {[-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((i) => (
        <mesh key={i} position={[i * SPAN, 0.3, 0]} castShadow>
          <boxGeometry args={[0.34, 0.8, 1.5]} />
          <meshStandardMaterial color={'#9a9282'} roughness={0.92} />
        </mesh>
      ))}
      {/* arched steel trusses over each span (both sides) */}
      {spans.map((s) =>
        [-0.6, 0.6].map((zc) => (
          <mesh key={`${s}${zc}`} position={[s * SPAN, 0.78, zc]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[SPAN * 0.5, 0.05, 6, 24, Math.PI]} />
            <meshStandardMaterial
              ref={glow}
              color={steel}
              metalness={0.6}
              roughness={0.5}
              emissive={'#7ad0ff'}
              emissiveIntensity={0.03}
            />
          </mesh>
        )),
      )}
      {/* vertical hangers + cross braces */}
      {spans.map((s) =>
        [-0.5, 0, 0.5].map((f) => {
          const x = s * SPAN + f * SPAN
          const h = Math.cos((f / 0.5) * (Math.PI / 2.3)) * SPAN * 0.42 + 0.08
          return [-0.6, 0.6].map((zc) => (
            <mesh key={`${s}${f}${zc}`} position={[x, 0.78 + h / 2, zc]}>
              <cylinderGeometry args={[0.02, 0.02, h, 5]} />
              <meshStandardMaterial color={steel} metalness={0.6} roughness={0.5} />
            </mesh>
          ))
        }),
      )}
    </group>
  )
}

/**
 * 白塔 White Pagoda of White Pagoda Hill — a whitewashed seven-tier octagonal
 * tower with small dark eaves and a gilt finial.
 */
function WhitePagoda({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.0)
  const TIERS = 7
  const tiers = useMemo(() => {
    const list: { r: number; h: number; y: number }[] = []
    let y = 0.7
    let r = 0.66
    for (let i = 0; i < TIERS; i++) {
      const h = 0.5 - i * 0.02
      list.push({ r, h, y })
      y += h + 0.12
      r *= 0.93
    }
    return { list, top: y }
  }, [])
  return (
    <group position={position}>
      {/* stone platform on the hill */}
      <mesh position={[0, 0.35, 0]} scale={[1.6, 1, 1.5]} receiveShadow castShadow>
        <sphereGeometry args={[1.0, 16, 10]} />
        <meshStandardMaterial color={'#7a7060'} roughness={0.97} flatShading />
      </mesh>
      <mesh position={[0, 0.55, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
        <cylinderGeometry args={[0.95, 1.05, 0.4, 8]} />
        <meshStandardMaterial color={'#d8d2c6'} roughness={0.9} />
      </mesh>
      {tiers.list.map((t, i) => (
        <group key={i}>
          <mesh position={[0, t.y + t.h / 2, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
            <cylinderGeometry args={[t.r * 0.94, t.r, t.h, 8]} />
            <meshStandardMaterial ref={glow} color={'#f0ece2'} emissive={'#ffe6b0'} emissiveIntensity={0.02} roughness={0.82} />
          </mesh>
          <mesh position={[0, t.y + t.h + 0.05, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
            <cylinderGeometry args={[t.r * 0.55, t.r + 0.14, 0.11, 8]} />
            <meshStandardMaterial color={'#4a4038'} roughness={0.6} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, tiers.top + 0.24, 0]}>
        <cylinderGeometry args={[0.03, 0.09, 0.55, 8]} />
        <meshStandardMaterial color={'#caa94a'} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, tiers.top + 0.56, 0]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color={'#caa94a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

/** Lanzhou — the White Pagoda on the hill, the iron bridge over the river. */
export default function LanzhouLandmarks() {
  return (
    <group>
      <group position={[-2.6, 0, -1.6]} rotation={[0, 0.2, 0]} scale={1.2}>
        <WhitePagoda position={[0, 0, 0]} />
      </group>
      <IronBridge position={[1.2, 0, 8.2]} rotation={0.1} />
    </group>
  )
}
