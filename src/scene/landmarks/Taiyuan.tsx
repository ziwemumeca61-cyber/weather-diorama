import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'

/**
 * 永祚寺凌霄双塔 Yongzuo Temple Twin Pagodas — Taiyuan's emblem: a matched
 * pair of slender 13-tier octagonal brick pagodas with green-glazed eaves and
 * a gilt finial, standing on a low stone plinth.
 */
function BrickPagoda({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.1)
  const TIERS = 13
  const tiers = useMemo(() => {
    const list: { r: number; h: number; y: number; eaveR: number }[] = []
    let y = 0.5 // plinth top
    let r = 0.6
    for (let i = 0; i < TIERS; i++) {
      const h = 0.4 - i * 0.011
      list.push({ r, h, y, eaveR: r + 0.17 })
      y += h + 0.09
      r *= 0.948
    }
    return { list, top: y }
  }, [])
  return (
    <group position={position}>
      {/* octagonal stone plinth */}
      <mesh position={[0, 0.25, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.86, 0.98, 0.5, 8]} />
        <meshStandardMaterial color={'#b7ac97'} roughness={0.92} />
      </mesh>
      {tiers.list.map((t, i) => (
        <group key={i}>
          <mesh position={[0, t.y + t.h / 2, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
            <cylinderGeometry args={[t.r * 0.95, t.r, t.h, 8]} />
            <meshStandardMaterial
              ref={glow}
              color={'#cabb9f'}
              emissive={'#ffcf8a'}
              emissiveIntensity={0.02}
              roughness={0.86}
            />
          </mesh>
          {/* green glazed eave ring */}
          <mesh position={[0, t.y + t.h + 0.04, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
            <cylinderGeometry args={[t.r * 0.5, t.eaveR, 0.11, 8]} />
            <meshStandardMaterial color={'#3f6b4a'} metalness={0.35} roughness={0.42} />
          </mesh>
        </group>
      ))}
      {/* gilt finial */}
      <mesh position={[0, tiers.top + 0.22, 0]}>
        <cylinderGeometry args={[0.03, 0.09, 0.52, 8]} />
        <meshStandardMaterial color={'#caa94a'} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, tiers.top + 0.54, 0]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial
          color={'#caa94a'}
          metalness={0.8}
          roughness={0.3}
          emissive={'#caa94a'}
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  )
}

/** Taiyuan — the twin pagodas rising side by side over the old town. */
export default function TaiyuanLandmarks() {
  return (
    <group>
      <BrickPagoda position={[-2.4, 0, -0.8]} />
      <BrickPagoda position={[1.5, 0, -3.4]} />
    </group>
  )
}
