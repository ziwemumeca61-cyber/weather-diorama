import { useNightGlow } from './nightGlow'

/**
 * 石家庄广播电视塔 — "a single column holding up the sky": a slender shaft with
 * a two-ring observation collar near the top and a tall antenna.
 */
function TVTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.7)
  const H = 11.0
  return (
    <group position={position}>
      {/* splayed feet */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.5, 0.8, Math.sin(a) * 0.5]} rotation={[Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22]} castShadow>
            <cylinderGeometry args={[0.1, 0.16, 1.7, 8]} />
            <meshStandardMaterial color={'#c8ccd2'} metalness={0.4} roughness={0.5} />
          </mesh>
        )
      })}
      <mesh position={[0, H / 2 + 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.42, H, 16]} />
        <meshStandardMaterial color={'#dfe3e8'} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* two observation collars */}
      {[0.72, 0.82].map((f, i) => (
        <mesh key={i} position={[0, H * f, 0]} castShadow>
          <cylinderGeometry args={[0.6 - i * 0.12, 0.6 - i * 0.12, 0.34, 20]} />
          <meshStandardMaterial ref={glow} color={'#a9c2d6'} metalness={0.5} roughness={0.3} emissive={'#ffe6a8'} emissiveIntensity={0.08} />
        </mesh>
      ))}
      <mesh position={[0, H + 1.5, 0]}>
        <cylinderGeometry args={[0.015, 0.07, 2.6, 6]} />
        <meshStandardMaterial color={'#cfd6de'} metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, H + 2.9, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color={'#ff4d4d'} emissive={'#ff2a2a'} emissiveIntensity={1.6} />
      </mesh>
    </group>
  )
}

/**
 * 赵州桥 (安济桥) Zhaozhou Bridge — the ancient open-spandrel stone arch: one
 * broad segmental main arch with a pair of small relief arches over each
 * shoulder, and a gentle stone deck.
 */
function ZhaozhouBridge({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  const stone = '#c3bba7'
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* deck (slightly arched) */}
      <mesh position={[0, 1.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.4, 0.18, 1.3]} />
        <meshStandardMaterial color={stone} roughness={0.9} />
      </mesh>
      {/* main segmental arch */}
      <mesh position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.1, 2.1, 1.25, 20, 1, false, Math.PI * 0.15, Math.PI * 0.7]} />
        <meshStandardMaterial color={'#b3ab97'} roughness={0.92} side={2} />
      </mesh>
      {/* open spandrel relief arches on each shoulder */}
      {[-1, 1].map((s) =>
        [1.55, 2.15].map((d) => (
          <mesh key={`${s}${d}`} position={[s * d, 0.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.28, 0.28, 1.28, 12, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color={'#a89e8a'} roughness={0.92} side={2} />
          </mesh>
        )),
      )}
      {/* abutments */}
      {[-2.6, 2.6].map((x) => (
        <mesh key={x} position={[x, 0.5, 0]} castShadow>
          <boxGeometry args={[0.5, 1.0, 1.4]} />
          <meshStandardMaterial color={'#a89e8a'} roughness={0.92} />
        </mesh>
      ))}
      {/* balustrade */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 1.2, s * 0.6]}>
          <boxGeometry args={[5.2, 0.16, 0.06]} />
          <meshStandardMaterial color={'#d6cfbe'} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

/** Shijiazhuang — the TV tower downtown, Zhaozhou Bridge over the river. */
export default function ShijiazhuangLandmarks() {
  return (
    <group>
      <TVTower position={[-2.6, 0, -3.6]} />
      <ZhaozhouBridge position={[1.6, 0, 8.2]} rotation={0.1} />
    </group>
  )
}
